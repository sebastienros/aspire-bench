# Common Aspire CLI health skill versus type-specific skills

This follow-up compares the three
[type-specific health skills](README.md) against one resource-agnostic
`aspire-health` skill using `aspire describe [resource] --format table`.
The original comparison and skill contents remain unchanged.

| Arm | Installed skills |
|---|---|
| `specific` | Seven pinned general skills + startup + three unchanged type-specific health skills |
| `cli` | Same seven general skills + startup + one common table-based health skill |

Both tasks use the same original four prompts, app, README, startup skill,
toolchain, limits, private Docker environment, and checkpoint-preserving
verifier. MCP is disabled in both. The comparison intentionally changes both
health-skill granularity (three versus one) and observation method (direct
HTTP/SQL/Redis versus Aspire state/health); it cannot isolate either alone.

Run three fresh trials per arm with the pinned model/package/CLI from the
previous experiment, contemporaneous rather than reusing historical times.
Inspect every step reward, actual skill selection, table reads, resource
identification work, fallback probes, token use, and agent time. Keep startup
as an unchanged diagnostic control, not a health gain.

## Local CLI contract and observation depth

The pinned Aspire CLI `13.6.0` accepts lowercase `--format table`. Local
inspection confirmed the Name, Type, State, Health, and URLs columns, and
scoping by `db` and `cache` works with isolated resources. Full-table output
contains wrapped dashboard links and Finished one-shot jobs as well as
Running/Healthy services; neither an exit code nor a word search for
`Healthy` proves the requested resource is healthy.
Scoped `boardadmin` also resolves its isolated instance; an absent resource
returns exit code 7 rather than a successful empty observation.

The common skill asks the model to inspect relevant rows. Its oracle parses
those actual table columns and fails on missing, duplicate, non-running,
or non-healthy targets before writing success. The grader remains unchanged
and independently validates the app/dependencies at the final step.

Aspire resource health is not equivalent to direct protocol, seed-data, or
TLS credential verification. A passing CLI arm demonstrates these prompts
can be satisfied through configured Aspire health checks, not that every
integration has adequate health checks or that application schema/data was
independently inspected by the agent.

## Reproduction

Validate both Docker images locally before inference:

```bash
harbor run --path msbench/aspire-health/tasks/cli --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name health-cli --n-concurrent 1
harbor run --path msbench/aspire-health/tasks/specific --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name health-cli-specific-control --n-concurrent 1
```

`cli-dataset.jsonl` pins both tasks to
`64c5693ebf7a023e12809513666a546d825b19d2`. Standard model invocation:

```bash
export USE_COPILOT_CLI_VERSION=1.0.99-0
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/aspire-health/cli-dataset.jsonl \
  --benchmark aspire-health-cli --variant cli \
  --agent github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627 \
  --model gpt-6-luna --env USE_COPILOT_CLI_VERSION \
  --backend ces-staging --acr msbenchstaging.azurecr.io --workers 1 \
  --repeat 3 --tag experiment=cli-health-skills
unset USE_COPILOT_CLI_VERSION
```

Repeat with `--variant specific` for the unchanged resource-type control.

Both local four-step Docker oracles passed on October 22, including the
table-based CLI solutions, with all step/final rewards 1 and no trial/step
exceptions. The temporary private table-inspection container was removed.

## Model execution record

