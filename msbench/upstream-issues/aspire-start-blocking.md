---
repo: dotnet/aspire
title: "CLI: cold start is the AppHost's launch time, not the start/wait/describe sequence (a blocking start measured)"
finding: F21
labels: []
status: draft
issue:
---

## Summary

Bringing an app up from nothing takes a coding agent longer with Aspire than with the same app's
start script. The first hypothesis was the command sequence (`aspire start`, then `aspire wait` per
resource, then `aspire describe` for the URLs, where the raw path is one script). We built and measured
the fix that hypothesis suggests, and it does not help: **the gap is the AppHost's own time to a healthy
app.** This draft records the measurement, so the request upstream is the right one.

## What was measured

A patch to `aspire start` (built from source at `30326eb8`, the 2026-11-17 daily's commit): after the
AppHost starts, wait for every resource to be healthy (or to finish with exit code 0, like a migration)
using the same backchannel wait as `aspire wait`, then print one line per resource and its endpoint URLs.
`--wait <names>` waits for named resources only; it is the default under `--non-interactive`, and
`--no-wait` keeps today's behaviour. Compared with the unpatched source build in the same round, on
the aspire-bench `cold-start` scenario, Copilot CLI, 6 trials per cell, every trial passed:

| Model | raw start script | `aspire start` (unpatched) | `aspire start` blocking |
|---|---:|---:|---:|
| gpt-6-luna | 29.0 s | 40.2 s | 41.2 s |
| gpt-6.1-terra | 26.7 s | 38.6 s | 43.1 s |
| gpt-6.2-sol | 31.3 s | 39.8 s | 40.2 s |

(median seconds from the agent's first model call to evidence that both web resources serve)

From the moment the start command is invoked, the raw script has the app serving in about 22 s, and
Aspire takes 33–38 s with or without the blocking start. Inside the blocking start, the AppHost launch
(build of the file-based AppHost, DCP, dashboard) took 15–20 s before the first resource wait began, and
the resources took 14–19 s more. The waits and `describe` cost nothing measurable because they run while
the app is still starting. A one-command start written into a skill or into `AGENTS.md` did no better.
Agents also kept running `aspire wait` after a blocking start had already reported the resources healthy,
because the workspace README named the waits.

## Proposal

- Treat the AppHost launch (15–20 s here, before any resource starts) as the cold-start cost to reduce:
  break it down (file-based AppHost build and restore, DCP start, dashboard start), cache what can be cached,
  and start resources earlier.
- A `--wait` on `aspire start` is still a reasonable convenience (one call, endpoints printed, fewer tokens:
  terra used 49k against 72k), but it should not be expected to make agents faster. If it is added, it should
  not be the default under `--non-interactive` without an opt-out, since it changes scripted behaviour.

## Evidence

aspire-bench telemetry suite, PLAN cards T2.2 and T2.9 (round `t22`, 162 trials), FINDINGS F21. The patch
is `msbench/telemetry/common/aspire-patches/cli-start-wait.patch`.
