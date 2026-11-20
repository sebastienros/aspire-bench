---
repo: microsoft/aspire
title: "`aspire new` and `aspire agent init`: write an AGENTS.md beside the AppHost with the start flow (start, describe, wait <resource-name>)"
finding: F36
labels: []
status: draft
issue:
---

## Summary

Coding agents read `AGENTS.md` (and `CLAUDE.md`) on every turn without any plugin, skill or MCP setup. A
short file beside the AppHost that gives the start flow in order (`aspire start`, then `aspire describe` as the
list of resources to wait on, then `aspire wait <resource-name>` for each one needed) lets an agent start an
Aspire app as fast as a dedicated start skill does, and faster than the shipped orchestration skill, with fewer
tokens. We propose that `aspire new` templates and `aspire agent init` write it.

## Proposed file

The skills section lists only the skills `aspire agent init` installed, one job line each (shown here for a
set without the orchestration skill):

```markdown
# Agent instructions

This is an Aspire application. Its AppHost is `/app/apphost.cs`.

## Run it
1. Start it: `aspire start --apphost /app/apphost.cs --non-interactive --isolated`.
2. `aspire describe` lists every resource of the running app with its state, health and endpoint
   URLs. That list names the resources to wait on.
3. `aspire wait <resource-name>` for each resource the task needs, with `<resource-name>` taken from
   that list. It returns when the resource is healthy.

`aspire logs <resource-name>` prints that resource's console output.

## When it is slow
Start with `aspire otel traces -n 15 --search "duration:>500"` (milliseconds; lower the
threshold if nothing comes back), before reading code or timing requests by hand.

## Skills
- `aspire-diagnose`: find why a running app is slow, failing or stuck, from its telemetry.
- `aspire-monitoring`: telemetry export, the standalone dashboard, browser telemetry.
- `aspireify`: wire resources into an AppHost.
- `aspire-init`: add Aspire to a repository.
- `aspire-deployment`: deploy or publish the app.
- `aspire-terminals`: Aspire terminals.
- `aspire-project-v2-migration`: move project resources to the v2 APIs.
```

On the daily measured, `aspire wait` requires a resource name, which is why the file explains `describe` as
the list to take the name from.

## Measured effect

aspire-bench PLAN T2.11, Copilot CLI 1.0.99, Aspire daily `30326eb8`, cold start of an 8-resource app, 6 trials
per cell, same round:

| | `gpt-6-luna` seconds to a verified-up app | tokens | `gpt-6.1-terra` |
|---|---:|---:|---:|
| Skills only (with the orchestration skill) | 46.8 | 152 k | 39.8 |
| Same skills + this file | 44.2 | 182 k | 35.2 |
| Skills without the orchestration skill + this file | **39.0** (p = 0.041) | **89 k** | 36.8 |
| No skills, no file (`aspire-cli`) | 39.7 | 70 k | |

With the orchestration skill present, `gpt-6-luna` followed the skill, not the file (0 of 6 ran `describe` before
`wait`); without it, 5 of 6 followed the file. `gpt-6.1-terra` ran `describe` before `wait` in 6 of 6 trials with or
without the skill (counts re-derived after the trajectory audit). Diagnosis on a running app was unaffected (6/6).

## Caveats

- Measured on one app and one harness; the workspace README also named the start command.
- The remaining gap to a hand-written start script (39 s against 28 s) is Aspire's own time to a healthy app
  (AppHost launch 15–20 s, then resource start-up), not the start returning before health: a blocking start
  closed none of it (see [aspire-start-blocking.md](aspire-start-blocking.md)).
- If the orchestration skill is removed from a set, other skills' descriptions that name it (for example
  `aspire-diagnose`'s "DO NOT USE FOR … (aspire-orchestration)") should point to the file instead: 2 of 6
  trials tried to load the missing skill.
