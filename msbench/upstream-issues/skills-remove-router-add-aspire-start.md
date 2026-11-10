---
repo: microsoft/aspire-skills
title: "Remove the `aspire` router skill and add an `aspire-start` skill for the job it leaves behind"
finding: F17, F21
labels: []
status: draft
issue:
---

## Summary

The 20.7 KB `aspire` router claims every Aspire verb in its description
("…describe/ps/logs/otel…"), so it competes with any focused skill for the same prompt.
On a diagnosis prompt with both the router and a focused `aspire-diagnose` present, the
cheapest model loaded the router or `aspire-monitoring` instead in 2 of 6 trials and
took 167 s / 799k tokens against 93 s / 301k when the router was absent. With the
router gone, selection was 12 of 12.

Removing it, however, leaves "start the app" without an owner. In that configuration
the cheapest model fell through to `aspire-orchestration`, read its references
(`detection.md` 13 KB, `app-commands.md` 16 KB) and ran a `git status` / `git worktree
list` / `aspire ps` detection sequence before starting anything: 82 s and 249k tokens,
twice the raw app.

## Proposal

1. Remove the router. Each remaining skill is selected by its own description, which
   must state symptoms or tasks and exclude what a neighbour owns.
2. Add `aspire-start` (about 2 KB): start, `aspire wait` the endpoints, read URLs from
   `aspire describe`, and a short recovery path for a resource that does not come up.
   Measured version: `msbench/telemetry/common/skills/start/aspire-start/SKILL.md` in
   the aspire-bench repository.
3. If the router's "check before you edit" guardrail is needed, put it in the skills
   that edit rather than in front of every task.

## Measured effect

`aspire-start` was selected 9 of 9 on the cold-start scenario; on the cheapest model it
brought the time back from 82 s to 51 s (−38%) and tokens from 249k to 116k (−54%),
level with the shipped set and the bare CLI; no change on the two stronger models. It
does not beat the bare CLI: it is the required companion of the router's removal, not a
speed-up.

## Rule this supports

Every job a router fronted needs an owner skill before the router goes. Without one the
cheapest model falls through to the nearest broad skill and reads its references.
