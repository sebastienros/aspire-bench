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
import functools
import hashlib
import json
import os
import re
import shutil
import sqlite3
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

SUITE = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("TELEMETRY_DATA_DIR", Path.home() / ".aspire-bench/telemetry-runs"))
VENV = Path.home() / "Library/Application Support/pipx/venvs/msbench-cli/bin"
PROTECTED = re.compile(r"/opt/benchmark[\w./-]*|/solution\b|/tests/test\.sh|/logs/verifier")
# Phase markers. "seen": the first tool result that puts the root cause on screen.
# "fix": the first command that changes the system toward a repair.
PHASES = {
    "slow-sql": (re.compile(r"square_audit"),
                 re.compile(r"CREATE\s+(UNIQUE\s+)?INDEX|DROP\s+TRIGGER|DISABLE\s+TRIGGER|CREATE\s+OR\s+REPLACE\s+FUNCTION|ALTER\s+TABLE", re.I)),
    "read-only": (re.compile(r"read-only transaction|25006|default_transaction_read_only", re.I),
                  re.compile(r"RESET\s+default_transaction_read_only|default_transaction_read_only\s*(=|TO)\s*'?(off|false)", re.I)),
    "slow-redis": (re.compile(r"report-exporter|redis\.call\(.KEYS|KEYS.{0,40}report:session", re.I),
                   re.compile(r"\bpkill\b|\bkillall\b|\bkill\s+(-\w+\s+)?\d+|CLIENT\s+KILL|CLIENT\s+PAUSE|ACL\s+SETUSER|rename-command", re.I)),
    # Held-out Shop app (T0.2). slow-sql: the JSON_VALUE statement on screen (EF Core log line,
    # trace span or plan); fix: an index or computed column. stuck-orders: the lock wait or its
    # holder on screen (wait type, the job, its sqlcmd session); fix: ending the holder.
    "heldout-slow-sql": (re.compile(r"JSON_VALUE\s*\(\s*\[?Payload", re.I),
                         re.compile(r"CREATE\s+(UNIQUE\s+)?(NONCLUSTERED\s+)?INDEX|ALTER\s+TABLE", re.I)),
    "heldout-stuck-orders": (re.compile(r"LCK_M_X|stock-reconcile|\bSQLCMD\b"),
                             re.compile(r"\bKILL\s+\d+|\bpkill\b|\bkillall\b|\bkill\s+(-\w+\s+)?\d+", re.I)),
    # cache: the per-shopper cache key on screen (it is only in the source); fix: a cache entry
    # under a constant key, i.e. the ranking shared again. Neither fires on a `ps` listing.
    # Guardrail (T3.8): the snapshot job or its idle transaction on screen; fix: the session ended or
    # the database restarted (by any means; the verifier and the write-up judge which).
    "stuck-db": (re.compile(r"board-snapshot|idle in transaction|AccessExclusiveLock", re.I),
                 re.compile(r"pg_terminate_backend|pg_cancel_backend|aspire\s+resource\s+\S+\s+restart|docker\s+(restart|rm|kill|stop)\b|aspire\s+(stop|start)\b", re.I)),
    "heldout-cache": (re.compile(r"products:\{customer\}"),
                      re.compile(r"GetOrCreate(Async)?\(\s*\\?\"[A-Za-z]")),
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
    # `msbench-cli extract` refuses a non-empty directory; drop partial earlier attempts.
    shutil.rmtree(out, ignore_errors=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, PATH=f"{VENV}:{os.environ['PATH']}", MSBENCH_DISABLE_RUN_ANALYSIS="1")
    subprocess.run(["msbench-cli", "extract", "--run-id", run_id, "--backend", "ces-staging",
                    "--output", str(out)], env=env, capture_output=True, text=True, timeout=1800)
    return out


# Rounds whose `raw` arm is the standard app as it ships now (start script and README only).
# Earlier rounds ran it with an extra scripts/check.sh health script, which an ordinary
# application does not have; those trials are kept under the arm name `raw-check`.
# This relabel only applies to the first pin: every later pin's `raw` is the standard app.
CURRENT_RAW_ROUNDS = {"gate", "r6", "r6b", "r7", "r7b"}

# A pin is the toolchain a trial ran on (Aspire daily + aspire-skills tag), named by the daily's
# build date. Rows of different pins are never pooled. Ledger entries written before the
# 2026-11-17 re-pin carry no `aspire_build`; all of them ran on the first pin.
FIRST_PIN = "2026-11-09"
FIRST_PIN_ROUNDS = {"gate", "probe", "probe-models", "r1", "r2", "r3", "r3b", "r4", "r4b", "r5",
                    "r6", "r6b", "r7", "r7b"}
PIN_LABELS = {FIRST_PIN: "Aspire 17.1.0-preview.1.26559.1+4954c76a, aspire-skills v0.0.5 (1117facb); the pin REPORT.md measured"}


# The harness a trial ran under. Ledger entries written before T0.4 carry no `agent`: all of them
# ran Copilot CLI. An oracle gate runs no harness.
DEFAULT_AGENT = "github-copilot-cli"


def agent_of(entry):
    return "oracle" if entry["model"] == "oracle" else entry.get("agent") or DEFAULT_AGENT


def cell_title(scenario, model, agent):
    """Section title of a cell group; Copilot CLI keeps the titles every earlier table used."""
    return f"## {scenario} / {model}" + ("" if agent == DEFAULT_AGENT else f" / {agent}")


REPO = SUITE.parent.parent
SKILL_SETS = {  # what common/skills/compose.sh copies for each set, in order; `aspire` is removed in lean sets
    "current": ["current"], "plus": ["current", "new"],
    "lean": ["current", "new", "-aspire", "lean-overrides"],
    "lean-start": ["current", "new", "start", "-aspire", "lean-overrides"],
    "lean-noorch": ["current", "new", "-aspire", "-aspire-orchestration", "lean-overrides"],
    "lean-start-wait": ["current", "new", "start-wait", "-aspire", "lean-overrides"],
    "lean-tracetable": ["current", "new", "-aspire", "lean-overrides", "diagnose-table"],
}


@functools.lru_cache(maxsize=None)
def skills_content(task_commit, scenario, arm):
    """Fingerprint of the skill files a task's image receives: the set named by the task's SKILLS
    build arg, composed as common/skills/compose.sh does from the suite commit the task builds from.
    None when the ledger line names no task commit (the first pin) or the task cannot be read."""
    if not task_commit:
        return None
    git = lambda *args: subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True)
    compose = git("show", f"{task_commit}:msbench/telemetry/tasks/{scenario}/{arm}/environment/docker-compose.yaml")
    if compose.returncode:
        return None
    skill_set = re.search(r"^\s+SKILLS:\s*(\S+)", compose.stdout, re.M)
    skill_set = skill_set.group(1) if skill_set else "none"
    if skill_set not in SKILL_SETS:
        return skill_set  # none, or plugin (the shipped tag, recorded in skills_sha)
    suite = re.search(r"#([0-9a-f]{40}):msbench/telemetry/common", compose.stdout).group(1)
    tree = git("ls-tree", "-r", f"{suite}:msbench/telemetry/common/skills")
    blobs = collections.defaultdict(dict)
    for line in tree.stdout.splitlines():
        meta, path = line.split("\t", 1)
        top, _, rest = path.partition("/")
        if rest:
            blobs[top][rest] = meta.split()[2]
    files = {}
    for step in SKILL_SETS[skill_set]:
        if step.startswith("-"):
            files = {path: blob for path, blob in files.items() if not path.startswith(step[1:] + "/")}
        else:
            files.update(blobs[step])
    files.pop("LICENSE", None)
    digest = hashlib.sha256("".join(f"{p} {b}\n" for p, b in sorted(files.items())).encode()).hexdigest()
    return f"{skill_set} {digest[:12]}"


