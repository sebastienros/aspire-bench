---
repo: microsoft/aspire-skills
title: "Narrow aspire-monitoring's trigger to what its body covers; defer first-line diagnosis"
finding: F17
labels: []
status: draft
issue:
---

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
