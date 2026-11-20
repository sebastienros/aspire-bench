#!/usr/bin/env python3
"""The Phase 2 MCP lane's decision rules, computed as PLAN writes them (T2.1, T2.7, T2.8).

    tools/p2mcp_decide.py t21|t27|t28

Reads results/trials.jsonl (regenerate it with tools/collect.py first) and the extracted Copilot CLI
event logs. Every graded trial counts, pass or fail; excluded and infrastructure-failed trials do not.
"""
import collections
import json
import re
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import collect  # noqa: E402
import mcp_payloads  # noqa: E402
from stats import mann_whitney  # noqa: E402

SUITE = Path(__file__).resolve().parent.parent
LUNA, TERRA = "gpt-6-luna", "gpt-6.1-terra"


def rows(rounds):
    out = collections.defaultdict(list)
    for line in open(SUITE / "results/trials.jsonl"):
        r = json.loads(line)
        if r.get("round") in rounds and not r.get("excluded") and not r.get("infrastructure_failure") \
                and r.get("agent_seconds") is not None and r.get("model_requested") != "oracle":
            if r.get("mcp_result_content_chars") is None:  # trials.jsonl written before collect.py had the field
                calls = mcp_payloads.trial_calls(r["run_id"]) or []
                mcp = [c["content"] for c in calls if c["tool"].startswith("aspire-")]
                r["mcp_result_content_chars"] = sum(len(json.dumps(text)) for text in mcp)
                r["mcp_spills"] = sum(text.startswith("Output too large to read at once (") for text in mcp)
            out[(r["scenario"], r["model_requested"], r["arm"])].append(r)
    return out


def med(xs):
    xs = [x for x in xs if x is not None]
    return statistics.median(xs) if xs else None


def compare(a, b, key):
    x, y = [t[key] for t in a if t.get(key) is not None], [t[key] for t in b if t.get(key) is not None]
    if not x or not y:
        return None, None, None, None
    mx, my = statistics.median(x), statistics.median(y)
    return mx, my, (mx / my - 1) if my else None, mann_whitney(x, y)


def passes(cell):
    return sum(1 for t in cell if t.get("reward") == 1)


def events_of(run_id):
    path = collect.run_trajectory(collect.DATA / "extracted" / run_id)  # the unredacted output copy first (PLAN §9)
    return collect.load_events(path) if path else []


def schema_and_calls(run_id):
    """Copilot CLI's tool-schema tokens per model call (last usage checkpoint) and the number of model calls."""
    events = events_of(run_id)
    tool_tokens = None
    for e in events:
        if e.get("type") == "session.usage_checkpoint":
            for state in e["data"].get("promptCacheBreakState", []):
                for model in state.get("models", {}).values():
                    tool_tokens = model.get("tool_tokens", tool_tokens)
    return tool_tokens, sum(e.get("type") == "model.call_start" for e in events)


REDIS_CLI = re.compile(r"redis-cli")
REDIS_READ = re.compile(r"SLOWLOG|CLIENT\s+LIST", re.I)


def dependency_use(run_id):
    """(ran redis-cli, read SLOWLOG or CLIENT LIST with it) from the trial's shell commands."""
    ran = read = False
    for e in events_of(run_id):
        if e.get("type") == "tool.execution_start":
            text = json.dumps(e["data"].get("arguments", ""))
            if REDIS_CLI.search(text):
                ran = True
                read = read or bool(REDIS_READ.search(text))
    return ran, read


def mcp_tool_counts(cell):
    counts = collections.Counter()
    for t in cell:
        counts.update({k.removeprefix("aspire-"): v for k, v in (t.get("mcp_calls") or {}).items()})
    return counts


def pct(x):
    return "-" if x is None else f"{x:+.0%}"


