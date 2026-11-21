# Upstream issues to file

Each file in this folder is one issue we intend to open on an external repository,
drafted from a finding in [FINDINGS.md](../FINDINGS.md) but not yet filed. Keeping them
here lets us batch the filing, review the wording first, and keep the link between
the issue and its evidence.

## File format

One markdown file per issue, named `<repo-short>-<slug>.md`. A YAML front matter
carries what the filing step needs; the body is the issue text as it should appear
upstream (write for the maintainers, not for this benchmark).

```yaml
---
repo: microsoft/aspire         # owner/name of the target repository
title: Issue title as it should appear upstream
finding: F22                   # finding ID in FINDINGS.md
labels: []                     # optional; only labels the repo already has
status: draft                  # draft | filed | superseded (fixed upstream before filing; issue: holds the PR) | folded (ask moved into another draft)
issue:                         # URL once filed
---
```

## Wording

Write for the maintainers. The MSBench model ids (`gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.2-sol`, `claude-opus-5.5`) may be
named in a filed issue when the text says the numbers come from MSBench (decided 2026-11-20); "the cheapest model"
wording is also fine. Nothing from the VS Code evaluation agent's internals goes in.

## Filing

```bash
gh issue create --repo <repo> --title "<title>" --body-file <file-body>
```

After filing, set `status: filed`, put the URL in `issue:`, and add the link to the
finding's **Limits / status** line. Keep the file; it is the record of what was asked.

## Index

| File | Repo | Finding | Ask |
|---|---|---|---|
| [aspire-redis-default-ports.md](aspire-redis-default-ports.md) | microsoft/aspire | F22 | **Superseded** by [PR 22350](https://github.com/microsoft/aspire/pull/22350) (merged 2026-11-20): plain Redis on 6379, TLS on 6380. Not filed |
| [aspire-mcp-compact-telemetry.md](aspire-mcp-compact-telemetry.md) | microsoft/aspire | F18, F31 | Default MCP telemetry responses under the common harness limit; `limit`/`traceId`/`severity`, per-trace summary (patch 0001); same for `list_resources` and `list_console_logs`. Shape ask, no speed claim (T1.4 `drop`). **Filed:** [microsoft/aspire#22507](https://github.com/microsoft/aspire/issues/22507) |
| [aspire-cli-plain-output.md](aspire-cli-plain-output.md) | microsoft/aspire | F19 | No borders or dashboard links when redirected (patch 0002); SQL text in the trace table. **Filed:** [microsoft/aspire#22508](https://github.com/microsoft/aspire/issues/22508) |
| [aspire-start-blocking.md](aspire-start-blocking.md) | microsoft/aspire | F21 | A start that waits for health and prints endpoints. **Held** (review of 2026-11-20): measurement recorded, no filing; its numbers are cited from the AGENTS.md issue |
| [aspire-agents-md.md](aspire-agents-md.md) | microsoft/aspire | F36 | `aspire new` / `aspire agent init` write `AGENTS.md` with the start flow (start, describe, wait `<resource-name>`). **Filed:** [microsoft/aspire#22506](https://github.com/microsoft/aspire/issues/22506) |
| [skills-add-aspire-diagnose.md](skills-add-aspire-diagnose.md) | microsoft/aspire-skills | F17, F23 | New `aspire-diagnose` skill (numbers at pin 2026-11-17). **Filed:** [microsoft/aspire-skills#178](https://github.com/microsoft/aspire-skills/issues/178) |
| [skills-remove-router.md](skills-remove-router.md) | microsoft/aspire-skills | F17, F21 | Remove the router; each skill selected by its own description; guardrails stay in the skills that edit (`aspire-start` dropped by T1.6, the orchestration skill or an AGENTS.md owns the start job). **Filed:** [microsoft/aspire-skills#179](https://github.com/microsoft/aspire-skills/issues/179) |
| [skills-narrow-aspire-monitoring.md](skills-narrow-aspire-monitoring.md) | microsoft/aspire-skills | F17 | **Folded** into the router and diagnose drafts (T1.2 `drop` alone). Not filed alone |
| [skills-aspireify-redis-client-tracing.md](skills-aspireify-redis-client-tracing.md) | microsoft/aspire-skills | F23, F47 | Propose the Aspire Redis client integration so cache calls are traced. **Filed:** [microsoft/aspire-skills#181](https://github.com/microsoft/aspire-skills/issues/181) |
| [aspire-describe-connect.md](aspire-describe-connect.md) | microsoft/aspire | F38, F50 | A `connect` entry per resource in `aspire describe --format Json` with the command that reaches it with its own client. **Filed:** [microsoft/aspire#22505](https://github.com/microsoft/aspire/issues/22505) |
| [aspire-js-otlp-without-sdk.md](aspire-js-otlp-without-sdk.md) | microsoft/aspire | F58 | Mark a JavaScript resource that received OTLP settings but never sent telemetry; document the Node SDK step. **Filed:** [microsoft/aspire#22509](https://github.com/microsoft/aspire/issues/22509) |
| [aspire-proxy-port-conflict-describe.md](aspire-proxy-port-conflict-describe.md) | microsoft/aspire | F55 | A proxy that cannot bind its port is a resource error; `describe` must not advertise the URL (same root cause as open issue 9717: comment there). **Held**: the 2026-08-10 comment on 9717 already carries the same repro; a comment with the launch-profile case, `--isolated` and the `WaitFor` consequence is drafted, not posted; 9717 is listed as related in the epic |
| [aspire-stop-teardown-race.md](aspire-stop-teardown-race.md) | microsoft/aspire | F56 | `aspire stop` waits for teardown; a start does not adopt containers being removed. **Filed:** [microsoft/aspire#22510](https://github.com/microsoft/aspire/issues/22510) |
| [skills-shrink-aspireify.md](skills-shrink-aspireify.md) | microsoft/aspire-skills | F52, F54 | Short main path for one integration in the body; load references only on failure; warn before `aspire init` on central package management. **Filed:** [microsoft/aspire-skills#180](https://github.com/microsoft/aspire-skills/issues/180) |
| [skills-v2-migration-advance-approval.md](skills-v2-migration-advance-approval.md) | microsoft/aspire-skills | F57 | Accept an explicit, scoped approval given in the request (see open issue 162 in that repository). **Filed:** [microsoft/aspire-skills#182](https://github.com/microsoft/aspire-skills/issues/182) |

Filed 2026-11-20 (11 issues, two epics with the filed issues as sub-issues): [microsoft/aspire#22511](https://github.com/microsoft/aspire/issues/22511) (milestone 17.1, assigned to sebastienros) and [microsoft/aspire-skills#183](https://github.com/microsoft/aspire-skills/issues/183) (assigned; that repository has no milestones). A second duplicate check at filing covered issues, PRs and `origin/main` source; what it corrected is in the drafts' pre-filing commit.

Drafts under [tracking/](tracking/) are written by `msbench/telemetry/tools/track_drafts.py` for flags raised by a
tracking run (PLAN T4.5). They record a benchmark event, carry no target repository and are never filed.
