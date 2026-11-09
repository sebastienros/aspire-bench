#!/usr/bin/env python3
"""Prints the tool-call sequence of one run: tools/trajectory.py <run-id> [max-arg-chars]"""
import json
import os
import re
import sys
from pathlib import Path

DATA = Path(os.environ.get("TELEMETRY_DATA_DIR", Path.home() / ".aspire-bench/telemetry-runs"))
root = DATA / "extracted" / sys.argv[1]
width = int(sys.argv[2]) if len(sys.argv) > 2 else 170
path = next(root.rglob("copilot-cli.jsonl"))
events = []
for line in path.read_text(errors="replace").splitlines():
    try:
        events.append(json.loads(line))
    except json.JSONDecodeError:
        try:
            events.append(json.loads(re.sub(r'\\(?!["\\/bfnrtu])', r"\\\\", line)))
        except json.JSONDecodeError:
            pass
sizes = {e["data"].get("toolCallId"): len(json.dumps(e["data"].get("result", "")))
         for e in events if e.get("type") == "tool.execution_complete"}
index = 0
for event in events:
    if event.get("type") != "tool.execution_start":
        continue
    index += 1
    data = event["data"]
    args = data.get("arguments", {})
    args = args if isinstance(args, dict) else {"raw": args}
    text = args.get("command") or args.get("skill") or args.get("path") or args.get("pattern") or json.dumps(args)
    text = re.sub(r"\s+", " ", str(text))[:width]
    print(f"{index:3d} {event.get('timestamp', '')[11:19]} {data.get('toolName', '?'):28s} {sizes.get(data.get('toolCallId'), 0):7d}b  {text}")
