---
repo: microsoft/aspire-skills
title: "Narrow aspire-monitoring's trigger to what its body covers; defer first-line diagnosis"
finding: F17
labels: []
status: folded
issue:
---

> **Folded, not to be filed alone (2026-11-20).** T1.2 measured this change by itself with the router kept and found no
> gain (same round luna slow-SQL 1.34×, p = 0.09; pooled over the pin +53 %, p = 0.031). The ask lives on as
> proposal 2 of [skills-remove-router.md](skills-remove-router.md) and as the trigger wording in
> [skills-add-aspire-diagnose.md](skills-add-aspire-diagnose.md).

## Summary

`aspire-monitoring`'s description invites "why is my app slow" prompts, but its body is
about telemetry export, the standalone dashboard, browser telemetry and deployed-app
routing. An agent that lands there on a live incident has to work out the commands
itself. In the benchmark the cheapest model chose it over a focused diagnosis skill in
1 of 6 trials when both were available.

## Proposal

Change only the description:

- USE FOR: OTLP export and configuration, standalone dashboard, browser telemetry,
  routing telemetry from a deployed app.
- DO NOT USE FOR: finding why a running local app is slow, failing or unhealthy
  (that is `aspire-diagnose`).

The measured override is `msbench/telemetry/common/skills/lean-overrides/aspire-monitoring/SKILL.md`
in the aspire-bench repository; the body is unchanged.

## Measured effect

Part of the `lean` set (new `aspire-diagnose`, router removed, this description). With
it, skill selection on diagnosis prompts was 12 of 12 on the cheapest model and 57 of
57 across models. Not isolated from the other two changes.
