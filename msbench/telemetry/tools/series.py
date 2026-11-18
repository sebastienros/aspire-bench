#!/usr/bin/env python3
"""The benchmark as a time series: one row per cell per run, as ratios to `raw` (REPORT.md §11.3).

    tools/series.py        reads results/trials.jsonl and results/ledger.jsonl,
                           writes results/series.jsonl and results/series.md

A cell is (agent, scenario, model, arm). A run is one measurement of the matrix:
- on the first pin (2026-11-09) every round is pooled into one run, the way comparison.md and
  the T0.1 tables pool them (its rounds r1 to r5 have only `raw-check`, so no round has the
  whole matrix with its own `raw`);
- on later pins a run is the round name up to the first `-`, so `t01b`, `t01b-solbridge`,
  `t01b-plugin` and `t01b-warm` are run `t01b`. Name the rounds of a new run `<run>[-<part>]`.
When an arm's skill content changed within a pin (a skill revised without a re-pin), a run that
holds both revisions has one row per revision, labelled with the first task commit that carried
it (`cell_arm` in trials.jsonl, from collect.label_skill_variants); both stay in the arm's series.

Every Aspire arm is reported against the `raw` cell of the same agent, scenario, model and run.
The trailing window of a cell is its last five earlier runs (WINDOW); a suite change that makes
earlier runs incomparable (new prompt or verifier, not a re-pin) starts a new window by adding
the first run of the new window to WINDOW_STARTS. Flags follow REPORT.md §11.2:

  regress-pass   pass rate fell by at least 2 trials in 5 (0.4 x n), binomial p < 0.05
  regress-time   time ratio +25 % or worse than the trailing median, Mann-Whitney p < 0.05
  regress-tokens token ratio, same rule
  improve-*      the mirror images
  selection-low  an arm with skills loaded a skill in fewer than 4 of 5 trials (reported, no trailing)
  leak           a trial touched a harness path (fails the run)
  no-raw         the run has no `raw` cell to divide by

Rows marked `excluded` in the ledger (model-service incident), oracle gates and infrastructure
failures are left out, as in every other results file. Only trials with a measured agent time
count, the rule comparison.md uses.
"""
import collections
import itertools
import json
import math
import re
import statistics
from pathlib import Path

SUITE = Path(__file__).resolve().parent.parent
FIRST_PIN = "2026-11-09"
DEFAULT_AGENT = "github-copilot-cli"
WINDOW = 5
WINDOW_STARTS = set()  # run ids that open a new trailing window (suite changes, not re-pins)
THRESHOLD = 0.25
SPARK = "▁▂▃▄▅▆▇█"
SKILL_ARM = re.compile(r"skills|lean|plus")  # arms that ship a skill set (gen-tasks.mjs `skills` != none)
ARM_ORDER = ["raw", "aspire-cli", "aspire-skills", "aspire-skills-plugin", "aspire-mcp", "aspire-skills-mcp",
             "aspire-plus", "aspire-lean", "aspire-lean-mcp", "aspire-lean-start", "aspire-mcp-src",
             "aspire-mcp-compact", "aspire-lean-mcp-src", "aspire-lean-mcp-compact", "aspire-lean-src",
             "aspire-lean-plain", "aspire-lean-mcp-all", "raw-check"]


def run_of(row):
    return FIRST_PIN if row["pin"] == FIRST_PIN else re.match(r"[^-]+", row["round"]).group(0)


def median(values):
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else None


def mann_whitney(a, b):
    """Two-sided rank-sum p: exact when the permutation count is small, normal approximation
    with tie correction otherwise (a run of 6 against a pooled window of 30 has 2 million)."""
    pooled = sorted(a + b)
    rank = {}
    for value in set(pooled):
        positions = [i + 1 for i, v in enumerate(pooled) if v == value]
        rank[value] = sum(positions) / len(positions)
    ranks = [rank[v] for v in a + b]
    n, m = len(a), len(b)
    observed = sum(ranks[:n])
    expected = n * (n + m + 1) / 2
    if math.comb(n + m, n) <= 200_000:
        extreme = total = 0
        for combo in itertools.combinations(range(n + m), n):
            total += 1
            extreme += abs(sum(ranks[i] for i in combo) - expected) >= abs(observed - expected) - 1e-9
        return extreme / total
    ties = sum(c ** 3 - c for c in collections.Counter(pooled).values())
    variance = n * m / 12 * ((n + m + 1) - ties / ((n + m) * (n + m - 1)))
    if variance <= 0:
        return 1.0
    z = (abs(observed - expected) - 0.5) / math.sqrt(variance)
    return min(1.0, math.erfc(max(z, 0) / math.sqrt(2)))