def pin_of(entry):
    """The pin date, from the Arcade build number in the daily's version (yy*1000 + MM*50 + dd)."""
    build = entry.get("aspire_build")
    if not build:
        if entry["round"] not in FIRST_PIN_ROUNDS:
            raise SystemExit(f"ledger entry {entry['run_id']} (round {entry['round']}) has no aspire_build")
        return FIRST_PIN
    code = int(re.search(r"\.(\d{5})\.\d+(\+|$)", build).group(1))
    return f"20{code // 1000:02d}-{code % 1000 // 50:02d}-{code % 50:02d}"


def pin_label(rows, pin):
    if pin in PIN_LABELS:
        return PIN_LABELS[pin]
    builds = sorted({r.get("aspire_build") for r in rows if r.get("pin") == pin and r.get("aspire_build")})
    skills = sorted({r.get("skills_sha") for r in rows if r.get("pin") == pin and r.get("skills_sha")})
    skills = [f"{tag} ({sha[:8]})" for tag, sha in (value.split() for value in skills)]
    return f"Aspire {', '.join(b[:b.index('+') + 9] if '+' in b else b for b in builds)}, aspire-skills {', '.join(skills)}"


def by_pin(rows):
    """Rows per pin for the tables. Rows whose ledger entry carries `excluded` (a reason) stay in
    trials.jsonl and are left out of every table."""
    pins = collections.defaultdict(list)
    for row in rows:
        if not row.get("excluded"):
            pins[row["pin"]].append(row)
    return sorted(pins.items())


def analyze_trial(result_path, entry):
    native = json.loads(result_path.read_text())
    trial_dir = result_path.parent
    arm = entry["arm"]
    pin = pin_of(entry)
    if arm == "raw" and pin == FIRST_PIN and entry["round"] not in CURRENT_RAW_ROUNDS:
        arm = "raw-check"
    row = dict(run_id=entry["run_id"], scenario=entry["scenario"], arm=arm,
               model_requested=entry["model"], round=entry["round"], pin=pin,
               agent=agent_of(entry), agent_package=entry.get("agent_package"), task=entry.get("task"),
               aspire_build=entry.get("aspire_build"), skills_sha=entry.get("skills_sha"),
               task_repo_commit=entry.get("task_repo_commit"),
               skills_content=skills_content(entry.get("task_repo_commit"), entry["scenario"], entry["arm"]),
               excluded=entry.get("excluded"),
               trial=native.get("trial_name"),
               url=f"https://msbenchapp.azurewebsites.net/run-analysis/{entry['run_id']}",
               native_result_sha256=sha256(result_path))
    verifier = native.get("verifier_result") or {}
    row["reward"] = (verifier.get("rewards") or {}).get("reward")
    exception = native.get("exception_info")
    row["exception"] = (exception or {}).get("exception_type") if isinstance(exception, dict) else exception
    # A runner/setup/model-service exception produced no grade: an infrastructure failure, kept
    # in trials.jsonl but excluded from every medians and pass-rate cell (see FINDINGS F06).
    row["infrastructure_failure"] = bool(row["exception"]) and row["reward"] is None
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

    if row["agent"] == "vscode":
        return analyze_vscode(trial_dir, entry, row)
    if row["agent"] not in (DEFAULT_AGENT, "oracle"):
        return analyze_atif(trial_dir, entry, row)
    trajectory = next((p for p in trial_dir.rglob("copilot-cli.jsonl")), None)
    if trajectory is None:
        row["trajectory"] = None
        return row
    row["trajectory_sha256"] = sha256(trajectory)
    events = load_events(trajectory)
    # Model-service health: wall time spent in model calls that ended in a 5xx (a 504 after a
    # 240 s hang on 2026-11-18). A trial that timed out or crashed after such failures says
    # nothing about the arm; it is an infrastructure failure like one that never got a grade.
    # The wait counts the failed call itself plus the retry backoff until the next model call.
    failures, wait = [], 0.0
    for index, event in enumerate(events):
        if event.get("type") == "model.call_failure" and (event.get("data", {}).get("statusCode") or 0) >= 500:
            failures.append(event["data"])
            wait += (event["data"].get("durationMs") or 0) / 1000
            following = next((e for e in events[index + 1:] if e.get("type") == "model.call_start"), None)
            if following and following.get("timestamp") and event.get("timestamp"):
                wait += (parse_time(following["timestamp"]) - parse_time(event["timestamp"])).total_seconds()
    row["model_service_5xx"] = len(failures)
    row["model_service_wait_seconds"] = round(wait, 1)
    if failures and row["exception"]:
        row["infrastructure_failure"] = True
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
    harness_paths = set()
    for tool in tools:
        text = json.dumps(tool.get("arguments", {}))
        matches = PROTECTED.findall(text)
        protected += bool(matches)
        harness_paths.update(m.rstrip("/") for m in matches)
        if tool.get("toolName") in ("bash", "write_bash"):
            aspire.update(re.sub(r"\s+", " ", m) for m in ASPIRE_COMMAND.findall(text))
    row["aspire_cli"] = dict(aspire)
    row["protected_path_access"] = protected
    row["harness_paths_read"] = sorted(harness_paths)
    # Phase timing, relative to the first trajectory event.
    def stamp(event):
        value = event.get("timestamp")
        return parse_time(value) if value else None
    started = next((stamp(e) for e in events if stamp(e)), None)
    # The agent loop alone, first to last trajectory event; agent_seconds is Harbor's
    # agent_execution, which also holds harness start-up (large for VS Code, see analyze_vscode).
    ended = max((stamp(e) for e in events if stamp(e)), default=None)
    if started and ended:
        row["agent_loop_seconds"] = round((ended - started).total_seconds(), 1)
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
    row.update(verified_up(events, entry["scenario"], "raw" if entry["arm"].startswith("raw") else "aspire"))
    row.update(trace_detail_reads(events))
    if entry["scenario"] == "slow-redis" and started:
        row.update(redis_reply(events, started))
    # Bytes returned to the model by tools: the context the agent had to read.
    row["tool_result_chars"] = sum(len(json.dumps(e["data"].get("result", "")))
                                   for e in events if e.get("type") == "tool.execution_complete")
    # tool_result_chars counts Copilot's whole result object, whose `detailedContent` (shown to the
    # user, not the model) roughly doubles it. The content alone is what an ATIF trajectory records,
    # so this is the measure to compare across harnesses.
    row["tool_result_content_chars"] = sum(
        len(json.dumps(atif_text(result.get("content")) if isinstance(result, dict) else result))
        for e in events if e.get("type") == "tool.execution_complete"
        for result in [e["data"].get("result", "")])
    # PLAN T2.1: the share of that from MCP tools, and how many MCP results Copilot CLI replaced by its
    # 20 KB spill notice (FINDINGS F31). Content as delivered; a spilled result counts at its notice size.
    tool_names = {e["data"].get("toolCallId"): e["data"].get("toolName", "")
                  for e in events if e.get("type") == "tool.execution_start"}
    mcp_results = [atif_text(result.get("content")) if isinstance(result, dict) else str(result)
                   for e in events if e.get("type") == "tool.execution_complete"
                   and tool_names.get(e["data"].get("toolCallId"), "").startswith("aspire-")
                   for result in [e["data"].get("result", "")]]
    row["mcp_result_content_chars"] = sum(len(json.dumps(text)) for text in mcp_results)  # counted as above
    row["mcp_spills"] = sum(text.startswith("Output too large to read at once (") for text in mcp_results)
    return row


