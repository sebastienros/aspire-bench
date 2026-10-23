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

All six original submissions eventually executed and passed: all 24 step
rewards and six final rewards were 1, without trial/step exceptions or
replacement submissions. Metadata confirms MSBench `0.3.67`, model
`gpt-6-luna`, package `github-copilot-cli-pkg-main-20261014-215627`,
and actual CLI `1.0.99-0` in all 24 invocations. CES dispatch delays are
excluded from agent timing.

## Completed comparison

| Step | Type-specific: median seconds | Common CLI: median seconds | CLI time increase | Median tool calls: specific / CLI |
|---|---:|---:|---:|---:|
| Startup (same guidance) | 79.8 | 89.8 | 12.5% | 4 / 3 |
| Services | 14.0 | 24.2 | 72.3% | 4 / 11 |
| Database | 16.4 | 29.0 | 76.3% | 3 / 12 |
| Redis | 11.4 | 25.3 | 121.7% | 3 / 11 |
| Three health steps, summed per trial | 38.3 | 79.3 | 107.2% | 10 / 35 |
| All four steps, summed per trial | 118.0 | 163.7 | 38.7% | 13 / 37 |

Each column is independently aggregated. Aggregate rows are medians of
per-trial sums, not sums of step medians. Every CLI health assessment was
slower than every type-specific attempt for the corresponding step.

| Arm / attempt | Startup seconds | Services seconds | Database seconds | Redis seconds | Health sum | Four-step sum |
|---|---:|---:|---:|---:|---:|---:|
| Specific 1 | 81.4 | 15.0 | 18.9 | 14.9 | 48.8 | 130.2 |
| Specific 2 | 75.3 | 10.3 | 16.4 | 9.2 | 36.0 | 111.3 |
| Specific 3 | 79.8 | 14.0 | 12.8 | 11.4 | 38.3 | 118.0 |
| CLI 1 | 83.0 | 24.2 | 30.4 | 25.3 | 79.8 | 162.8 |
| CLI 2 | 104.4 | 23.8 | 29.0 | 26.4 | 79.3 | 183.7 |
| CLI 3 | 89.8 | 26.8 | 22.0 | 25.2 | 73.9 | 163.7 |

| Health step | Median input tokens: specific / CLI | Median output tokens: specific / CLI |
|---|---:|---:|
| Services | 53,993 / 119,080 | 501 / 854 |
| Database | 54,397 / 130,748 | 598 / 911 |
| Redis | 53,763 / 130,943 | 393 / 892 |
| Three health steps, summed per trial | 161,884 / 364,927 | 1,391 / 2,629 |

Input includes cached tokens; its 125.4% aggregate increase is not a
billed-cost estimate.

All eleven type-specific-arm skills and all nine CLI-arm skills were
advertised in the actual model prompt of every step. All nine CLI health
assessments loaded only `aspire-health`, made one successful all-resource
`describe --format table`, and reported the relevant rows as Running/Healthy.
There were no direct HTTP/SQL/Redis fallbacks, failed scoped lookups, or
reference reads. All nine control health assessments selected their matching
type-specific skill. All startup invocations selected only `aspire-startup`.

The third trial corroborated the earlier trace investigation below:
workspace/AppHost discovery before the query and separate report
composition/validation afterward, rather than a slow CLI observation.
Its service report also tried an unavailable `python` command before
validating with Node, another consequence of ad-hoc report handling.

Startup is not a benefit of either health method: identical startup guidance
was slower in the CLI arm. Its median pre-recipe dispatch time was 15.2
seconds versus 10.8 control, recipe-shell time 60.8 versus 61.3, and post-shell
time 14.1 versus 8.9. These are independent tool-boundary medians, not proof
that health metadata caused the difference. Do not attribute the entire
four-step difference to the health command or internal app startup.

**Conclusion:** The common skill successfully covers all three resource
categories through configured Aspire health, but this implementation did
not retain the type-specific recipes' efficiency. The CLI command itself
is fast; the skill leaves target/AppHost discovery and report generation
to extra agent turns. This is not evidence that Aspire health queries are
inherently slower than direct probes or that one skill per resource type
is required.

Keep this as an experimental alternative, not a replacement for the tested
type-specific guidance yet. Generalize known-target selection and reporting
without reintroducing integration-specific probe commands. Explicit
integration identity is also useful, but the current comparison does not
isolate identity, recipe specificity, report composition, or skill count.
Three samples on one app/model/client, fresh conversations, uncontrolled
hardware/caches/scheduling, and healthy dependencies limit generalization.
The broader observation-depth caveat above still applies.

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

These are the individual first two trials used for the initial trace
investigation, not the final comparison medians above.

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

## PR 21279 toolchain follow-up