def t21():
    cells = rows({"t21"})
    print("## T2.1 aspire-mcp-compact2 vs aspire-mcp-compact (round t21)\n")
    print("| Scenario | Model | Pass | Chars read (total) | Δ | p | MCP chars | Δ | Agent s | Δ | p | Input tok | Δ | p | MCP spills/trial |")
    print("|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|")
    gate_cells, regress_luna, regress_any, pass_loss = 0, False, False, []
    for sc in ("slow-sql", "read-only"):
        for model in (LUNA, TERRA):
            a, b = cells[(sc, model, "aspire-mcp-compact2")], cells[(sc, model, "aspire-mcp-compact")]
            if not a or not b:
                print(f"| {sc} | {model} | missing ({len(a)} vs {len(b)}) |"); continue
            ca, cb, cd, cp = compare(a, b, "tool_result_content_chars")
            ma, mb, md, _ = compare(a, b, "mcp_result_content_chars")
            sa, sb, sd, sp = compare(a, b, "agent_seconds")
            ia, ib, idd, ip = compare(a, b, "input_tokens")
            spills = f"{statistics.mean(t.get('mcp_spills', 0) for t in a):.1f} vs {statistics.mean(t.get('mcp_spills', 0) for t in b):.1f}"
            print(f"| {sc} | {model} | {passes(a)}/{len(a)} vs {passes(b)}/{len(b)} | {ca:,.0f} vs {cb:,.0f} | {pct(cd)} | {cp:.3f} "
                  f"| {ma:,.0f} vs {mb:,.0f} | {pct(md)} | {sa:.0f} vs {sb:.0f} | {pct(sd)} | {sp:.3f} | {ia:,.0f} vs {ib:,.0f} | {pct(idd)} | {ip:.3f} | {spills} |")
            gate_cells += cd is not None and cd <= -0.30
            regressed = sa > sb and sp < 0.05
            regress_any |= regressed
            regress_luna |= regressed and model == LUNA
            if passes(b) - passes(a) > 1:
                pass_loss.append(f"{sc}/{model}")
    g2, g1 = cells[("slow-redis", LUNA, "aspire-lean-mcp-compact2")], cells[("slow-redis", LUNA, "aspire-lean-mcp-compact")]
    guard = passes(g2) >= passes(g1) - 1 if g1 else None
    use2 = [dependency_use(t["run_id"]) for t in g2]
    use1 = [dependency_use(t["run_id"]) for t in g1]
    print(f"\nGuard slow-redis luna: lean-mcp-compact2 {passes(g2)}/{len(g2)} vs lean-mcp-compact {passes(g1)}/{len(g1)} -> "
          f"{'holds' if guard else 'FAILS'}; redis-cli run {sum(u[0] for u in use2)} vs {sum(u[0] for u in use1)}, "
          f"SLOWLOG/CLIENT LIST read {sum(u[1] for u in use2)} vs {sum(u[1] for u in use1)}")
    if g1 and passes(g1) <= 1:
        print("  control at 0-1/6: guard read on redis-cli use (rule).")
    verdict = ("drop" if gate_cells == 0 or regress_luna else
               "ship" if gate_cells == 4 and not regress_any and guard else "revise")
    print(f"\nGate met in {gate_cells}/4 cells; time regression luna {regress_luna}, any {regress_any}; pass loss > 1: {pass_loss or 'none'}")
    print(f"**Verdict by the rule as computed: {verdict}**")


