# Aspire startup ablation

Cross-experiment lessons and improvement candidates are tracked in the
[Aspire improvement findings register](../FINDINGS.md).

This experiment isolates skills/MCP availability from the four-step Bingo
benchmark. It uses the same shared Aspire application, installed tools,
resources, and agent limits, but only asks for startup and endpoint discovery.
The original dataset and four-step task definitions are unchanged.

| Variant | Seven Aspire skills | Aspire MCP |
|---|---|---|
| `none` | Absent | Absent |
| `skills` | Installed for Harbor and native Copilot discovery | Absent |
| `mcp` | Absent | Declared for Harbor and project discovery |
| `skills-mcp` | Installed for Harbor and native Copilot discovery | Declared for Harbor and project discovery |

All cells receive exactly the same prompt and README recipe. The recipe uses
`aspire start`, waits for `boardadmin` and `bingoboard`, then matches
`resources[].displayName` and reads `urls[].url` to avoid isolation-suffix and
endpoint-schema mistakes. It is deliberately prescriptive: this measures the
cost/behavior of optional capabilities with a known workflow, not the ability
to discover how an unfamiliar application starts.

No application or skill snapshots are duplicated. Standard Docker named build
contexts fetch the existing common application and, only for skill-enabled
cells, the pinned skill snapshot. No-MCP images explicitly remove the shared
application's `.github/mcp.json`; omitting the task's MCP declaration alone
would not isolate that factor. The verifier checks treatment assets, immutable
inputs, real workspace-owned HTTP listeners, admin login, and player HTML.
It does not run the original final database/Redis workflow.

## Measurement

The identical shell recipe records four epoch-millisecond boundaries in
`benchmark-startup-timings.json`:

| Boundary | Observation |
|---|---|
| `launch_started_ms` | Immediately before `aspire start` |
| `launch_returned_ms` | Immediately after that command returns |
| `ready_ms` | After both `aspire wait` commands return |
| `endpoints_written_ms` | After endpoint JSON is written |

Report launch command time, subsequent readiness wait, endpoint extraction
time, and time outside the recipe separately. Use Harbor's `agent_execution`
interval as the full agent-time denominator. Setup/build/verifier/queue time
is excluded. The timestamps are agent-recorded cooperative measurements:
check them against trajectory/tool boundaries rather than treating their
valid shape as independent proof. A wait's completion is not a measurement
of the earliest instant the HTTP endpoint could have responded.

Compare three model-executed attempts per cell with the same pinned `gpt-6-luna` agent,
Copilot package/CLI version, and limits. Check actual skill/MCP calls in each
trajectory: availability does not guarantee consumption. Analyze this
startup-only experiment independently of the older multi-step totals.

## Standard commands

Validate local images without inference:

```bash
export MSBENCH_ASPIRE_APP_CONTEXT="$PWD/msbench/bingo/common/aspire-app"
export MSBENCH_ASPIRE_SKILLS_CONTEXT="$PWD/msbench/bingo/tasks/aspire/environment/skills"
harbor run -p msbench/aspire-startup/tasks/none -a oracle -e docker -n 1
harbor run -p msbench/aspire-startup/tasks/skills -a oracle -e docker -n 1
harbor run -p msbench/aspire-startup/tasks/mcp -a oracle -e docker -n 1
harbor run -p msbench/aspire-startup/tasks/skills-mcp -a oracle -e docker -n 1
unset MSBENCH_ASPIRE_APP_CONTEXT MSBENCH_ASPIRE_SKILLS_CONTEXT
node --test msbench/aspire-startup/experiment.test.mjs
```

Once task sources are committed/pushed and the dataset pins that task commit:

```bash
export USE_COPILOT_CLI_VERSION=1.0.99-0
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/aspire-startup/dataset.jsonl \
  --benchmark aspire-startup --variant none \
  --agent github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627 \
  --model gpt-6-luna --env USE_COPILOT_CLI_VERSION \
  --backend ces-staging --acr msbenchstaging.azurecr.io \
  --workers 1 --repeat 3
unset USE_COPILOT_CLI_VERSION
```

