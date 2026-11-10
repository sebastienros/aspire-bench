---
repo: dotnet/aspire
title: "CLI: a start that waits for resources and prints their endpoints"
finding: F21
labels: []
status: draft
issue:
---

## Summary

Bringing an app up from nothing takes an agent 15% to 56% longer with Aspire than with
the same app's one-line start script, whatever skills it has, because the Aspire path
is three commands where the raw path is one:

1. `aspire start`
2. `aspire wait <resource>` for each endpoint it cares about
3. `aspire describe` to learn the URLs, then `curl` to verify

The raw agent runs the start script and `curl`s the URL printed in the README. Over
3 models × 3 trials the medians were raw 36 to 43 s against Aspire 49 to 56 s, with the
same success rate (all passed). The CLI with no skills is as fast as any skill set, so
this is not something guidance recovers.

## Proposal

Either of:

- `aspire start --wait` (or a default in non-interactive mode): return when every
  resource with health checks is healthy and print a resource → endpoint table, in the
  same plain shape as `aspire describe`.
- Make `aspire start` print the endpoint table at the end of its normal output when
  stdout is not a terminal, so `describe` is not needed to find the URLs.

## Evidence

`cold-start` scenario in the aspire-bench telemetry suite (RESULTS.md, "Cold start").