# PLAN T2.3: one trace fetched by ID (`aspire otel traces -t <id>` / `--trace-id`), as JSON or as the tree.
TRACE_DETAIL = re.compile(r"\baspire\s+otel\s+traces\b[^|;&\n]*?(?:\s-t\s|\s--trace-id[\s=])")
JSON_FORMAT = re.compile(r"--format[\s=]+json\b|\s-f\s+json\b", re.I)


def trace_detail_reads(events):
    """Shell calls that fetch one trace by ID, split by output format (Copilot CLI rows)."""
    json_reads = table_reads = 0
    for e in events:
        if e.get("type") != "tool.execution_start":
            continue
        for part in re.split(r"&&|\|\||;|\n", _command(e.get("data", {}).get("arguments")) or ""):
            if TRACE_DETAIL.search(part + " "):
                if JSON_FORMAT.search(part):
                    json_reads += 1
                else:
                    table_reads += 1
    return {"trace_detail_json": json_reads, "trace_detail_table": table_reads}


# PLAN T2.4: on slow-redis, seconds_to_root_cause_seen fires on any `ps` listing that names the exporter, so the
# time measure is the first redis-cli call that got an answer from the server, from the first trajectory event.
# A reply is a result with output and none of the connection errors a bare redis-cli gets from the TLS port.
REDIS_ERROR = re.compile(r"I/O error|Connection reset|Could not connect|NOAUTH|WRONGPASS|wrong version number"
                         r"|Error: Server closed|Connection refused|Protocol error", re.I)


def redis_reply(events, started):
    starts = {}
    first_failed = None
    for e in events:
        data = e.get("data", {})
        if e.get("type") == "tool.execution_start":
            starts[data.get("toolCallId")] = _command(data.get("arguments")) or ""
            continue
        if e.get("type") != "tool.execution_complete" or "redis-cli" not in starts.get(data.get("toolCallId"), ""):
            continue
        result = data.get("result", "")
        text = atif_text(result.get("content")) if isinstance(result, dict) else str(result)
        failed = bool(REDIS_ERROR.search(text)) or not re.sub(r"<shellId:[^>]*>|\s", "", text)
        if first_failed is None:
            first_failed = failed
        if not failed:
            return {"seconds_to_redis_reply": round((parse_time(e["timestamp"]) - started).total_seconds(), 1),
                    "redis_cli_first_failed": first_failed}
    return {"seconds_to_redis_reply": None, "redis_cli_first_failed": first_failed}


# Cold start (PLAN T2.11): when did the agent have evidence that both the player page and the admin
# application are serving? Per resource, the first tool result that shows it: an `aspire wait` that
# reports it healthy/up, a `describe` (table, JSON, or a spilled copy read back) showing it Running and
# Healthy, or an HTTP 200 from a URL whose port a describe listed for it. Time runs from the first model
# call to the completion of the call that supplied the second resource's evidence.
VERIFY_RESOURCES = {"cold-start": ("bingoboard", "boardadmin"), "cold-start-warm": ("bingoboard", "boardadmin")}
WAIT_OK = re.compile(r"Resource '([\w-]+)' is (?:healthy|up)\b", re.I)
WAIT_CMD = re.compile(r"\baspire\s+wait\s+(?:--?\S+\s+(?:\S+\s+)?)*([A-Za-z][\w-]*)")
DESCRIBE_CMD = re.compile(r"\baspire\s+describe\b")
# Status codes as curl/wget report them (`-w '%{http_code}'`, `-i`, `HTTP/1.1 200`); 2xx and 3xx mean serving
# (the admin answers 302, its login redirect).
HTTP_STATUS = re.compile(r"(?:HTTP/[\d.]+\s+|http_code\W{0,3}|:\s?|HTTP\s)([1-5]\d\d)\b")
URL = re.compile(r"https?://(?:localhost|127\.0\.0\.1):(\d+)")
# The raw application's fixed ports (image ENV FRONTEND_PORT, ADMIN_PORT).
RAW_PORTS = {"bingoboard": {"15173"}, "boardadmin": {"18080"}}
RAW_START_OK = {"bingoboard": r"OK: Player frontend", "boardadmin": r"OK: Admin portal"}
# "port 15173: HTTP 200", from a loop over ports whose URL holds a shell variable.
PORT_STATUS = re.compile(r"\b(\d{4,5})\b\D{0,24}?\b([1-5]\d\d)\b")
TABLE_ROW = re.compile(r"│\s*([A-Za-z][\w-]*)[^│\n]*│[^│\n]*│\s*(?:Running|Starting|Finished|Exited|Waiting|NotStarted|Unknown|FailedToStart)")


