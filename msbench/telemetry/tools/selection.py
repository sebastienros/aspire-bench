#!/usr/bin/env python3
"""Selection benchmark (PLAN card T3.9): which skill does the agent load first for a prompt?

    tools/selection.py            extract runs listed in results/selection-ledger.jsonl, rebuild results
    tools/selection.py --no-fetch only re-derive from artifacts already on disk

Each run is a static copy of the aspirified Bingo workspace (nothing running) whose Copilot CLI policy hook
(common/bench/selection/pretool.sh, installed in /etc/github-copilot/policy.d/) stops the agent at
its first skill load or at its fourth command. A run's "selected" skill is the first `skill` call the model makes with at most three
commands (calls other than view, glob, grep, report_intent, think) before it; "none" otherwise.

Calibration uses the same definition on the full trials in results/trials.jsonl, read from their
trajectories, so the two are compared like for like.

Outputs (committed): results/selection.jsonl (one row per run) and results/selection.md. Runs live in
their own ledger, so they never enter trials.jsonl, the comparison cells or the series.
"""
import collections
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import collect  # noqa: E402  (fetch, load_events, DATA)

SUITE = collect.SUITE
READS = {"view", "glob", "grep", "report_intent", "think"}
MAX_COMMANDS = 3
SELECTION_PROMPTS = SUITE / "tools/selection-prompts.mjs"
# Calibration targets: the full trials on the same pin and bundle (round t01b, pin 2026-11-17,
# aspire-skills v0.0.6), on the suite's own prompts. Written in PLAN T3.9 before any selection run.
CALIBRATION = [
    # (label, arm, model, prompt scenarios in the trials, skill counted)
    ("router first, shipped set + MCP, diagnosis", "aspire-skills-mcp", "gpt-6-luna", ("slow-sql", "read-only", "slow-redis"), "aspire"),
    ("aspire-diagnose first, lean, diagnosis", "aspire-lean", "gpt-6-luna", ("slow-sql", "read-only", "slow-redis"), "aspire-diagnose"),
    ("aspire-monitoring first, shipped set + MCP, diagnosis", "aspire-skills-mcp", "gpt-6.1-terra", ("slow-sql", "read-only", "slow-redis"), "aspire-monitoring"),
    ("aspire-diagnose first, lean, diagnosis", "aspire-lean", "gpt-6.1-terra", ("slow-sql", "read-only", "slow-redis"), "aspire-diagnose"),
    ("router first, shipped set + MCP, cold start", "aspire-skills-mcp", "gpt-6-luna", ("cold-start",), "aspire"),
    ("aspire-orchestration first, lean, cold start", "aspire-lean", "gpt-6-luna", ("cold-start",), "aspire-orchestration"),
]
TRIAL_TO_SELECTION = {"slow-sql": "sel-suite-sluggish", "slow-redis": "sel-suite-sluggish",
                      "read-only": "sel-suite-readonly", "cold-start": "sel-suite-coldstart"}
CALIBRATION_ROUNDS = {"t01b"}
PROBE_PREFIX = "t39-probe"
SUITE_DIAGNOSIS = ("slow-sql", "read-only", "slow-redis")


def prompt_owners():
    """Scenario -> owner, parsed from selection-prompts.mjs (p("id", "owner", ...) lines)."""
    owners = {f"sel-{k}": "suite" for k in ("suite-sluggish", "suite-readonly", "suite-coldstart")}
    import re
    for match in re.finditer(r'p\("([^"]+)", "([^"]+)"', SELECTION_PROMPTS.read_text()):
        owners[f"sel-{match.group(1)}"] = match.group(2)
    return owners


def requests(events):
    """Tool calls the model asked for, in order (denied ones included)."""
    calls = []
    for event in events:
        if event.get("type") == "assistant.message":
            for request in event.get("data", {}).get("toolRequests") or []:
                arguments = request.get("arguments") or {}
                calls.append((request.get("name"), arguments if isinstance(arguments, dict) else {}))
    return calls


def first_skill(calls, limit=MAX_COMMANDS):
    commands = 0
    for name, arguments in calls:
        if name == "skill":
            return arguments.get("skill"), commands
        if name not in READS:
            commands += 1
            if commands > limit:
                return None, commands
    return None, commands


