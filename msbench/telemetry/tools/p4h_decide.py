#!/usr/bin/env python3
"""Phase 4 harness lane verdicts, computed as PLAN §8 states them (rule blocks T4.7, T4.8, T4.9, written before
any trial). Reads results/trials.jsonl; graded = not an infrastructure failure and not excluded; pass = reward 1.

    tools/p4h_decide.py t47 [--rounds t47,t47-topup]
    tools/p4h_decide.py t48 [--rounds t48,t48-topup]      T4.8 and T4.9 (one shared round)
"""
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats import bootstrap_ratio, mann_whitney  # noqa: E402

SUITE = Path(__file__).resolve().parent.parent
CC, COPILOT, VSCODE = "claude-code", "github-copilot-cli", "vscode"
LEVEL = (0.90, 1.10)


def rows(rounds):
    out = defaultdict(list)
    for line in (SUITE / "results/trials.jsonl").read_text().splitlines():
        r = json.loads(line)
        if r.get("round") in rounds and r["model_requested"] != "oracle" and not r.get("excluded") \
                and not r.get("infrastructure_failure"):
            out[(r.get("agent") or COPILOT, r["scenario"], r["model_requested"], r["arm"])].append(r)
    return out


def time_of(r):
    """T1.9's definition: VS Code net loop (transport fallback removed), any other harness its loop."""
    loop = r.get("agent_loop_seconds")
    if loop is None:
        return None
    return loop - (r.get("transport_wait_seconds") or 0) if r.get("agent") == VSCODE else loop


def cell(cells, key):
    trials = cells.get(key, [])
    times = [t for t in map(time_of, trials) if t is not None]
    return {"n": len(trials), "pass": sum(t.get("reward") == 1 for t in trials), "times": times,
            "median": statistics.median(times) if times else None, "trials": trials}


def side(ratio):
    return "level" if LEVEL[0] <= ratio <= LEVEL[1] else ("below" if ratio < 1 else "above")


def same_side(a, b):
    return "level" in (side(a), side(b)) or side(a) == side(b)


def sign(x, y):
    return (x > y) - (x < y)


def fmt(c, raw=None):
    ratio = f" {c['median'] / raw['median']:.2f}x" if raw and c["median"] and raw["median"] else ""
    p = ""
    if raw and len(c["times"]) > 1 and len(raw["times"]) > 1:
        p = f" p={mann_whitney(c['times'], raw['times']):.3f}"
    return f"{c['pass']}/{c['n']} pass, median {c['median']:.1f} s{ratio}{p}" if c["median"] is not None else f"{c['pass']}/{c['n']} pass"


def t47(rounds):
    cells = rows(rounds)
    model = "claude-haiku-5.5"
    pairs = {CC: ("raw", "aspire-skills-mcp-cc", "aspire-lean-cc"), COPILOT: ("raw", "aspire-skills-mcp", "aspire-lean")}
    ok_all = True
    for scenario in ("slow-sql", "slow-redis"):
        got = {h: [cell(cells, (h, scenario, model, a)) for a in arms] for h, arms in pairs.items()}
        print(f"\n## {scenario}")
        for h, arms in pairs.items():
            raw = got[h][0]
            for a, c in zip(arms, got[h]):
                skills = sum(bool(t.get("skills_loaded")) for t in c["trials"])
                mcp = statistics.median([sum((t.get("mcp_calls") or {}).values()) for t in c["trials"]]) if c["trials"] else 0
                print(f"  {h:20} {a:22} {fmt(c, raw if a != 'raw' else None)}; skill loaded {skills}/{c['n']}, MCP calls median {mcp}")
        ratios = {h: [g[1]["median"] / g[0]["median"], g[2]["median"] / g[0]["median"]] for h, g in got.items()}
        c1 = all(same_side(ratios[CC][i], ratios[COPILOT][i]) for i in (0, 1))
        order = {h: g[2]["median"] / g[1]["median"] for h, g in got.items()}  # lean ÷ skills-mcp
        c2 = "level" in (side(order[CC]), side(order[COPILOT])) or sign(order[CC], 1) == sign(order[COPILOT], 1)
        conditions = [("ratio sides", c1, ratios), ("Aspire arm order (lean ÷ skills-mcp)", c2, order)]
        if scenario == "slow-redis":
            c3 = sign(got[CC][2]["pass"], got[CC][0]["pass"]) == sign(got[COPILOT][2]["pass"], got[COPILOT][0]["pass"])
            conditions.append(("lean vs raw pass order", c3, {h: (g[2]["pass"], g[0]["pass"]) for h, g in got.items()}))
        for name, ok, values in conditions:
            print(f"  {'met' if ok else 'NOT met'}: {name}: {json.dumps(values, default=lambda v: round(v, 2))}")
            ok_all &= ok
    print(f"\nT4.7 verdict: {'ship (harness-neutral)' if ok_all else 'no verdict'}")