def _command(arguments):
    """A shell tool's command; some tools pass their arguments as a plain string."""
    return arguments.get("command") or "" if isinstance(arguments, dict) else ""


def describe_evidence(text, name):
    """(running and healthy, ports) for one resource in a describe table or JSON."""
    healthy, ports = False, set()
    for line in text.splitlines():
        if re.search(rf"(?<![\w-]){re.escape(name)}(?![\w-])", line):
            if re.search(r"\bRunning\b", line) and re.search(r"\bHealthy\b", line):
                healthy = True
            ports.update(re.findall(r"localhost:(\d+)", line))
    # describe JSON is camelCase (displayName); the MCP list_resources tool writes snake_case (display_name).
    for match in re.finditer(rf'"(?:displayName|display_name|name)"\s*:\s*"{re.escape(name)}"', text):
        window = text[match.start():match.start() + 4000]
        nxt = re.search(r'"(?:displayName|display_name)"\s*:\s*"(?!' + re.escape(name) + r'")', window[20:])
        window = window[:20 + nxt.start()] if nxt else window
        if re.search(r'"state"\s*:\s*"Running"', window) and re.search(r'"Healthy"', window):
            healthy = True
        ports.update(re.findall(r"localhost:(\d+)", window))
    # MCP wait_for_resources ("# WAIT RESULT"): one object per resource, named by its unique name
    # (display name plus a suffix), with "outcome": "success" once it reached the target state.
    if "WAIT RESULT" in text:
        for obj in re.finditer(r"\{[^{}]*\}", text):
            body = obj.group(0)
            if (re.search(rf'"name"\s*:\s*"{re.escape(name)}(?:-[a-z0-9]{{8}})?"', body)
                    and re.search(r'"outcome"\s*:\s*"success"', body)):
                healthy = True
    return healthy, ports


def verified_up(events, scenario, kind="aspire"):
    names = VERIFY_RESOURCES.get(scenario)
    if not names:
        return {}
    start = next((parse_time(e["timestamp"]) for e in events if e.get("type") == "model.call_start" and e.get("timestamp")), None)
    starts = {}
    order = []
    for e in events:
        if e.get("type") == "tool.execution_start":
            data = e.get("data", {})
            command = _command(data.get("arguments")) or ""
            starts[data.get("toolCallId")] = command
            order.append((data.get("toolCallId"), command))
    evidence, listed = {}, set()
    ports = {n: set(RAW_PORTS.get(n, ())) if kind == "raw" else set() for n in names}
    waits = [WAIT_CMD.search(c).group(1) for _, c in order if WAIT_CMD.search(c)]
    first_wait = next((i for i, (_, c) in enumerate(order) if WAIT_CMD.search(c)), None)
    first_describe = next((i for i, (_, c) in enumerate(order) if DESCRIBE_CMD.search(c)), None)
    wait_named_listed = []
    out = {"waits": len(waits),
           "describe_before_wait": None if first_wait is None else (first_describe is not None and first_describe < first_wait)}
    calls_done = 0
    seen_ids = []
    for e in events:
        if e.get("type") == "tool.execution_start":
            seen_ids.append(e.get("data", {}).get("toolCallId"))
            command = _command(e.get("data", {}).get("arguments")) or ""
            match = WAIT_CMD.search(command)
            if match:
                wait_named_listed.append(match.group(1) in listed)
        if e.get("type") != "tool.execution_complete":
            continue
        data = e.get("data", {})
        result = data.get("result", "")
        text = atif_text(result.get("content")) if isinstance(result, dict) else str(result)
        command = starts.get(data.get("toolCallId"), "")
        for match in TABLE_ROW.finditer(text):
            listed.add(match.group(1))
        for match in re.finditer(r'"(?:displayName|display_name)"\s*:\s*"([\w-]+)"', text):
            listed.add(match.group(1))
        for name in names:
            if name in evidence:
                continue
            ok = any(m.group(1) == name for m in WAIT_OK.finditer(text))
            # The raw start script checks both origins itself before it returns.
            if kind == "raw" and re.search(RAW_START_OK[name], text):
                ok = True
            healthy, found_ports = describe_evidence(text, name)
            ports[name].update(found_ports)
            if healthy:
                ok = True
            if not ok and re.search(r"\b(?:curl|wget)\b", command):
                # Pair each URL in the command with the status codes in the output, in order.
                expanded = re.sub(r"\$\{?FRONTEND_PORT\}?", "15173", re.sub(r"\$\{?ADMIN_PORT\}?", "18080", command))
                urls, codes = URL.findall(expanded), HTTP_STATUS.findall(text)
                # `curl --fail` chained with && and no status printed: exit code 0 means every URL answered < 400.
                if not codes and re.search(r"exit code 0\b", text) and re.search(r"(?:--fail\b|\s-[a-zA-Z]*f[a-zA-Z]*\b)", expanded):
                    codes = ["200"] * len(urls)
                ok = any(port in ports[name] and code[0] in "23"
                         for port, code in list(zip(urls, codes)) + PORT_STATUS.findall(text))
            if ok:
                evidence[name] = e
        if len(evidence) == len(names):
            done = parse_time(e["timestamp"])
            index = seen_ids.index(data.get("toolCallId")) + 1 if data.get("toolCallId") in seen_ids else len(seen_ids)
            out["seconds_to_verified_up"] = round((done - start).total_seconds(), 1) if start else None
            out["commands_to_verified_up"] = index
            break
    out["wait_named_listed"] = None if not wait_named_listed else all(wait_named_listed)
    return out


