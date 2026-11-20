#!/usr/bin/env python3
"""MCP tool results as the Copilot CLI agent received them (PLAN T2.1, FINDINGS F31).

    tools/mcp_payloads.py [--round r[,r...]] [--arm a[,a...]] [--scenario s] [--model m] [--json]

For every Copilot CLI trial in results/trials.jsonl that matches (excluded trials skipped), reads the
extracted copilot-cli.jsonl and, per arm x MCP tool: calls, content characters the model saw (median and
max per call), and how many results Copilot CLI spilled to a file (a result over about 20 KB is replaced by
an ~837-character notice with a 500-character preview; the notice names `copilot-tool-output`). The
"server chars" column is the size the server returned: for a spilled result the size Copilot CLI states in
its notice ("Output too large to read at once (30.7 KB)", KB = 1,024 bytes, so +-50 bytes), otherwise the
content length. Also per arm: spills per trial, and how many later
`rg`/`view`/`cat`/`head`/`jq` calls read a spill file back.
"""
import argparse
import collections
import json
import os
import re
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import collect  # noqa: E402

SUITE = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("TELEMETRY_DATA_DIR", Path.home() / ".aspire-bench/telemetry-runs"))
NOTICE = re.compile(r"^Output too large to read at once \(([0-9.]+) KB\)")
SPILL = re.compile(r"/tmp/\d+-copilot-tool-output-[0-9a-f]+\.txt")


def trial_calls(run_id):
    path = collect.run_trajectory(DATA / "extracted" / run_id)  # the unredacted output copy first (PLAN §9)
    if path is None:
        return None
    events = collect.load_events(path)
    starts = {e["data"].get("toolCallId"): e["data"] for e in events if e.get("type") == "tool.execution_start"}
    calls = []
    for event in events:
        if event.get("type") != "tool.execution_complete":
            continue
        start = starts.get(event["data"].get("toolCallId"), {})
        result = event["data"].get("result", "")
        content = collect.atif_text(result.get("content")) if isinstance(result, dict) else str(result)
        notice = NOTICE.search(content)
        server = round(float(notice.group(1)) * 1024) if notice else len(content)
        args = start.get("arguments", {})
        calls.append({"tool": start.get("toolName", "?"), "content": content, "server_chars": server,
                      "args": json.dumps(args) if not isinstance(args, str) else args})
    return calls


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--round"); parser.add_argument("--arm"); parser.add_argument("--scenario"); parser.add_argument("--model")
    parser.add_argument("--json", action="store_true")
    a = parser.parse_args()
    split = lambda v: set(v.split(",")) if v else None
    rounds, arms = split(a.round), split(a.arm)
    rows = [json.loads(line) for line in open(SUITE / "results/trials.jsonl")]
    rows = [r for r in rows if not r.get("excluded") and r.get("agent", "github-copilot-cli") == "github-copilot-cli"
            and (not rounds or r.get("round") in rounds) and (not arms or r["arm"] in arms)
            and (not a.scenario or r["scenario"] == a.scenario) and (not a.model or a.model in r.get("model_requested", ""))]
    per_tool = collections.defaultdict(lambda: {"calls": 0, "spilled": 0, "content": [], "server": []})
    per_arm = collections.defaultdict(lambda: {"trials": 0, "spills": 0, "spill_reads": 0, "mcp_content": 0, "missing": 0})
    for row in rows:
        key = (row["scenario"], row.get("model_requested"), row["arm"])
        calls = trial_calls(row["run_id"])
        arm = per_arm[key]
        if calls is None:
            arm["missing"] += 1
            continue
        arm["trials"] += 1
        spill_files = set()
        for call in calls:
            files = set(SPILL.findall(call["args"]))
            if files & spill_files and not call["tool"].startswith("aspire-"):
                arm["spill_reads"] += 1
            if not call["tool"].startswith("aspire-"):
                continue
            spilled = bool(NOTICE.search(call["content"]))
            spill_files.update(SPILL.findall(call["content"]))
            tool = per_tool[key + (call["tool"].removeprefix("aspire-"),)]
            tool["calls"] += 1
            tool["spilled"] += spilled
            tool["content"].append(len(call["content"]))
            tool["server"].append(call["server_chars"])
            arm["spills"] += spilled
            arm["mcp_content"] += len(call["content"])
    if a.json:
        print(json.dumps({"tools": {"|".join(map(str, k)): {**v, "content": v["content"], "server": v["server"]} for k, v in per_tool.items()},
                          "arms": {"|".join(map(str, k)): v for k, v in per_arm.items()}}))
        return
    print("| Scenario | Model | Arm | Tool | Calls | Spilled | Content chars median | max | Server chars median | max |")
    print("|---|---|---|---|---:|---:|---:|---:|---:|---:|")
    for key in sorted(per_tool):
        v = per_tool[key]
        print(f"| {key[0]} | {key[1]} | {key[2]} | `{key[3]}` | {v['calls']} | {v['spilled']} | {statistics.median(v['content']):,.0f} | {max(v['content']):,} "
              f"| {statistics.median(v['server']):,.0f} | {max(v['server']):,} |")
    print()
    print("| Scenario | Model | Arm | Trials | MCP spills | per trial | spill-file reads | MCP content chars per trial (mean) |")
    print("|---|---|---|---:|---:|---:|---:|---:|")
    for key in sorted(per_arm):
        v = per_arm[key]
        n = v["trials"] or 1
        print(f"| {key[0]} | {key[1]} | {key[2]} | {v['trials']}{' (+%d not extracted)' % v['missing'] if v['missing'] else ''} | {v['spills']} "
              f"| {v['spills'] / n:.1f} | {v['spill_reads']} | {v['mcp_content'] / n:,.0f} |")


if __name__ == "__main__":
    main()
