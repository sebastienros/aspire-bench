---
repo: microsoft/aspire-skills
title: "`aspire-project-v2-migration`: accept an explicit approval given in the request"
finding: F57
labels: []
status: draft
issue:
---

## Summary

`aspire-project-v2-migration` (v0.0.6) treats every request as authorizing an assessment only, and it asks for
approval of the exact edits before changing anything. That holds even when the request already grants the
approval. We asked agents to migrate a running AppHost with three `AddProject` calls to Project v2 and wrote "you
have my approval in advance for every edit the migration needs in the AppHost and its package references; do not
wait for further confirmation". On a mid-tier model, the skill made the migration fail in 6 of 6 trials, and in 5
of 6 with the shipped skill set. Without the skill the same model migrated correctly in 12 of 12.

## What happens

In most of these trials the agent completes a correct assessment: the right `AddDotnetProject` calls, the launch profile kept, the
`Aspire.Hosting.Dotnet` package at the AppHost's version. Then it stops: "Migration is blocked pending approval of
the exact edits below", "advance approval of unspecified edits does not satisfy that boundary". In a
non-interactive run (CI, an agent harness, a scripted request) nobody answers, so nothing is migrated.

## Proposal

Keep the plan-first behaviour, but let an approval that is explicit and scoped in the request count. For example,
"approval in advance for the migration's edits to the AppHost and its package references" would authorize those
files. The skill would still print the per-resource plan before editing and stop for anything outside that scope
(application code, project files). A one-line rule in the approval boundary would do it.

## Evidence

aspire-bench telemetry suite, PLAN T3.7, round `t37`, Aspire daily 17.1.0-preview.1.26567.3, aspire-skills v0.0.6,
Copilot CLI 1.0.99, n = 6 per cell. The cheapest model proceeded anyway in 5 of 6 trials; the mid-tier model
followed the boundary.
