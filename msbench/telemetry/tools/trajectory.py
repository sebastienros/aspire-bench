#!/usr/bin/env python3
"""Prints the tool-call sequence of one run: tools/trajectory.py <run-id> [max-arg-chars]

Copilot CLI runs are read from copilot-cli.jsonl; VS Code runs from the agent-traces.db span
store (see collect.analyze_vscode), with subagent tool calls marked `>`."""
import datetime
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import collect  # noqa: E402

DATA = Path(os.environ.get("TELEMETRY_DATA_DIR", Path.home() / ".aspire-bench/telemetry-runs"))
root = DATA / "extracted" / sys.argv[1]
width = int(sys.argv[2]) if len(sys.argv) > 2 else 170


def summary(args):
    args = args if isinstance(args, dict) else {"raw": args}
    text = args.get("command") or args.get("skill") or args.get("filePath") or args.get("path") or args.get("pattern") \
        or args.get("query") or json.dumps(args)
    return re.sub(r"\s+", " ", str(text))[:width]


path = next(root.rglob("copilot-cli.jsonl"), None)
if path is None:
    trial = next(p.parent for p in root.rglob("result.json") if "trial_name" in p.read_text()[:4000])
    spans, _ = collect.load_spans(trial)
    if not spans:
        sys.exit(f"no copilot-cli.jsonl or agent-traces.db under {root}")
    for index, span in enumerate((s for s in spans if s["operation_name"] == "execute_tool"), 1):
        a = span["attributes"]
        try:
            args = json.loads(a.get("gen_ai.tool.call.arguments") or "{}")
        except json.JSONDecodeError:
            args = a.get("gen_ai.tool.call.arguments")
        size = len(json.dumps(collect.tsx_text(a.get("gen_ai.tool.call.result"))))
        stamp = datetime.datetime.fromtimestamp(span["start_time_ms"] / 1000, datetime.timezone.utc).strftime("%H:%M:%S")
        sub = ">" if a.get("copilot_chat.parent_chat_session_id") else " "
        print(f"{index:3d} {stamp} {sub}{(a.get('gen_ai.tool.name') or '?')[:31]:31s} {size:7d}b  {summary(args)}")
    sys.exit(0)

events = collect.load_events(path)
sizes = {e["data"].get("toolCallId"): len(json.dumps(e["data"].get("result", "")))
         for e in events if e.get("type") == "tool.execution_complete"}
index = 0
for event in events:
    if event.get("type") != "tool.execution_start":
        continue
    index += 1
    data = event["data"]
    print(f"{index:3d} {event.get('timestamp', '')[11:19]} {data.get('toolName', '?'):28s} {sizes.get(data.get('toolCallId'), 0):7d}b  {summary(data.get('arguments', {}))}")
