# Telemetry suite: standard app vs aspirified app on Aspire `main`

This suite asks one question with a controlled answer: **when a running application
misbehaves, does the data Aspire collects (traces, structured logs, resource health)
let an agent fix it faster, cheaper, or more often than the same application run the
ordinary way?** It then measures which Aspire skills and MCP tools contribute.

It is separate from the earlier 13.6 experiments in this directory. Those remain
unchanged as historical evidence; see [FINDINGS.md](../FINDINGS.md).

## What is compared

| Arm | Application | Aspire skills | Aspire MCP |
|---|---|---|---|
| `raw` | Standard app: Compose dependencies, lifecycle scripts, log files | none | no |
| `aspire-cli` | Aspirified app | none | no |
| `aspire-skills` | Aspirified app | `current` (shipped v0.0.5) | no |
| `aspire-mcp` | Aspirified app | none | yes |
| `aspire-skills-mcp` | Aspirified app | `current` | yes |
| `aspire-plus` | Aspirified app | `plus` = current + new `aspire-diagnose` | no |
| `aspire-lean` | Aspirified app | `lean` = plus, router removed, monitoring trigger narrowed | no |
| `aspire-lean-mcp` | Aspirified app | `lean` | yes |

`raw` versus any Aspire arm is the product comparison. The Aspire arms share one
application, one AppHost and one toolchain, so differences between them isolate
skills and MCP. Skill sets are defined in
[`common/skills`](common/skills/PROVENANCE.md) and assembled by
[`compose.sh`](common/skills/compose.sh).

Both applications run the same Bingo business code (`msbench/bingo/common`, commit
`baacba3`). The aspirified variant adds an AppHost, ServiceDefaults, and PostgreSQL
client tracing (`Npgsql.OpenTelemetry`); the standard variant has no tracing, which
is the ordinary state of a non-Aspire app. A win for Aspire here therefore combines
instrumentation and tooling. Separating the two needs an instrumented raw arm and is
not done yet.

## Toolchain

Aspire CLI, AppHost SDK and Hosting packages are the official daily build of
`microsoft/aspire` `main`: **`17.1.0-preview.1.26559.1+4954c76a62bd091e0edbb02854c0dc2be06e64f5`**
(built 2026-11-09, two unrelated commits behind `main` HEAD `72d62597` at the time).
The CLI archive is pinned by versioned URL and SHA-256 in the
[Dockerfile](tools/templates/Dockerfile); packages come from the public `dotnet9`
daily feed. `aspire --version` is recorded in every image at `/etc/aspire-version`.

## Scenarios

Each scenario starts both applications healthy, injects one runtime fault, and keeps
**live traffic** running before and during the agent, so evidence of the incident
exists the way it would for a real application. Prompts are identical across arms,
describe only the user-visible symptom, and name no endpoint, tool or component.

| Scenario | Fault | Where the evidence is |
|---|---|---|
| `slow-sql` | An audit trigger's duplicate check filters an unindexed JSON history that has grown to millions of rows. Square writes take seconds. Nothing fails. | Duration of one database call. Aspire: a trace span with the SQL text. Standard app: EF Core's command-duration lines in `admin.log`. |
| `read-only` | The database default was left read-only. Pages and reads work; every write fails. Health stays green. | An exception with SQLSTATE 25006. Aspire: structured log + failed trace. Standard app: `admin.log`. |

`slow-sql` self-calibrates: it grows the audit history until one square write costs
at least 500 ms on the machine at hand, so the incident and its repair are both far
from the verifier's 600 ms limit for five writes.

## Grading

[`bench.mjs verify`](common/bench/bench.mjs) decides success from live HTTP and SQL
only. It never reads an agent report.

- `slow-sql`: five fresh 5-square imports and updates must each have a median under
  600 ms; every change must still be audited exactly once; the audit history and all
  original squares must be intact; call/clear/status must work.
- `read-only`: a fresh write must succeed and reach PostgreSQL; the read-only default
  must be gone at the database level; a second write must succeed after the verifier
  replaces every application session; original squares intact; call/clear/status work.

Dropping the trigger, truncating the audit history, or a per-session workaround all
fail. Each cell was validated locally with `verify` (must fail) → reference repair →
`verify` (must pass) before any model ran; see [results](results/).

## Reproduce

```bash
# Local, no model: build one cell, start it, and run the fail/repair/pass gate
bash tools/local.sh up aspire lean slow-sql
bash tools/local.sh oracle tele-aspire-slow-sql

# Cloud: remote no-model gate, then model trials (3 repeats)
bash tools/submit.sh slow-sql raw oracle
bash tools/submit.sh slow-sql aspire-lean gpt-6-luna 3 r1

# Fetch artifacts and rebuild results/trials.jsonl and results/summary.md
python3 tools/collect.py
```

Changing anything under `common/` needs three commits so remote builds can fetch
exact contents: commit `common/`, run `gen-tasks.mjs tasks --suite-sha <that commit>`
and commit, then `gen-tasks.mjs dataset --task-sha <that commit>` and commit.