Repeat with `skills`, `mcp`, and `skills-mcp`. These one-step tasks do not test
conversation continuation. That requires a separate multi-step runtime probe:
successful execution, receipt of every new instruction, and an actual reloaded
session/history must all be demonstrated. Preserving `OUTPUT_DIR`, reusing the
workspace, or setting `--harbor-resume-trajectory` alone is insufficient.

## Observed startup results

The October 21, 2026 run used MSBench CLI `0.3.67`, CES staging, model
`gpt-6-luna`, package `github-copilot-cli-pkg-main-20261014-215627`, and
Copilot CLI `1.0.99-0` (verified in every executed trial's
`cli-provenance.json`). Dataset task definitions were pinned to
`a4b793929abe5d90a6eae75a6e43d5b7ada8904c`; shared application sources
remained pinned to `baacba3e17181491c9a4d419db7d0e6763c3d363`.
All four finalized Docker images passed local timed Harbor oracle runs
before cloud inference.

All 12 model-executed trials passed startup verification with reward 1 and
no trial/step exceptions. There were **13 submissions**, including one
agent-setup failure before model execution, reported separately below.
The following values are independent column medians in seconds, not an
additive decomposition of a single representative run:

| Variant | Executed passes | Full agent time | Launch command | Subsequent wait | Endpoint extraction | Outside recipe |
|---|---:|---:|---:|---:|---:|---:|
| `none` | 3/3 | 82.6 | 19.8 | 44.8 | 0.17 | 21.4 |
| `skills` | 3/3 | 90.3 | 20.0 | 44.0 | 0.16 | 30.4 |
| `mcp` | 3/3 | 87.2 | 19.7 | 44.7 | 0.17 | 25.9 |
| `skills-mcp` | 3/3 | 88.8 | 18.8 | 36.3 | 0.21 | 30.9 |

Outside-recipe time is the per-trial sum of pre-launch and post-recipe
agent time. Median pre-launch/post-recipe seconds were respectively
12.0/10.1 (`none`), 18.7/11.9 (`skills`), 14.3/11.7 (`mcp`), and
18.4/12.5 (`skills-mcp`). Every recipe's recorded start/end boundaries
were checked against the corresponding shell-tool execution start/end
events and Harbor's agent-execution interval.

