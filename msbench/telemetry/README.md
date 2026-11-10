# Telemetry suite: standard app vs aspirified app on Aspire `main`

This suite asks one question with a controlled answer: **when a running application
misbehaves, does the data Aspire collects (traces, structured logs, resource health)
let an agent fix it faster, cheaper, or more often than the same application run the
ordinary way?** It then measures which Aspire skills and MCP tools contribute.

It is separate from the earlier 13.6 experiments in this directory. Those remain
unchanged as historical evidence; see [FINDINGS.md](../FINDINGS.md).

**Start with [RESULTS.md](RESULTS.md)** for what was found and
[SKILLS-PROPOSAL.md](SKILLS-PROPOSAL.md) for the new, updated and removed skills.
The two Aspire product patches are in [upstream/](upstream/).

## What is compared

| Arm | Application | Aspire skills | Aspire MCP |
|---|---|---|---|
| `raw` | Standard app: Compose dependencies, a start script, log files | none | no |
| `raw-check` | The same standard app with an extra `scripts/check.sh` health script (rounds 1–5 only; kept for reference, never pooled with `raw`) | none | no |
| `aspire-cli` | Aspirified app | none | no |
| `aspire-skills` | Aspirified app | `current` (shipped v0.0.5) | no |
| `aspire-mcp` | Aspirified app | none | yes |
| `aspire-skills-mcp` | Aspirified app | `current` | yes |
| `aspire-plus` | Aspirified app | `plus` = current + new `aspire-diagnose` | no |
| `aspire-lean` | Aspirified app | `lean` = plus, router removed, monitoring trigger narrowed | no |
| `aspire-lean-mcp` | Aspirified app | `lean` | yes |
| `aspire-lean-start` | Aspirified app | `lean` + new `aspire-start` (cold-start scenario only) | no |
| `aspire-mcp-src`, `aspire-lean-mcp-src`, `aspire-lean-src` | Aspirified app, CLI built from source at the daily's commit (control) | none / `lean` | yes / yes / no |
| `aspire-mcp-compact`, `aspire-lean-mcp-compact` | Same, plus the MCP compact-telemetry patch | none / `lean` | yes |
| `aspire-lean-plain` | Same, plus the CLI plain-output patch | `lean` | no |
| `aspire-lean-mcp-all` | Same, plus both patches | `lean` | yes |

`raw` versus any Aspire arm is the product comparison. The Aspire arms share one
application, one AppHost and one toolchain, so differences between them isolate
skills and MCP. Skill sets are defined in
[`common/skills`](common/skills/PROVENANCE.md) and assembled by
[`compose.sh`](common/skills/compose.sh).

Both applications run the same Bingo business code (`msbench/bingo/common`, commit
`baacba3`). The standard app ships with its start script and README only; a
`scripts/check.sh` health script that rounds 1 to 5 had left in place was removed before
round 7 because an ordinary application does not come with one, and the `raw` baseline
was re-run without it. The aspirified variant adds an AppHost, ServiceDefaults, and PostgreSQL
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
| `slow-redis` | A host-side "attendance report" exporter counts cache sessions with a `KEYS`-based script in a loop; the session keyspace grew, so single-threaded Redis spends most of its time on it and every cache call the admin makes waits. Nothing fails. Same prompt as `slow-sql`. | Duration of requests that touch the cache. Aspire: slow server spans whose database child spans are short. Standard app: **nothing**; request logging is off at the default `Microsoft.AspNetCore: Warning` level and the Redis client logs no durations. Both arms must then read the cache's `SLOWLOG` / `CLIENT LIST`. |

A third scenario, `cold-start`, has no fault: nothing is running and the agent must
bring the application up. It measures the new `aspire-start` skill.

`slow-sql` and `slow-redis` self-calibrate: they grow the audit history or the session
keyspace until one square write, or one report query, costs at least 500 ms on the
machine at hand, so the incident and its repair are both far from the verifier's limits.

## Grading

[`bench.mjs verify`](common/bench/bench.mjs) decides success from live HTTP and SQL
only. It never reads an agent report.

- `slow-sql`: five fresh 5-square imports and updates must each have a median under
  600 ms; every change must still be audited exactly once; the audit history and all
  original squares must be intact; call/clear/status must work.
- `read-only`: a fresh write must succeed and reach PostgreSQL; the read-only default
  must be gone at the database level; a second write must succeed after the verifier
  replaces every application session; original squares intact; call/clear/status work.

- `slow-redis`: eight status reads and eight square calls must each have a median under
  300 ms, no cache command may take over 100 ms during that window (`SLOWLOG`, at a
  threshold the verifier sets itself), the session keyspace must be intact, square state
  must still be stored in the cache, and call/clear/status must work.
- `cold-start`: both origins respond and a fresh write, call and clear round-trip
  through PostgreSQL.

Dropping the trigger, truncating the audit history, flushing or restarting the cache
(the session keys are gone), swapping the cache for memory, or a per-session workaround
all fail. For `read-only` the verifier records "application works" and "root cause
removed" separately, so both pass rates can be reported. Each cell was validated locally with `verify` (must fail) → reference repair →
`verify` (must pass) before any model ran; see [results](results/).

## Custom Aspire builds

Product changes are measured without publishing binaries. When a task sets
`CLI_KIND=source`, the image clones `microsoft/aspire` at the daily build's commit,
optionally applies a patch from [`common/aspire-patches`](common/aspire-patches), and
publishes the CLI. That CLI goes on `PATH` for the agent, the MCP server and the
harness; `aspire --version` reports for example
`17.1.0-agentic.mcpcompacttelemetry+4954c76a…`. The official daily still starts the
AppHost because it carries the bundle. A patched arm is only ever compared with the
`*-src` control built the same way, since both are managed builds rather than NativeAOT.

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