def t27():
    cells = rows({"t21-t27"})
    print("## T2.7 aspire-mcp-tools8 vs aspire-mcp-src (round t21-t27)\n")
    print("| Scenario | Pass | Input tok (i) | Δ | p | tool_tokens/call | Model calls/trial | Attributable (ii), median | Agent s | Δ | p |")
    print("|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|")
    bands = []
    for sc in ("slow-sql", "read-only"):
        a, b = cells[(sc, LUNA, "aspire-mcp-tools8")], cells[(sc, LUNA, "aspire-mcp-src")]
        if not a or not b:
            print(f"| {sc} | missing ({len(a)} vs {len(b)}) |"); continue
        ia, ib, idd, ip = compare(a, b, "input_tokens")
        sa, sb, sd, sp = compare(a, b, "agent_seconds")
        sa_tt = [schema_and_calls(t["run_id"]) for t in a]
        sb_tt = [schema_and_calls(t["run_id"]) for t in b]
        src_tt = med([x for x, _ in sb_tt])
        shares = [(src_tt - tt) * calls / (t["input_tokens"] + (src_tt - tt) * calls)
                  for t, (tt, calls) in zip(a, sa_tt) if tt is not None and t.get("input_tokens")]
        share = med(shares)
        bands.append((sc, share, idd, ip))
        print(f"| {sc} | {passes(a)}/{len(a)} vs {passes(b)}/{len(b)} | {ia:,.0f} vs {ib:,.0f} | {pct(idd)} | {ip:.3f} "
              f"| {sorted({x for x, _ in sa_tt})} vs {sorted({x for x, _ in sb_tt})} | {med([c for _, c in sa_tt]):.0f} vs {med([c for _, c in sb_tt]):.0f} "
              f"| {share:.1%} | {sa:.0f} vs {sb:.0f} | {pct(sd)} | {sp:.3f} |")
        ca, cb = mcp_tool_counts(a), mcp_tool_counts(b)
        removed = {k: v for k, v in cb.items() if k in {"select_apphost", "list_integrations", "doctor", "refresh_tools", "list_docs", "search_docs", "get_doc"}}
        print(f"|   MCP calls | tools8 {dict(ca.most_common())} | src {dict(cb.most_common())} | src calls to removed tools: {removed or 'none'} |")
    g8, g15 = cells[("slow-redis", LUNA, "aspire-lean-mcp-tools8")], cells[("slow-redis", LUNA, "aspire-lean-mcp-src")]
    guard = passes(g8) >= passes(g15) - 1 if g15 else None
    print(f"\nGuard slow-redis luna: lean-mcp-tools8 {passes(g8)}/{len(g8)} vs lean-mcp-src {passes(g15)}/{len(g15)} -> {'holds' if guard else 'FAILS'}")
    route_ok = all(abs(passes(cells[(sc, LUNA, 'aspire-mcp-tools8')]) - passes(cells[(sc, LUNA, 'aspire-mcp-src')])) <= 1 for sc in ("slow-sql", "read-only"))
    shares = [s for _, s, _, _ in bands]
    verdict = ("pursue" if all(s >= 0.05 for s in shares) and route_ok and guard else
               "drop" if all(s < 0.02 for s in shares) else "no verdict between the bars")
    band = lambda x: "pursue" if x >= 0.05 else "drop" if x < 0.02 else "between"
    disagreements = [sc for sc, s, d, p in bands if d is not None and p < 0.05 and band(-d) != band(s)]
    print(f"Pass within one trial in both cells: {route_ok}; (i) in a different band with p < 0.05: {disagreements or 'none'}")
    print(f"**Verdict by the rule as computed: {verdict}**")


def t28():
    cells = rows({"t28"})
    control_redis = cells[("slow-redis", LUNA, "aspire-lean-mcp-all")]
    control_sql = cells[("slow-sql", LUNA, "aspire-lean-mcp-all")]
    print("## T2.8 variants vs aspire-lean-mcp-all (round t28)\n")
    print("| Arm | slow-redis pass | redis-cli run | SLOWLOG/CLIENT LIST | s to redis reply (median) | slow-redis s | variant used | slow-sql pass | slow-sql s | ÷ control | p |")
    print("|---|---|---:|---:|---:|---:|---|---|---:|---:|---:|")
    sql_med = med([t["agent_seconds"] for t in control_sql])
    qualifying = []
    for arm in ("aspire-lean-mcp-all", "aspire-lean-mcp-all-conn", "aspire-lean-mcp-all-hint", "aspire-lean-mcp-all-step"):
        r, s = cells[("slow-redis", LUNA, arm)], cells[("slow-sql", LUNA, arm)]
        use = [dependency_use(t["run_id"]) for t in r]
        if arm.endswith("conn"):
            used = sum(1 for t in r if (t.get("mcp_calls") or {}).get("aspire-get_resource_connection"))
        elif arm.endswith("step") or arm == "aspire-lean-mcp-all":
            used = sum(1 for t in r if "aspire-diagnose" in json.dumps(t.get("skills_loaded") or ""))
        else:
            used = sum(1 for t in r if (t.get("mcp_calls") or {}).get("aspire-list_resources"))
        _, _, _, p = compare(s, control_sql, "agent_seconds") if arm != "aspire-lean-mcp-all" else (0, 0, 0, None)
        smed = med([t["agent_seconds"] for t in s])
        ratio = smed / sql_med if smed and sql_med else None
        print(f"| {arm} | {passes(r)}/{len(r)} | {sum(u[0] for u in use)} | {sum(u[1] for u in use)} | {med([t.get('seconds_to_redis_reply') for t in r]) or '-'} "
              f"| {med([t['agent_seconds'] for t in r]) or 0:.0f} | {used}/{len(r)} | {passes(s)}/{len(s)} | {smed or 0:.0f} | {ratio or 0:.2f} | {'-' if p is None else f'{p:.3f}'} |")
        if arm != "aspire-lean-mcp-all" and len(r) and passes(r) >= 5 and ratio is not None and ratio <= 1.15:
            qualifying.append((passes(r), -(med([t["agent_seconds"] for t in r]) or 0), arm))
    if passes(control_redis) >= 5:
        print(f"\nControl passes slow-redis {passes(control_redis)}/{len(control_redis)} (>= 5/6): **no verdict, premise not reproduced** (rule).")
    elif qualifying:
        print(f"\n**Ship {max(qualifying)[2]}** (qualifying: {[q[2] for q in qualifying]})")
    else:
        print("\nNo variant reaches 5/6 within the slow-sql bar: **CLI-only lean for cheap models on silent faults** (rule).")