def binomial_low(k, n, p):
    """P(X <= k) for X ~ Binomial(n, p): how surprising a pass count this low is."""
    return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(0, k + 1))


def binomial_high(k, n, p):
    return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k, n + 1))


def spark(values):
    values = [v for v in values if v is not None][-10:]
    if not values:
        return ""
    low, high = min(values), max(values)
    if high - low < 1e-9:
        return SPARK[3] * len(values)
    return "".join(SPARK[round((v - low) / (high - low) * (len(SPARK) - 1))] for v in values)


def load():
    ledger = {}
    for line in (SUITE / "results/ledger.jsonl").read_text().splitlines():
        if line.strip():
            entry = json.loads(line)
            ledger[entry["run_id"]] = entry
    trials = []
    for line in (SUITE / "results/trials.jsonl").read_text().splitlines():
        row = json.loads(line)
        if (row["model_requested"] == "oracle" or row.get("excluded") or row.get("infrastructure_failure")
                or row.get("agent_seconds") is None):
            continue
        entry = ledger.get(row["run_id"], {})
        row["agent"] = row.get("agent") or entry.get("agent") or DEFAULT_AGENT
        row["task"] = row.get("task") or entry.get("task")
        row["submitted_at"] = entry.get("submitted_at")
        row["task_repo_commit"] = entry.get("task_repo_commit")
        row["run"] = run_of(row)
        row["cell_arm"] = row.get("cell_arm") or row["arm"]
        trials.append(row)
    return trials


def cell_metrics(trials):
    n = len(trials)
    seconds = [t["agent_seconds"] for t in trials]
    sec_median = median(seconds)
    skilled = sum(bool(t.get("skills_loaded")) for t in trials)
    skills = collections.Counter(s for t in trials for s in set(t.get("skills_loaded") or []))
    return {
        "n": n,
        "passed": sum(t.get("reward") == 1 for t in trials),
        "pass_rate": round(sum(t.get("reward") == 1 for t in trials) / n, 3),
        "agent_seconds": sec_median,
        "agent_seconds_mad": median([abs(s - sec_median) for s in seconds]),
        "input_tokens": median([t.get("input_tokens") for t in trials]),
        "cost_usd": median([t.get("cost_usd") for t in trials]),
        "seconds_to_root_cause_seen": median([t.get("seconds_to_root_cause_seen") for t in trials]),
        "skill_selection": round(skilled / n, 3),
        "skills_loaded": dict(sorted(skills.items())),
        "mcp_calls": median([sum((t.get("mcp_calls") or {}).values()) for t in trials]),
        "tool_result_chars": median([t.get("tool_result_chars") for t in trials]),
        "harness_leaks": sum(bool(t.get("protected_path_access")) for t in trials),
    }