# ATIF (Harbor's Agent Trajectory Interchange Format) is what the VS Code agent writes
# (vsc-output/trajectories/trajectory.json, copied to <output>/trajectories/). It has one timestamp
# per step, not per tool: the moment the step's model call returned, which is when its tools start.
# A step's model call began `metrics.extra.model_call_duration_ms` earlier when the harness reports
# it, and a tool's result is back when the next step's model call begins.
SKILL_FILE = re.compile(r"(?:^|/)\.github/skills/([^/]+)/SKILL\.md$")
VSCODE_MCP_TOOL = re.compile(r"^mcp_aspire_(.+)$")


def atif_steps(trajectory):
    """Main-session steps followed by every subagent's, each tagged with its trajectory."""
    steps = list(trajectory.get("steps") or [])
    for sub in trajectory.get("subagent_trajectories") or []:
        steps += atif_steps(sub)
    return steps


def atif_text(content):
    if isinstance(content, list):
        return "".join(part.get("text", "") if isinstance(part, dict) else str(part) for part in content)
    return "" if content is None else str(content)


def canonical_tool(name):
    """Tool names as the Copilot CLI rows spell them, so tool_counts and mcp_calls compare."""
    match = VSCODE_MCP_TOOL.match(name or "")
    return f"aspire-{match.group(1)}" if match else name


def skill_of(call):
    """A skill load: Copilot's `skill` tool, or VS Code reading a SKILL.md under .github/skills."""
    if call["name"] == "skill":
        return call["arguments"].get("skill")
    for value in call["arguments"].values():
        match = SKILL_FILE.search(str(value)) if isinstance(value, str) else None
        if match:
            return match.group(1)
    return None


def analyze_atif(trial_dir, entry, row):
    path = next((p for p in sorted(trial_dir.rglob("trajectories/trajectory.json"))
                 if "harbor_logs" not in p.parts), None) or next(iter(trial_dir.rglob("trajectory.json")), None)
    if path is None:
        row["trajectory"] = None
        return row
    row["trajectory_sha256"] = sha256(path)
    trajectory = json.loads(path.read_text())
    steps = atif_steps(trajectory)
    stamps = [parse_time(s["timestamp"]) if s.get("timestamp") else None for s in steps]
    def began(index):
        duration = (((steps[index].get("metrics") or {}).get("extra") or {}).get("model_call_duration_ms") or 0)
        return stamps[index] - datetime.timedelta(milliseconds=duration) if stamps[index] else None
    # Model-service failures are not in ATIF; the fields stay None rather than claiming zero.
    row["model_service_5xx"] = None
    row["model_service_wait_seconds"] = None
    agent_steps = [s for s in steps if s.get("source") == "agent"]
    row["models_called"] = sorted({s["model_name"] for s in agent_steps if s.get("model_name")})
    row["model_calls"] = sum(s.get("llm_call_count") or 1 for s in agent_steps)
    calls = []
    for index, step in enumerate(steps):
        results = {r.get("source_call_id"): r for r in ((step.get("observation") or {}).get("results") or [])}
        done = next((began(j) for j in range(index + 1, len(steps)) if stamps[j]), stamps[index])
        for call in step.get("tool_calls") or []:
            arguments = call.get("arguments")
            arguments = arguments if isinstance(arguments, dict) else {"raw": arguments}
            result = results.get(call.get("tool_call_id"))
            calls.append({"name": canonical_tool(call.get("function_name")), "arguments": arguments,
                          "result": atif_text(result.get("content")) if result else "",
                          "started": stamps[index], "finished": done, "step": index})
    counts = collections.Counter(c["name"] for c in calls)
    row["tool_calls"] = len(calls)
    row["tool_counts"] = dict(counts)
    row["mcp_calls"] = {name: n for name, n in counts.items() if name and name.startswith("aspire-")}
    row["skills_loaded"] = [skill for skill in map(skill_of, calls) if skill]
    aspire, protected, harness_paths = collections.Counter(), 0, set()
    for call in calls:
        text = json.dumps(call["arguments"])
        matches = PROTECTED.findall(text)
        protected += bool(matches)
        harness_paths.update(m.rstrip("/") for m in matches)
        if "command" in call["arguments"]:  # a terminal tool: bash, run_in_terminal, ...
            aspire.update(re.sub(r"\s+", " ", m) for m in ASPIRE_COMMAND.findall(text))
    row["aspire_cli"] = dict(aspire)
    row["protected_path_access"] = protected
    row["harness_paths_read"] = sorted(harness_paths)
    started = next((began(i) for i in range(len(steps)) if stamps[i]), None)
    if started and len([t for t in stamps if t]) > 1:
        row["agent_loop_seconds"] = round((max(t for t in stamps if t) - started).total_seconds(), 1)
    seen_pattern, fix_pattern = PHASES.get(entry["scenario"], (None, None))
    if started and seen_pattern:
        seen = next((i for i, c in enumerate(calls) if seen_pattern.search(json.dumps(c["result"]))), None)
        if seen is not None:
            row["seconds_to_root_cause_seen"] = round((calls[seen]["finished"] - started).total_seconds(), 1)
            # Every call of the seen call's step started before any of its results came back, the
            # way the events reader counts starts before the completion that showed the cause.
            row["tool_calls_to_root_cause_seen"] = sum(c["step"] <= calls[seen]["step"] for c in calls)
        fix = next((c for c in calls if fix_pattern.search(json.dumps(c["arguments"]))), None)
        if fix is not None:
            row["seconds_to_first_fix"] = round((fix["started"] - started).total_seconds(), 1)
    row["tool_result_chars"] = row["tool_result_content_chars"] = sum(len(json.dumps(c["result"])) for c in calls)
    # Harbor's agent_result carries tokens and cost only when the harness reports them; ATIF's
    # final metrics are the fallback.
    final = trajectory.get("final_metrics") or {}
    for key, atif_key in (("input_tokens", "total_prompt_tokens"), ("cached_input_tokens", "total_cached_tokens"),
                          ("output_tokens", "total_completion_tokens"), ("cost_usd", "total_cost_usd")):
        if row.get(key) is None and final.get(atif_key) is not None:
            row[key] = final[atif_key]
            row.setdefault("usage_source", "atif")
    return row


