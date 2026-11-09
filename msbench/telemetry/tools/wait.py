#!/usr/bin/env python3
"""Blocks until the given MSBench runs finish executing, then prints one line per run.

    tools/wait.py <run-id> [...]         specific runs
    tools/wait.py --round r1             every ledger entry of a round
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

SUITE = Path(__file__).resolve().parent.parent
VENV = Path.home() / "Library/Application Support/pipx/venvs/msbench-cli/bin"
ENV = dict(os.environ, PATH=f"{VENV}:{os.environ['PATH']}")


def status(run_id):
    out = subprocess.run(["msbench-cli", "status", "--run_id", run_id, "--backend", "ces-staging",
                          "--format", "json"], env=ENV, capture_output=True, text=True, timeout=300).stdout
    start = out.find("{")
    # The CLI may print more than one JSON document; the first is this run's status.
    return json.JSONDecoder().raw_decode(out[start:])[0] if start >= 0 else {}


def main():
    args = [arg for arg in sys.argv[1:] if arg != "--quiet"]
    if args[:1] == ["--round"]:
        ledger = [json.loads(line) for line in (SUITE / "results/ledger.jsonl").read_text().splitlines() if line.strip()]
        runs = [entry["run_id"] for entry in ledger if entry["round"] == args[1] and not entry.get("cancelled")]
    else:
        runs = args
    pending, final = set(runs), {}
    deadline = time.time() + float(os.environ.get("WAIT_SECONDS", 3300))
    while pending and time.time() < deadline:
        for run_id in sorted(pending):
            try:
                state = status(run_id)
            except Exception as error:  # transient service errors must not end the wait
                state = {"error": str(error)}
            if state.get("execution_complete"):
                final[run_id] = state
                pending.discard(run_id)
        if pending:
            time.sleep(45)
    if "--quiet" in sys.argv:
        print(f"{len(final)} finished, {len(pending)} still running")
        return
    for run_id in runs:
        state = final.get(run_id)
        print(run_id, "completed=%s failed=%s" % (state.get("completed"), state.get("failed")) if state else "STILL RUNNING")


if __name__ == "__main__":
    main()
