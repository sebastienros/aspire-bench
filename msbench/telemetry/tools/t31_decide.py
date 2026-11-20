#!/usr/bin/env python3
"""T3.1 (aspire-orchestration) verdict by the rule as computed in PLAN §7 "T3.1 fixtures and rule".

    tools/t31_decide.py [--rounds t31[,t31-topup]]

Reads results/trials.jsonl (run tools/collect.py first) and the trials' trajectories for the per-trial
command markers. Same-round only: every cell is taken from the given rounds. Prints Markdown.
"""
import collections
import json
import math
import re
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import collect  # noqa: E402
from stats import bootstrap_ratio, mann_whitney  # noqa: E402

SUITE = collect.SUITE
LUNA, TERRA = "gpt-6-luna", "gpt-6.1-terra"
DECISIVE = ["restart-change", "two-app", "port-conflict"]
REPORTED = ["cold-start"]
SKILL, CLI, BUNDLE, MINUS, RAW = ("aspire-skill-orchestration", "aspire-cli", "aspire-skills",
                                  "aspire-skills-noorchestration", "raw")
ARMS = [RAW, CLI, SKILL, BUNDLE, MINUS]
PIN = "2026-11-17"


def fisher(a_pass, a_n, b_pass, b_n):
    """Two-sided Fisher exact p for a 2x2 table (sum of tables no more likely than the observed)."""
    total, passes = a_n + b_n, a_pass + b_pass
    prob = lambda k: math.comb(a_n, k) * math.comb(b_n, passes - k) / math.comb(total, passes)
    observed = prob(a_pass)
    lo, hi = max(0, passes - b_n), min(a_n, passes)
    return min(1.0, sum(prob(k) for k in range(lo, hi + 1) if prob(k) <= observed * (1 + 1e-9)))


def load(rounds):
    cells = collections.defaultdict(list)
    for line in (SUITE / "results/trials.jsonl").read_text().splitlines():
        r = json.loads(line)
        if (r.get("pin") == PIN and r.get("round") in rounds and r["model_requested"] != "oracle"
                and not r.get("excluded") and not r.get("infrastructure_failure") and r.get("agent_seconds") is not None):
            cells[(r["scenario"], r["model_requested"], r["arm"])].append(r)
    return cells


def commands(row):
    """Shell commands the agent ran, in order (Copilot CLI trajectory)."""
    root = collect.DATA / "extracted" / row["run_id"]
    found = []
    for path in filter(None, [collect.run_trajectory(root)]):  # the unredacted output copy first (PLAN §9)
        for line in path.read_text().splitlines():
            if '"tool.execution_start"' not in line:
                continue
            data = json.loads(line).get("data", {})
            if data.get("toolName") in ("bash", "write_bash"):
                found.append(str((data.get("arguments") or {}).get("command", "")))
        break
    return found


MARKERS = {
    "restart-change": {
        "rebuild": r"aspire\s+resource\s+boardadmin\s+rebuild",
        "restart": r"aspire\s+resource\s+boardadmin\s+restart",
        "dotnet build": r"dotnet\s+build",
        "aspire stop (AppHost)": r"aspire\s+stop",
        "kill app process": r"\b(kill|pkill|killall)\b",
    },
    "two-app": {
        "--apphost": r"--apphost",
        "names /neighbor-app": r"neighbor",
        "resource restart/start": r"aspire\s+resource\s+boardadmin\s+(restart|start|stop)",
        "broad kill (pkill/killall)": r"\b(pkill|killall)\b",
        "kill -CONT": r"kill\s+-(CONT|18|SIGCONT)",
        "docker restart/stop/rm": r"docker\s+(restart|stop|rm|kill)",
        "aspire stop": r"aspire\s+stop",
    },
    "port-conflict": {
        "aspire stop before a start": None,  # computed below
        "--isolated": r"aspire\s+start[^\n]*--isolated",
        "launch profile edited": r"launchSettings",
        "names the preview (board-preview, 5039, 18080)": r"board-preview|\b5039\b|\b18080\b",
        "any kill/pkill/fuser -k": r"\b(kill|pkill|killall)\b|fuser\s+-k",
        "changed ADMIN_PORT": r"ADMIN_PORT=",
    },
    "cold-start": {"--isolated": r"aspire\s+start[^\n]*--isolated"},
}


