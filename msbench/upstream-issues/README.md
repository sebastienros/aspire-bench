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
repo: dotnet/aspire            # owner/name of the target repository
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
| [aspire-redis-default-ports.md](aspire-redis-default-ports.md) | dotnet/aspire | F22 | Plain Redis on 6379, TLS on 6380; or a hint where the agent looks |
| [aspire-mcp-compact-telemetry.md](aspire-mcp-compact-telemetry.md) | dotnet/aspire | F18 | Compact `list_traces` / `list_structured_logs` (patch 0001); same for `list_resources` and `list_console_logs` |
| [aspire-cli-plain-output.md](aspire-cli-plain-output.md) | dotnet/aspire | F19 | No borders or dashboard links when redirected (patch 0002); SQL text in the trace table |
| [aspire-start-blocking.md](aspire-start-blocking.md) | dotnet/aspire | F21 | A start that waits for health and prints endpoints |
| [skills-add-aspire-diagnose.md](skills-add-aspire-diagnose.md) | microsoft/aspire-skills | F17 | New `aspire-diagnose` skill |
| [skills-remove-router-add-aspire-start.md](skills-remove-router-add-aspire-start.md) | microsoft/aspire-skills | F17, F21 | Remove the router; add `aspire-start` |
| [skills-narrow-aspire-monitoring.md](skills-narrow-aspire-monitoring.md) | microsoft/aspire-skills | F17 | Narrow the trigger description |
| [skills-aspireify-redis-client-tracing.md](skills-aspireify-redis-client-tracing.md) | microsoft/aspire-skills | F23 | Propose the Aspire Redis client integration so cache calls are traced |