def build(trials):
    groups = collections.defaultdict(list)
    for t in trials:
        # cell_arm splits an arm whose skill content changed within a pin (collect.label_skill_variants),
        # so one run can hold two rows of the same arm, one per skill revision.
        groups[(t["agent"], t["scenario"], t["model_requested"], t["arm"], t["run"], t["cell_arm"])].append(t)
    runs = collections.defaultdict(list)
    for t in trials:
        runs[(t["agent"], t["run"])].append(t)
    # A run's place in the series: when its first trial was submitted.
    order = {key: min(t["submitted_at"] or "" for t in rows) for key, rows in runs.items()}
    rows = []
    for (agent, scenario, model, arm, run, cell_arm), cell in groups.items():
        row = {"agent": agent, "scenario": scenario, "model": model, "arm": arm, "run": run,
               "skills_variant": cell_arm[len(arm):].strip(" ()") or None,
               "skills_content": sorted({t["skills_content"] for t in cell if t.get("skills_content")}),
               "run_started": order[(agent, run)], "cell_started": min(t["submitted_at"] or "" for t in cell),
               "pin": cell[0]["pin"],
               "rounds": sorted({t["round"] for t in cell}),
               "aspire_build": sorted({t.get("aspire_build") for t in cell if t.get("aspire_build")}),
               "skills_sha": sorted({t.get("skills_sha") for t in cell if t.get("skills_sha")}),
               "task": sorted({t["task"] for t in cell if t.get("task")}),
               "task_repo_commit": sorted({t["task_repo_commit"] for t in cell if t.get("task_repo_commit")}),
               **cell_metrics(cell)}
        raw = groups.get((agent, scenario, model, "raw", run, "raw"))
        row["raw_n"] = len(raw) if raw else 0
        for key in ("agent_seconds", "input_tokens", "cost_usd"):
            base = median([t.get(key) for t in raw]) if raw else None
            row[f"ratio_{key}"] = round(row[key] / base, 3) if base and row[key] is not None else None
        # Per-trial ratios (trial / same-run raw median) feed the trailing-window test.
        base_s = median([t["agent_seconds"] for t in raw]) if raw else None
        base_t = median([t.get("input_tokens") for t in raw]) if raw else None
        row["_trial_time"] = [t["agent_seconds"] / base_s for t in cell] if base_s else []
        row["_trial_tokens"] = [t["input_tokens"] / base_t for t in cell if t.get("input_tokens") is not None] if base_t else []
        rows.append(row)
    rows.sort(key=lambda r: (r["agent"] != DEFAULT_AGENT, r["agent"], r["scenario"], r["model"],
                             ARM_ORDER.index(r["arm"]) if r["arm"] in ARM_ORDER else 99, r["run_started"],
                             r["cell_started"]))
    flag(rows)
    return rows


def flag(rows):
    history = collections.defaultdict(list)
    for row in rows:  # sorted by run start within each cell
        key = (row["agent"], row["scenario"], row["model"], row["arm"])
        if row["run"] in WINDOW_STARTS:
            history[key] = []
        window = history[key][-WINDOW:]
        flags = []
        if row["arm"] != "raw" and row["raw_n"] == 0:
            flags.append("no-raw")
        if row["harness_leaks"]:
            flags.append("leak")
        if SKILL_ARM.search(row["arm"]) and row["skill_selection"] < 0.8:
            flags.append("selection-low")
        row["trailing_runs"] = [w["run"] for w in window]
        if window:
            trailing_pass = sum(w["passed"] for w in window) / sum(w["n"] for w in window)
            row["trailing_pass_rate"] = round(trailing_pass, 3)
            drop = trailing_pass * row["n"] - row["passed"]
            if drop >= 0.4 * row["n"] and binomial_low(row["passed"], row["n"], trailing_pass) < 0.05:
                flags.append("regress-pass")
            if -drop >= 0.4 * row["n"] and binomial_high(row["passed"], row["n"], trailing_pass) < 0.05:
                flags.append("improve-pass")
            for metric, trial_key in (("agent_seconds", "_trial_time"), ("input_tokens", "_trial_tokens")):
                trailing = median([w[f"ratio_{metric}"] for w in window])
                row[f"trailing_ratio_{metric}"] = round(trailing, 3) if trailing is not None else None
                current = row[f"ratio_{metric}"]
                pooled = [v for w in window for v in w[trial_key]]
                if current is None or trailing is None or not pooled or not row[trial_key]:
                    continue
                change = current / trailing - 1
                row[f"change_vs_trailing_{metric}"] = round(change, 3)
                p = mann_whitney(row[trial_key], pooled)
                row[f"p_vs_trailing_{metric}"] = round(p, 4)
                label = "time" if metric == "agent_seconds" else "tokens"
                if change >= THRESHOLD and p < 0.05:
                    flags.append(f"regress-{label}")
                if change <= -THRESHOLD and p < 0.05:
                    flags.append(f"improve-{label}")
        row["flags"] = flags
        row["spark_ratio_agent_seconds"] = spark([w["ratio_agent_seconds"] for w in history[key]] + [row["ratio_agent_seconds"]])
        history[key].append(row)


