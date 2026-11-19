#!/usr/bin/env python3
"""Exact two-sided Mann-Whitney tests for the headline comparisons.

Reads results/trials.jsonl and writes results/stats.md. With 3 to 6 trials per cell the
exact permutation distribution is enumerated, so no normal approximation is involved.
The smallest attainable two-sided p is 2/C(n+m, n): 0.0022 for 6 vs 6, 0.1 for 3 vs 3.
"""
import itertools
import json
import math
import statistics
from collections import defaultdict
from pathlib import Path

SUITE = Path(__file__).resolve().parent.parent
PAIRS = [("raw", "raw-check"), ("aspire-lean", "raw"), ("aspire-skills-mcp", "raw"), ("aspire-lean", "aspire-skills-mcp"),
         ("aspire-mcp-compact", "aspire-mcp-src"), ("aspire-lean-mcp-compact", "aspire-lean-mcp-src"),
         ("aspire-lean-plain", "aspire-lean-src"), ("aspire-lean-mcp-all", "aspire-lean-mcp-src"),
         ("aspire-lean-mcp-all", "raw"), ("aspire-lean-start", "aspire-lean"), ("aspire-lean-start", "aspire-skills"),
         ("aspire-lean-start", "raw")]
# Pairs added with the 2026-11-17 re-pin; they are computed for later pins only, so the first
# pin's table stays exactly as REPORT.md quoted it.
LATER_PIN_PAIRS = [("aspire-cli", "raw"), ("aspire-skills-plugin", "aspire-skills"),
                   # Phase 1 skills lane: one change each against the shipped set (T1.2, T1.3, T3.8).
                   ("aspire-skills-mon", "aspire-skills"), ("aspire-skills-norouter", "aspire-skills"),
                   ("aspire-lean", "aspire-skills"),
                   # T2.10: the instructions file against each control arm.
                   ("aspire-lean-agents", "aspire-lean"), ("aspire-cli-agents", "aspire-cli"),
                   ("aspire-skills-agents", "aspire-skills"),
                   # Phase 2 MCP lane: T2.1 against patch 0001, T2.7 against the unpatched control.
                   ("aspire-mcp-compact2", "aspire-mcp-compact"), ("aspire-lean-mcp-compact2", "aspire-lean-mcp-compact"),
                   ("aspire-mcp-tools8", "aspire-mcp-src"), ("aspire-lean-mcp-tools8", "aspire-lean-mcp-src"),
                   # T2.8: three MCP routes to the dependency against the current lean + MCP arm.
                   ("aspire-lean-mcp-all-conn", "aspire-lean-mcp-all"), ("aspire-lean-mcp-all-hint", "aspire-lean-mcp-all"),
                   ("aspire-lean-mcp-all-step", "aspire-lean-mcp-all"),
                   # T2.11: file v2, with the orchestration skill kept and removed.
                   ("aspire-lean-agents-v2", "aspire-lean"), ("aspire-lean-noorch-agents", "aspire-lean"),
                   ("aspire-lean-noorch-agents", "aspire-cli"),
                   # T2.5: traced against untraced, same arm; instrumented raw against raw.
                   ("aspire-lean-traced", "aspire-lean"), ("aspire-lean-mcp-all-traced", "aspire-lean-mcp-all"),
                   ("aspire-cli-traced", "aspire-cli"), ("raw-otel", "raw"), ("aspire-lean-traced", "raw-otel"),
                   # T2.6: generic step 3 (describe-connect patch) against the hand-written step on the source control.
                   ("aspire-lean-connect", "aspire-lean-src")]
FIRST_PIN = "2026-11-09"
DEFAULT_AGENT = "github-copilot-cli"
METRICS = [("agent_seconds", "s"), ("input_tokens", "tok"), ("cost_usd", "$")]