def markers(scenario, rows):
    out = collections.Counter()
    for row in rows:
        cmds = commands(row)
        text = "\n".join(cmds)
        for name, pattern in MARKERS.get(scenario, {}).items():
            if pattern is None:
                stops = [i for i, c in enumerate(cmds) if re.search(r"aspire\s+stop", c)]
                starts = [i for i, c in enumerate(cmds) if re.search(r"aspire\s+start", c)]
                hit = any(s < t for s in stops for t in starts if t > min(starts, default=-1))
            else:
                hit = bool(re.search(pattern, text))
            out[name] += hit
    return out


def median(values):
    return statistics.median(values) if values else None


def compare(a, b, seed):
    x = [t["agent_seconds"] for t in a]
    y = [t["agent_seconds"] for t in b]
    if not x or not y:
        return None
    ratio = median(x) / median(y)
    return {"ratio": ratio, "p": mann_whitney(x, y), "ci": bootstrap_ratio(x, y, seed),
            "pa": sum(t.get("reward") == 1 for t in a), "na": len(a),
            "pb": sum(t.get("reward") == 1 for t in b), "nb": len(b)}


def orchestration_refs(row):
    return sum(p.startswith("aspire-orchestration/") for p in row.get("references_read_paths") or [])


def first_skill(row):
    return (row.get("skills_loaded") or ["none"])[0]


