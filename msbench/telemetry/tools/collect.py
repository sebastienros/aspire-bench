#!/usr/bin/env python3
"""Extracts MSBench runs listed in results/ledger.jsonl and derives per-trial metrics.

    tools/collect.py            extract any run not yet extracted, then rebuild results
    tools/collect.py --no-fetch only re-derive from artifacts already on disk

Outputs (committed): results/trials.jsonl (one row per trial) and results/summary.md.
Raw artifacts stay outside the repository in $TELEMETRY_DATA_DIR; each row records the
SHA-256 of the native result and trajectory it was derived from.

Nothing here reads the agent's own claims: reward comes from the verifier, timing and
tokens from Harbor's native result, and tool/skill/MCP use from the trajectory events.
"""
import collections
import datetime
import hashlib
import json
import os
import re
import statistics
import subprocess
import sys
from pathlib import Path

SUITE = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("TELEMETRY_DATA_DIR", Path.home() / ".aspire-bench/telemetry-runs"))
VENV = Path.home() / "Library/Application Support/pipx/venvs/msbench-cli/bin"
PROTECTED = re.compile(r"/opt/benchmark|/solution\b|/tests/test\.sh|/logs/verifier")
# Phase markers. "seen": the first tool result that puts the root cause on screen.
# "fix": the first command that changes the system toward a repair.
PHASES = {
    "slow-sql": (re.compile(r"square_audit"),
                 re.compile(r"CREATE\s+(UNIQUE\s+)?INDEX|DROP\s+TRIGGER|DISABLE\s+TRIGGER|CREATE\s+OR\s+REPLACE\s+FUNCTION|ALTER\s+TABLE", re.I)),
    "read-only": (re.compile(r"read-only transaction|25006|default_transaction_read_only", re.I),
                  re.compile(r"RESET\s+default_transaction_read_only|default_transaction_read_only\s*(=|TO)\s*'?(off|false)", re.I)),
}
ASPIRE_COMMAND = re.compile(
    r"\baspire\s+(otel\s+(?:traces|spans|logs)|describe|logs|resource|export|ps|wait|start|stop|run|docs|doctor|mcp|agent)\b")


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_time(value):
    return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))


def load_events(path):
    events = []
    for line in path.read_text(errors="replace").splitlines():
        if not line.strip():
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            # Some tool output contains invalid JSON escapes; read them as literal backslashes.
            try:
                events.append(json.loads(re.sub(r'\\(?!["\\/bfnrtu])', r"\\\\", line)))
            except json.JSONDecodeError:
                continue
    return events


def fetch(run_id):
    out = DATA / "extracted" / run_id
    if out.exists() and any(out.rglob("result.json")):
        return out
    out.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, PATH=f"{VENV}:{os.environ['PATH']}", MSBENCH_DISABLE_RUN_ANALYSIS="1")
    subprocess.run(["msbench-cli", "extract", "--run-id", run_id, "--backend", "ces-staging",
                    "--output", str(out)], env=env, capture_output=True, text=True, timeout=1800)
    return out


def analyze_trial(result_path, entry):
    native = json.loads(result_path.read_text())
    trial_dir = result_path.parent
    row = dict(run_id=entry["run_id"], scenario=entry["scenario"], arm=entry["arm"],
               model_requested=entry["model"], round=entry["round"],
               trial=native.get("trial_name"),
               url=f"https://msbenchapp.azurewebsites.net/run-analysis/{entry['run_id']}",
               native_result_sha256=sha256(result_path))
    verifier = native.get("verifier_result") or {}
    row["reward"] = (verifier.get("rewards") or {}).get("reward")
    exception = native.get("exception_info")
    row["exception"] = (exception or {}).get("exception_type") if isinstance(exception, dict) else exception
    timing = native.get("agent_execution") or {}
    if timing.get("started_at") and timing.get("finished_at"):
        row["agent_seconds"] = round(
            (parse_time(timing["finished_at"]) - parse_time(timing["started_at"])).total_seconds(), 1)
    metrics = native.get("agent_result") or {}
    row["input_tokens"] = metrics.get("n_input_tokens")
    row["cached_input_tokens"] = metrics.get("n_cache_tokens")
    row["output_tokens"] = metrics.get("n_output_tokens")
    row["cost_usd"] = metrics.get("cost_usd")

    details = next(iter(trial_dir.rglob("details.json")), None)
    if details:
        try:
            row["verifier_details"] = json.loads(details.read_text())
        except json.JSONDecodeError:
            pass
    versions = {json.loads(p.read_text()).get("resolvedVersion") for p in trial_dir.rglob("cli-provenance.json")}
    row["copilot_cli"] = sorted(v for v in versions if v)

    trajectory = next((p for p in trial_dir.rglob("copilot-cli.jsonl")), None)
    if trajectory is None:
        row["trajectory"] = None
        return row
    row["trajectory_sha256"] = sha256(trajectory)
    events = load_events(trajectory)
    row["models_called"] = sorted({e["data"].get("model") for e in events
                                   if e.get("type") == "model.call_start" and e.get("data", {}).get("model")})
    row["model_calls"] = sum(e.get("type") == "model.call_start" for e in events)
    tools = [e["data"] for e in events if e.get("type") == "tool.execution_start"]
    counts = collections.Counter(t.get("toolName") for t in tools)
    row["tool_calls"] = len(tools)
    row["tool_counts"] = dict(counts)
    row["mcp_calls"] = {name: n for name, n in counts.items() if name and name.startswith("aspire-")}
    row["skills_loaded"] = [t.get("arguments", {}).get("skill") for t in tools if t.get("toolName") == "skill"]
    aspire = collections.Counter()
    protected = 0
    for tool in tools:
        text = json.dumps(tool.get("arguments", {}))
        protected += bool(PROTECTED.search(text))
        if tool.get("toolName") in ("bash", "write_bash"):
            aspire.update(re.sub(r"\s+", " ", m) for m in ASPIRE_COMMAND.findall(text))
    row["aspire_cli"] = dict(aspire)
    row["protected_path_access"] = protected
    # Phase timing, relative to the first trajectory event.
    def stamp(event):
        value = event.get("timestamp")
        return parse_time(value) if value else None
    started = next((stamp(e) for e in events if stamp(e)), None)
    seen_pattern, fix_pattern = PHASES.get(entry["scenario"], (None, None))
    if started and seen_pattern:
        for event in events:
            if event.get("type") == "tool.execution_complete" and seen_pattern.search(json.dumps(event["data"].get("result", ""))):
                row["seconds_to_root_cause_seen"] = round((stamp(event) - started).total_seconds(), 1)
                break
        for event in events:
            if event.get("type") == "tool.execution_start" and fix_pattern.search(json.dumps(event["data"].get("arguments", ""))):
                row["seconds_to_first_fix"] = round((stamp(event) - started).total_seconds(), 1)
                break
        seen_index = next((i for i, e in enumerate(events) if e.get("type") == "tool.execution_complete"
                           and seen_pattern.search(json.dumps(e["data"].get("result", "")))), None)
        if seen_index is not None:
            row["tool_calls_to_root_cause_seen"] = sum(e.get("type") == "tool.execution_start" for e in events[:seen_index])
    # Bytes returned to the model by tools: the context the agent had to read.
    row["tool_result_chars"] = sum(len(json.dumps(e["data"].get("result", "")))
                                   for e in events if e.get("type") == "tool.execution_complete")
    return row