# VS Code agent mode. The run's ATIF trajectory and Harbor's agent_result, which is read from it,
# hold only the last session the agent ran; when a subagent ran last, that is the subagent, not
# the main agent (T0.4). The Copilot Chat extension's OpenTelemetry span store holds every session,
# model call and tool call; subagent sessions link to the main one, and their model calls and tools
# count as the agent's.
VSCODE_MCP_SERVER = re.compile(r"^aspire")
NANO_AIU_PER_USD = 1e11  # Copilot CLI's ATIF reports cost_usd = total_nano_aiu / 1e11


def tsx_text(value):
    """Tool results are plain text, or a serialized prompt-tsx tree whose text leaves are what the
    model is shown."""
    try:
        tree = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return value or ""
    if not isinstance(tree, dict) or "node" not in tree:
        return value
    parts = []
    def walk(node):
        if isinstance(node, dict):
            if node.get("type") == 2 and isinstance(node.get("text"), str):
                parts.append(node["text"])
            for child in node.get("children") or []:
                walk(child)
    walk(tree["node"])
    return "".join(parts)


def sqlite_ok(path):
    with tempfile.TemporaryDirectory() as tmp:
        shutil.copy(path, Path(tmp) / path.name)
        try:
            connection = sqlite3.connect(Path(tmp) / path.name)
            ok = connection.execute("pragma integrity_check").fetchone()[0] == "ok"
            connection.close()
            return ok
        except sqlite3.DatabaseError:
            return False


def load_spans(trial_dir):
    # Prefer the run's output copy, written after VS Code exits; a copy taken while the store is
    # still open can fail integrity_check.
    candidates = [parent / "vsc-output/agent-traces.db" for parent in trial_dir.parents]
    candidates = [c for c in candidates if c.exists()] + sorted(trial_dir.rglob("vsc-output/agent-traces.db"))
    db = next((c for c in candidates if sqlite_ok(c)), None)
    if db is None:
        return None, None
    # The store is in WAL mode; open a copy of the database and its -wal so nothing is lost or written.
    with tempfile.TemporaryDirectory() as tmp:
        for suffix in ("", "-wal"):  # never the -shm: a stale index makes SQLite misread the WAL
            source = db.with_name(db.name + suffix)
            if source.exists():
                shutil.copy(source, Path(tmp) / (db.name + suffix))
        connection = sqlite3.connect(Path(tmp) / db.name)
        connection.row_factory = sqlite3.Row
        spans = [dict(r) for r in connection.execute("select * from spans order by start_time_ms, end_time_ms")]
        attributes = collections.defaultdict(dict)
        for span_id, key, value in connection.execute("select span_id, key, value from span_attributes"):
            attributes[span_id][key] = value
        connection.close()
    for span in spans:
        span["attributes"] = attributes.get(span["span_id"], {})
    digest = hashlib.sha256(b"".join(db.with_name(db.name + s).read_bytes()
                                     for s in ("", "-wal") if db.with_name(db.name + s).exists())).hexdigest()
    return spans, digest


def websocket_logs(trial_dir):
    """The Copilot Chat extension log of the run (its <output>/vsc-output copy, else the trial's)."""
    for parent in trial_dir.parents:
        found = sorted(parent.glob("vsc-output/productLogs/window*/exthost/GitHub.copilot-chat/*.log"))
        if found:
            return found
    return sorted(trial_dir.rglob("GitHub.copilot-chat/*.log"))


