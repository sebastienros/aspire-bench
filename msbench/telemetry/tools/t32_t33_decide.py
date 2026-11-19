#!/usr/bin/env python3
"""T3.2 (aspireify) and T3.3 (aspire-init) verdicts by the rule as computed in PLAN §7
"T3.2 and T3.3 fixtures and rules, as computed" (written before any t32/t33 trial).

    tools/t32_t33_decide.py [--rounds t32,t33[,t32-topup,...]]

Builds its rows from the ledger entries of the given rounds only (collect.analyze_trial on the extracted
runs; it never fetches another round), plus each trial's verifier details.json (failed checks, AppHost
sdkVersion). Same-round cells only. Prints Markdown.
"""
import collections
import json
import math
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import collect  # noqa: E402
from stats import bootstrap_ratio, mann_whitney  # noqa: E402

SUITE = collect.SUITE
PIN = "2026-11-17"
PINNED = "17.1.0-preview.1.26567.3"
LUNA, TERRA = "gpt-6-luna", "gpt-6.1-terra"
CARDS = {
    "T3.2": {"short": "aspireify", "skill": "aspireify", "scenarios": ["adoption", "add-dependency"], "guard": True},
    "T3.3": {"short": "init", "skill": "aspire-init", "scenarios": ["greenfield"], "guard": False},
}
CLI, BUNDLE = "aspire-cli", "aspire-skills"


def fisher(a_pass, a_n, b_pass, b_n):
    total, passes = a_n + b_n, a_pass + b_pass
    prob = lambda k: math.comb(a_n, k) * math.comb(b_n, passes - k) / math.comb(total, passes)
    observed = prob(a_pass)
    lo, hi = max(0, passes - b_n), min(a_n, passes)
    return min(1.0, sum(prob(k) for k in range(lo, hi + 1) if prob(k) <= observed * (1 + 1e-9)))


def load(rounds):
    cells = collections.defaultdict(list)
    for line in (SUITE / "results/ledger.jsonl").read_text().splitlines():
        entry = json.loads(line)
        if entry.get("round") not in rounds or entry["model"] == "oracle" or entry.get("excluded") or entry.get("cancelled"):
            continue
        root = collect.fetch(entry["run_id"])
        for path in [p for p in root.rglob("result.json") if "trial_name" in p.read_text()[:4000]]:
            row = collect.analyze_trial(path, entry)
            details = next(path.parent.rglob("details.json"), None)
            d = json.loads(details.read_text()) if details else {}
            row["failed_checks"] = sorted(k for k, v in (d.get("checks") or {}).items() if v is not True)
            row["apphost_sdk"] = d.get("sdkVersion")
            if row.get("infrastructure_failure") or row.get("agent_seconds") is None:
                cells[("infra", entry["scenario"], entry["model"], entry["arm"])].append(row)
                continue
            cells[(entry["scenario"], entry["model"], entry["arm"])].append(row)
    return cells


passes = lambda rows: sum(1 for r in rows if r.get("reward") == 1)
secs = lambda rows: [r["agent_seconds"] for r in rows]
first = lambda r: (r.get("skills_loaded") or ["none"])[0]


def pair(cells, scenario, model, a, b):
    x, y = cells.get((scenario, model, a), []), cells.get((scenario, model, b), [])
    if not x or not y:
        return None
    ratio = statistics.median(secs(x)) / statistics.median(secs(y))
    ci = bootstrap_ratio(secs(x), secs(y), f"{PIN}|{scenario}|{model}|{a}|{b}")
    return {"n": (len(x), len(y)), "pass": (passes(x), passes(y)), "med": (statistics.median(secs(x)), statistics.median(secs(y))),
            "ratio": ratio, "p": mann_whitney(secs(x), secs(y)), "ci": ci, "fisher": fisher(passes(x), len(x), passes(y), len(y)),
            "refs": statistics.median([r.get("references_read") or 0 for r in x])}