def mann_whitney(a, b):
    """Exact two-sided p-value of the rank-sum statistic (mid-ranks for ties).

    Counts, over all C(n+m, n) ways to pick A's ranks, how many sums are at least as far from
    the mean as the observed one. Counted by dynamic programming on doubled ranks (mid-ranks
    are halves, so doubled they are integers): the same integers full enumeration gives, so the
    same p, but pooled cells of 20+ trials per arm stay fast (C(56, 28) is about 7.6e15)."""
    pooled = sorted(a + b)
    rank2 = {}
    for value in set(pooled):
        positions = [i + 1 for i, v in enumerate(pooled) if v == value]
        rank2[value] = 2 * sum(positions) // len(positions)
    ranks = [rank2[v] for v in a + b]
    n = len(a)
    observed = sum(ranks[:n])
    expected = n * (len(ranks) + 1)  # twice n(N+1)/2
    # ways[k][s]: subsets of k ranks among those seen so far whose doubled sum is s.
    top = sum(ranks)
    ways = [[0] * (top + 1) for _ in range(n + 1)]
    ways[0][0] = 1
    for r in ranks:
        for k in range(n, 0, -1):
            row, below = ways[k], ways[k - 1]
            for s in range(top, r - 1, -1):
                if below[s - r]:
                    row[s] += below[s - r]
    total = math.comb(len(ranks), n)
    extreme = sum(count for s, count in enumerate(ways[n]) if abs(s - expected) >= abs(observed - expected))
    return extreme / total


def main():
    pins = defaultdict(lambda: defaultdict(list))
    for line in (SUITE / "results/trials.jsonl").read_text().splitlines():
        row = json.loads(line)
        if (row["model_requested"] != "oracle" and row.get("agent_seconds") is not None
                and not row.get("infrastructure_failure") and not row.get("excluded")):
            # Rows written before T0.4 carry no agent: Copilot CLI. Harnesses are never pooled.
            agent = row.get("agent") or DEFAULT_AGENT
            pins[(row["pin"], agent)][(row["scenario"], row["model_requested"], row.get("cell_arm") or row["arm"])].append(row)
    lines = ["# Significance of the headline comparisons", "",
             "Exact two-sided Mann-Whitney test on per-trial values. `A vs B` reports the change of A's",
             "median relative to B's. p is the probability of a rank separation at least this large if",
             "both arms came from the same distribution. Cells with 3 trials per arm cannot go below p = 0.10.",
             "Each pin (toolchain) has its own table; trials of different pins are never compared.", ""]
    for (pin, agent), cells in sorted(pins.items(), key=lambda item: (item[0][1] != DEFAULT_AGENT, item[0])):
        title = f"## Pin {pin}" + ("" if agent == DEFAULT_AGENT else f", harness {agent}")
        lines += [title, ""] + table(cells, PAIRS if pin == FIRST_PIN else PAIRS + LATER_PIN_PAIRS) + [""]
    (SUITE / "results/stats.md").write_text("\n".join(lines).rstrip("\n") + "\n")
    print("\n".join(lines[6:]))


def variants(cells, scenario, model, arm):
    return sorted(c for s, m, c in cells if (s, m) == (scenario, model) and c.split(" (")[0] == arm)


def table(cells, pairs):
    lines = ["| Scenario | Model | A vs B | n | Agent seconds | Input tokens | Cost |", "|---|---|---|---|---|---|---|"]
    for (scenario, model) in sorted({(s, m) for s, m, _ in cells}):
        # An arm split by a skill revision (collect.label_skill_variants) is compared per variant.
        for cell_a, cell_b in ((x, y) for a, b in pairs for x, y in itertools.product(
                variants(cells, scenario, model, a), variants(cells, scenario, model, b))):
            first, second = cells[(scenario, model, cell_a)], cells[(scenario, model, cell_b)]
            parts = []
            for key, _ in METRICS:
                x = [t[key] for t in first if t.get(key) is not None]
                y = [t[key] for t in second if t.get(key) is not None]
                if not x or not y or not statistics.median(y):
                    parts.append("-")
                    continue
                change = (statistics.median(x) - statistics.median(y)) / statistics.median(y)
                parts.append(f"{change:+.0%} (p={mann_whitney(x, y):.3f})")
            lines.append(f"| {scenario} | {model} | {cell_a} vs {cell_b} | {len(first)} vs {len(second)} | " + " | ".join(parts) + " |")
    return lines


if __name__ == "__main__":
    main()
