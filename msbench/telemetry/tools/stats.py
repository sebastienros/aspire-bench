#!/usr/bin/env python3
"""Exact two-sided Mann-Whitney tests for the headline comparisons.

Reads results/trials.jsonl and writes results/stats.md. With 3 to 6 trials per cell the
exact permutation distribution is enumerated, so no normal approximation is involved.
The smallest attainable two-sided p is 2/C(n+m, n): 0.0022 for 6 vs 6, 0.1 for 3 vs 3.
"""
import itertools
import json
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
                   ("aspire-lean", "aspire-skills")]
FIRST_PIN = "2026-11-09"
DEFAULT_AGENT = "github-copilot-cli"
METRICS = [("agent_seconds", "s"), ("input_tokens", "tok"), ("cost_usd", "$")]


def mann_whitney(a, b):
    """Exact two-sided p-value of the rank-sum statistic (mid-ranks for ties)."""
    pooled = sorted(a + b)
    rank = {}
    for value in set(pooled):
        positions = [i + 1 for i, v in enumerate(pooled) if v == value]
        rank[value] = sum(positions) / len(positions)
    ranks = [rank[v] for v in a + b]
    observed = sum(ranks[:len(a)])
    expected = len(a) * (len(a) + len(b) + 1) / 2
    extreme = total = 0
    for combo in itertools.combinations(range(len(ranks)), len(a)):
        total += 1
        if abs(sum(ranks[i] for i in combo) - expected) >= abs(observed - expected) - 1e-9:
            extreme += 1
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
