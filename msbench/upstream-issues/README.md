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
status: draft                  # draft | filed
issue:                         # URL once filed
---
```

## Filing

```bash
gh issue create --repo <repo> --title "<title>" --body-file <file-body>
```

After filing, set `status: filed`, put the URL in `issue:`, and add the link to the
finding's **Limits / status** line. Keep the file; it is the record of what was asked.

## Index

| File | Repo | Finding | Ask |
|---|---|---|---|
| [aspire-redis-default-ports.md](aspire-redis-default-ports.md) | microsoft/aspire | F22 | Plain Redis on 6379, TLS on 6380; or a hint where the agent looks |
| [aspire-mcp-compact-telemetry.md](aspire-mcp-compact-telemetry.md) | microsoft/aspire | F18 | Compact `list_traces` / `list_structured_logs` (patch 0001); same for `list_resources` and `list_console_logs` |
| [aspire-cli-plain-output.md](aspire-cli-plain-output.md) | microsoft/aspire | F19 | No borders or dashboard links when redirected (patch 0002); SQL text in the trace table |
| [aspire-start-blocking.md](aspire-start-blocking.md) | microsoft/aspire | F21 | A start that waits for health and prints endpoints |
| [aspire-agents-md.md](aspire-agents-md.md) | microsoft/aspire | F36 | `aspire new` / `aspire agent init` write `AGENTS.md` with the start flow (start, describe, wait `<resource-name>`) |
| [skills-add-aspire-diagnose.md](skills-add-aspire-diagnose.md) | microsoft/aspire-skills | F17 | New `aspire-diagnose` skill |
| [skills-remove-router-add-aspire-start.md](skills-remove-router-add-aspire-start.md) | microsoft/aspire-skills | F17, F21 | Remove the router; add `aspire-start` |
| [skills-narrow-aspire-monitoring.md](skills-narrow-aspire-monitoring.md) | microsoft/aspire-skills | F17 | Narrow the trigger description |
| [skills-aspireify-redis-client-tracing.md](skills-aspireify-redis-client-tracing.md) | microsoft/aspire-skills | F23, F47 | Propose the Aspire Redis client integration so cache calls are traced |
| [aspire-describe-connect.md](aspire-describe-connect.md) | microsoft/aspire | F38, F50 | A `connect` entry per resource in `aspire describe --format Json` with the command that reaches it with its own client |
| [aspire-js-otlp-without-sdk.md](aspire-js-otlp-without-sdk.md) | microsoft/aspire | F58 | Mark a JavaScript resource that received OTLP settings but never sent telemetry; document the Node SDK step |
| [aspire-proxy-port-conflict-describe.md](aspire-proxy-port-conflict-describe.md) | microsoft/aspire | F55 | A proxy that cannot bind its port is a resource error; `describe` must not advertise the URL (same root cause as open issue 9717: comment there) |
| [aspire-stop-teardown-race.md](aspire-stop-teardown-race.md) | microsoft/aspire | F56 | `aspire stop` waits for teardown; a start does not adopt containers being removed |
| [skills-shrink-aspireify.md](skills-shrink-aspireify.md) | microsoft/aspire-skills | F52, F54 | Short main path for one integration in the body; load references only on failure; warn before `aspire init` on central package management |
| [skills-v2-migration-advance-approval.md](skills-v2-migration-advance-approval.md) | microsoft/aspire-skills | F57 | Accept an explicit, scoped approval given in the request (see open issue 162 in that repository) |

Drafts under [tracking/](tracking/) are written by `msbench/telemetry/tools/track_drafts.py` for flags raised by a
tracking run (PLAN T4.5). They record a benchmark event, carry no target repository and are never filed.
