---
repo: microsoft/aspire
title: "CLI: drop table borders and dashboard links when stdout is not a terminal"
finding: F19
labels: []
status: filed
issue: https://github.com/microsoft/aspire/issues/22508
---

## Summary

When an agent (or a script) captures CLI output, every box-drawing border character is
a multi-byte sequence and every row carries a dashboard URL it cannot click. In agent
transcripts, 57 KB of the 75 KB read from the Aspire CLI came from `aspire describe`
and the trace list, most of it borders and links.

## Proposal

A 13-line patch (`cli-plain-output.patch` in the aspire-bench repository): when
output is redirected, render tables without borders and without the per-row dashboard
link. Endpoint URLs are kept.

| Command | Shipped | Patched |
|---|---:|---:|
| `aspire describe` | 5,282 bytes | 1,221 bytes (−77%) |
| `aspire otel traces -n 15 --search "duration:>500"` | 6,863 bytes | 1,561 bytes (−77%) |
| `aspire otel traces` | 31,258 bytes | 12,280 bytes (−61%) |
| `aspire otel spans -n 20` | 3,386 bytes | 1,456 bytes (−57%) |
| `aspire describe --format Json` | 24,868 bytes | unchanged |

Measured on `17.1.0-preview.1.26567.3+30326eb8` (2026-11-18), patched source build against the
unpatched source build of the same commit, one running app. Since #22054 put the exit code in the
State cell, the per-row dashboard link wraps every `describe` row onto a third line, which is what the
patch removes; on the earlier daily (`4954c76a`) `describe` was 4,244 → 1,086 bytes.

Related: #16241 asked for `--no-color` on redirected output; this is the same situation, for the table
shape rather than the colours. `CliHostEnvironment.SupportsInteractiveOutput` already knows when stdout is redirected,
so the switch exists; today it drives spinners and markdown only.

Also related: the trace detail table omits the span's SQL text, so an agent that wants the
statement has to re-run the command with `--format Json` (188 KB unfiltered). Showing
the statement, truncated, in the table row would remove that hop.

## Measured effect

Patched vs unpatched source build, 3 trials per cell, three models, two faults: bytes
returned to the agent by all tools −21% to −59%; agent time −12% to +1%; input tokens
−23% to +2%. No cell significant. This is a context saving, not a speed-up on its own:
once the agent keeps its calls bounded, the conversation prefix dominates token use.
Worth shipping for the context it frees.