def trial_events(root):
    trajectory = next(root.rglob("copilot-cli.jsonl"), None)
    return collect.load_events(trajectory) if trajectory else None


def clopper_pearson(k, n, level=0.90):
    """Exact two-sided binomial interval."""
    alpha = 1 - level

    def cdf(x, p):
        return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(x + 1))

    def bisect(f, target, increasing):
        lo, hi = 0.0, 1.0
        for _ in range(60):
            mid = (lo + hi) / 2
            if (f(mid) < target) == increasing:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2

    lower = 0.0 if k == 0 else bisect(lambda p: 1 - cdf(k - 1, p), alpha / 2, True)
    upper = 1.0 if k == n else bisect(lambda p: cdf(k, p), alpha / 2, False)
    return lower, upper


def analyze(entry):
    root = collect.DATA / "extracted" / entry["run_id"] if "--no-fetch" in sys.argv else collect.fetch(entry["run_id"])
    results = [p for p in root.rglob("result.json") if "trial_name" in p.read_text()[:4000]]
    rows = []
    for result in results:
        native = json.loads(result.read_text())
        trial_dir = result.parent
        row = dict(run_id=entry["run_id"], scenario=entry["scenario"], arm=entry["arm"], model=entry["model"],
                   round=entry["round"], task=entry.get("task"), task_repo_commit=entry.get("task_repo_commit"),
                   trial=native.get("trial_name"))
        exception = native.get("exception_info")
        row["exception"] = (exception or {}).get("exception_type") if isinstance(exception, dict) else exception
        metrics = native.get("agent_result") or {}
        row["input_tokens"] = metrics.get("n_input_tokens")
        row["cost_usd"] = metrics.get("cost_usd")
        timing = native.get("agent_execution") or {}
        if timing.get("started_at") and timing.get("finished_at"):
            row["agent_seconds"] = round((collect.parse_time(timing["finished_at"])
                                          - collect.parse_time(timing["started_at"])).total_seconds(), 1)
        hook = next(trial_dir.rglob("selection-hook.jsonl"), None)
        hook_lines = [json.loads(line) for line in hook.read_text().splitlines() if line.strip()] if hook else []
        row["hook_calls"] = len(hook_lines)
        row["hook_denied"] = sum(line.get("decision") == "deny" for line in hook_lines)
        events = trial_events(trial_dir.parent.parent if not any(trial_dir.rglob("copilot-cli.jsonl")) else trial_dir)
        if events is None:
            row["selected"] = None
            rows.append(row)
            continue
        calls = requests(events)
        skill, commands = first_skill(calls)
        row["selected"] = skill or "none"
        row["commands_before"] = commands
        row["requests"] = [name for name, _ in calls][:12]
        row["model_calls"] = sum(e.get("type") == "model.call_start" for e in events)
        row["model_service_5xx"] = sum(e.get("type") == "model.call_failure"
                                       and (e.get("data", {}).get("statusCode") or 0) >= 500 for e in events)
        rows.append(row)
    return rows


def trial_baseline():
    """The calibration targets, measured on the full trials with the same definition."""
    trials = [json.loads(line) for line in (SUITE / "results/trials.jsonl").read_text().splitlines() if line.strip()]
    out = {}
    for label, arm, model, scenarios, skill in CALIBRATION:
        picked = [t for t in trials if t["arm"] == arm and t["model_requested"] == model and t["scenario"] in scenarios
                  and t["round"] in CALIBRATION_ROUNDS and not t.get("excluded") and not t.get("infrastructure_failure")
                  and (t.get("agent") or collect.DEFAULT_AGENT) == collect.DEFAULT_AGENT]
        selected = []
        for t in picked:
            events = trial_events(collect.DATA / "extracted" / t["run_id"])
            if events is not None:
                selected.append(first_skill(requests(events))[0] or "none")
        out[(arm, model, scenarios)] = (label, skill, selected)
    return out