The separate `tasks/cli-pr21279` variant uses
[microsoft/aspire#21279](https://github.com/microsoft/aspire/pull/21279),
which exposes resource service display names. Existing `cli`, `specific`,
datasets, and historical results remain unchanged.

| Input | Pinned value |
|---|---|
| Aspire source | `6676979b2bb4ed074568b84c84fb36a196d38f06` |
| CI build | [39876549957](https://github.com/microsoft/aspire/actions/runs/39876549957), attempt 1 |
| CLI / AppHost SDK / Hosting packages | `17.0.0-pr.21279.g6676979b` |
| Installer | Same source commit, SHA-256 verified |
| Preserved public artifacts | [Dedicated prerelease](https://github.com/sebastienros/aspire-bench/releases/tag/aspire-pr-21279-6676979b) |

[pr21279-build.json](pr21279-build.json) records artifact names, sizes,
checksums, and original build provenance. With user approval, Linux ARM64 and
x64 CLI archives, cross-platform NuGet packages, and matching Dashboard/
Orchestration packages were preserved before GitHub Actions artifacts expire.
Redundant .NET-tool CLI packages were omitted. These are public upstream
artifacts, not a new Microsoft release.

Docker builds download the preserved assets without authentication and
verify SHA-256 before installing. The installer uses `--local-dir`,
`--hive-label pr-21279`, `--skip-path`, `--skip-extension`, and
`--skip-completions`; `ASPIRE_HOME` and the container PATH explicitly select
the isolated install. No GitHub credentials are passed into the build or
stored in image layers. The image asserts the actual CLI version.

Replacing only the CLI executable would not supply the new integration
metadata from the old AppHost packages. The new variant therefore overlays
only the AppHost SDK/Hosting versions, corresponding central package entries,
a local PR NuGet source, and the README's CLI requirement. Application logic,
.NET 10 SDK, Node, dependency image tags, all four prompts, both skills,
health/reporting recipes, limits, and verifiers are unchanged. The input hash
manifest protects the overlaid files as well.

### Observed local output

The actual all-resource table now contains:

| Name | Type | State | Health |
|---|---|---|---|
| `cache` | `Redis` | Running | Healthy |
| `postgres` | `PostgreSQL Server` | Running | Healthy |
| `db` | `PostgreSQL Database` | Running | Healthy |
| `bingoboard` | `Vite` | Running | Healthy |

Logical resource names remain `cache`, `postgres`, and `db`; the **Type
column** now supplies the integration's service display name. Structured
`describe --format Json` also exposes `serviceDisplayName`. Local inspection
asserted the Redis, PostgreSQL Server, and PostgreSQL Database values against
the running application, not just a synthetic table or `--version`.

The unchanged startup endpoint extractor and five-column health table
oracles work with this output. Both the native local Docker oracle and the
explicit Linux AMD64 oracle passed all four steps and final verification,
without trial/step exceptions. A separate private Docker inspection confirmed
the full table and JSON fields, then stopped the exact AppHost and removed
the container. Initial fixture bring-up failed the immutable-input check
because its copied hash manifest still described the old package files;
after updating the manifest, both complete oracles passed. This was a local
fixture preparation error, not a CLI or model failure.

Reproduce:

```bash
node --test msbench/aspire-health/experiment.test.mjs msbench/aspire-health/pr21279.test.mjs
harbor run --path msbench/aspire-health/tasks/cli-pr21279 --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name health-cli-pr21279-native --n-concurrent 1
DOCKER_DEFAULT_PLATFORM=linux/amd64 harbor run \
  --path msbench/aspire-health/tasks/cli-pr21279 --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name health-cli-pr21279-x64 --n-concurrent 1
```

[cli-pr21279-dataset.jsonl](cli-pr21279-dataset.jsonl) pins the new default
variant and unchanged `cli` control to task commit
`9e9eedbfbff421c95dc2d01928fea6cbba9cb6d7`. To measure the PR build with the
previous model/client pins:

```bash
export USE_COPILOT_CLI_VERSION=1.0.99-0
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/aspire-health/cli-pr21279-dataset.jsonl \
  --benchmark aspire-health-cli-pr21279 --variant cli-pr21279 \
  --agent github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627 \
  --model gpt-6-luna --env USE_COPILOT_CLI_VERSION \
  --backend ces-staging --acr msbenchstaging.azurecr.io --workers 1 \
  --repeat 3 --tag experiment=cli-health-pr21279
unset USE_COPILOT_CLI_VERSION
```

Use `--variant cli` for a fresh 13.6.0 control under the same dataset.

**Measurement status:** No model trials have been submitted for this variant.
The prior 13.6.0 timings must not be relabeled as PR-build measurements. A
fresh CLI-versus-CLI comparison can keep the skill and reporting instructions
fixed, but the upgrade from 13.6.0 to this PR build also changes Hosting and
other product implementation. It cannot isolate the effect of display names
alone. That would require a matching parent build as a control.
