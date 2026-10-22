# Specific health skills

This independent Harbor experiment extends the
[startup-specific skill experiment](../aspire-startup/README.md) to the
remaining three prompts in the original Bingo scenario. It does not change
the original tasks or their seven-skill snapshot.

| Arm | Skills available |
|---|---|
| `general` | Seven unchanged predefined skills + the previously measured startup skill |
| `specific` | Same eight + `aspire-service-health`, `aspire-postgres-health`, `aspire-redis-health` |

Both arms retain the original four prompts, application, README,
checkpoint-preserving verifier, limits, and private Docker
environment. MCP is disabled in both arms to isolate skill additions.
Startup guidance is identical in both arms; compare the three later steps
separately and use startup as a diagnostic control, not a health-skill gain.
Use fresh agent invocations for each step, with the running app and output
files preserved. Do not enable the unresolved continuation contract.

The new skills apply startup's pattern: a narrow advertised purpose,
self-contained observation recipe, correct instance selection, and no
mandatory broad-skill/reference handoff. They supply application-specific
knowledge absent from the general bundle: saved service URLs, database seed
checks, and authenticated Redis TLS probing. Consequently this measures the
practical benefit of **specific discoverable guidance plus its recipe**, not
the isolated effect of metadata, file size, or specificity alone. Do not
attribute all elapsed-time savings to discovery.

## Measurement and interpretation

Run three contemporaneous trials per arm with the same pinned Copilot
package, CLI, and model as the startup experiments. Inspect native step
rewards and exceptions, per-step agent time and token use, actual skill
invocations, reference reads, and discovery commands before the first
health observation. Confirm the full treatment is advertised in model
prompts. Include all submissions and label infrastructure failures and
unchanged replacements separately. Exclude queue/build/setup/verifier time
from agent timing.

`dataset.jsonl` pins both tasks to
`a924d3763526ab0e5308950f581d761354072eb7`. Model evaluation:

```bash
export USE_COPILOT_CLI_VERSION=1.0.99-0
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/aspire-health/dataset.jsonl \
  --benchmark aspire-health --variant specific \
  --agent github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627 \
  --model gpt-6-luna --env USE_COPILOT_CLI_VERSION \
  --backend ces-staging --acr msbenchstaging.azurecr.io --workers 1 \
  --repeat 3 --tag experiment=specific-health-skills
unset USE_COPILOT_CLI_VERSION
```

Repeat with `--variant general` for the control.

Validate both Docker images locally with all four oracle steps before cloud
inference:

```bash
harbor run --path msbench/aspire-health/tasks/general --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name health-general --n-concurrent 1
harbor run --path msbench/aspire-health/tasks/specific --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name health-specific --n-concurrent 1
```

The oracle does not prove model skill selection. The specific arm's three
health oracle solutions are the exact fenced skill recipes (equivalent
checks to the original oracle); structural tests enforce this match. Local
success covers their actual shell instructions, not just image boot.

## Existing skill ownership

These are experimental application-specific skills, not replacements for
the predefined general-purpose skills. No existing skill content is changed.
Use measured consumption and step-level gains to decide whether to
generalize each entry point.

| Candidate | Existing overlap | Possible update after evidence |
|---|---|---|
| Service health | Monitoring resource state and orchestration readiness | Route known-app health requests directly to a bounded read-only assessment; preserve broad diagnostics and lifecycle safety |
| PostgreSQL health | Monitoring and resource discovery; application/schema knowledge is not currently provided | Consider a database-readiness entry point or targeted reference; separate engine connectivity from schema/migration readiness |
| Redis health | Monitoring and resource discovery; authentication/TLS knowledge is not currently provided | Consider a cache-readiness entry point or targeted reference; preserve instance ownership, credential handling, and TLS validation |

Do not remove orchestration's wait or monitoring's investigation workflows
based on successful happy-path probes. Generic adoption requires unknown-app,
unhealthy-resource, absent-output, ambiguous-target, editor-owned-session,
and different-integration coverage. These recipes must not leak Bingo
container names, schema assumptions, or report filenames into product skills.
