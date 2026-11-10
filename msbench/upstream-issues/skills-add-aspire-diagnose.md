---
repo: microsoft/aspire-skills
title: "Add an aspire-diagnose skill: a bounded recipe for 'a running app is slow, failing or unhealthy'"
finding: F17
labels: []
status: draft
issue:
---

## Summary

The shipped skills have no owner for first-line diagnosis of a running local app. On a
"the app is slow, find out why and fix it" prompt the agent gets the router, then
`aspire-monitoring`, and ends up reading unbounded `aspire otel` output or source code.
Measured against the same app without Aspire, the shipped skills + MCP make diagnosis
35% to 228% slower and 96% to 356% more expensive in tokens on three models (p ≤ 0.004
on tokens in all six cells).

## Proposal

Add `aspire-diagnose` (about 5 KB, no reference files on the main path). The measured
version is in the aspire-bench repository under
`msbench/telemetry/common/skills/new/aspire-diagnose/SKILL.md`. Its shape:

1. **Locate** with a bounded filter: `aspire otel traces -n 15 --search "duration:>500"`
   (or `--search "status:error"`), table output.
2. **Explain one trace** as JSON by ID, with a short table of what span patterns mean
   (one slow child; many similar children; uncovered time; error under a 200).
3. **Confirm at the dependency**, with the exact commands: `docker exec <container.id>
   psql …` for PostgreSQL, `docker exec … redis-cli -p 6380 SLOWLOG GET 10` and
   `CLIENT LIST` for Redis, using `container.id` from `aspire describe`.
4. **Fix** the smallest thing that removes the cause; do not restart or flush by default.
5. **Verify** with the same filter as step 1.

Trigger description states symptoms, not verbs: "a running local app is slow, failing
or unhealthy; find the root cause".

## Measured effect

Three faults (slow SQL, read-only database, a blocked Redis cache), three models,
6 to 12 trials per cell:

- Selected 162 of 162 times; every slow-SQL trial then ran the duration filter
  (0 of 30 shipped-skills trials did).
- Against shipped skills + MCP: 10% to 60% faster, 22% to 75% fewer input tokens, in
  all nine scenario × model cells (p ≤ 0.004 in the seven cells with n ≥ 6).
- Against the raw app: parity (−3% to +16% time, none significant) when the app's own
  log carries the evidence; decisive when it does not. On the cache fault the skill
  fixed 5 of 6 on the cheapest model against 0 of 6 for the shipped skills + MCP and
  1 of 8 for the raw app, 41% faster (p = 0.005); 45% to 68% faster on the other two.

## Caveats

- Step 3 names PostgreSQL and Redis only; other integrations need their own line.
- It works best with the router removed (see the companion issue); with the router
  present the cheapest model picked the wrong skill in 2 of 6 trials.
