# Specific health skills

This independent Harbor experiment extends the
[startup-specific skill experiment](../aspire-startup/README.md) to the
remaining three prompts in the original Bingo scenario. It does not change
the original tasks or their seven-skill snapshot.

The follow-up [common CLI health skill comparison](CLI-README.md) tests a
single `aspire describe --format table` health entry point against the
unchanged three resource-type skills below.

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

### Execution record

Both local Docker oracles passed all four steps with reward 1 and no trial
or step exceptions on October 22. The host Docker engine initially did not
respond; validation succeeded after a user-approved Docker Desktop restart.
That host incident precedes model evaluation and is not an agent failure.

The six initial CES staging submissions are:

| Arm | Attempt 1 | Attempt 2 | Attempt 3 |
|---|---|---|---|
| General + startup | [2026102261463000](https://msbenchapp.azurewebsites.net/run-analysis/2026102261463000) | [2026102261463756](https://msbenchapp.azurewebsites.net/run-analysis/2026102261463756) | [2026102261464402](https://msbenchapp.azurewebsites.net/run-analysis/2026102261464402) |
| General + startup + specific health skills | [2026102261463016](https://msbenchapp.azurewebsites.net/run-analysis/2026102261463016) | [2026102261463720](https://msbenchapp.azurewebsites.net/run-analysis/2026102261463720) | [2026102261464344](https://msbenchapp.azurewebsites.net/run-analysis/2026102261464344) |

All six original submissions eventually executed and passed: every one of
the 24 step rewards and six final rewards was 1, with no trial/step
exceptions and no replacement submissions. CES dispatch delays are not
included in the agent metrics below. Extracted metadata confirms MSBench
`0.3.67`, model `gpt-6-luna`, package
`github-copilot-cli-pkg-main-20261014-215627`, and actual CLI `1.0.99-0`
in all 24 step invocations.

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

## Observed results

| Step | General + startup: median seconds | Plus specific health skills: median seconds | Reduction | Median tool calls: general / specific |
|---|---:|---:|---:|---:|
| Startup (unchanged guidance) | 75.5 | 83.1 | -10.2% | 3 / 4 |
| Services | 48.5 | 14.1 | 70.8% | 10 / 3 |
| Database | 42.8 | 16.2 | 62.1% | 10 / 3 |
| Redis | 45.7 | 12.2 | 73.4% | 14 / 2 |
| Three health steps, summed per trial | 145.3 | 41.3 | 71.6% | 36 / 8 |
| All four steps, summed per trial | 217.7 | 124.8 | 42.7% | 39 / 12 |

The aggregate rows take the median of each trial's sum, not the sum of
step medians. Every table column is independently aggregated.

| Arm / attempt | Startup seconds | Services seconds | Database seconds | Redis seconds | Health-step sum | Four-step sum |
|---|---:|---:|---:|---:|---:|---:|
| General 1 | 75.5 | 54.3 | 42.8 | 101.6 | 198.6 | 274.1 |
| General 2 | 72.5 | 48.5 | 51.7 | 45.1 | 145.3 | 217.7 |
| General 3 | 76.1 | 41.4 | 41.0 | 45.7 | 128.1 | 204.2 |
| Specific 1 | 81.7 | 14.1 | 16.2 | 14.4 | 44.8 | 126.5 |
| Specific 2 | 83.1 | 14.2 | 17.6 | 9.5 | 41.3 | 124.4 |
| Specific 3 | 83.7 | 13.5 | 15.5 | 12.2 | 41.1 | 124.8 |

Every treatment health step was faster than every control attempt for the
same step; the result is not solely the long first Redis control.

| Step | Median input tokens: general / specific | Input reduction | Median output tokens: general / specific |
|---|---:|---:|---:|
| Services | 117,882 / 53,785 | 54.4% | 2,208 / 407 |
| Database | 105,799 / 54,410 | 48.6% | 2,077 / 578 |
| Redis | 170,790 / 40,107 | 76.5% | 2,300 / 339 |
| Three health steps, summed per trial | 405,269 / 148,178 | 63.4% | 6,727 / 1,275 |

These are Harbor's `n_input_tokens` and `n_output_tokens`. Input includes
cached tokens, so the reductions are not equivalent to billed-cost savings.

### Actual selection and avoided work

All eight control skills and all eleven treatment skills were advertised
in the actual model prompt of every step. Each treatment health invocation
loaded exactly its matching specialized skill as the first tool call, then
executed the health recipe as the second. All nine recipe shells exited 0.
No router, orchestration, monitoring, or unrelated startup skill was loaded
in those nine invocations; no repository discovery preceded the recipe.

The controls did not consistently choose a broad skill:

| Control step | Attempt 1 skill | Attempt 2 skill | Attempt 3 skill |
|---|---|---|---|
| Services | startup | startup | startup |
| Database | startup | router | startup |
| Redis | monitoring | none | monitoring |

Thus five of the six control services/database assessments loaded
`aspire-startup` even though the app was already running and no startup was
requested. They did not rerun the startup recipe, but had to derive the
requested assessment themselves. The result supports adding missing intent
coverage and improving trigger boundaries, not simply making broad skills
shorter. Neither arm read `/references/` files during the recorded calls,
so reference loading was not the mechanism of these gains.

Controls inspected workspace state, rediscovered resources, repeatedly
described health, composed reports, and checked report formats separately.
All three Redis controls first attempted a plain `redis-cli` probe without
the required TLS/authentication setup, then investigated listener settings
or credentials. One ultimately used plaintext on port 6380; another used
both plaintext and TLS with `--insecure`. The treatment used authenticated
TLS with the Aspire CA in all three trials. Treatment database probes also
checked application seed data; controls used resource health/readiness or
generic SQL, not that seed query.

For context, treatment median time from agent start to recipe dispatch was
8.3 seconds for services, 10.8 for database, and 8.6 for Redis. The recipe
shells themselves took 0.20, 0.16, and 0.08 seconds respectively, measured
from tool start to successful completion. Most remaining time is model/tool
dispatch and reporting, not engine readiness. These are tool boundaries,
not precise server-side health-transition measurements.

### Startup control and limits

Every startup invocation in both arms selected only `aspire-startup`.
Despite identical startup instructions, treatment startup was 7.7 seconds
slower at the median. Time to startup-recipe tool dispatch was 10.7 seconds
control versus 11.2 treatment; whole recipe-shell time was 58.0 versus
65.0, and post-shell time 7.4 versus 7.5. The observed difference largely
occurred inside the shell containing launch and readiness waits, not extra
skill loads. Do not claim adding metadata is free, or count startup as a win.
These tool boundaries differ from the file-based timing decomposition of
the separate startup benchmark.

This is three trials per arm, one app, one model/client, fresh conversations,
and healthy dependencies already running after startup. Corresponding
attempts began near each other, but hardware, caches, and scheduling were
not controlled or randomized. The new skills add recipes as well as narrow
metadata; a recipe-equivalent general-skill/README control is needed to
isolate trigger/discovery effects. No MCP or real conversation-continuation
benefit is measured. Success on healthy resources does not validate failure
diagnosis, arbitrary schemas, other integrations, or generic product safety.

## Existing skill ownership

These are experimental application-specific skills, not replacements for
the predefined general-purpose skills. No existing skill content is changed.
The measured health-step reductions support generalizing the narrow entry
points, while preserving the broad skills for diagnosis and lifecycle work.

| Candidate | Existing overlap | Recommended follow-up, not yet applied |
|---|---|---|
| Service health | Monitoring resource state and orchestration readiness | Route known-app health requests directly to a bounded read-only assessment; preserve broad diagnostics and lifecycle safety |
| PostgreSQL health | Monitoring and resource discovery; application/schema knowledge is not currently provided | Consider a database-readiness entry point or targeted reference; separate engine connectivity from schema/migration readiness |
| Redis health | Monitoring and resource discovery; authentication/TLS knowledge is not currently provided | Consider a cache-readiness entry point or targeted reference; preserve instance ownership, credential handling, and TLS validation |

Prefer app-aware, project-local guidance (for example generated from an
AppHost during agent setup) for schema, identity, authentication, and endpoint
facts. The experiment does not establish whether three product-wide skills
outperform one health skill with integration-specific references.

The controls also expose an update needed in the experimental startup
skill: explicitly exclude health-only requests against an already-running
application. Merely mentioning ready endpoints left its description broad
enough to attract five unrelated assessments. If these health entry points
are adopted, update router/monitoring descriptions and handoffs to recognize
them directly. Keep general investigation and resource-readiness guidance
for unknown or unhealthy apps; remove only duplicated recipe ownership after
a separate routing comparison, not entire general skills.

Do not remove orchestration's wait or monitoring's investigation workflows
based on successful happy-path probes. Generic adoption requires unknown-app,
unhealthy-resource, absent-output, ambiguous-target, editor-owned-session,
and different-integration coverage. These recipes must not leak Bingo
container names, schema assumptions, or report filenames into product skills.
