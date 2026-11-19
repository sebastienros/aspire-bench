#!/usr/bin/env python3
"""Where a round's wall time goes: queue, image build, fault setup, agent (PLAN T4.6 measurement).

    tools/round_time.py [--out <dir>]     reads results/ledger.jsonl and the shared extracted/ cache;
                                          prints a summary, writes <dir>/round-time.{jsonl,md} if --out

Nothing is fetched: a ledger line whose run folder is not already extracted is counted as missing,
so a round still in flight is never touched. Pin 2026-11-17 only. Phases per trial, from Harbor's
own timing file (harbor_logs/harbor_timings.json) and the trial's result.json (seconds):

  queue        workflow.total_to_results start - the ledger's submitted_at (one stamp per submit.sh call)
  pre          workflow.pre_harbor (runner start, task restore)
  build        harbor.environment_setup (image build and container start)
  ready        agent_setup start - environment_setup end (healthcheck wait: the fault's setup in the container)
  agent_setup  harbor.agent_setup
  agent        harbor.agent_execution
  verify       harbor.verifier
  post         the rest of workflow.total_to_results
  elapsed      queue + total_to_results
"""
import collections
import datetime
import json
import os
import statistics
import sys
from pathlib import Path

SUITE = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("TELEMETRY_DATA_DIR", Path.home() / ".aspire-bench/telemetry-runs"))
PHASES = ["queue", "pre", "build", "ready", "agent_setup", "agent", "verify", "post"]
SETUP = ["queue", "pre", "build", "ready", "agent_setup"]


def ts(value):
    return datetime.datetime.fromisoformat(value.replace("Z", "+00:00")) if value else None


def stamp(value):
    return datetime.datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=datetime.timezone.utc)


def trial_rows(entry):
    root = DATA / "extracted" / entry["run_id"]
    if not root.exists():
        return None
    out = []
    for timing in root.rglob("harbor_logs/harbor_timings.json"):
        phases = {p["phase"]: p for p in json.loads(timing.read_text())["phases"]}
        summary = json.loads(timing.read_text()).get("summary", {})
        results = [p for p in timing.parent.glob("jobs/*/*/result.json")]
        if not results or "workflow.total_to_results" not in phases:
            continue
        result = json.loads(results[0].read_text())
        total = phases["workflow.total_to_results"]
        start, end = ts(total["started_at"]), ts(total["finished_at"])
        env, setup = result.get("environment_setup") or {}, result.get("agent_setup") or {}
        execution, verifier = result.get("agent_execution") or {}, result.get("verifier") or {}
        seconds = lambda key: (phases[key]["duration_ms"] / 1000) if key in phases else None
        span = lambda a, b: (ts(b) - ts(a)).total_seconds() if a and b else None
        row = {"run_id": entry["run_id"], "round": entry["round"], "scenario": entry["scenario"], "arm": entry["arm"],
               "model": entry["model"], "kind": "oracle" if entry["model"] == "oracle" else "model",
               "app": "raw" if entry["arm"].startswith("raw") else "aspire",
               "task_repo_commit": entry.get("task_repo_commit"),
               "excluded": bool(entry.get("excluded")),
               "submitted": entry["submitted_at"], "started": total["started_at"], "finished": total["finished_at"],
               "queue": (start - stamp(entry["submitted_at"])).total_seconds(),
               "pre": seconds("workflow.pre_harbor"),
               "build": span(env.get("started_at"), env.get("finished_at")),
               "ready": span(env.get("finished_at"), setup.get("started_at")),
               "agent_setup": span(setup.get("started_at"), setup.get("finished_at")),
               "agent": span(execution.get("started_at"), execution.get("finished_at")),
               "verify": span(verifier.get("started_at"), verifier.get("finished_at")),
               "image_pull_ms": summary.get("harbor_image_pull_ms")}
        known = sum(row[k] or 0 for k in PHASES[1:-1])
        row["post"] = max(0.0, (end - start).total_seconds() - known)
        row["elapsed"] = row["queue"] + (end - start).total_seconds()
        out.append(row)
    return out


def median(values):
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else None


def concurrency(rows):
    events = sorted([(ts(r["started"]), 1) for r in rows] + [(ts(r["finished"]), -1) for r in rows])
    running = peak = 0
    for _, delta in events:
        running += delta
        peak = max(peak, running)
    return peak