def t48(rounds):
    cells = rows(rounds)
    print("# T4.8 (a)")
    outside, lines = 0, []
    for scenario in ("slow-sql", "slow-redis"):
        for model in ("gpt-6-luna", "gpt-6.1-terra"):
            r = {}
            for h in (VSCODE, COPILOT):
                raw, arm = cell(cells, (h, scenario, model, "raw")), cell(cells, (h, scenario, model, "aspire-skills-mcp"))
                r[h] = (raw, arm, arm["median"] / raw["median"] if arm["median"] and raw["median"] else None)
                ci = bootstrap_ratio(arm["times"], raw["times"], seed=f"{h}{scenario}{model}") if arm["times"] and raw["times"] else None
                print(f"  {scenario:10} {model:14} {h:20} raw {fmt(raw)} | aspire-skills-mcp {fmt(arm, raw)}"
                      f"{f' [{ci[0]:.2f}-{ci[1]:.2f}]' if ci else ''}")
            delta = abs(r[VSCODE][2] - r[COPILOT][2])
            outside += delta > 0.15
            print(f"    |ratio_vscode - ratio_copilot| = {delta:.2f} {'OUTSIDE' if delta > 0.15 else 'inside'} ±0.15")
            if scenario == "slow-redis" and model == "gpt-6-luna":
                passes = (r[VSCODE][1]["pass"], r[COPILOT][1]["pass"])
                pass_ok = abs(passes[0] - passes[1]) <= 1
                print(f"    slow-redis luna aspire-skills-mcp passes VS Code {passes[0]} vs Copilot {passes[1]}: {'within one' if pass_ok else 'NOT within one'}")
    print(f"\nT4.8 (a) verdict: {'parity' if outside == 0 and pass_ok else 'harness-dependent'} ({outside} of 4 cells outside)")

    print("\n# T4.9 (VS Code, luna)")
    arms = ("raw", "aspire-cli", "aspire-cli-agents", "aspire-lean-agents", "aspire-lean")
    got = {s: {a: cell(cells, (VSCODE, s, "gpt-6-luna", a)) for a in arms} for s in ("slow-sql", "slow-redis")}
    for s, cs in got.items():
        for a, c in cs.items():
            shell = statistics.median([(t.get("tool_counts") or {}).get("run_in_terminal", 0) for t in c["trials"]]) if c["trials"] else None
            passing = [time_of(t) for t in c["trials"] if t.get("reward") == 1 and time_of(t) is not None]
            ttp = f"{statistics.median(passing):.1f} s (n={len(passing)})" if passing else "—"
            print(f"  {s:10} {a:20} {c['pass']}/{c['n']} pass; shell commands median {shell}; time to pass {ttp}")
    within = lambda a: all(abs(got[s][a]["pass"] - got[s]["aspire-lean"]["pass"]) <= 1 for s in got)
    if not all(got[s]["aspire-lean"]["pass"] >= got[s]["raw"]["pass"] + 2 for s in got):
        verdict = "no verdict (precondition: aspire-lean ≥ raw + 2 on both faults not met)"
    elif within("aspire-cli"):
        verdict = "neither"
    elif within("aspire-cli-agents"):
        verdict = "commands"
    elif within("aspire-lean-agents"):
        verdict = "skill"
    else:
        verdict = "no verdict"
    print(f"\nT4.9 verdict: {verdict}")


if __name__ == "__main__":
    which = sys.argv[1]
    rounds = set(sys.argv[sys.argv.index("--rounds") + 1].split(",")) if "--rounds" in sys.argv else {which}
    {"t47": t47, "t48": t48}[which](rounds)
