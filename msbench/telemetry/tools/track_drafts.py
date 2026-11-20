#!/usr/bin/env python3
"""Issue drafts for a tracking run's flags (PLAN T4.5, "T4.5 tracking rule, as computed", rules 2 to 4).

    tools/track_drafts.py --series <series.jsonl> --run <run> --out <dir>   summary on stdout, one draft per flag
    tools/track_drafts.py --series <series.jsonl> --run <run> --repeat-cells  "<scenario> <arm>" per luna cell to repeat

Drafts only: nothing is filed. A draft names the flag and the row, the two runs compared (the flagged run and the
latest run of its trailing window) with the MSBench run IDs of the cell's and its raw cell's trials in each, and the
diff of pins between them. Exit status: 0 done; 3 a luna time or token flag waits for its repeat (rule 3: no draft
for it until the repeat round `<run>-repeat` is in the run).
"""
import collections
import json
import re
import sys
from pathlib import Path

SUITE = Path(__file__).resolve().parent.parent
DRAFT_FLAGS = ("regress-pass", "regress-time", "regress-tokens", "leak")
LUNA = "gpt-6-luna"


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def ledger_ids(ledger, rounds, scenario, model, arm):
    return sorted(e["run_id"] for e in ledger if e["round"] in rounds and e["scenario"] == scenario
                  and e["model"] == model and e["arm"] == arm and not e.get("cancelled"))


def pins(row, entries):
    packages = sorted({e.get("agent_package") or "" for e in entries} - {""})
    return {"Pin": row["pin"], "Aspire build": ", ".join(row["aspire_build"]) or "–", "Skills": ", ".join(row["skills_sha"]) or "–",
            "Task commit": ", ".join(c[:12] for c in row["task_repo_commit"]) or "–",
            "Agent package": ", ".join(packages) or "–", "Rounds": ", ".join(row["rounds"])}