def t28s():
    cells = rows({"t28-skills", "t28-skills-topup"})
    base_redis, base_sql = cells[("slow-redis", LUNA, "aspire-skills-mcp-all")], cells[("slow-sql", LUNA, "aspire-skills-mcp-all")]
    official = cells[("slow-redis", LUNA, "aspire-skills-mcp")]
    print("## T2.8 on the shipped set + MCP (round t28-skills)\n")
    print("| Arm | slow-redis pass | skills loaded (none / router / monitoring) | redis-cli run | SLOWLOG/CLIENT LIST | s to redis reply | slow-redis s | variant used | slow-sql pass | slow-sql s | ÷ control | p |")
    print("|---|---|---|---:|---:|---:|---:|---|---|---:|---:|---:|")
    sql_med = med([t["agent_seconds"] for t in base_sql])
    qualifying = []
    for arm in ("aspire-skills-mcp", "aspire-skills-mcp-all", "aspire-skills-mcp-all-conn", "aspire-skills-mcp-all-hint", "aspire-skills-mcp-all-step"):
        r, s = cells[("slow-redis", LUNA, arm)], cells[("slow-sql", LUNA, arm)]
        use = [dependency_use(t["run_id"]) for t in r]
        loaded = [json.dumps(t.get("skills_loaded") or []) for t in r]
        skills = f"{sum(l == '[]' for l in loaded)} / {sum('\"aspire\"' in l for l in loaded)} / {sum('aspire-monitoring' in l for l in loaded)}"
        if arm.endswith("conn"):
            used = sum(1 for t in r if (t.get("mcp_calls") or {}).get("aspire-get_resource_connection"))
        elif arm.endswith("hint"):
            used = sum(1 for t in r if (t.get("mcp_calls") or {}).get("aspire-list_resources"))
        else:
            used = sum(1 for t in r if "aspire-monitoring" in json.dumps(t.get("skills_loaded") or ""))
        p = compare(s, base_sql, "agent_seconds")[3] if s and arm not in ("aspire-skills-mcp", "aspire-skills-mcp-all") else None
        smed = med([t["agent_seconds"] for t in s])
        ratio = smed / sql_med if smed and sql_med else None
        print(f"| {arm} | {passes(r)}/{len(r)} | {skills} | {sum(u[0] for u in use)} | {sum(u[1] for u in use)} | {med([t.get('seconds_to_redis_reply') for t in r]) or '-'} "
              f"| {med([t['agent_seconds'] for t in r]) or 0:.0f} | {used}/{len(r)} | {passes(s)}/{len(s)} | {smed or 0:.0f} | {ratio or 0:.2f} | {'-' if p is None else f'{p:.3f}'} |")
        if arm.startswith("aspire-skills-mcp-all-") and len(r) and passes(r) >= 5 and ratio is not None and ratio <= 1.15:
            qualifying.append((passes(r), -(med([t["agent_seconds"] for t in r]) or 0), arm))
    if passes(official) >= 5:
        print(f"\nOfficial aspire-skills-mcp passes {passes(official)}/{len(official)}: **no verdict, premise not reproduced on the shipped set either** (rule).")
    elif passes(base_redis) >= 5:
        print(f"\naspire-skills-mcp-all passes {passes(base_redis)}/{len(base_redis)}: patches 0001 + 0002 alone get there; **no verdict for the variants** (rule).")
    elif qualifying:
        print(f"\n**Ship {max(qualifying)[2]}** (qualifying: {[q[2] for q in qualifying]})")
    else:
        print("\nNo variant reaches 5/6 within the slow-sql bar: **CLI-only lean for cheap models on silent faults**, lean + MCP already passes (rule).")


if __name__ == "__main__":
    {"t21": t21, "t27": t27, "t28": t28, "t28s": t28s}[sys.argv[1]]()