def fmt(pr):
    if not pr:
        return "missing"
    ci = f"{pr['ci'][0]:.2f}–{pr['ci'][1]:.2f}" if pr["ci"] else "-"
    return (f"pass {pr['pass'][0]}/{pr['n'][0]} vs {pr['pass'][1]}/{pr['n'][1]} (Fisher p {pr['fisher']:.3f}), "
            f"median {pr['med'][0]:.0f} vs {pr['med'][1]:.0f} s, ratio {pr['ratio']:.2f}× (p {pr['p']:.3f}, 90 % {ci})")


def decide(cells, card):
    c = CARDS[card]
    skill, minus = f"aspire-skill-{c['short']}", f"aspire-skills-no{c['short']}"
    out = [f"## {card} `{c['skill']}`", ""]
    luna = {s: pair(cells, s, LUNA, skill, CLI) for s in c["scenarios"]}
    terra = {s: pair(cells, s, TERRA, skill, CLI) for s in c["scenarios"]}
    for s in c["scenarios"]:
        out.append(f"- `{s}` luna skill-only vs aspire-cli: {fmt(luna[s])}")
        out.append(f"- `{s}` terra skill-only vs aspire-cli: {fmt(terra[s])}")
    # Selection, luna (ruling 3): first skill loaded in the aspire-skills luna trials.
    sel = {s: collections.Counter(first(r) for r in cells.get((s, LUNA, BUNDLE), [])) for s in c["scenarios"]}
    sel_ok = all(sel[s][c["skill"]] >= 5 for s in c["scenarios"])
    out.append(f"- luna selection (first skill, `aspire-skills`): {dict((s, dict(v)) for s, v in sel.items())} → "
               f"{'≥ 5/6 per scenario' if sel_ok else 'below 5/6'}")
    # 1. floors
    floors = {s for s in c["scenarios"] if luna[s] and luna[s]["pass"][0] <= 1 and luna[s]["pass"][1] <= 1}
    if floors:
        out.append(f"- luna floor cells (both ≤ 1/6, reported not tested): {sorted(floors)}")
    tested = [s for s in c["scenarios"] if s not in floors and luna[s]]
    if not tested:
        return out + ["", f"**Verdict: `no verdict`** (every luna cell is a floor)."]
    # 2. keep clause (luna)
    pooled = (sum(luna[s]["pass"][0] for s in tested), sum(luna[s]["n"][0] for s in tested),
              sum(luna[s]["pass"][1] for s in tested), sum(luna[s]["n"][1] for s in tested))
    pooled_fisher = fisher(*pooled)
    meets_time = [s for s in tested if luna[s]["ratio"] <= 0.90 and luna[s]["p"] < 0.05]
    meets_pass = [s for s in tested if luna[s]["fisher"] < 0.05 and luna[s]["pass"][0] > luna[s]["pass"][1]]
    pooled_better = pooled_fisher < 0.05 and pooled[0] / pooled[1] > pooled[2] / pooled[3]
    meets = sorted(set(meets_time + meets_pass)) or (tested if pooled_better else [])
    worse = [s for s in tested if (luna[s]["ratio"] > 1.10 and luna[s]["p"] < 0.10) or luna[s]["pass"][0] <= luna[s]["pass"][1] - 2]
    same_dir = all(luna[s]["ratio"] < 1.0 and luna[s]["pass"][0] >= luna[s]["pass"][1] for s in tested if s not in meets)
    out.append(f"- keep clause (luna): time {meets_time}, pass {meets_pass}, pooled Fisher p {pooled_fisher:.3f}; "
               f"other scenarios same direction: {same_dir}; worse: {worse}; cells tested: {len(tested)}")
    if worse:
        return out + ["", f"**Rule row 3 (worse on {worse}): `shrink` if the trajectories show the cost comes from the body/references "
                          "on the main path, else `no verdict`** (read the trajectories)."]
    if meets and same_dir:
        refs = statistics.median([luna[s]["refs"] for s in meets])
        if not sel_ok:
            return out + ["", "**Keep clause met but luna selection below 5/6 → row 5: `no verdict`** (selection)."]
        if refs >= 2:
            return out + ["", f"**Verdict: `shrink`** (keep clause met; median references read {refs} ≥ 2)."]
        return out + ["", f"**Verdict: `keep`** (median references read {refs})."]
    # 4. remove
    equiv = []
    for model, pairs in ((LUNA, luna), (TERRA, terra)):
        for s, pr in pairs.items():
            ok = pr and 0.90 <= pr["ratio"] <= 1.10 and pr["ci"] and 0.75 <= pr["ci"][0] and pr["ci"][1] <= 1.25 and abs(pr["pass"][0] - pr["pass"][1]) <= 1
            equiv.append((s, model, bool(ok)))
    minus_ok = []
    for s in c["scenarios"]:
        for model in (LUNA, TERRA):
            pr = pair(cells, s, model, minus, BUNDLE)
            ok = pr and pr["ratio"] <= 1.10 and pr["pass"][0] >= pr["pass"][1] - 1
            minus_ok.append((s, model, bool(ok)))
            out.append(f"- `{s}` {model} bundle-minus vs bundle: {fmt(pr)}")
    if c["guard"]:
        g_sql, g_redis = pair(cells, "slow-sql", LUNA, minus, BUNDLE), pair(cells, "slow-redis", LUNA, minus, BUNDLE)
        out.append(f"- guard luna slow-sql: {fmt(g_sql)}")
        out.append(f"- guard luna slow-redis (time only): {fmt(g_redis)}")
        sql_ok = bool(g_sql) and not (g_sql["ratio"] > 1.10 and g_sql["p"] < 0.10) and g_sql["pass"][0] >= g_sql["pass"][1] - 1
        redis_ok = bool(g_redis) and not (g_redis["ratio"] > 1.10 and g_redis["p"] < 0.10)
        minus_ok += [("guard slow-sql", LUNA, sql_ok), ("guard slow-redis", LUNA, redis_ok)]
    out.append(f"- equivalence cells: {equiv}")
    out.append(f"- bundle-minus / guard cells: {minus_ok}")
    if all(ok for *_, ok in equiv):
        failing = [(s, m) for s, m, ok in minus_ok if not ok]
        if not failing:
            return out + ["", "**Verdict: `remove`** from the default set (keep the content as docs)."]
        return out + ["", f"**Verdict: `no verdict`**: equivalent, but bundle-minus/guard fails on {failing}."]
    return out + ["", "**Verdict: `no verdict`** (not better, not shown equivalent): one top-up allowed (ruling 6)."]


