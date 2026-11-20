#!/usr/bin/env python3
"""Infrastructure losses of a tracking round, as the T4.5 first-full-run rule defines them (PLAN, written before
any trial). Reads only infrastructure fields of results/trials.jsonl (exception, infrastructure_failure,
model_service_5xx) and, for agent time-limit hits, how long the last model call was open when the limit ended
the trial (a hung call over 300 s is a model-service stall). Never prints a reward or a time of the agent's work.

    python3 evidence/trk20261119/infra_check.py <round> [<round> ...]
"""
import json
import sys
from pathlib import Path

SUITE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(SUITE / "tools"))
import collect  # noqa: E402

rounds = set(sys.argv[1:])
rows = [json.loads(l) for l in (SUITE / "results/trials.jsonl").read_text().splitlines() if l.strip()]
rows = [r for r in rows if r["round"] in rounds]
ledger = [json.loads(l) for l in (SUITE / "results/ledger.jsonl").read_text().splitlines() if l.strip()]
submitted = {e["run_id"] for e in ledger if e["round"] in rounds and not e.get("cancelled")}
print(f"rounds {sorted(rounds)}: {len(submitted)} submitted, {len(rows)} trials read")
missing = submitted - {r["run_id"] for r in rows}
for run_id in sorted(missing):
    print(f"NO RESULT {run_id}")


def open_call_seconds(run_id):
    """Seconds from the last model.call_start with nothing after it in the model stream to the trajectory's last event."""
    root = collect.DATA / "extracted" / run_id
    for result in root.rglob("result.json"):
        if "trial_name" not in result.read_text()[:4000]:
            continue
        path, _ = collect.copilot_trajectory(result.parent)
        if not path:
            return None
        events = collect.load_events(path)
        stamps = [e for e in events if e.get("timestamp")]
        starts = [i for i, e in enumerate(events) if e.get("type") == "model.call_start"]
        if not starts or not stamps:
            return None
        last = starts[-1]
        after = [e for e in events[last + 1:] if str(e.get("type", "")).startswith(("model.", "assistant.", "tool."))]
        if after:
            return 0.0
        return (collect.parse_time(stamps[-1]["timestamp"]) - collect.parse_time(events[last]["timestamp"])).total_seconds()
    return None


losses = []
for r in sorted(rows, key=lambda r: (r["scenario"], r["model_requested"], r["arm"], r["run_id"])):
    cell = f"{r['scenario']}/{r['model_requested']}/{r['arm']}"
    if r.get("infrastructure_failure"):
        losses.append((r, f"infrastructure_failure ({r.get('exception')}, 5xx {r.get('model_service_5xx')})"))
    elif r.get("exception") == "AgentTimeoutError":
        hung = open_call_seconds(r["run_id"])
        verdict = "stall (hung call > 300 s)" if hung and hung > 300 else "limit hit of the agent (not re-run)"
        print(f"limit hit {r['run_id']} {cell}: last model call open {hung} s -> {verdict}")
        if hung and hung > 300:
            losses.append((r, f"model-service stall, last call open {hung:.0f} s"))
    elif r.get("exception"):
        print(f"OTHER exception {r['run_id']} {cell}: {r['exception']} (to the coordinating session)")
    if r.get("model_service_5xx"):
        print(f"5xx {r['run_id']} {cell}: {r['model_service_5xx']} failed calls, wait {r.get('model_service_wait_seconds')} s")
print(f"infrastructure losses to re-run once: {len(losses)}")
for r, why in losses:
    print(f"  {r['run_id']} {r['scenario']} {r['arm']} {r['model_requested']}: {why}")