def analyze_vscode(trial_dir, entry, row):
    spans, digest = load_spans(trial_dir)
    if not spans:
        row["trajectory"] = None
        return row
    row["trajectory_sha256"] = digest
    at = lambda ms: datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc)
    sessions = [s for s in spans if s["operation_name"] == "invoke_agent"]
    main = next((s for s in sessions if not s["attributes"].get("copilot_chat.parent_chat_session_id")), None)
    main = main or max(sessions, key=lambda s: s["end_time_ms"] - s["start_time_ms"], default=None)
    chats = [s for s in spans if s["operation_name"] == "chat"]
    tools = [s for s in spans if s["operation_name"] == "execute_tool"]
    row["agent_version"] = {"vscode-agent": (entry.get("agent_package") or "").split("=")[-1] or None}
    log = next(iter(trial_dir.rglob("vsc-output/agent-output.log")), None)
    match = re.search(r"VS Code version: (\S+)", log.read_text(errors="replace")) if log else None
    if match:
        row["agent_version"]["vscode"] = match.group(1)
    # Model calls that failed with a server error. The span store records the failed call; the
    # retry backoff before the next call is counted the way the Copilot reader counts it.
    failures = [s for s in chats if s["status_code"] == 2 and re.search(r"\b5\d\d\b", s["status_message"] or "")]
    wait = 0.0
    for failure in failures:
        following = next((c for c in chats if c["start_time_ms"] >= failure["end_time_ms"]), None)
        wait += ((following["start_time_ms"] if following else failure["end_time_ms"]) - failure["start_time_ms"]) / 1000
    row["model_service_5xx"] = len(failures)
    row["model_service_wait_seconds"] = round(wait, 1)
    if failures and row["exception"]:
        row["infrastructure_failure"] = True
    # Copilot Chat first tries each request over a WebSocket; in T0.4 the attempt failed after about
    # 60 s and the request was retried over HTTP (three times per trial, then the extension stopped
    # trying). The agent is idle meanwhile: the wait runs
    # from the last span that ended before the error to the error itself.
    ends = sorted(s["end_time_ms"] for s in spans)
    errors = []
    transport_wait = 0.0
    for log_path in websocket_logs(trial_dir):
        for line in log_path.read_text(errors="replace").splitlines():
            match = re.match(r"(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+) \[error\] \[ChatWebSocketManager\] Connection error", line)
            if match:
                errors.append(datetime.datetime.fromisoformat(match.group(1)).replace(tzinfo=datetime.timezone.utc))
    for error in errors:
        ms = error.timestamp() * 1000
        before = [e for e in ends if e <= ms]
        if before:
            transport_wait += (ms - before[-1]) / 1000
    row["transport_fallbacks"] = len(errors)
    row["transport_wait_seconds"] = round(transport_wait, 1)
    row["models_called"] = sorted({s["response_model"] or s["request_model"] for s in chats
                                   if s["response_model"] or s["request_model"]})
    row["model_calls"] = len(chats)
    row["subagent_sessions"] = sum(1 for s in sessions if s is not main)
    # Tokens and cost: Harbor's agent_result for this harness covers one subagent session only, so
    # the span totals replace it.
    row["input_tokens"] = sum(s["input_tokens"] or 0 for s in chats)
    row["cached_input_tokens"] = sum(s["cached_tokens"] or 0 for s in chats)
    row["output_tokens"] = sum(s["output_tokens"] or 0 for s in chats)
    nano = [float(s["attributes"].get("copilot_chat.copilot_usage_nano_aiu") or 0) for s in chats]
    row["cost_usd"] = round(sum(nano) / NANO_AIU_PER_USD, 6) if any(nano) else None
    row["usage_source"] = "agent-traces.db"
    calls = []
    for span in tools:
        a = span["attributes"]
        name = a.get("gen_ai.tool.name") or span["tool_name"]
        if a.get("github.copilot.tool.parameters.mcp_server_name") and VSCODE_MCP_SERVER.match(
                a["github.copilot.tool.parameters.mcp_server_name"]):
            name = "aspire-" + a.get("github.copilot.tool.parameters.mcp_tool_name", name)
        try:
            arguments = json.loads(a.get("gen_ai.tool.call.arguments") or "{}")
        except json.JSONDecodeError:
            arguments = {"raw": a.get("gen_ai.tool.call.arguments")}
        calls.append({"name": name, "arguments": arguments if isinstance(arguments, dict) else {"raw": arguments},
                      "result": tsx_text(a.get("gen_ai.tool.call.result")),
                      "started": at(span["start_time_ms"]), "finished": at(span["end_time_ms"])})
    counts = collections.Counter(c["name"] for c in calls)
    row["tool_calls"] = len(calls)
    row["tool_counts"] = dict(counts)
    row["mcp_calls"] = {name: n for name, n in counts.items() if name and name.startswith("aspire-")}
    row["skills_loaded"] = [skill for skill in map(skill_of, calls) if skill]
    aspire, protected, harness_paths = collections.Counter(), 0, set()
    for call in calls:
        text = json.dumps(call["arguments"])
        matches = PROTECTED.findall(text)
        protected += bool(matches)
        harness_paths.update(m.rstrip("/") for m in matches)
        if "command" in call["arguments"]:  # run_in_terminal, also inside the execution subagent
            aspire.update(re.sub(r"\s+", " ", m) for m in ASPIRE_COMMAND.findall(text))
    row["aspire_cli"] = dict(aspire)
    row["protected_path_access"] = protected
    row["harness_paths_read"] = sorted(harness_paths)
    started = at(main["start_time_ms"]) if main else at(spans[0]["start_time_ms"])
    if main:
        row["agent_loop_seconds"] = round((main["end_time_ms"] - main["start_time_ms"]) / 1000, 1)
    seen_pattern, fix_pattern = PHASES.get(entry["scenario"], (None, None))
    if seen_pattern:
        seen = min((c for c in calls if seen_pattern.search(json.dumps(c["result"]))),
                   key=lambda c: c["finished"], default=None)
        if seen is not None:
            row["seconds_to_root_cause_seen"] = round((seen["finished"] - started).total_seconds(), 1)
            row["tool_calls_to_root_cause_seen"] = sum(c["started"] < seen["finished"] for c in calls)
        fix = next((c for c in calls if fix_pattern.search(json.dumps(c["arguments"]))), None)
        if fix is not None:
            row["seconds_to_first_fix"] = round((fix["started"] - started).total_seconds(), 1)
    # Result text as the model sees it (the prompt-tsx wrapping removed); there is no separate
    # user-facing copy as in Copilot CLI's detailedContent, so both measures are the same.
    row["tool_result_chars"] = row["tool_result_content_chars"] = sum(len(json.dumps(c["result"])) for c in calls)
    return row


def median(values):
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else None


def summarize(rows):
    lines = ["# Telemetry suite results", "",
             "Generated by `tools/collect.py` from native MSBench/Harbor artifacts. Medians are over all",
             "trials in a cell, including failures; a failed trial keeps its real time and tokens.",
             "Each pin (toolchain) has its own section; rows of different pins are never pooled.", ""]
    for pin, pinned in by_pin(rows):
        lines += [f"# Pin {pin}: {pin_label(rows, pin)}", ""] + summarize_pin(pinned)
    return "\n".join(lines)


def summarize_pin(rows):
    cells = collections.defaultdict(list)
    for row in rows:
        if row["model_requested"] != "oracle" and not row.get("infrastructure_failure"):
            cells[(row["scenario"], row["model_requested"], row["agent"], row["cell_arm"])].append(row)
    lines = []
    for scenario, model, agent in sorted({(s, m, g) for s, m, g, _ in cells}, key=lambda k: (k[2] != DEFAULT_AGENT, k)):
        lines += [cell_title(scenario, model, agent), "",
                  "| Arm | Pass | Agent s | To root cause s | To first fix s | Input tok | Output tok | Cost USD | Tools | Skills loaded | MCP calls | Tool output chars |",
                  "|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|"]
        for (s, m, g, arm), trials in sorted(cells.items()):
            if (s, m, g) != (scenario, model, agent):
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
    return lines


def functional_pass(trial):
    """True when the application worked again, whether or not the cause itself was removed."""
    if trial.get("reward") == 1:
        return True
    details = trial.get("verifier_details") or {}
    checks = details.get("checks")
    if checks is not None:
        return bool(checks.get("functional"))
    # Round 1 verifier stopped at the first failed assertion: a failure that is only the
    # root-cause assertion means the fresh write had already succeeded.
    return (details.get("failure") or "").startswith("The read-only default")


