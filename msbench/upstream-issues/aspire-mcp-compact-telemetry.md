---
repo: dotnet/aspire
title: "MCP: list_traces / list_structured_logs / list_console_logs / list_resources each fill the 8k-token budget on every call"
finding: F18
labels: []
status: draft
issue:
---

## Summary

`SharedAIHelpers.MaximumListTokenLength` is 8192, and the telemetry tools fill it on
every call. Against a small running app (8 resources, one slow endpoint):

| MCP call | Response size |
|---|---:|
| `list_traces {}` | 31,797 chars |
| `list_traces {search: "duration:>500"}` | 29,981 chars |
| `list_structured_logs {}` | 32,630 chars |
| `list_console_logs {}` | 34,676 chars |
| `list_resources {}` | 10,321 chars (mostly command descriptions) |

A `search` filter does not shrink the response, it only changes which traces fill it.
An agent that diagnoses through MCP reads about 300 KB of tool output per incident, and
in our benchmark the two arms using the shipped MCP server were the only ones that
fixed the wrong thing (patched the application instead of the database) on the
cheapest model.

## Proposal

A patch is attached as the starting point
(`0001-mcp-compact-telemetry.patch` in the aspire-bench repository, 3 files, 25 unit
tests passing, 5 new):

- `list_traces` returns one summary per trace: root span, duration, the slowest child
  span with its statement (SQL / HTTP target), and the first failed span. It takes
  `limit` and `traceId` (full detail for one trace on request). `list_traces {}` drops
  from 31,797 to 8,988 chars; a filtered call to 2,854 chars and the summary already
  names the slow SQL.
- `list_structured_logs` takes `limit` and `severity`. `{severity: "Error"}` returns
  734 chars.

Still to do, same treatment: `list_resources` (move command descriptions out of the
default listing) and `list_console_logs` (take `limit` and a tail/head choice).

## Measured effect

Source-built CLI at the same commit, patched vs unpatched, 3 trials per cell, two
faults, two models: agent time fell in all eight cells (−6% to −36%); input tokens fell
8% to 62% when MCP was the agent's main route. With compact output the agent made MCP
its main route (median 5 to 10 MCP calls and 1 CLI call per trial, against 2 to 3 MCP
and 4 to 7 CLI calls before).

**Decision n, 2026-11-18** (aspire-bench PLAN T1.4, daily `30326eb8`, Copilot CLI 1.0.99, 6 trials per
cell): patched vs unpatched without skills, agent time −29 % and −30 % on the stronger model
(`gpt-6.1-terra`, p = 0.009 and 0.002) and −10 % to −12 % on the cheapest (`gpt-6-luna`, not significant;
one cell passed 4/6 against 6/6). With the lean skill set the patch moved agents from the CLI onto MCP and cost
8 % to 24 % more input tokens. The benchmark's pre-registered rule required a significant gain on the
cheapest model, so the patch was not taken forward there. Under Copilot CLI the unpatched 30 KB results are
not read whole: the harness replaces any result over about 20 KB with a 500-character preview and a file
path, so the measured gain comes from fewer follow-up file reads, not from a smaller context. A smaller
default response is still what a harness without that limit needs; the numbers above are specific to this
harness.

## Caveats

- The default shape of `list_traces` changes; a `format: full` option would keep the
  old behaviour for callers that want it.
- 3 trials per cell: a consistent direction, not a proven effect size.
