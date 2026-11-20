---
repo: microsoft/aspire-skills
title: "`aspireify`: put the one-off integration path in the body and load references only on failure"
finding: F52, F54
labels: []
status: draft
issue:
---

## Summary

On a live app, `aspireify` (v0.0.6, 24 KB, 11 references) made agents slower at the job it claims, with no
reliability gain. The test asked agents to add Redis to an existing AppHost and move one project's distributed
cache onto it. With `aspireify` as the only skill, agents took 1.71× the time of the CLI alone on the cheapest model
(236 s against 138 s, p 0.002, n = 6) and 1.69× on a mid-tier model (349 against 206 s). Every trial of both arms
passed.

Wiring a whole AppHost for an existing repo shows the same direction: 1.35× and 1.23×, again with every trial
passing.

The trajectories put the extra time in the body's own main path:

- **Before the first edit (half of the cheapest model's +103 s):** the body says to "load these references before
  editing". The agents read `references/apphost-wiring.md` (21 KB) and one more reference, then ran the
  `aspire docs api search` / `aspire integration search` lookups the body prescribes. The CLI-only agents went
  straight from reading `apphost.cs` and `Program.cs` to the edit.
- **After the restart (the other half):** "VALIDATE → `aspire wait` <each resource>": 71 wait/describe/ps calls
  over six trials against 44.
- **On a repo with no AppHost:** every agent that had the skill ran `aspire init` (36/36). The CLI-only agents wrote
  a file-based `apphost.cs` by hand (0/12). On a repo with central package management, `aspire init` produces an
  AppHost whose restore fails with NU1008, which the agents then repaired.

Every arm made the same edits: a Redis resource, `WithReference`, a cache registration, a restart. The skill added
reading and checks, not a better route.

## Proposal

1. Add a short main path for a single integration in an existing AppHost, in the body:
   - `aspire add <package id>`: non-interactive mode needs the exact id or friendly name; `aspire add postgres`
     finds no match.
   - `WithReference` / `WaitFor` on the consuming resource.
   - The client registration in the consuming project.
   - Restart the AppHost, then `aspire wait` the changed resources only.

   The description already says "FOR SINGLE OPERATIONS: Run `aspire add PACKAGE` directly"; the body should match
   it.
2. Change "load these references before editing" to "load the reference for the step that failed".
3. When the repo uses central package management, say so before `aspire init`. Either use `--file-based`, or move
   the AppHost project's versions to `Directory.Packages.props`. (microsoft/aspire#22082 detects the file-based
   CPM case in the CLI; the project-based `aspire init` on a CPM repo is still the agent's problem.)

## Measured

Task T3.2 of the aspire-bench telemetry suite (`msbench/telemetry/PLAN.md`, T3.2 results). Setup:

- Aspire daily `17.1.0-preview.1.26567.3+30326eb8`, aspire-skills v0.0.6, Copilot CLI 1.0.99.
- Models `gpt-6-luna` and `gpt-6.1-terra`, six trials per cell.
- Arms: the CLI alone, `aspireify` alone, the v0.0.6 bundle, the bundle without `aspireify`.
- The pinned daily's packages were vendored into the image so that `aspire new` / `init` / `add` resolve the pin.

Caveats:

- Every arm passed every trial, so this is a time result.
- The attribution is read from trajectories; it is not an ablation of the body.
- The bundle was as slow with or without `aspireify` on the cheapest model (2.42× the CLI on the dependency task),
  so this change alone does not fix the bundle's time on authoring jobs.