def render(rows):
    fmt = lambda v, spec="": "–" if v is None else format(v, spec)
    ratio = lambda v: "–" if v is None else f"{v:.2f}×"
    runs = collections.OrderedDict()
    for row in sorted(rows, key=lambda r: r["run_started"]):
        runs.setdefault((row["agent"], row["run"]), row)
    lines = ["# Series: every cell per run, as a ratio to `raw`", "",
             "Generated by `tools/series.py` from `trials.jsonl` and `ledger.jsonl` (machine-readable rows:",
             "`series.jsonl`). One row per cell (agent, scenario, model, arm) per run. Medians over trials with a",
             "measured agent time; `× raw` divides by the `raw` median of the same agent, scenario, model and run.",
             "`trail` is the median ratio of the cell's last five earlier runs; flags follow REPORT.md §11.2",
             "(see the docstring of `tools/series.py`). The spark line is the time ratio over the cell's runs,",
             "oldest first, scaled per cell. Excluded rounds (model-service incident), oracle gates and",
             "infrastructure failures are left out.", "",
             "## Runs", "",
             "| Agent | Run | Started | Pin | Rounds | Aspire build | Skills | Task |",
             "|---|---|---|---|---|---|---|---|"]
    for (agent, run), _ in runs.items():
        members = [r for r in rows if (r["agent"], r["run"]) == (agent, run)]
        rounds = sorted({x for r in members for x in r["rounds"]})
        builds = sorted({b[:b.index("+") + 9] if "+" in b else b for r in members for b in r["aspire_build"]})
        skills = sorted({s.split()[0] for r in members for s in r["skills_sha"]})
        tasks = sorted({x for r in members for x in r["task"]})
        started = min(r["run_started"] for r in members)
        lines.append(f"| {agent} | {run} | {started[:8] or '–'} | {members[0]['pin']} | "
                     f"{', '.join(rounds) if len(rounds) <= 4 else f'{len(rounds)} rounds pooled'} | "
                     f"{', '.join(builds) or '17.1.0-preview.1.26559.1+4954c76a'} | {', '.join(skills) or 'v0.0.5'} | "
                     f"{', '.join(tasks) or '–'} |")
    lines.append("")
    cells = collections.OrderedDict()
    for row in rows:
        cells.setdefault((row["agent"], row["scenario"], row["model"]), []).append(row)
    for (agent, scenario, model), members in cells.items():
        title = f"## {scenario} / {model}" + ("" if agent == DEFAULT_AGENT else f" / {agent}")
        lines += [title, "",
                  "| Arm | Run | n | Pass | Agent s (MAD) | Input tok | Time × raw | trail | Tokens × raw | trail | Skill sel. | MCP calls | Chars read | Flags | Time ratio |",
                  "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|"]
        for r in members:
            lines.append("| {} | {} | {} | {}/{} | {} ({}) | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |".format(
                r["arm"], r["run"] + (f" (tasks {r['skills_variant'].split()[-1]})" if r["skills_variant"] else ""),
                r["n"], r["passed"], r["n"], fmt(r["agent_seconds"], ".0f"),
                fmt(r["agent_seconds_mad"], ".0f"), fmt(r["input_tokens"], ",.0f"),
                "–" if r["arm"] == "raw" else ratio(r["ratio_agent_seconds"]),
                ratio(r.get("trailing_ratio_agent_seconds")) if r["arm"] != "raw" else "–",
                "–" if r["arm"] == "raw" else ratio(r["ratio_input_tokens"]),
                ratio(r.get("trailing_ratio_input_tokens")) if r["arm"] != "raw" else "–",
                f"{r['skill_selection']:.0%}", fmt(r["mcp_calls"], ".0f"), fmt(r["tool_result_chars"], ",.0f"),
                ", ".join(r["flags"]) or "", "" if r["arm"] == "raw" else r["spark_ratio_agent_seconds"]))
        lines.append("")
    return "\n".join(lines)


def main():
    rows = build(load())
    public = [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]
    (SUITE / "results/series.jsonl").write_text("".join(json.dumps(r, sort_keys=True) + "\n" for r in public))
    (SUITE / "results/series.md").write_text(render(public) + "\n")
    flagged = [r for r in public if any(f.startswith(("regress", "leak")) for f in r["flags"])]
    print(f"{len(public)} cell-runs; {len(flagged)} with a regression or leak flag")


if __name__ == "__main__":
    main()