def pin_trials(arm, model, scenarios, pin="2026-11-17"):
    """First skill of every graded Copilot CLI trial of the pin for one cell (every round), by round."""
    trials = [json.loads(line) for line in (SUITE / "results/trials.jsonl").read_text().splitlines() if line.strip()]
    by_round = collections.defaultdict(list)
    for t in trials:
        if (t["arm"] == arm and t["model_requested"] == model and t["scenario"] in scenarios and t.get("pin") == pin
                and not t.get("excluded") and not t.get("infrastructure_failure")
                and (t.get("agent") or collect.DEFAULT_AGENT) == collect.DEFAULT_AGENT):
            events = trial_events(collect.DATA / "extracted" / t["run_id"])
            if events is not None:
                by_round[t["round"]].append(first_skill(requests(events))[0] or "none")
    return by_round


def fmt_ci(k, n):
    lo, hi = clopper_pearson(k, n)
    return f"{k}/{n} ({lo:.2f}–{hi:.2f})"


def report(rows):
    owners = prompt_owners()
    usable = [r for r in rows if r.get("selected") is not None and not r.get("exception")]
    lines = ["# Selection benchmark (T3.9)", "",
             "Generated by `tools/selection.py` from `results/selection-ledger.jsonl`. A run is a static copy of the",
             "aspirified Bingo workspace (nothing running) stopped at its first skill load or at its fourth",
             "command; **selected** = the first skill the model loads with at most three commands before it.",
             "Intervals are exact binomial (Clopper-Pearson) 90 %. These runs are not trials and appear in no",
             "other results file. The hook probes (rounds `t39-probe`, `t39-probe2`) are counted in the run line",
             "and excluded from every table.", ""]
    failed = [r for r in rows if r.get("selected") is None or r.get("exception")]
    acted = [r for r in rows if r.get("requests")]
    lines += [f"Runs: {len(rows)} ({len(failed)} without a usable trajectory or with a runner exception); "
              f"the hook fired in {sum(r.get('hook_calls', 0) > 0 for r in acted)} of the {len(acted)} runs that asked "
              f"for a tool (the others answered without one); cost ${sum(r.get('cost_usd') or 0 for r in rows):.2f}.", ""]
    usable = [r for r in usable if not r["round"].startswith(PROBE_PREFIX)]

    # Calibration
    lines += ["## Calibration against the full trials (same pin, bundle and prompts; the static copy has no build output or AppHost state)", "",
              "| Target | Model | Trials (`t01b`) | Selection runs | Trial rate inside the runs' 90 % interval |",
              "|---|---|---|---|---|"]
    for (arm, model, scenarios), (label, skill, selected) in trial_baseline().items():
        wanted = {TRIAL_TO_SELECTION[s] for s in scenarios}
        runs = [r for r in usable if r["arm"] == arm and r["model"] == model and r["scenario"] in wanted
                and r["round"].startswith("t39-cal")]
        k_t, n_t = sum(s == skill for s in selected), len(selected)
        k_s, n_s = sum(r["selected"] == skill for r in runs), len(runs)
        inside = "-"
        if n_s and n_t:
            lo, hi = clopper_pearson(k_s, n_s)
            inside = "yes" if lo <= k_t / n_t <= hi else "**no**"
        trial_mix = ", ".join(f"{k} {v}" for k, v in collections.Counter(selected).most_common())
        run_mix = ", ".join(f"{k} {v}" for k, v in collections.Counter(r["selected"] for r in runs).most_common())
        lines.append(f"| {label} (`{arm}`) | {model} | {k_t}/{n_t} ({trial_mix}) | "
                     f"{fmt_ci(k_s, n_s) if n_s else '-'} ({run_mix or '-'}) | {inside} |")
    lines.append("")

    # Every suite-prompt cell against every trial of the pin (descriptive; the rule uses the targets above)
    suite_runs = [r for r in usable if owners.get(r["scenario"]) == "suite"]
    if suite_runs:
        lines += ["## Every suite-prompt cell against all trials of the pin (descriptive)", "",
                  "Selection runs from every round (`t39-cal`, `t39-mat`, `t39-arm`) against every graded Copilot CLI",
                  "trial of pin 2026-11-17 in the same arm, model and scenario group, all rounds pooled. The compared",
                  "skill is the trials' most frequent first choice. Not part of the pre-registered rule.", "",
                  "| Arm | Model | Prompts | Trials: first skill (rounds) | Selection runs | Trials' top choice: trial rate, runs' 90 % interval | Inside |",
                  "|---|---|---|---|---|---|---|"]
        for arm, model, group in sorted({(r["arm"], r["model"], "cold start" if "coldstart" in r["scenario"] else "diagnosis")
                                          for r in suite_runs}):
            scenarios = ("cold-start",) if group == "cold start" else SUITE_DIAGNOSIS
            by_round = pin_trials(arm, model, scenarios)
            selected = [s for v in by_round.values() for s in v]
            runs = [r for r in suite_runs if (r["arm"], r["model"]) == (arm, model)
                    and (("coldstart" in r["scenario"]) == (group == "cold start"))]
            if not selected or not runs:
                continue
            top, k_t = collections.Counter(selected).most_common(1)[0]
            k_s = sum(r["selected"] == top for r in runs)
            lo, hi = clopper_pearson(k_s, len(runs))
            trial_mix = ", ".join(f"{k} {v}" for k, v in collections.Counter(selected).most_common())
            run_mix = ", ".join(f"{k} {v}" for k, v in collections.Counter(r["selected"] for r in runs).most_common())
            lines.append(f"| `{arm}` | {model} | {group} | {trial_mix} ({', '.join(sorted(by_round))}) | {run_mix} | "
                         f"{top}: {k_t}/{len(selected)}, runs {k_s}/{len(runs)} ({lo:.2f}–{hi:.2f}) | "
                         f"{'yes' if lo <= k_t / len(selected) <= hi else '**no**'} |")
        lines.append("")

    # Matrix on the shipped set
    matrix = [r for r in usable if r["arm"] == "aspire-skills" and r["round"].startswith("t39-mat")]
    if matrix:
        models = sorted({r["model"] for r in matrix})
        skills = sorted({o for o in owners.values() if o not in ("suite", "none")})
        lines += ["## Matrix: shipped set v0.0.6 without MCP (`aspire-skills`)", "",
                  "Own prompts: runs on the skill's six prompts that selected it (12 per model). Elsewhere: runs on",
                  "every other skill's prompts and the distractors that selected it. Audit rule: keep needs ≥ 10/12",
                  "own and ≤ 2/12 elsewhere; ≥ 3 elsewhere means split or narrow the trigger.", "",
                  "| Skill | " + " | ".join(f"{m} own | {m} elsewhere" for m in models) + " |",
                  "|---|" + "---|---|" * len(models)]
        for skill in skills:
            cells = []
            for model in models:
                mine = [r for r in matrix if r["model"] == model and owners.get(r["scenario"]) == skill]
                other = [r for r in matrix if r["model"] == model and owners.get(r["scenario"]) not in (skill, "suite")]
                cells += [f"{sum(r['selected'] == skill for r in mine)}/{len(mine)}",
                          f"{sum(r['selected'] == skill for r in other)}/{len(other)}"]
            lines.append(f"| `{skill}` | " + " | ".join(cells) + " |")
        for group, title in (("none", "Distractors (non-Aspire): runs that loaded any skill"),
                             ("suite", "Suite prompts: first skill")):
            cells = []
            for model in models:
                mine = [r for r in matrix if r["model"] == model and owners.get(r["scenario"]) == group]
                if group == "none":
                    cells.append(f"{sum(r['selected'] != 'none' for r in mine)}/{len(mine)}")
                else:
                    cells.append(", ".join(f"{k} {v}" for k, v in collections.Counter(r["selected"] for r in mine).most_common()))
            lines.append(f"| {title} | " + " | ".join(f"{c} | " for c in cells).rstrip(" |") + " |")
        lines += ["", "### Confusion: owner of the prompt → skill selected (both models)", "",
                  "| Owner | " + " | ".join(f"`{s}`" for s in skills + ["none"]) + " |",
                  "|---|" + "---|" * (len(skills) + 1)]
        for owner in skills + ["none", "suite"]:
            mine = [r for r in matrix if owners.get(r["scenario"]) == owner]
            counts = collections.Counter(r["selected"] for r in mine)
            lines.append(f"| {owner} | " + " | ".join(str(counts.get(s, 0) or "") for s in skills + ["none"]) + " |")
        lines.append("")

    # Other arms on the suite prompts
    extra = [r for r in usable if r["round"].startswith("t39-arm")]
    if extra:
        lines += ["## Phase 1 variants on the suite's prompts", "",
                  "| Arm | Model | Prompt | Runs | First skill |", "|---|---|---|---:|---|"]
        for key in sorted({(r["arm"], r["model"], r["scenario"]) for r in extra}):
            mine = [r for r in extra if (r["arm"], r["model"], r["scenario"]) == key]
            mix = ", ".join(f"{k} {v}" for k, v in collections.Counter(r["selected"] for r in mine).most_common())
            lines.append(f"| `{key[0]}` | {key[1]} | {key[2]} | {len(mine)} | {mix} |")
        lines.append("")

    # T3.1's split-row re-run (coordinating session, Q3 ruling; rule in PLAN T3.1 before the run)
    t31 = [r for r in usable if r["round"].startswith("t31-sel")]
    if t31:
        lines += ["## T3.1 selection re-run (`t31-sel`)", "",
                  "The router's and `aspire-orchestration`'s six prompts each, on the bundle without the router (T1.3's",
                  "proposal) and the shipped bundle in the same round. Rule (PLAN T3.1, row 6): under `norouter` no skill",
                  "other than `aspire-orchestration` on the router's prompts, and orchestration's own rate ≥ 10/12.", "",
                  "| Arm | Model | Prompts | Runs | First skill |", "|---|---|---|---:|---|"]
        for key in sorted({(r["arm"], r["model"], owners.get(r["scenario"])) for r in t31}):
            mine = [r for r in t31 if (r["arm"], r["model"], owners.get(r["scenario"])) == key]
            mix = ", ".join(f"{k} {v}" for k, v in collections.Counter(r["selected"] for r in mine).most_common())
            lines.append(f"| `{key[0]}` | {key[1]} | {key[2]}'s | {len(mine)} | {mix} |")
        for model in sorted({r["model"] for r in t31}):
            nr = [r for r in t31 if r["arm"] == "aspire-skills-norouter" and r["model"] == model]
            router = [r for r in nr if owners.get(r["scenario"]) == "aspire"]
            own = [r for r in nr if owners.get(r["scenario"]) == "aspire-orchestration"]
            others = collections.Counter(r["selected"] for r in router if r["selected"] not in ("aspire-orchestration", "none"))
            if router and own:
                k = sum(r["selected"] == "aspire-orchestration" for r in own)
                verdict = "discharged" if not others and k >= 10 else "split / narrow stands"
                lines.append(f"\n{model}, `norouter`: other skills on the router's prompts "
                             f"{dict(others) or 0}; orchestration own {k}/{len(own)} → **{verdict}**.")
        lines.append("")

    lines += ["## Per prompt", "", "| Prompt | Owner | Arm | Model | Selected (runs) |", "|---|---|---|---|---|"]
    for key in sorted({(r["scenario"], r["arm"], r["model"]) for r in usable}):
        mine = [r for r in usable if (r["scenario"], r["arm"], r["model"]) == key]
        mix = ", ".join(f"{k} {v}" for k, v in collections.Counter(r["selected"] for r in mine).most_common())
        lines.append(f"| {key[0]} | {owners.get(key[0], '?')} | `{key[1]}` | {key[2]} | {mix} |")
    return "\n".join(lines) + "\n"


def main():
    ledger_path = SUITE / "results/selection-ledger.jsonl"
    ledger = [json.loads(line) for line in ledger_path.read_text().splitlines() if line.strip()] if ledger_path.exists() else []
    rows = []
    for entry in ledger:
        if entry.get("model") == "oracle" or entry.get("cancelled"):
            continue
        found = analyze(entry)
        if not found:
            print(f"pending/no result: {entry['run_id']} {entry['scenario']} {entry['arm']} {entry['model']}", file=sys.stderr)
        rows += found
    (SUITE / "results/selection.jsonl").write_text("".join(json.dumps(r, sort_keys=True) + "\n" for r in rows))
    (SUITE / "results/selection.md").write_text(report(rows))
    print(f"{len(rows)} selection runs from {len(ledger)} ledger entries")


if __name__ == "__main__":
    main()