def main():
    rounds = set(sys.argv[sys.argv.index("--rounds") + 1].split(",")) if "--rounds" in sys.argv else {"t31"}
    cells = load(rounds)
    out = [f"# T3.1 decision (rounds {', '.join(sorted(rounds))})", ""]
    # Cell table
    out += ["| Scenario | Model | Arm | Pass | Median s | vs | Ratio | p | 90 % interval | Fisher p | Median orch. refs | Median tokens |",
            "|---|---|---|---|---:|---|---:|---:|---|---:|---:|---:|"]
    results = {}
    for scenario in DECISIVE + REPORTED + ["slow-sql", "slow-redis"]:
        for model in (LUNA, TERRA):
            for arm in ARMS:
                rows = cells.get((scenario, model, arm))
                if not rows:
                    continue
                base = {SKILL: CLI, MINUS: BUNDLE, RAW: None, CLI: None, BUNDLE: None}[arm]
                c = compare(rows, cells.get((scenario, model, base), []), f"{PIN}|{scenario}|{model}|{arm}|{base}") if base else None
                if c:
                    results[(scenario, model, arm)] = c
                passed = sum(t.get("reward") == 1 for t in rows)
                fmt = lambda v, f: "" if v is None else format(v, f)
                out.append("| {} | {} | `{}` | {}/{} | {:.0f} | {} | {} | {} | {} | {} | {} | {:,.0f} |".format(
                    scenario, model.replace("gpt-", ""), arm, passed, len(rows), median([t["agent_seconds"] for t in rows]),
                    f"`{base}`" if c else "", fmt(c and c["ratio"], ".2f"), fmt(c and c["p"], ".3f"),
                    f"{c['ci'][0]:.2f}–{c['ci'][1]:.2f}" if c and c["ci"] else "",
                    fmt(c and fisher(c["pa"], c["na"], c["pb"], c["nb"]), ".3f"),
                    fmt(median([orchestration_refs(t) for t in rows]), "g"),
                    median([t.get("input_tokens") or 0 for t in rows])))
    out.append("")

    # Rule
    sk = lambda s, m: results.get((s, m, SKILL))
    floors = [s for s in DECISIVE if sk(s, LUNA) and sk(s, LUNA)["pa"] <= 1 and sk(s, LUNA)["pb"] <= 1]
    tested = [s for s in DECISIVE if sk(s, LUNA) and s not in floors]
    out.append(f"**Floors (luna, both ≤ 1/6):** {', '.join(floors) or 'none'}. Decisive luna cells tested: {len(tested)}.")
    # Luna selection
    sel = {s: collections.Counter(first_skill(t) for t in cells.get((s, LUNA, BUNDLE), [])) for s in DECISIVE}
    sel_ok = all(sel[s].get("aspire-orchestration", 0) >= 5 for s in DECISIVE if cells.get((s, LUNA, BUNDLE)))
    out.append("**Luna selection (first skill, `aspire-skills`):** " + "; ".join(
        f"{s} {dict(sel[s])}" for s in DECISIVE) + f" → {'≥ 5/6 each' if sel_ok else 'below 5/6 somewhere'}.")
    meets = []
    for s in tested:
        c = sk(s, LUNA)
        time_clause = c["ratio"] <= 0.90 and c["p"] < 0.05
        pass_clause = fisher(c["pa"], c["na"], c["pb"], c["nb"]) < 0.05 and c["pa"] > c["pb"]
        if time_clause or pass_clause:
            meets.append(s)
    pooled = [sk(s, LUNA) for s in tested]
    pa, na, pb, nb = (sum(c[k] for c in pooled) for k in ("pa", "na", "pb", "nb")) if pooled else (0, 0, 0, 0)
    pooled_clause = bool(pooled) and pa > pb and fisher(pa, na, pb, nb) < 0.05
    worse = [s for s in tested if (sk(s, LUNA)["ratio"] > 1.10 and sk(s, LUNA)["p"] < 0.10) or sk(s, LUNA)["pb"] - sk(s, LUNA)["pa"] >= 2]
    same_dir = lambda s: sk(s, LUNA)["ratio"] < 1.00 and sk(s, LUNA)["pa"] >= sk(s, LUNA)["pb"]
    out.append(f"**Keep clauses:** cells meeting time or pass clause: {meets or 'none'}; pooled pass clause: "
               f"{pooled_clause} ({pa}/{na} vs {pb}/{nb}, p {fisher(pa, na, pb, nb) if na else float('nan'):.3f}); "
               f"worse cells: {worse or 'none'}.")
    verdict = None
    if not tested:
        verdict = "no verdict (every luna cell is a floor)"
    elif (meets or pooled_clause) and not worse:
        others = [s for s in tested if s not in meets]
        if all(same_dir(s) for s in others) and sel_ok:
            refs = [orchestration_refs(t) for s in (meets or tested) for t in cells.get((s, LUNA, SKILL), [])]
            verdict = "shrink (keep's clauses met, median orchestration files read ≥ 2)" if median(refs) >= 2 else "keep"
        elif not sel_ok:
            verdict = "no verdict (keep's clauses met but luna selection below 5/6: row 5)"
    if verdict is None and worse:
        verdict = f"worse on {worse}: shrink if the trajectories put the cost on the body/references, else no verdict"
    if verdict is None:
        equiv = all(
            sk(s, m) and 0.90 <= sk(s, m)["ratio"] <= 1.10 and sk(s, m)["ci"] and 0.75 <= sk(s, m)["ci"][0]
            and sk(s, m)["ci"][1] <= 1.25 and abs(sk(s, m)["pa"] - sk(s, m)["pb"]) <= 1
            for s in DECISIVE for m in (LUNA, TERRA))
        minus = [(s, m) for s in DECISIVE for m in (LUNA, TERRA) if results.get((s, m, MINUS)) and (
            results[(s, m, MINUS)]["ratio"] > 1.10 or results[(s, m, MINUS)]["pb"] - results[(s, m, MINUS)]["pa"] > 1)]
        g_sql, g_redis = results.get(("slow-sql", LUNA, MINUS)), results.get(("slow-redis", LUNA, MINUS))
        guard_fail = []
        if g_sql and ((g_sql["ratio"] > 1.10 and g_sql["p"] < 0.10) or g_sql["pa"] < g_sql["pb"] - 1):
            guard_fail.append("slow-sql")
        if g_redis and g_redis["ratio"] > 1.10 and g_redis["p"] < 0.10:
            guard_fail.append("slow-redis")
        out.append(f"**Remove clauses:** skill-only equivalent on every decisive cell: {equiv}; bundle-minus cells "
                   f"failing: {minus or 'none'}; guard failing: {guard_fail or 'none'}.")
        if equiv and not minus and not guard_fail:
            verdict = "remove"
        elif equiv:
            verdict = f"no verdict (equivalent, but not removable: {minus + guard_fail})"
        else:
            verdict = "no verdict (not better, interval not inside ±25 % or passes differ): one top-up allowed"
    out += ["", f"**Outcome verdict by the rule: {verdict}**", ""]

    # Markers
    out += ["## Commands per trial (read from trajectories)", ""]
    for scenario in DECISIVE + REPORTED:
        names = list(MARKERS.get(scenario, {}))
        if not names:
            continue
        out += [f"### {scenario}", "", "| Model | Arm | n | " + " | ".join(names) + " |", "|---|---|---:|" + "---:|" * len(names)]
        for model in (LUNA, TERRA):
            for arm in ARMS:
                rows = cells.get((scenario, model, arm))
                if rows:
                    m = markers(scenario, rows)
                    out.append(f"| {model.replace('gpt-', '')} | `{arm}` | {len(rows)} | " + " | ".join(str(m[n]) for n in names) + " |")
        out.append("")
    print("\n".join(out))


if __name__ == "__main__":
    main()
