---
repo: microsoft/aspire
title: "CLI: cold start is the AppHost's launch time, not the start/wait/describe sequence (a blocking start measured)"
finding: F21
labels: []
status: draft                  # held at the 2026-11-20 review, not filed
issue:                         # the one-call-wait convenience went as a comment on microsoft/aspire#16827 (2026-11-24, text below)
---

## Summary

Bringing an app up from nothing takes a coding agent longer with Aspire than with the same app's
start script. The first hypothesis was the command sequence (`aspire start`, then `aspire wait` per
resource, then `aspire describe` for the URLs, where the raw path is one script). We built and measured
the fix that hypothesis suggests, and it does not help: **the gap is the AppHost's own time to a healthy
app.** This issue records the measurement, so the request is the right one.

## What was measured

A patch to `aspire start` (built from source at `30326eb8`, the 2026-11-17 daily's commit): after the
AppHost starts, wait for every resource to be healthy (or to finish with exit code 0, like a migration)
using the same backchannel wait as `aspire wait`, then print one line per resource and its endpoint URLs.
`--wait <names>` waits for named resources only; it is the default under `--non-interactive`, and
`--no-wait` keeps today's behaviour. Compared with the unpatched source build in the same round, on
a cold-start scenario (MSBench, Copilot CLI), 6 trials per cell, every trial passed:

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
  and start resources earlier. Two pointers that much of it is first-start cost (not measured in the cells
  above): a warm workspace in another round (3 trials) reached a verified-up app in 34.5 s against 49.0 s cold,
  and locally a second start with the AppHost already built launched in about 4.5 s against 15–20 s.
- A `--wait` on `aspire start` is still a reasonable convenience (one call, endpoints printed, fewer tokens:
  terra used 49k against 72k), but it should not be expected to make agents faster. If it is added, it should
  not be the default under `--non-interactive` without an opt-out, since it changes scripted behaviour.

Related: #22194 (a warm TypeScript AppHost spending 44 s in `npm install` before any resource) and #17250 (warm
AppHost build cost) are the same phase from other angles.

## Evidence

MSBench, 162 trials in one round. The patch is available on request.

## Comment posted on microsoft/aspire#16827 (2026-11-24)

Posted as https://github.com/microsoft/aspire/issues/16827#issuecomment-7139414148 after the user asked for it; 16827 (`aspire wait` on several resources, open since 2026-05-06, Backlog) was added to epic 22511 as a sub-issue the same day. The text, verbatim:

Adding the coding-agent angle to this ask, from MSBench runs where agents (Copilot CLI 1.0.99; models `gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.2-sol`) start, fix and extend an aspirified sample app with seven resources.

**What an agent does today.** `aspire wait` takes one resource name, so an agent that wants a healthy app has to learn the names first and then wait once per name. Each command is a model turn: its output goes back to the model, which decides the next call. The flow our workspace instructions described, because the CLI allows nothing shorter, was `aspire start`, `aspire describe` to read the resource list, then one `aspire wait <name>` per resource; `gpt-6.1-terra` followed it in 6 of 6 cold-start trials. The skill shipped for adding an integration ends with "validate: `aspire wait` for each resource", and on the task that adds Redis and restarts the app that step is where the time goes: on `gpt-6-luna`, from the restart to the last call took 110 s with the skill against 58 s without it, with 71 `aspire wait` / `describe` / `ps` calls over six trials against 44.

**What a single call saves, and what it does not.** We measured a patched `aspire start` that waited for every resource (healthy, or exited 0 for one-shot resources) and printed the endpoints, which is the shape `aspire start && aspire wait --all` would give. On terra, median commands to a verified-up app fell from 5 to 3 and median tokens from 72k to 49k per trial; luna was flat (75k to 72k) and sol rose (83k to 91k, its start coming back unfinished at the harness's 30 s shell wait in 6 of 6 trials). A workspace file that named one wait instead of the describe-then-wait sequence had the same effect on luna: 58k tokens against 89k and 3.5 commands against 7. Wall-clock to a healthy app did not improve in any cell, because the per-resource waits overlap the app's own start-up; the blocking start was 0.6 to 3.8 s slower in every same-build pair (terra 43.1 s against 38.6 s, p = 0.002), and one candidate cause on record is that it waited on all seven resources where the agents waited on the two they needed. That argues for the multi-name form in this request as much as for `--all`: the saving is in model turns and context, and in the `describe` round trip that exists only to discover names, not in the app's start time. We also saw agents keep issuing per-resource waits after a blocking start had reported everything healthy, because their instructions named the waits; a first-class batch wait is what instructions would name instead.

**Suggested shape.**
- `aspire wait <res1> <res2> ...` as asked above, and `aspire wait --all` for every resource the AppHost would start.
- `ResourceWaitService` in the CLI already waits on a list and reports a per-resource outcome; the MCP server's `wait_for_resources` tool uses it and, when `resourceNames` is omitted, waits on every non-hidden, non-excluded resource. The CLI command could call the same service for the batch mechanics.
- What that service does not define is "done" per resource kind, which `--all` needs: healthy for services, exited 0 for one-shot resources such as migrations (today the `healthy` wait treats a completed resource as a failure, as `WaitFor` does), skipped for explicit-start resources, fail fast when one resource exits non-zero.
- Print one line per resource with its final state (and, with `--all`, the endpoint URLs), so the output is also the list a CI script or an agent needs and no `describe` follows. That is the per-resource list this request asks for.

The `AGENTS.md` start flow proposed in #22506 is written around the one-name limitation (start, describe, wait per name). With this in place it becomes `aspire start`, `aspire wait --all`, and `aspire describe` only when URLs are needed. Tracked from #22511.

Model names are MSBench model ids.
