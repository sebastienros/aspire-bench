---
repo: dotnet/aspire
title: "CLI: drop table borders and dashboard links when stdout is not a terminal"
finding: F19
labels: []
status: draft
issue:
---

## Summary

When an agent (or a script) captures CLI output, every box-drawing border character is
a multi-byte sequence and every row carries a dashboard URL it cannot click. In agent
transcripts, 57 KB of the 75 KB read from the Aspire CLI came from `aspire describe`
and the trace list, most of it borders and links.

## Proposal

A 13-line patch (`0002-cli-plain-output.patch` in the aspire-bench repository): when
output is redirected, render tables without borders and without the per-row dashboard
link. Endpoint URLs are kept.

| Command | Shipped | Patched |
|---|---:|---:|
| `aspire describe` | 4,244 bytes | 1,086 bytes (−74%) |
| `aspire otel traces -n 15 --search "duration:>500"` | 6,863 bytes | 1,561 bytes (−77%) |
| `aspire otel spans -n 20` | 3,327 bytes | 1,399 bytes (−58%) |

Related: the trace detail table omits the span's SQL text, so an agent that wants the
statement has to re-run the command with `--format Json` (188 KB unfiltered). Showing
the statement, truncated, in the table row would remove that hop.

## Measured effect

Patched vs unpatched source build, 3 trials per cell, three models, two faults: bytes
returned to the agent by all tools −21% to −59%; agent time −12% to +1%; input tokens
−23% to +2%. No cell significant. This is a context saving, not a speed-up on its own:
once the agent keeps its calls bounded, the conversation prefix dominates token use.
Worth shipping for the context it frees.
