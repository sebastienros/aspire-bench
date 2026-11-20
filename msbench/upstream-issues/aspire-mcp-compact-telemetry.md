---
repo: microsoft/aspire
title: "MCP: list_traces / list_structured_logs / list_console_logs fill the 8k-token budget on every call, and `search` does not shrink them"
finding: F18, F31
labels: []
status: draft
issue:
---

## Summary

`SharedAIHelpers.MaximumListTokenLength` is 8192, and the telemetry tools fill it on every call. Against a small
running app (8 resources, one slow endpoint), captured on the 2026-11-09 daily (`4954c76a`); on
`17.1.0-preview.1.26567.3+30326eb8` the unpatched `list_traces` was still about 30 KB on every call and
`list_resources` 10,321 characters:

| MCP call | Response size |
|---|---:|
| `list_traces {}` | 31,797 chars |
| `list_traces {search: "duration:>500"}` | 29,981 chars |
| `list_structured_logs {}` | 32,630 chars |
| `list_console_logs {}` | 34,676 chars (once the app has produced that much output) |
| `list_resources {}` | 10,321 chars (mostly command descriptions) |

A `search` filter does not shrink the response, it only changes which traces fill it, and the response ends with
"Returned latest 21 traces. Earlier 118 traces not returned because of size limits". There is no way to ask for
fewer traces, for one trace by id, or for logs of one severity.

What the agent then reads depends on the harness, not on the server. Copilot CLI (1.0.99) writes any tool result
over about 20 KB to a file and shows the model an 837-character notice with the first 500 characters; in 54
diagnosis trials against the shipped server that happened 137 times, each followed by `rg`/`view` reads of the spill
file. VS Code's agent mode defers MCP tools behind `tool_search`, so a model that does not search for them never
calls them (one model called no Aspire MCP tool in 12 trials on two scenarios). A size measured at the server is
therefore not the size an agent reads, but a default response that no common harness passes whole is a response
that reaches the model as a pointer to a file.

## Proposal

Keep each default response under the common harness limits (about 20 KB here), and give the tools the parameters
that let an agent ask for less:

- `list_traces`: one summary per trace (root span, duration, the slowest child span with its statement, the first
  failed span), with `limit` and `traceId` (full detail for one trace on request). Keep the current shape behind a
  `format: full` option for callers that want it.
- `list_structured_logs`: `limit` and `severity`.
- `list_console_logs`: `limit` and a head/tail choice.
- `list_resources`: move command descriptions out of the default listing.

A patch for the first two is attached as a starting point (`0001-mcp-compact-telemetry.patch` in the aspire-bench
repository: 3 files, 25 unit tests passing, 5 new). With it, `list_traces {}` drops from 31,797 to 8,988 characters,
a filtered call to 2,854 and the summary already names the slow SQL; `list_structured_logs {severity: "Error"}`
returns 734 characters.

## Measured

aspire-bench telemetry suite, PLAN T1.4 (round `t14`, 2026-11-18): the patched server against the unpatched source
build of the same commit, same round, Copilot CLI 1.0.99, two faults (slow SQL, read-only database), six trials per
cell, MSBench models `gpt-6-luna` and `gpt-6.1-terra`.

- Without skills (MCP as the agent's main route): terra −29 % and −30 % agent time (p = 0.009 and 0.002); luna −12 %
  and −10 %, not significant, and one luna cell passed 4 of 6 against 6 of 6.
- Spills fell from 137 to 28 in 54 trials. Under this harness the gain comes from fewer follow-up file reads, not
  from a smaller context: the compact shape puts more trace text in front of the model per call (median 6.4k
  characters per MCP call against 3.9k, where the unpatched figure mixes small results with 837-character notices).
- With a focused diagnosis skill alongside, the patch moved agents from the CLI onto MCP (median MCP calls per trial
  4 → 8 and 7.5 → 11 on luna) and cost 8 % to 24 % more input tokens, with time between 0.85× and 1.30× of the
  unpatched lean arm and no consistent direction.
- `list_resources` (10 KB) and `list_console_logs` (0.1k to 3.8k per trial in these short runs, far from the table's
  figure) never crossed Copilot CLI's threshold in either arm (PLAN T2.1), so compacting them changes nothing this
  harness shows the model; the remaining spills are `list_structured_logs`.

The benchmark's pre-registered rule required a significant gain on the cheapest model, so the patch was not adopted
there. We propose it for the response shape, not for a measured speed-up: the numbers above are specific to one
harness, the server-side sizes are not.

## Caveats

- The default shape of `list_traces` changes; `format: full` keeps the old behaviour.
- Six trials per cell on one application; agent-time effects are harness-specific (above).