| Arm | Attempt 1 | Attempt 2 | Attempt 3 |
|---|---|---|---|
| Resource-specific skills | [2026102280077062](https://msbenchapp.azurewebsites.net/run-analysis/2026102280077062) | [2026102280077918](https://msbenchapp.azurewebsites.net/run-analysis/2026102280077918) | [2026102280078532](https://msbenchapp.azurewebsites.net/run-analysis/2026102280078532) |
| Common CLI table-health skill | [2026102280077500](https://msbenchapp.azurewebsites.net/run-analysis/2026102280077500) | [2026102280078174](https://msbenchapp.azurewebsites.net/run-analysis/2026102280078174) | [2026102280078804](https://msbenchapp.azurewebsites.net/run-analysis/2026102280078804) |

Submitted with MSBench `0.3.67` to CES staging. The first two attempts per
arm have completed and passed all 16 steps and four final verifications,
without trial/step exceptions. The third attempt in each arm is still
awaiting dispatch as of the October 22 trace investigation. The full
three-attempt comparison is not complete.

## Trace investigation: resource identity versus extra workflow turns

The first two CLI trials selected only `aspire-health` for all six health
assessments, used `--format table`, and wrote assessments consistent with
the returned resource states. Each used one all-resource `describe` per
assessment, not failed scoped lookups or repeated health polling.

| Step | Specific attempt 1 / 2: seconds | CLI attempt 1 / 2: seconds |
|---|---:|---:|
| Services | 15.0 / 10.3 | 24.2 / 23.8 |
| Database | 18.9 / 16.4 | 30.4 / 29.0 |
| Redis | 14.9 / 9.2 | 25.3 / 26.4 |

These are individual observed trials, not the final comparison medians.

### What the table actually says

| Requested dependency | Visible logical name | Type column | Other identity hints |
|---|---|---|---|
| Database | `db` | `PostgresDatabaseResource` | A separate `postgres` row has Type `Container` |
| Redis | `cache` | `Container` | `rediss://` endpoint and a wrapped dashboard link containing `resource=harbor-bingo-redis` |

Redis is not explicitly identified as Redis in the Name/Type columns.
Its hints are indirect and the Docker-name hint is specific to this fixture,
not a reliable integration contract. Database identity is clearer: the
table does expose `PostgresDatabaseResource`. The database prompt itself asks
for the existing database, not specifically "PostgreSQL"; Redis is explicitly
named in its prompt.

The first CLI trial read the AppHost before querying services and database.
Its Redis assessment searched for `apphost|Redis|redis|BENCH_RUN_ID|COMPOSE_PROJECT_NAME`
before describing the app. The second trial again read the AppHost before
the database query and searched Markdown for `apphost|Redis|redis` before the
Redis query. Its final Redis evidence explicitly identified `cache` through
resource ID `harbor-bingo-redis`. Thus identity mapping is a genuine
portability concern, but there was no observed cycle of failed Redis
lookups after receiving the table.

### Where the extra time went

First-pair tool-boundary decomposition:

| Step / arm | Before observation command | Observation command | After observation command | Total seconds |
|---|---:|---:|---:|---:|
| Services / specific | 10.20 | 0.11 | 4.72 | 15.03 |
| Services / CLI | 13.94 | 0.14 | 10.09 | 24.17 |
| Database / specific | 13.73 | 0.14 | 4.98 | 18.85 |
| Database / CLI | 20.39 | 0.13 | 9.91 | 30.42 |
| Redis / specific | 9.41 | 0.07 | 5.45 | 14.93 |
| Redis / CLI | 11.58 | 0.13 | 13.54 | 25.25 |

The observation command is the first `aspire describe` in the CLI arm,
versus the direct protocol-check recipe in the specific arm. Specific
recipes also write their report inside that same shell; the CLI arm writes
its report afterward. These are deliberately different operations, so the
decomposition explains workflow costs, not pure command equivalence.

All six CLI `describe` calls across the first two trials took only
0.09-0.14 seconds. The additional wall time was outside the command.
For the first Redis CLI assessment, the visible sequence relative to agent
execution start was:

| Time | Action |
|---|---|
| +4.47 s | Load `aspire-health` |
| +8.25 s | Glob workspace and search for AppHost/Redis guidance |
| +11.58 s | Run `aspire describe`; complete at +11.71 s |
| +15.53 s | Check whether the requested report file exists |
| +19.84 s | Add the report with `apply_patch` |
| +22.94 s | Read report and check Git status |
| +25.25 s | Agent execution finishes |

The type-specific Redis recipe started at +9.41 seconds, checked Redis and
wrote its report by +9.48, and finished at +14.93. Of the CLI arm's extra
10.32 seconds, 8.09 occurred after the observation command. The CLI arm also
performed general workspace/AppHost/guidance discovery for services, where
Redis identity was not relevant.

Tool starts/completions expose actions and elapsed time, not internal
reasoning time. Gaps also include model inference, scheduling, formatting,
and tool orchestration. They cannot establish that any specific terminology
caused a measured amount of "thinking."

### Improvement candidates, not changes to this running comparison

Expose explicit integration identity (for example Redis versus a generic
container) alongside stable logical resource identity, rather than relying
on arbitrary names or dashboard URLs. Keep database-versus-server identity
clear as well.

For the skill, avoid rediscovering a supplied AppHost and provide a compact
report-writing pattern instead of leaving every assessment to compose and
validate a report in separate turns. The generic skill uses an
`<apphost-path>` placeholder; the type-specific skills include concrete
instance-selection and report recipes. That difference must not be
misattributed to the CLI's runtime.

A causal follow-up can hold the CLI commands and reporting pattern constant
while adding only an explicit logical-name/integration mapping. Test report
composition/known-AppHost guidance separately. No prompt, skill, or pinned
task has been changed during these runs.
