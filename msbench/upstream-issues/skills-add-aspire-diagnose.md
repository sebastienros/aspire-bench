---
repo: microsoft/aspire-skills
title: "Add an aspire-diagnose skill: a bounded recipe for 'a running app is slow, failing or unhealthy'"
finding: F17, F23
labels: []
status: draft
issue:
---

## Summary

The shipped skills have no owner for first-line diagnosis of a running local app. On a "the app is slow, find out
why and fix it" prompt the agent lands on `aspire-monitoring` (with or without the router first), whose body is about telemetry
export, and ends up reading unbounded `aspire otel` output or source code. Measured on an aspirified sample application with injected faults (aspire-bench
telemetry suite; MSBench, Copilot CLI 1.0.99, Aspire daily `17.1.0-preview.1.26567.3+30326eb8`, aspire-skills
v0.0.6, pooled over the rounds of that pin), the shipped set with MCP against the same app without Aspire:

| Fault | Model | Shipped set + MCP ÷ raw, agent time [90 % interval] | Input tokens |
|---|---|---|---|
| slow SQL | `gpt-6-luna` | 1.71× [1.60–2.09], p < 0.001 | +177 % |
| slow SQL | `gpt-6.1-terra` | 1.63× [1.52–1.73], p < 0.001 | +159 % |
| read-only database | `gpt-6-luna` | 1.83× [1.32–3.44], p = 0.003 | +172 % |
| read-only database | `gpt-6.1-terra` | 1.40× [1.21–1.56], p < 0.001 | +137 % |

On a third fault, a cache blocked by another client, whose evidence is not in the app's own log, the shipped set
with MCP passed 0 of 24 luna trials (raw 8 of 54): the agents patched the application instead of the cache.

`aspire-diagnose` was revised once during this pin (the wording of step 1, PLAN T1.1). The lean numbers below use the
revised text on the slow-SQL and cache faults and, for `gpt-6-luna` and `gpt-6.1-terra`, the original text on the
read-only fault, the only text run there; `gpt-6.2-sol` and `claude-opus-5.5` ran the revised text everywhere.

## Proposal

Add `aspire-diagnose` (about 6 KB, no reference files on the main path). The measured version is in the
aspire-bench repository at `msbench/telemetry/common/skills/new/aspire-diagnose/SKILL.md`, commit `c85f32e` (the Redis
line of step 3 was made port-agnostic afterwards, commit `1474b83`; that text has not run in a trial). Its shape:

1. **Locate** with a bounded filter: `aspire otel traces -n 15 --search "duration:>500"` (or
   `--search "status:error"`), table output.
2. **Explain one trace** as JSON by id, with a short table of what span patterns mean (one slow child; many similar
   children; uncovered time; error under a 200).
3. **Confirm at the dependency**, with the exact commands run inside the resource's container, using `container.id`
   from `aspire describe`: `psql …` for PostgreSQL; `redis-cli SLOWLOG GET 10` and `CLIENT LIST` for Redis on its
   plain port (the skill probes 6379 then 6380 with a PING, since Aspire serves TLS on one of them).
4. **Fix** the smallest thing that removes the cause (do not restart or flush by default), then **verify** with the
   same filter as step 1.

Trigger description states symptoms, not verbs: "a running local app is slow, failing or unhealthy; find the root
cause".

## Measured effect

Same pin and harness, the "lean" set (this skill, the router removed, `aspire-monitoring`'s description narrowed, no
MCP), pooled over the pin's rounds; p from an exact Mann-Whitney test, intervals from a 90 % bootstrap of the ratio.

- **Selected every time by the models that use skills.** `aspire-diagnose` was loaded in 96 of 96 lean trials with the
  revised text on the three faults across `gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.2-sol` and `claude-opus-5.5` (138 of
  150 over both texts and six models: the 12 misses are all `claude-haiku-5.5`, which under Copilot CLI never called the skill tool on
  any arm; under Claude Code it loads this skill). Next to the router (`aspire-plus`, first pin) it was selected in
  only 4 of 6 luna trials.
- **Against the shipped set with MCP:** luna 0.47× the time on slow SQL (18 vs 18, p < 0.001) and 0.47× on read-only
  (p = 0.002); terra 0.61× (p < 0.001) and 0.67× (p = 0.002); sol 0.84× on read-only (p = 0.065) and 0.65× on the
  cache fault (p = 0.041); Opus 0.42× on the cache fault (p = 0.015). Input tokens 32 % to 71 % lower in every one of
  those cells. The remaining cells: Opus slow SQL 1.11× [1.00–1.42] (p = 0.13; tokens −42 %) and read-only 0.71×
  [0.48–1.26] (p = 0.18; tokens −43 %), sol slow SQL 0.87× by medians (53 against 61 s), the one pair the pooled table
  does not list.
- **Against the raw app:** parity on the two faults whose evidence is in the app's log. Luna 0.80× on slow SQL
  [0.71–1.05] and 0.85× on read-only [0.56–1.23], terra 1.00× [0.95–1.05] and 0.94× [0.90–0.99], none significant on
  time; tokens −21 % (luna slow SQL, p = 0.041) to +9 %. The original step-1 text was 1.23× on terra slow SQL
  (p = 0.006), a cross-round comparison; the revision was made for another fault (stuck work), not for this cell. The strong models pay for waiting on fresh telemetry before
  confirming a fix: Opus 1.45× on slow SQL (p = 0.026) and 1.35× on read-only (p = 0.065), sol 1.21× on read-only
  (p = 0.093); every trial passed.
- **Decisive where the log is silent** (the blocked cache): luna passed 25 of 30 (29 of 36 over both texts) against
  8 of 54 raw and 0 of 24 for the shipped set with MCP, at 0.51× raw's time [0.41–0.64]; terra 0.40× [0.26–0.63],
  sol 0.57× [0.36–0.81] (p = 0.004), Opus 0.42× [0.25–0.82]; the three stronger models passed every trial on every
  arm. Two comparator caveats from the same round: one Opus raw trial read the benchmark's own verifier file (without
  it Opus is 0.49×), and 5 of 6 sol raw trials read the benchmark's traffic generator, so sol's raw cell is
  contaminated in the raw arm's favour.
- **Pass rates otherwise unchanged:** lean 18 of 18 (luna) and 6 of 6 (terra) on slow SQL with the revised text
  (24 of 24 and 12 of 12 over both), 6 of 6 and 6 of 6 on read-only.

## Caveats

- Step 3 names PostgreSQL and Redis only; other integrations need their own line, or a generic `connect` entry in
  `aspire describe` (proposed separately on microsoft/aspire).
- It works best with the router removed (companion issue): with the router present the cheapest model picked the
  wrong skill in 2 of 6 trials on the first pin.
- Step 4's "confirm on fresh traffic" adds 15–45 s per confirmation on `claude-opus-5.5`, which waits for new
  telemetry; a revision that accepts the first clean trace was proposed (PLAN T1.8) and has not been measured.
- One application, one harness (Copilot CLI); six trials per cell per round. The pooled ratios mix rounds, and the
  same shipped-set cell moved from 147 to 271 s between rounds, so ratios near 1 are unresolved; the ratios far from
  1 (shipped set with MCP against raw, lean against shipped set with MCP, the cache pass rates) are not.