def main():
    rows = [json.loads(l) for l in Path(arg("--series")).read_text().splitlines() if l.strip()]
    run = arg("--run")
    ledger = [json.loads(l) for l in (SUITE / "results/ledger.jsonl").read_text().splitlines() if l.strip()]
    mine = [r for r in rows if r["run"] == run]
    if not mine:
        raise SystemExit(f"run {run} has no rows in {arg('--series')}")
    repeated = any(f"{run}-repeat" in r["rounds"] for r in mine)
    waiting, drafts, notes = [], [], collections.defaultdict(list)
    for r in mine:
        for flag in r["flags"]:
            if flag in DRAFT_FLAGS:
                if r["model"] == LUNA and flag in ("regress-time", "regress-tokens") and not repeated:
                    waiting.append((r, flag))
                else:
                    drafts.append((r, flag))
            else:
                notes[flag].append(f"{r['scenario']}/{r['model']}/{r['arm']}")
    if "--repeat-cells" in sys.argv:
        for scenario, arm in sorted({(r["scenario"], r["arm"]) for r, _ in waiting}):
            print(scenario, arm)
        return
    out = Path(arg("--out"))
    lines = [f"# Tracking run `{run}`: flags", "",
             f"{len(mine)} cell rows; failed (leak): {'yes' if any('leak' in r['flags'] for r in mine) else 'no'}; "
             f"harness paths named without a read (touch, listed): {sum(r.get('harness_touches') or 0 for r in mine)}; "
             f"repeat round in the run: {'yes' if repeated else 'no'}.", ""]
    by_cell = {(r["agent"], r["scenario"], r["model"], r["arm"], r["run"]): r for r in rows}
    written = []
    for r, flag in drafts:
        cell = (r["agent"], r["scenario"], r["model"], r["arm"])
        previous_run = (r.get("trailing_runs") or [None])[-1]
        previous = by_cell.get(cell + (previous_run,)) if previous_run else None
        raw_now = by_cell.get((r["agent"], r["scenario"], r["model"], "raw", run))
        raw_then = by_cell.get((r["agent"], r["scenario"], r["model"], "raw", previous_run)) if previous_run else None
        ids = lambda row, arm: ledger_ids(ledger, set(row["rounds"]), r["scenario"], r["model"], arm) if row else []
        now_entries = [e for e in ledger if e["run_id"] in ids(r, r["arm"])]
        then_entries = [e for e in ledger if previous and e["run_id"] in ids(previous, r["arm"])]
        pin_now, pin_then = pins(r, now_entries), pins(previous, then_entries) if previous else {}
        fmt = lambda v, spec=".2f": "–" if v is None else format(v, spec)
        body = [f"# Tracking: `{flag}` on {r['scenario']} / {r['model']} / {r['arm']} (run `{run}`)", "",
                "Draft written by `tools/track_drafts.py` (PLAN T4.5). Not filed.", "",
                "## The row", "",
                "| | This run | Trailing window |", "|---|---|---|",
                f"| Runs | `{run}` | {', '.join(f'`{x}`' for x in r.get('trailing_runs') or []) or '–'} |",
                f"| Pass | {r['passed']}/{r['n']} | {fmt(r.get('trailing_pass_rate'))} |",
                f"| Agent s (median) | {fmt(r['agent_seconds'], '.0f')} | – |",
                f"| Time × raw | {fmt(r['ratio_agent_seconds'])} | {fmt(r.get('trailing_ratio_agent_seconds'))} |",
                f"| Tokens × raw | {fmt(r['ratio_input_tokens'])} | {fmt(r.get('trailing_ratio_input_tokens'))} |",
                f"| Change vs trailing (time, tokens) | {fmt(r.get('change_vs_trailing_agent_seconds'))}, "
                f"{fmt(r.get('change_vs_trailing_input_tokens'))} | p {fmt(r.get('p_vs_trailing_agent_seconds'), '.4f')}, "
                f"{fmt(r.get('p_vs_trailing_input_tokens'), '.4f')} |",
                f"| Skill selection | {r['skill_selection']:.0%} | – |",
                f"| Harness leaks (file read) | {r['harness_leaks']} | – |",
                f"| Harness paths named only | {r.get('harness_touches') or 0} | – |", "",
                f"All flags on the row: {', '.join(r['flags'])}.", "",
                "## The two runs (MSBench run IDs)", "",
                f"- **`{run}`**: {r['arm']} {', '.join(ids(r, r['arm']))}; raw {', '.join(ids(raw_now, 'raw')) or '–'}",
                f"- **`{previous_run or '–'}`** (latest in the window): {r['arm']} {', '.join(ids(previous, r['arm'])) or '–'}; "
                f"raw {', '.join(ids(raw_then, 'raw')) or '–'}", "",
                "## Diff of pins", "",
                f"| | `{previous_run or '–'}` | `{run}` |", "|---|---|---|"]
        for key in pin_now:
            then = pin_then.get(key, "–")
            body.append(f"| {key}{' (changed)' if then != pin_now[key] else ''} | {then} | {pin_now[key]} |")
        name = re.sub(r"[^\w.-]+", "-", f"{run}-{r['scenario']}-{r['model']}-{r['arm']}-{flag}") + ".md"
        out.mkdir(parents=True, exist_ok=True)
        (out / name).write_text("\n".join(body) + "\n")
        written.append(name)
    lines.append(f"Drafts ({len(written)}): " + (", ".join(f"`{n}`" for n in written) or "none"))
    lines.append(f"Waiting for the luna repeat ({len(waiting)}): " +
                 (", ".join(f"{r['scenario']}/{r['arm']} {f}" for r, f in waiting) or "none"))
    for flag in sorted(notes):
        lines.append(f"Listed, no draft, `{flag}` ({len(notes[flag])}): {', '.join(notes[flag])}")
    print("\n".join(lines))
    sys.exit(3 if waiting else 0)


if __name__ == "__main__":
    main()
