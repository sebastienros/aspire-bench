#!/usr/bin/env python3
"""PLAN T4.2/T4.3 rule, as computed (ruling 1 with the coordinator's precedence and denominators).

    tools/t42_t43_decide.py <round> [<round> ...]     e.g. t42 t42-rerun

Reads the ledger entries of the given rounds, analyzes each trial with collect.analyze_trial (fetching the run
if it is not in the cache) and prints, per scenario: the marker counts for every arm and model (reads among
passing trials, reads over all trials, the descriptive hint) and the verdict word on luna. Writes nothing.
"""
import collections
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import collect  # noqa: E402

ARMS = ["raw", "aspire-cli", "aspire-skills-mcp", "aspire-lean"]
MODELS = ["gpt-6-luna", "gpt-6.1-terra"]


def verdict(lean, cli, field="pattern_read_before_edit"):
    """The rule as pre-registered with `pattern_read_before_edit`; with `pattern_read_aggregate` it gives the word
    the coordinator's ruling asks to state beside it (not applied to t42/t43)."""
    passed = [t for t in lean if t["reward"] == 1]
    reads_pass = sum(t[field] for t in passed)
    lean_all = sum(t[field] for t in lean)
    cli_all = sum(t[field] for t in cli)
    if len(passed) <= 3 or reads_pass <= 3:
        return "row not confirmed"
    if len(passed) >= 5 and reads_pass >= 4 and lean_all - cli_all >= 2:
        return "row confirmed"
    if len(passed) >= 5 and abs(lean_all - cli_all) <= 1:
        return "row not attributable"
    return "no verdict"


def main():
    rounds = set(sys.argv[1:])
    ledger = [json.loads(line) for line in (collect.SUITE / "results/ledger.jsonl").read_text().splitlines() if line.strip()]
    rows = []
    for entry in ledger:
        if entry["round"] not in rounds or entry.get("cancelled") or entry["model"] == "oracle":
            continue
        root = collect.fetch(entry["run_id"])
        trials = [p for p in root.rglob("result.json") if "trial_name" in p.read_text()[:4000]]
        if not trials:
            print(f"pending/no result: {entry['run_id']}", file=sys.stderr)
        rows += [collect.analyze_trial(p, entry) for p in trials]
    graded = [r for r in rows if not r.get("infrastructure_failure")]
    infra = [r for r in rows if r.get("infrastructure_failure")]
    for r in infra:
        print(f"infrastructure: {r['run_id']} {r['scenario']} {r['arm']} {r['model_requested']} {r['exception']}")
    cells = collections.defaultdict(list)
    for r in graded:
        cells[(r["scenario"], r["model_requested"], r["arm"])].append(r)
    for scenario in sorted({r["scenario"] for r in graded}):
        print(f"\n## {scenario}")
        print("| model | arm | n | pass | reads (passing) | reads (all) | aggregate (passing) | aggregate (all) | hint (all) | median agent s | median s to pattern |")
        print("|---|---|---|---|---|---|---|---|---|---|---|")
        for model in MODELS:
            for arm in ARMS:
                trials = cells.get((scenario, model, arm), [])
                if not trials:
                    continue
                passed = [t for t in trials if t["reward"] == 1]
                reads_pass = sum(t.get("pattern_read_before_edit", False) for t in passed)
                reads_all = sum(t.get("pattern_read_before_edit", False) for t in trials)
                hint_all = sum(t.get("pattern_hint_before_edit", False) for t in trials)
                agg_pass = sum(t.get("pattern_read_aggregate", False) for t in passed)
                agg_all = sum(t.get("pattern_read_aggregate", False) for t in trials)
                print(f"| {model} | {arm} | {len(trials)} | {len(passed)} | {reads_pass} | {reads_all} | {agg_pass} | {agg_all} | {hint_all} "
                      f"| {collect.median([t.get('agent_seconds') for t in trials])} "
                      f"| {collect.median([t.get('seconds_to_pattern_read') for t in trials if t.get('seconds_to_pattern_read')])} |")
        lean = cells.get((scenario, "gpt-6-luna", "aspire-lean"), [])
        cli = cells.get((scenario, "gpt-6-luna", "aspire-cli"), [])
        if len(lean) == 6 and len(cli) == 6:
            print(f"\n**Verdict ({scenario}, luna): `{verdict(lean, cli)}`**")
            print(f"(with pattern_read_aggregate, not pre-registered: `{verdict(lean, cli, 'pattern_read_aggregate')}`)")
        else:
            print(f"\n(verdict not computed: luna aspire-lean n={len(lean)}, aspire-cli n={len(cli)}; the rule needs 6 graded each)")


if __name__ == "__main__":
    main()