| Variant | Attempt 1: full agent seconds | Attempt 2: full agent seconds | Attempt 3: full agent seconds |
|---|---|---|---|
| `none` | [82.6](https://msbenchapp.azurewebsites.net/run-analysis/2026102173520438) | [75.9](https://msbenchapp.azurewebsites.net/run-analysis/2026102173521098) | [117.1](https://msbenchapp.azurewebsites.net/run-analysis/2026102173521720) |
| `skills` | [83.6](https://msbenchapp.azurewebsites.net/run-analysis/2026102173540362) | [104.1](https://msbenchapp.azurewebsites.net/run-analysis/2026102173541146) | [90.3](https://msbenchapp.azurewebsites.net/run-analysis/2026102173541828) |
| `mcp` | [87.8](https://msbenchapp.azurewebsites.net/run-analysis/2026102173540372) | [Setup failure](https://msbenchapp.azurewebsites.net/run-analysis/2026102173541158) | [87.2](https://msbenchapp.azurewebsites.net/run-analysis/2026102173541774) |
| `skills-mcp` | [79.2](https://msbenchapp.azurewebsites.net/run-analysis/2026102173540366) | [93.6](https://msbenchapp.azurewebsites.net/run-analysis/2026102173541052) | [88.8](https://msbenchapp.azurewebsites.net/run-analysis/2026102173541688) |

MCP-only attempt 2 raised `MSBenchAgentSetupError`. Its setup log showed
that npm installation completed but the Copilot CLI startup probe failed
with `no platform package found`. No model ran and no startup timing was
produced; the underlying reason for the missing package was not established.
A separately tagged, otherwise unchanged
[replacement submission](https://msbenchapp.azurewebsites.net/run-analysis/2026102175185594)
passed in 80.2 agent seconds. The MCP medians include attempts 1, 3, and
this replacement; original-submission accounting remains 2 passes and
1 setup failure, not 3/3 original passes.

### What the trajectories show

Every executed trial followed the common `aspire start` recipe rather
than inventing a launch procedure. All six skill-enabled trials loaded
`aspire-orchestration`; two also loaded the `aspire` router. No
skill-disabled trial invoked a skill. MCP-only trials made no Aspire
MCP calls. The combined treatment's second attempt made one successful
`aspire-list_apphosts` call before launch, returning no running AppHosts;
its other two attempts made none. No no-MCP trial called Aspire MCP.
This therefore measures **capability availability**, not a forced
CLI-versus-MCP launch comparison.

With the endpoint recipe, extraction itself took only 0.15-0.26 seconds
and post-recipe agent work took 7.6-12.5 seconds across trials. The
combined treatment's median startup agent time was 88.8 seconds, versus
115.1 seconds for startup in the earlier four-step experiment. That
historical difference is not a controlled estimate of the recipe's
effect alone: the task scope/prompt also changed and infrastructure
timing/cache state was not controlled.

Skills still added observable pre-launch discovery: their trajectories
loaded guidance/reference files and performed worktree/AppHost checks
before the supplied command. Median launch-command times were similar
across cells (18.8-20.0 seconds); the full-agent differences do not imply
that skills make the application itself slower. Wait time and total time
also varied substantially, including a 117.1-second no-skills/no-MCP
trial. Three valid samples per cell, unequal actual MCP consumption,
and unpaired infrastructure variation are insufficient for a reliable
performance ranking or a causal claim about MCP.

## Continuation retry with MSBench 0.3.67

Probe [2026102173182342](https://msbenchapp.azurewebsites.net/run-analysis/2026102173182342)
retried the existing four-step Aspire task after the CLI upgrade, using the
current standard package rather than a custom runner. It resolved
`github-copilot-cli-pkg-main-20261021-184958` and CLI `1.0.102`.
The first agent invocation exited with code 1 before any model tool call;
the available error reported only `Copilot CLI process exited with code 1`.
The subsequent three invocations found `/output/.runner-lock` and exited
without processing their instructions. All step rewards were 0.

This is an agent-runtime failure, not application/model failure, and not a
valid continuation-performance sample. Upgrading the submission CLI did not
produce a working resumed session in this probe. Do not remove the lock and
claim continuation: the runner must reload the actual model session as well.
The paired fresh-versus-continuation arm remains blocked pending a runner
with verified session reload (or an explicitly selected custom adapter).
Keep this diagnostic probe out of startup-ablation aggregates; those use
the previously working pinned package and CLI version.

## Alternative-agent continuation control

Two additional October 21 runs used the unchanged original four-step Aspire
task and model `gpt-6-luna`, with MSBench CLI `0.3.67` on CES staging:

| Mode | Run | Step rewards | Final reward | Actual conversations |
|---|---|---|---|---|
| Fresh | [2026102179917578](https://msbenchapp.azurewebsites.net/run-analysis/2026102179917578) | 1, 1, 1, 1 | 1 | Four separate Codex threads |
| Resume requested | [2026102179916912](https://msbenchapp.azurewebsites.net/run-analysis/2026102179916912) | 1, 1, 1, 1 | 1 | Four separate Codex threads |

Both used Registry agent `msbench-codex-cli@0.14.1792564410`, explicitly
pinned Python runtime `msbench-agent-codex-cli==0.0.15`, and resolved vendor
CLI `codex-cli 0.163.0`. The vendor CLI version was observed, not explicitly
pinned. The task image, sources, instructions, skills/MCP declarations, and
limits were unchanged; no custom runner was introduced.

Standard command (for the fresh control, omit `--harbor-resume-trajectory`
and set the conversation tag to `fresh`):

```bash
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/bingo/dataset.jsonl \
  --benchmark aspire-bench --variant aspire \
  --agent msbench-codex-cli@0.14.1792564410 \
  --agent-runtime-version 0.0.15 --model gpt-6-luna \
  --backend ces-staging --acr msbenchstaging.azurecr.io --workers 1 \
  --harbor-resume-trajectory \
  --tag experiment=continuation-codex-control \
  --tag conversation=resume-requested
```

Every native step completed without a trial/step exception, including in
resume-requested mode: Codex did not encounter the Copilot runner's lock
refusal. Per-step `harbor-metadata.json` correctly reported
`resume_trajectory: false` for the fresh control and `true` for the requested
resume control. Runner logs accumulated in the latter's output snapshots.
However, raw per-step `agent.log` events recorded these distinct thread IDs:

| Step | Fresh thread | Resume-requested thread |
|---|---|---|
| startup | `01a16088-1c55-7903-9325-6f13994ca17b` | `01a16087-e657-7252-95a9-f8286d39832d` |
| services | `01a16089-cf82-7ee0-b104-2c09229adf16` | `01a1608e-b77d-7313-8183-7311233dc157` |
| database | `01a1608a-582d-7791-a639-b9e6d25fd782` | `01a1608f-7768-7b42-9dae-d46bc2203077` |
| redis | `01a1608b-561e-77c3-b336-d11110a8eb63` | `01a16090-74ba-7041-8aa6-e20d08a9b07a` |

The prepared package's `run-codex-cli-exec.cjs` confirms the distinction:
it extracts only the current `metadata.problem_statement`, then invokes
`codex exec ... -- <problemStatement>` for every step. It does not select
`exec resume`, load a prior thread, or inject conversation history.
The converted resume-services trajectory was malformed JSON, so thread
identity was checked in raw events rather than relying on that conversion.

This control shows that the shared execution path can deliver and complete
all four instructions with output preservation enabled. It narrows the
**lock refusal** toward the Copilot runner integration; it does not diagnose
Copilot's initial exit or prove MSBench conversation resumption works
end-to-end. Neither Codex run is a genuine resumed-session sample. Total
agent times were 283.2 seconds (fresh) and 591.6 seconds (resume requested),
but these are not continuation-effect measurements: both started fresh
threads and the latter's startup alone took 440.6 seconds.
The paired fresh-versus-genuinely-resumed comparison remains blocked on
a packaged runner that actually reloads its conversation.

## Compact startup-skill follow-up

The separate `compact-skills` treatment replaces the seven general Aspire
skills with one short `aspire-orchestration` skill. It points directly to the
same README recipe and retains failure handling and input-preservation rules,
without a router or additional reference files. MCP remains absent.
The application, prompt, recipe, oracle, resource limits, and live checks
match the existing `skills` treatment; the verifier only adds the new
treatment name to its accepted values. The original four-cell dataset and
historical tasks remain unchanged.

This intentionally tests a reduced, startup-specific guidance bundle, not
lossless compression of all seven skills or general Aspire capabilities.
The README already supplies the commands in both arms. Compare three fresh
model attempts per arm with the original pinned Copilot package/CLI/model,
and verify actual skill consumption and timing boundaries before interpreting
pre-launch or total-time differences. Run both arms again rather than
using the historical skill-enabled sample as the sole baseline.

The compact image passed a local Harbor oracle run with reward 1 and no
exceptions. The structural suite checks shared inputs and the compact
skill's exact immutable-input manifest.

The comparison dataset is `compact-dataset.jsonl`, pinning both task
definitions to `b8c6a2e52a36dae4b889d6857ab565d2a1ab4f19`. Reproduce each
arm with the standard CLI:

```bash
export USE_COPILOT_CLI_VERSION=1.0.99-0
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/aspire-startup/compact-dataset.jsonl \
  --benchmark aspire-startup --variant compact-skills \
  --agent github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627 \
  --model gpt-6-luna --env USE_COPILOT_CLI_VERSION \
  --backend ces-staging --acr msbenchstaging.azurecr.io --workers 1 \
  --repeat 3 --tag experiment=compact-startup-skills
unset USE_COPILOT_CLI_VERSION
```

Repeat with `--variant skills`. Both arms use no MCP and fresh conversations.

### Observed compact-skill results

The October 21 follow-up produced six passing model-executed trials
(three per arm), with final and startup rewards all 1 and no trial/step
exceptions. Every executed trial used the pinned package and model above,
and actual CLI provenance confirmed `1.0.99-0`. Recorded timing boundaries
were checked against the recipe's shell-tool execution and Harbor's
agent-execution interval.

| Guidance | Full agent time | Pre-launch | Launch command | Subsequent wait | Extraction | Post-recipe | Outside recipe |
|---|---:|---:|---:|---:|---:|---:|---:|
| Seven original skills | 83.7 | 13.6 | 17.2 | 45.5 | 0.17 | 8.2 | 21.9 |
| One compact startup skill | 85.2 | 12.0 | 20.4 | 45.1 | 0.17 | 7.4 | 19.5 |

Values are independent column medians in seconds, not an additive
representative trial. Outside-recipe time is computed per trial as
pre-launch plus post-recipe time before taking the median.

| Guidance | Attempt 1: full agent seconds | Attempt 2: full agent seconds | Attempt 3: full agent seconds |
|---|---|---|---|
| Original skills | [83.3](https://msbenchapp.azurewebsites.net/run-analysis/2026102200430364) | [83.7](https://msbenchapp.azurewebsites.net/run-analysis/2026102200431170) | [Image-build failure](https://msbenchapp.azurewebsites.net/run-analysis/2026102200431782) |
| Compact startup skill | [77.2](https://msbenchapp.azurewebsites.net/run-analysis/2026102200430362) | [85.2](https://msbenchapp.azurewebsites.net/run-analysis/2026102200431166) | [89.9](https://msbenchapp.azurewebsites.net/run-analysis/2026102200431780) |

There were seven submissions, not six: the original-skills third attempt
failed before model execution when fetching `https://aspire.dev/install.sh`
returned HTTP 503 during Docker build. An explicitly tagged, unchanged
[replacement](https://msbenchapp.azurewebsites.net/run-analysis/2026102201488750)
passed in 89.3 agent seconds and supplies the third valid baseline sample.
The original baseline submissions remain two passes and one infrastructure
failure; no timing is assigned to the failed build.

All three compact trials loaded only `aspire-orchestration`, read the
README, then executed the supplied recipe without pre-launch repository
discovery. All three baseline trials loaded the `aspire` router, and two
also loaded `aspire-orchestration`. Baseline trajectories additionally
checked worktree/environment state or searched for AppHost/benchmark files.
Thus actual guidance consumption was not identical even within the
original-skills arm.

The compact treatment reduced median pre-launch time by 1.6 seconds and
outside-recipe time by 2.5 seconds, but **did not improve median full agent
time** in this sample (85.2 versus 83.7 seconds). Its launch-command median
was higher, while readiness-wait medians were similar. These three-sample
arms show less discovery work, not a demonstrated end-to-end speedup.
The baseline was also faster than its historical 90.3-second median:
comparing the compact arm only to that older sample would overstate the
benefit. Do not replace the general-purpose skills based on this
startup-only, already-documented workflow.

## Recipe-location comparison

The `readme-only` and `startup-skill` treatments test where startup knowledge
is delivered, rather than adding a skill on top of an already complete README.
Both receive the same location-neutral instruction, application, limits,
oracle solution, timing contract, and verifier. Neither has MCP.
`readme-only` has the original recipe in its README and no skills.
`startup-skill` has only a brief, non-procedural README and a single discoverable
`aspire-startup` skill whose body is byte-identical to that recipe. Its
frontmatter identifies startup and endpoint discovery as the trigger.

This compares two delivery mechanisms, not differently optimized instructions.
Check actual skill loading, correct startup and timing files, discovery cost,
and full agent time independently. The prompt does not name either guidance
file. A passing oracle proves image/verifier viability, not model skill
discovery; both images passed locally before cloud submissions.

The separate `location-dataset.jsonl` pins both treatments to
`a449468c06970caeffd4f89989c314c3c6cf6d56`. Standard reproduction:

```bash
export USE_COPILOT_CLI_VERSION=1.0.99-0
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/aspire-startup/location-dataset.jsonl \
  --benchmark aspire-startup --variant startup-skill \
  --agent github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627 \
  --model gpt-6-luna --env USE_COPILOT_CLI_VERSION \
  --backend ces-staging --acr msbenchstaging.azurecr.io --workers 1 \
  --repeat 3 --tag experiment=startup-recipe-location
unset USE_COPILOT_CLI_VERSION
```

Repeat with `--variant readme-only`. The earlier datasets and their explicitly
README-directed prompts are unchanged and are not pooled into this comparison.

### Observed recipe-location results

The October 21 comparison (October 22 UTC run IDs) used MSBench `0.3.67`,
the pinned package/model above, and verified CLI `1.0.99-0` in all six
model-executed trials. Every executed startup and final reward was 1,
with no trial/step exceptions.

| Recipe location | Full agent time | Pre-launch | Launch command | Subsequent wait | Extraction | Post-recipe | Outside recipe |
|---|---:|---:|---:|---:|---:|---:|---:|
| README only | 86.3 | 14.3 | 19.3 | 45.5 | 0.16 | 9.7 | 23.0 |
| Single startup skill | 72.4 | 8.9 | 20.4 | 36.4 | 0.21 | 6.1 | 14.9 |

Values are independent column medians in seconds. Outside-recipe time
is computed per trial before taking the median. Cooperative timestamp
boundaries were checked against Harbor's agent interval and the shell
execution. README attempt 2 used an asynchronous shell: its final
`read_bash` exit-0 event, not the initial still-running tool return,
provides the completion bound.

| Recipe location | Attempt 1: full agent seconds | Attempt 2: full agent seconds | Attempt 3: full agent seconds |
|---|---|---|---|
| README only | [89.6](https://msbenchapp.azurewebsites.net/run-analysis/2026102202625460) | [86.3](https://msbenchapp.azurewebsites.net/run-analysis/2026102202626270) | [77.4](https://msbenchapp.azurewebsites.net/run-analysis/2026102202626884) |
| Single startup skill | [72.4](https://msbenchapp.azurewebsites.net/run-analysis/2026102202625462) | [Build HTTP 503](https://msbenchapp.azurewebsites.net/run-analysis/2026102202626280) | [Build HTTP 504](https://msbenchapp.azurewebsites.net/run-analysis/2026102202626886) |

Eight submissions produced those six executed trials. The two skill-arm
build failures occurred fetching `https://aspire.dev/install.sh`, before
model execution, and have no startup timing. Two unchanged, explicitly
tagged replacements passed in
[76.2 seconds](https://msbenchapp.azurewebsites.net/run-analysis/2026102203603998)
and [70.3 seconds](https://msbenchapp.azurewebsites.net/run-analysis/2026102203604770).
Skill medians include the original executed trial and these replacements;
original-submission accounting remains one pass and two build failures.

All three executed skill trials invoked `aspire-startup` first, then ran
the recipe in one shell without opening the README or inspecting AppHost
sources beforehand. README-only trials instead searched the workspace,
read the README and AppHost/configuration, and inspected repository or
environment state before launch. The same procedural content therefore
reached the agent through a directly selected skill with less discovery
in these observed trajectories.

Median pre-launch time fell by 5.4 seconds and outside-recipe time by
8.1 seconds. Full agent time was 13.9 seconds lower in this sample, but
the readiness-wait median was also 9.0 seconds lower; these independent
medians do not form an additive causal decomposition. Three valid
samples per arm, replacement trials later in time, and uncontrolled
infrastructure/cache variation do not establish the size of a general
speedup. The supported conclusion is narrower: a self-contained,
discoverable startup skill worked without a procedural README and
consistently avoided the observed pre-launch repository discovery.
This does not demonstrate `aspire run` alone suffices: both locations
still supply explicit readiness, endpoint-extraction, and timing commands.

## Adding full orchestration alongside the startup skill

The `startup-orchestration` treatment adds the existing full
`aspire-orchestration` skill and its reference files to `startup-skill`.
The original standalone `aspire-startup` skill, brief README, neutral prompt,
application, recipe, and limits remain identical. MCP and the router skill
remain absent. A pinned Docker build context fetches orchestration from the
existing skill snapshot; it is not rewritten or reduced for this experiment.
The combined image passed local Docker/Harbor oracle validation.

Compare three fresh attempts in each arm with the same Copilot package,
CLI, and model as prior experiments. Inspect actual skill selection rather
than assuming that both available skills are loaded. Define observable churn
as additional skill loads, reference-file reads, pre-launch tool calls,
and pre-launch/outside-recipe agent time. Treat application launch and
readiness-wait variability separately. This measures the effect of making
the broader skill available alongside startup guidance, not forced
orchestration consumption or the value of its safeguards in ambiguous
workspaces.

`orchestration-dataset.jsonl` pins both tasks to
`e9ca000aebbea9fa5802239c7464761ec4f6566f`. Reproduction uses standard CLI
commands, with `startup-skill` as the other arm:

```bash
export USE_COPILOT_CLI_VERSION=1.0.99-0
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/aspire-startup/orchestration-dataset.jsonl \
  --benchmark aspire-startup --variant startup-orchestration \
  --agent github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627 \
  --model gpt-6-luna --env USE_COPILOT_CLI_VERSION \
  --backend ces-staging --acr msbenchstaging.azurecr.io --workers 1 \
  --repeat 3 --tag experiment=startup-orchestration-churn
unset USE_COPILOT_CLI_VERSION
```

### Observed orchestration-availability results

The October 21 experiment used MSBench `0.3.67` and the same pinned
package/model above, with actual CLI `1.0.99-0` verified in all six
executed trials. All six startup/final rewards were 1, with no trial/step
exceptions. Recipe timestamp boundaries were checked against shell-tool
events and Harbor's agent interval.

| Available skills | Full agent time | Pre-launch | Launch command | Subsequent wait | Post-recipe | Outside recipe |
|---|---:|---:|---:|---:|---:|---:|
| Startup only | 75.0 | 8.8 | 20.7 | 43.6 | 6.3 | 15.1 |
| Startup + full orchestration | 78.8 | 8.3 | 19.3 | 45.3 | 6.5 | 14.9 |

Values are independent column medians in seconds, not an additive
representative run. Outside-recipe time is computed per trial.

| Observed churn | Startup only | Startup + full orchestration |
|---|---|---|
| Loaded skills, every executed trial | `aspire-startup` only | `aspire-startup` only |
| Pre-launch tool calls, excluding recipe shell | 1 in every trial | 1 in every trial |
| Orchestration reference reads | 0 | 0 |
| Total tool calls per trial | 3, 4, 4 | 4, 4, 5 |

The combined trials' raw process logs confirm that **both** skills were
advertised in the model's available-skills list. The agent consistently
selected the dedicated startup skill and went directly to the recipe.
Thus the absence of orchestration calls is not simply an assumption based
on installed files. Extra post-launch tool calls involved checking output
files or HTTP endpoints, not loading orchestration references.

| Arm | Attempt 1: full agent seconds | Attempt 2: full agent seconds | Attempt 3: full agent seconds |
|---|---|---|---|
| Startup only | [87.7](https://msbenchapp.azurewebsites.net/run-analysis/2026102204630452) | [Build HTTP 502](https://msbenchapp.azurewebsites.net/run-analysis/2026102204631206) | [75.0](https://msbenchapp.azurewebsites.net/run-analysis/2026102204631854) |
| Startup + orchestration | [88.0](https://msbenchapp.azurewebsites.net/run-analysis/2026102204630456) | [78.8](https://msbenchapp.azurewebsites.net/run-analysis/2026102204631234) | [67.9](https://msbenchapp.azurewebsites.net/run-analysis/2026102204631852) |

Seven submissions produced six executed samples. The startup-only second
attempt failed before model execution while fetching the Aspire installer
(HTTP 502). Its unchanged, explicitly tagged
[replacement](https://msbenchapp.azurewebsites.net/run-analysis/2026102205656936)
passed in 72.0 seconds and provides the third valid control sample.
Original control submissions remain two passes and one build failure.

**No added pre-launch discovery churn was observed from orchestration's
availability alongside a directly selected startup skill.** The combined
arm's full-agent median was 3.8 seconds higher, but pre-launch and
outside-recipe medians were slightly lower, and readiness waits varied.
With three samples per arm this is not evidence of a total-time penalty
or proof that metadata has zero inference cost.

This does **not** measure the cost of loading orchestration's body or
following its references: it was never invoked. Earlier broad-skill
experiments did load it and perform additional discovery, but also changed
the skill bundle and guidance arrangement. An invocation-specific comparison
would need a separate explicit treatment rather than reinterpreting this
availability result.