ARM_ORDER = ["raw", "aspire-cli", "aspire-skills", "aspire-mcp", "aspire-skills-mcp", "aspire-plus",
             "aspire-lean", "aspire-lean-mcp", "aspire-mcp-src", "aspire-mcp-compact", "aspire-lean-mcp-src",
             "aspire-lean-mcp-compact", "aspire-lean-src", "aspire-lean-plain", "aspire-lean-mcp-all",
             # Listed so their order is fixed (it used to follow set iteration order).
             "raw-check", "aspire-lean-start", "aspire-skills-plugin", "aspire-skills-mon", "aspire-skills-norouter",
             "aspire-lean-agents", "aspire-cli-agents", "aspire-skills-agents", "aspire-lean-agents-v2",
             "aspire-lean-noorch-agents",
             # T2.5: traced app variant and the instrumented raw app.
             "raw-otel", "aspire-cli-traced", "aspire-lean-traced", "aspire-lean-mcp-all-traced",
             # Phase 2 CLI lane (T2.2, T2.9, T2.3, T2.4): source builds, patched next to their -src control.
             "aspire-cli-src", "aspire-cli-wait", "aspire-lean-start-wait",
             "aspire-lean-noorch-agents-src", "aspire-lean-noorch-agents-v3", "aspire-lean-tracetable",
             "aspire-cli-redishint", "aspire-skills-src", "aspire-skills-redishint",
             "aspire-mcp-compact2", "aspire-lean-mcp-compact2", "aspire-mcp-tools8", "aspire-lean-mcp-tools8"]


def arm_order(cell_arm):
    arm = cell_arm.split(" (")[0]
    return (ARM_ORDER.index(arm) if arm in ARM_ORDER else 99, cell_arm)


def label_skill_variants(rows):
    """`cell_arm` is the arm, plus the first task commit that carried its skill content when one
    pin, scenario, model, harness and arm holds trials with different skill content (a skill
    revised within a pin). Tables, stats and series key cells on it, so revisions are not pooled."""
    first = {}
    for row in rows:  # ledger order: the first task commit seen with each content
        if row.get("skills_content") and row.get("task_repo_commit"):
            first.setdefault(row["skills_content"], row["task_repo_commit"][:8])
    contents = collections.defaultdict(set)
    for row in rows:
        contents[(row["pin"], row["scenario"], row["model_requested"], row["agent"], row["arm"])].add(row.get("skills_content"))
    for row in rows:
        split = len(contents[(row["pin"], row["scenario"], row["model_requested"], row["agent"], row["arm"])]) > 1
        row["cell_arm"] = f"{row['arm']} (tasks {first.get(row.get('skills_content'), 'none')})" if split else row["arm"]


def compare(rows):
    """Per pin, scenario and model: every arm pooled over the pin's rounds, with deltas against raw."""
    lines = ["# Raw app versus aspirified app", "",
             "All trials of every round of one pin are pooled per cell; pins are never pooled. `Pass` requires the root cause to be removed;",
             "`App works` only requires the application to work again. Medians include failed trials.",
             "Percentages compare the arm's median with the `raw` median of the same pin, scenario and model.",
             "`Infra` counts trials that ended in a runner, setup or model-service exception before any grade;",
             "they are listed in trials.jsonl and excluded from every other column.", ""]
    for pin, pinned in by_pin(rows):
        lines += [f"# Pin {pin}: {pin_label(rows, pin)}", ""] + compare_pin(pinned)
    return "\n".join(lines)


def compare_pin(rows):
    cells = collections.defaultdict(list)
    infra = collections.Counter()
    for row in rows:
        if row["model_requested"] == "oracle":
            continue
        key = (row["scenario"], row["model_requested"], row["agent"], row["cell_arm"])
        if row.get("infrastructure_failure"):
            infra[key] += 1
        elif row.get("agent_seconds") is not None:
            cells[key].append(row)
    lines = []
    pct = lambda value, base: "" if not base or value is None else f" ({(value - base) / base:+.0%})"
    for scenario, model, agent in sorted({(s, m, g) for s, m, g, _ in cells}, key=lambda k: (k[2] != DEFAULT_AGENT, k)):
        base = cells.get((scenario, model, agent, "raw"), [])
        base_s, base_t, base_c = (median([t.get(k) for t in base]) for k in ("agent_seconds", "input_tokens", "cost_usd"))
        lines += [cell_title(scenario, model, agent), "",
                  "| Arm | n | Pass | App works | Agent s | Input tokens | Cost USD | Tool calls | To root cause s | Infra |",
                  "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
        arms = sorted({a for s, m, g, a in cells if (s, m, g) == (scenario, model, agent)},
                      key=arm_order)
        for arm in arms:
            trials = cells[(scenario, model, agent, arm)]
            seconds, tokens, cost = (median([t.get(k) for t in trials]) for k in ("agent_seconds", "input_tokens", "cost_usd"))
            lines.append("| {} | {} | {}/{} | {}/{} | {:.0f}{} | {:,.0f}{} | {:.3f}{} | {:.0f} | {} | {} |".format(
                arm, len(trials), sum(t.get("reward") == 1 for t in trials), len(trials),
                sum(functional_pass(t) for t in trials), len(trials),
                seconds, pct(seconds, base_s), tokens or 0, pct(tokens, base_t), cost or 0, pct(cost, base_c),
                median([t.get("tool_calls") for t in trials]) or 0,
                "-" if median([t.get("seconds_to_root_cause_seen") for t in trials]) is None
                else format(median([t.get("seconds_to_root_cause_seen") for t in trials]), ".0f"),
                infra.get((scenario, model, agent, arm), 0) or "-"))
        lines.append("")
    return lines


def main():
    ledger = [json.loads(line) for line in (SUITE / "results/ledger.jsonl").read_text().splitlines() if line.strip()]
    rows = []
    for entry in ledger:
        if entry.get("cancelled"):
            continue
        root = DATA / "extracted" / entry["run_id"] if "--no-fetch" in sys.argv else fetch(entry["run_id"])
        trials = [p for p in root.rglob("result.json") if "trial_name" in p.read_text()[:4000]]
        if not trials:
            print(f"pending/no result: {entry['run_id']} {entry['scenario']} {entry['arm']} {entry['model']}", file=sys.stderr)
            continue
        rows += [analyze_trial(path, entry) for path in trials]
    label_skill_variants(rows)
    (SUITE / "results/trials.jsonl").write_text("".join(json.dumps(r, sort_keys=True) + "\n" for r in rows))
    (SUITE / "results/summary.md").write_text(summarize(rows) + "\n")
    (SUITE / "results/comparison.md").write_text(compare(rows) + "\n")
    print(f"{len(rows)} trials from {len(ledger)} ledger entries")


if __name__ == "__main__":
    main()
