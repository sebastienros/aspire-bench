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