def main():
    ledger = [json.loads(l) for l in (SUITE / "results/ledger.jsonl").read_text().splitlines() if l.strip()]
    ledger = [e for e in ledger if e.get("aspire_build") and not e.get("cancelled")]
    rows, missing = [], collections.Counter()
    for entry in ledger:
        found = trial_rows(entry)
        if not found:
            missing[entry["round"]] += 1
            continue
        rows += found
    fmt = lambda v: "–" if v is None else f"{v:,.0f}"
    lines = ["# Round time: queue, build, fault setup and agent (PLAN T4.6)", "",
             f"Generated by `tools/round_time.py` from `results/ledger.jsonl` and the extracted runs already on disk "
             f"(nothing fetched). Pin 2026-11-17. {len(rows)} trials with Harbor timing files; "
             f"{sum(missing.values())} ledger lines without an extracted run (in flight, not fetched, or lost).", ""]
    # Phase medians and shares by kind and app kind.
    lines += ["## Phases per trial (seconds; median, and share of the summed elapsed time)", "",
              "| Group | n | " + " | ".join(PHASES) + " | elapsed | setup share | agent share |",
              "|---|---:|" + "---:|" * (len(PHASES) + 3)]
    groups = collections.OrderedDict()
    for r in rows:
        groups.setdefault(("all", r["kind"]), []).append(r)
        groups.setdefault((r["app"], r["kind"]), []).append(r)
    for (app, kind), members in sorted(groups.items(), key=lambda kv: (kv[0][1], kv[0][0] != "all", kv[0][0])):
        total = sum(r["elapsed"] for r in members)
        setup = sum(sum(r[k] or 0 for k in SETUP) for r in members)
        agent = sum(r["agent"] or 0 for r in members)
        lines.append(f"| {kind} / {app} | {len(members)} | " +
                     " | ".join(fmt(median([r[k] for r in members])) for k in PHASES) +
                     f" | {fmt(median([r['elapsed'] for r in members]))} | {setup / total:.0%} | {agent / total:.0%} |")
    lines.append("")
    # Image cache: first run of a task (by start time) against its later runs.
    by_task = collections.defaultdict(list)
    for r in rows:
        by_task[(r["task_repo_commit"], r["scenario"], r["arm"])].append(r)
    ratios = []
    for members in by_task.values():
        members.sort(key=lambda r: r["started"])
        if len(members) >= 3 and members[0]["build"]:
            later = median([r["build"] for r in members[1:]])
            ratios.append(later / members[0]["build"])
    pulls = sum(r["image_pull_ms"] is not None for r in rows)
    lines += ["## Image cache on CES", "",
              f"Tasks with a first run and at least two later runs: {len(ratios)}. Median of (later runs' median build) / "
              f"(first run's build): {median(ratios):.2f} (quartiles {statistics.quantiles(ratios, n=4)[0]:.2f}–"
              f"{statistics.quantiles(ratios, n=4)[2]:.2f}). Trials with `harbor_image_pull_ms` set: {pulls} of {len(rows)}.", ""]
    # Rounds.
    lines += ["## Rounds (model rounds with at least 12 trials)", "",
              "| Round | Trials | Wall h | Peak running | Σ agent h | Σ queue h | Σ build+ready h | Median queue s | Max queue s |",
              "|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
    rounds = collections.defaultdict(list)
    for r in rows:
        rounds[r["round"]].append(r)
    summary_rounds = []
    for name, members in sorted(rounds.items(), key=lambda kv: min(r["submitted"] for r in kv[1])):
        if len(members) < 12 or all(r["kind"] == "oracle" for r in members):
            continue
        wall = (max(ts(r["finished"]) for r in members) - min(stamp(r["submitted"]) for r in members)).total_seconds()
        item = {"round": name, "trials": len(members), "wall_h": wall / 3600, "peak": concurrency(members),
                "agent_h": sum(r["agent"] or 0 for r in members) / 3600,
                "queue_h": sum(r["queue"] for r in members) / 3600,
                "build_ready_h": sum((r["build"] or 0) + (r["ready"] or 0) for r in members) / 3600,
                "queue_median": median([r["queue"] for r in members]), "queue_max": max(r["queue"] for r in members)}
        summary_rounds.append(item)
        lines.append(f"| {name} | {item['trials']} | {item['wall_h']:.1f} | {item['peak']} | {item['agent_h']:.1f} | "
                     f"{item['queue_h']:.1f} | {item['build_ready_h']:.1f} | {item['queue_median']:,.0f} | {item['queue_max']:,.0f} |")
    lines.append("")
    model = [r for r in rows if r["kind"] == "model"]
    waiting = sum(sum(r[k] or 0 for k in SETUP) for r in model)
    agent = sum(r["agent"] or 0 for r in model)
    verdict = "supported" if waiting > agent else "not supported"
    lines += ["## Premise (rule as computed)", "",
              f"Over {len(model)} model trials: queue + pre + build + ready + agent_setup = {waiting / 3600:,.1f} h, "
              f"agent = {agent / 3600:,.1f} h. The premise that queue and setup time bound the plan more than agent "
              f"time is **{verdict}** by the rule as computed.", ""]
    if missing:
        lines += ["Ledger lines without an extracted run, by round: " +
                  ", ".join(f"`{k}` {v}" for k, v in sorted(missing.items())), ""]
    text = "\n".join(lines)
    print(text)
    if "--out" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--out") + 1])
        out.mkdir(parents=True, exist_ok=True)
        (out / "round-time.jsonl").write_text("".join(json.dumps(r, sort_keys=True) + "\n" for r in rows))
        (out / "round-time.md").write_text(text + "\n")


if __name__ == "__main__":
    main()