def median(values):
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else None


def summarize(rows):
    cells = collections.defaultdict(list)
    for row in rows:
        if row["model_requested"] != "oracle":
            cells[(row["scenario"], row["model_requested"], row["arm"])].append(row)
    lines = ["# Telemetry suite results", "",
             "Generated by `tools/collect.py` from native MSBench/Harbor artifacts. Medians are over all",
             "trials in a cell, including failures; a failed trial keeps its real time and tokens.", ""]
    for scenario, model in sorted({(s, m) for s, m, _ in cells}):
        lines += [f"## {scenario} / {model}", "",
                  "| Arm | Pass | Agent s | To root cause s | To first fix s | Input tok | Output tok | Cost USD | Tools | Skills loaded | MCP calls | Tool output chars |",
                  "|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|"]
        for (s, m, arm), trials in sorted(cells.items()):
            if (s, m) != (scenario, model):
                continue
            valid = [t for t in trials if t.get("agent_seconds") is not None]
            passed = sum(1 for t in trials if t.get("reward") == 1)
            skills = collections.Counter(skill for t in trials for skill in set(t.get("skills_loaded") or []))
            fmt = lambda v, spec: "-" if v is None else format(v, spec)
            lines.append("| {} | {}/{} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |".format(
                arm, passed, len(trials),
                fmt(median([t.get("agent_seconds") for t in valid]), ".0f"),
                fmt(median([t.get("seconds_to_root_cause_seen") for t in valid]), ".0f"),
                fmt(median([t.get("seconds_to_first_fix") for t in valid]), ".0f"),
                fmt(median([t.get("input_tokens") for t in valid]), ",.0f"),
                fmt(median([t.get("output_tokens") for t in valid]), ",.0f"),
                fmt(median([t.get("cost_usd") for t in valid]), ".3f"),
                fmt(median([t.get("tool_calls") for t in valid]), ".0f"),
                ", ".join(f"{k}x{v}" for k, v in sorted(skills.items())) or "-",
                fmt(median([sum((t.get("mcp_calls") or {}).values()) for t in valid]), ".0f"),
                fmt(median([t.get("tool_result_chars") for t in valid]), ",.0f")))
        lines.append("")
    return "\n".join(lines)


def main():
    ledger = [json.loads(line) for line in (SUITE / "results/ledger.jsonl").read_text().splitlines() if line.strip()]
    rows = []
    for entry in ledger:
        root = DATA / "extracted" / entry["run_id"] if "--no-fetch" in sys.argv else fetch(entry["run_id"])
        trials = [p for p in root.rglob("result.json") if "trial_name" in p.read_text()[:4000]]
        if not trials:
            print(f"pending/no result: {entry['run_id']} {entry['scenario']} {entry['arm']} {entry['model']}", file=sys.stderr)
            continue
        rows += [analyze_trial(path, entry) for path in trials]
    (SUITE / "results/trials.jsonl").write_text("".join(json.dumps(r, sort_keys=True) + "\n" for r in rows))
    (SUITE / "results/summary.md").write_text(summarize(rows) + "\n")
    print(f"{len(rows)} trials from {len(ledger)} ledger entries")


if __name__ == "__main__":
    main()