def drift_and_contamination(cells):
    out = ["## Recorded, not graded", ""]
    for (key, rows) in sorted(cells.items(), key=lambda kv: str(kv[0])):
        if key[0] == "infra":
            out.append(f"- infrastructure: {key[1:]} {[r['run_id'] for r in rows]}")
            continue
        scenario, model, arm = key
        drift = [(r["run_id"], r["apphost_sdk"]) for r in rows if r.get("apphost_sdk") and r["apphost_sdk"] != PINNED]
        loaded = [r["run_id"] for r in rows if arm == CLI and r.get("skills_loaded")]
        fails = collections.Counter(c for r in rows if r.get("reward") != 1 for c in r["failed_checks"])
        out.append(f"- {scenario} {model} {arm}: pass {passes(rows)}/{len(rows)}, median {statistics.median(secs(rows)):.0f} s, "
                   f"refs median {statistics.median([r.get('references_read') or 0 for r in rows])}, "
                   f"first skills {dict(collections.Counter(first(r) for r in rows))}, "
                   f"$ {sum(r.get('cost_usd') or 0 for r in rows):.2f}"
                   + (f", other Aspire version {drift}" if drift else "") + (f", aspire-cli skill loads {loaded}" if loaded else "")
                   + (f", failed checks {dict(fails)}" if fails else ""))
    return out


def main():
    rounds = set((sys.argv[sys.argv.index("--rounds") + 1] if "--rounds" in sys.argv else "t32,t33").split(","))
    cells = load(rounds)
    lines = [f"# T3.2 / T3.3 by the rule as computed (rounds {', '.join(sorted(rounds))})", ""]
    for card in CARDS:
        lines += decide(cells, card) + [""]
    lines += drift_and_contamination(cells)
    print("\n".join(lines))


if __name__ == "__main__":
    main()
