# MSBench / Harbor

This is a separate, ready-configured Harbor benchmark. The application
sources, Dockerfiles, prompts, skills/MCP configuration and graders live
under `msbench/bingo/`. They are maintained independently of the Vally
fixtures and experiment files. There is no exporter, conversion or
synchronization between the two.

## Layout and variants

The [Aspire improvement findings register](FINDINGS.md) collects actionable
lessons across experiments, including evidence, limitations, negative results,
and proposed skills/MCP improvements. Update it as new experiments change
what we know.

The separate [Aspire startup ablation](aspire-startup/README.md) compares
no skills/MCP, skills only, MCP only, and both with one matched startup
recipe and command-boundary timing. It does not change the original
four-step comparison below.

The [specific health skill experiment](aspire-health/README.md) applies the
same narrow-entry-point approach to service, PostgreSQL, and Redis health.
It compares the complete unchanged general bundle plus startup with and
without three specialized assessment skills, using the original four prompts.

```text
msbench/
  bingo/
    dataset.jsonl
    application-provenance.json
    treatment-provenance.json
    common/
      raw-app/
      aspire-app/
    tasks/
      raw/
      raw-documented/
      raw-scripted/
      aspire/
```

The three raw variants share one application in `bingo/common/raw-app/`.
Their `environment/app/` folders contain only variant-specific READMEs and,
for `raw-scripted`, scripts. Docker copies the shared app into `/app`, then
adds that variant's guidance. The Aspire application lives in
`bingo/common/aspire-app/` and uses the same pattern, with its README in the
task's `environment/app/` overlay. Skills and MCP configuration remain
task-specific.

Every task folder contains its own `task.toml`, `environment/Dockerfile`,
`environment/docker-compose.yaml`, verifier helpers, and
four `steps/`: startup, services, database, Redis. Each step has
`instruction.md`, `tests/test.sh`, and `solution/solve.sh`. The solutions are
reference implementations for Harbor's standard oracle validation, not
application setup exposed to the benchmark agent.

The prompts use the same lifecycle in every variant: start the application
and its dependencies once through its normal workflow, then wait for and
verify the existing services, database, and Redis. Startup waits for the admin
and frontend HTTP endpoints, not a separate assessment of every dependency.
Later steps observe the running application without starting, restarting, or
recreating individual resources. This accommodates Aspire's application-wide
startup as well as the raw variants' startup workflows. Output contracts and
step order remain unchanged.

| Variant | Application and guidance | Declared Aspire skills/MCP |
|---|---|---|
| `raw` | Raw app, lifecycle-only README | None |
| `raw-documented` | Raw app, manual setup README | None |
| `raw-scripted` | Raw app, launcher/check scripts and README | None |
| `aspire` | Aspire app | Seven project skills installed; Aspire skill loading and MCP use verified with Copilot |

All four variants use instance ID `bingo-health-checks`. The dataset declares
their logical benchmark relationship with `variant_of_benchmark`,
`benchmark_variant` and `default_variant: raw`. Selection is handled by
MSBench itself, not a wrapper or a runtime fixture transformation.

## Standard MSBench usage

Local execution requires the optional Harbor runtime, not just `msbench-cli`.
For a pip installation, install the extra:

```bash
pip install 'msbench-cli[harbor]'
```

For an existing pipx installation, inject the required runtime and expose its
executable:

```bash
pipx inject msbench-cli 'harbor==0.20.0' --include-apps
```

Both `msbench-cli` and `harbor` must be on PATH. MSBench also discovers agent
plugin executables through PATH. For the macOS pipx installation used here:

```bash
export PATH="$HOME/Library/Application Support/pipx/venvs/msbench-cli/bin:$HOME/.local/bin:$PATH"
command -v msbench-cli harbor msbench-agent-github-copilot-cli
```

On other platforms, substitute pipx's actual `msbench-cli` environment `bin`
directory. Listing an agent in the remote registry does not prove its local
runtime executable is discoverable.

Installing plain `msbench-cli` does not install Harbor. The CLI's suggestion
to run `pip install msbench-cli` when Harbor is missing does not address this.
Inspect the configured variants without inference:

```bash
msbench-cli list instances --dataset msbench/bingo/dataset.jsonl \
  --benchmark aspire-bench --variant raw-scripted --format json
```

Validate the published task through MSBench without model inference:

```bash
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/bingo/dataset.jsonl \
  --benchmark aspire-bench --variant raw \
  --config fix_validation --backend local --workers 1
```

`fix_validation` selects Harbor's **oracle** agent, which runs the reference
solutions. Do not combine it with `--harbor-resume-trajectory`: oracle does
not support trajectory resumption. `--model` does not turn this validation
config into a model evaluation. `MSBENCH_DISABLE_RUN_ANALYSIS=1` disables the
optional model-based report analysis, not the task verifier; it also avoids
warnings if MSBench's default analysis model is unavailable.

Run an intentional model evaluation using the normal CLI:

```bash
msbench-cli run --dataset msbench/bingo/dataset.jsonl \
  --benchmark aspire-bench --variant raw \
  --agent YOUR_AGENT --model YOUR_MODEL \
  --backend local --workers 1
```

Change `--variant` to `raw-documented`, `raw-scripted`, or `aspire`, keeping
agent/model and run settings fixed. Keep `--backend` explicit: omitting it
defaults to `ces-dev1`, not local execution or the staging onboarding path.

### Multi-step invocation and trajectory resumption

The default is one fresh agent invocation and a clean `OUTPUT_DIR` per step.
The application workspace, running services, and verifier checkpoints persist;
only agent output is reset. All variants must use the same invocation mode
when comparing outcomes.

Do **not** add `--harbor-resume-trajectory` to the stock Copilot commands below.
It preserves `OUTPUT_DIR` and sets `harbor_step.resume_trajectory` in metadata,
but does not keep an agent process alive or automatically restore conversation
history. The packaged runner must implement that contract.

In run `2026101503460490`, `gpt-6-luna` passed startup, but the next three
invocations found `/output/.runner-lock` and exited without processing their
instructions. This is not evidence of model failure on those steps. Removing
the flag uses the documented output reset and avoids retaining that lock;
it changes the experiment to fresh conversations, not same-conversation
continuation. Only enable resumption with a runner demonstrated to support it.

Cloud run [2026101504123494](https://msbenchapp.azurewebsites.net/run-analysis/2026101504123494)
confirmed this default path end to end for `raw` with `github-copilot-cli` and
`gpt-6-luna`: all four agent invocations executed, every step received reward
1, and the final reward was 1. Metadata recorded `resume_trajectory: false`
for every step, with no completion-lock skips or trial exceptions.

### Remote CES staging

The dataset uses the documented Harbor-native **build-on-demand** layout:
`image_tag` is omitted, `run_platform` is `linux_container`, and
`container_registry` selects `msbenchstaging.azurecr.io`. Task TOMLs omit
`docker_image`, so Harbor builds the task environment from its Dockerfile.
No application-image push is required. A registry is not a backend selector;
the registry field does not force a run onto `ces-staging`.

Validate remote orchestration with oracle before spending model inference:

```bash
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/bingo/dataset.jsonl \
  --benchmark aspire-bench --variant raw \
  --config fix_validation --backend ces-staging \
  --acr msbenchstaging.azurecr.io --workers 1
```

Once staging oracle passes, run the model agent:

```bash
MSBENCH_RUN_ANALYSIS_MODEL=gpt-6-luna msbench-cli run \
  --dataset msbench/bingo/dataset.jsonl \
  --benchmark aspire-bench --variant raw \
  --agent github-copilot-cli --model gpt-6-luna \
  --backend ces-staging --acr msbenchstaging.azurecr.io \
  --workers 1
```

Use `--backend ces-staging` with `status`, `report`, and `extract` for these
run IDs. Staging access, cloud agent identity, and privileged Docker Compose
support remain runtime requirements.
Do not assume a submission or completed CES job is a verifier pass.

### Pinned four-variant comparison (2026-10-21)

Three independent attempts per variant completed on CES staging, using:

- Task commit `1fcca7e91c89716f0e4a8bf7324da13a39f70c66` and shared application
  commit `baacba3e17181491c9a4d419db7d0e6763c3d363`.
- Agent package `github-copilot-cli-pkg-main-20261014-215627`,
  Copilot CLI `1.0.99-0` (confirmed in each step's `cli-provenance.json`),
  model `gpt-6-luna`, one worker per run, and no trajectory resumption.
- The existing 900-second per-step agent limits and identical prompts.
  Optional model-based report analysis was disabled.

| Variant | Final passes | Median agent seconds | Median input tokens | Median output tokens | Median tool calls |
|---|---:|---:|---:|---:|---:|
| `raw` | 3/3 | 197.5 | 555,339 | 10,106 | 67 |
| `raw-documented` | 3/3 | 178.0 | 471,332 | 8,024 | 58 |
| `raw-scripted` | 3/3 | 159.9 | 435,747 | 5,777 | 53 |
| `aspire` | 3/3 | 242.1 | 936,295 | 10,052 | 69 |

All 48 step rewards were 1, with no trial or step exceptions. Every Aspire
attempt loaded `aspire` and `aspire-orchestration`, and made 10, 8, and 4
Aspire MCP calls respectively. The raw attempts made no Aspire skill or MCP
calls. This confirms actual treatment consumption, not merely configuration.

Agent seconds sum all four Harbor `agent_execution` durations per trial;
they include shell/application waits but exclude image builds, agent setup,
verifiers, queue time, and report finalization. Token figures sum the four
steps' `agent_result` values; input includes cached tokens. Each table column
is its own median, not necessarily from the same attempt. Tool calls count
`tool.execution_start` events from each step's trajectory.

This is a small, single-application smoke comparison, not evidence of a
general performance ranking. The variants combine application orchestration,
guidance, skills and MCP rather than isolating each factor. These image
builds use cached/remote dependencies, not controlled cold caches. With
success saturated at 3/3 for every variant, more trials and additional tasks
are needed before drawing effectiveness conclusions.

| Variant | Attempt 1 | Attempt 2 | Attempt 3 |
|---|---|---|---|
| `raw` | [2026102168804688](https://msbenchapp.azurewebsites.net/run-analysis/2026102168804688) | [2026102168805324](https://msbenchapp.azurewebsites.net/run-analysis/2026102168805324) | [2026102168805924](https://msbenchapp.azurewebsites.net/run-analysis/2026102168805924) |
| `raw-documented` | [2026102168822404](https://msbenchapp.azurewebsites.net/run-analysis/2026102168822404) | [2026102168823056](https://msbenchapp.azurewebsites.net/run-analysis/2026102168823056) | [2026102168823658](https://msbenchapp.azurewebsites.net/run-analysis/2026102168823658) |
| `raw-scripted` | [2026102168822398](https://msbenchapp.azurewebsites.net/run-analysis/2026102168822398) | [2026102168823052](https://msbenchapp.azurewebsites.net/run-analysis/2026102168823052) | [2026102168823656](https://msbenchapp.azurewebsites.net/run-analysis/2026102168823656) |
| `aspire` | [2026102168822410](https://msbenchapp.azurewebsites.net/run-analysis/2026102168822410) | [2026102168823090](https://msbenchapp.azurewebsites.net/run-analysis/2026102168823090) | [2026102168823706](https://msbenchapp.azurewebsites.net/run-analysis/2026102168823706) |

Reproduce one variant's three-attempt batch with standard MSBench commands:

```bash
export USE_COPILOT_CLI_VERSION=1.0.99-0
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/bingo/dataset.jsonl \
  --benchmark aspire-bench --variant raw \
  --agent github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627 \
  --model gpt-6-luna --env USE_COPILOT_CLI_VERSION \
  --backend ces-staging --acr msbenchstaging.azurecr.io \
  --workers 1 --repeat 3 --tag comparison=20261021-pinned
unset USE_COPILOT_CLI_VERSION
```

Repeat with the other three `--variant` values. Keep the source, package,
CLI version, model, limits and invocation mode fixed.

Cloud GitHub checkout also requires the
[CES App](https://github.com/apps/ces-app) installed for the repository owner
`sebastienros`, with access to **only** `aspire-bench`. An authorized owner
must install/configure the app and approve the repository access. A public
repository does not bypass this cloud installation-token flow.

Staging oracle run `2026101503131983` reached the native path but failed at the
CES App lookup before checkout. Subsequent cloud run `2026101503460490`
successfully checked out the task, built the raw image, authenticated Copilot,
and passed startup. The earlier source-access failure is not the blocker in
that later run; its remaining failure was the runner lock described above.
Later run `2026101504123494` completed all four raw steps successfully without
resumption. Run `2026101504938791` also completed all four Aspire steps.
Those initial runs demonstrated cloud execution and Aspire MCP, but did not
yet establish Aspire skill discovery. The pinned comparison above verifies
both skill consumption and MCP use with the corrected image.

The earlier CES run `2026101502008746` used `ces-dev1` and placeholder
`image_tag` values, causing a pull of an unpublished image from
`codeexeccachecorp.azurecr.io` before Harbor started. Do not restore those tags
unless deliberately switching to published prebuilt images.

See the upstream [cloud guide](https://github.com/devdiv-microsoft/MicrosoftSweBench/blob/main/docs/detailed-reference/harbor/cloud.md)
and [image-less dataset guide](https://github.com/devdiv-microsoft/MicrosoftSweBench/blob/main/docs/detailed-reference/harbor/onboarding-dataset.md).

### Aspire treatment: declaration is not agent consumption

The Aspire image includes seven skills at `/opt/aspire-skills`, referenced by
`environment.skills_dir`, and at `/app/.github/skills` for Copilot's native
[project-skill discovery](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills).
Both locations are built from the same checked-in skill snapshot; no custom
runner or runtime staging script is needed. The project copies are covered
by the verifier's immutable input hashes. The image also has an installed `aspire` executable. Its
`environment.mcp_servers` declares the stdio command. Harbor/MSBench exposes
these through `MSBENCH_SKILLS_DIR` and `MSBENCH_MCP_CONFIG`; this does not prove
that a particular agent loads them.

The [built-in agent guide](https://msbenchapp.azurewebsites.net/documentation/using-msbench-built-in-agents)
says the shipped Copilot packages do not read `MSBENCH_MCP_CONFIG`, but the
runtime observed in cloud run
[2026101504938791](https://msbenchapp.azurewebsites.net/run-analysis/2026101504938791)
does: its runner logs forwarding that variable to
`COPILOT_CLI_MCP_CONFIG_FILE` and invokes Copilot with
`--additional-mcp-config @/drop/mcp-config.json`. The trajectory confirms actual
Aspire tool calls, including `aspire-list_resources`, `aspire-doctor`, and
Aspire log/trace tools. No custom runner or extra CLI arguments were needed.
This observed runtime evidence supersedes the guide's MCP limitation for this
run; do not assume every package version behaves identically.

The same run's model-visible `<available_skills>` catalog contained only
`customize-cloud-agent` and `github-pr-media`, not the seven Aspire skills.
There were no Aspire skill loader calls in its trajectory. The declared
`/opt/aspire-skills` assets therefore do not establish an active skill treatment:
this run demonstrates the Aspire application plus MCP, **not the full
skills/MCP treatment**. It predates the project-local skill installation above;
the corrected image was verified separately below.

Cloud probe [2026102168273796](https://msbenchapp.azurewebsites.net/run-analysis/2026102168273796)
verified the project-local installation: the actual `skill` tool loaded
`aspire` in all four steps and `aspire-orchestration` during startup. Aspire
MCP calls also appeared in the trajectory. All four step rewards and the final
reward were 1, with no trial exception and resumption disabled. This verifies
actual skill consumption rather than just asset presence; it does not imply
all seven skills should be invoked for this task.

The probe pinned `github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627`,
`USE_COPILOT_CLI_VERSION=1.0.99-0`, and model `gpt-6-luna`. Harbor agent
execution durations were approximately 130, 48, 28, and 38 seconds; these include
shell waits and application work, not just model reasoning.

In the earlier run `2026101504938791`, all four steps received reward 1 with
`gpt-6-luna`, no trial exceptions, and
`resume_trajectory: false`. Agent execution durations were approximately
98, 60, 31, and 697 seconds. The Redis duration included a 600-second shell
wait visible in the process log, so it is not pure model reasoning time.
Oracle success alone cannot establish any of these agent-side capabilities.

The setup audit successfully initialized the Aspire MCP server and listed its
14 tools directly inside the benchmark image, and verified all seven skill
directories. That probe established asset/server availability; the cloud
trajectory above separately establishes actual MCP use.

### Local Copilot agent prerequisites and authentication

All four images include Azure CLI, `jq`, and `unzip`, required by the
`github-copilot-cli` package downloader. These tools are installed at image
build time rather than consuming the agent's setup timeout.

The local Copilot plugin downloads its runtime from authenticated Azure Blob
Storage during setup. Its default model index also obtains an Azure token
for the Copilot endpoint. A host `az login` is **not** automatically available
inside the task container. Installing the tools does not provide authentication:
without an authenticated container, the downloader can wait for interactive
login until Harbor's 360-second agent setup timeout expires.

This benchmark does not mount your host Azure login cache, forward credentials
by default, or include credentials in images. Configure container authentication
through your approved execution environment before running this agent. Oracle
validation requires no Copilot package download or Azure authentication and
does not verify this agent-specific setup path.

**Commit and push the tasks and shared apps before running through MSBench**, including
with `--backend local`: MSBench fetches `task_path` from `task_repo`; it does
not execute an uncommitted local folder. The dataset points at this repository's
origin, `https://github.com/sebastienros/aspire-bench`. The dataset currently
pins task definitions to `1fcca7e91c89716f0e4a8bf7324da13a39f70c66`;
all four Compose contexts pin shared application sources to
`baacba3e17181491c9a4d419db7d0e6763c3d363`. These are separate commits so
task changes do not require recopying or republishing unchanged applications.
For reproducible runs, first pin the Compose Git contexts to a pushed commit
containing the shared apps, then commit/push the updated task definitions and
pin the dataset's `task_repo_commit` values to that task commit SHA.
There is no custom source-ref override script.

Tasks use Docker Compose's `build.additional_contexts` and Dockerfile
`COPY --from=raw-app` or `COPY --from=aspire-app` to load their shared directory
from this origin repository.
This works even when MSBench sparse-checks out only a selected task folder.
Builds require network access to GitHub.

Local MSBench execution requires its optional Harbor runtime
(`msbench-cli[harbor]`); the documented local runtime is Harbor 0.20.0.
Both local and cloud Harbor-native execution can build each task's Dockerfile
on demand; neither requires publishing an application image.

## Standard local image validation

Use Harbor's **oracle** agent to build and exercise each configured image,
run the four reference solutions, and grade the live stack without inference:

```bash
export MSBENCH_RAW_APP_CONTEXT="$PWD/msbench/bingo/common/raw-app"
export MSBENCH_ASPIRE_APP_CONTEXT="$PWD/msbench/bingo/common/aspire-app"
harbor run -p msbench/bingo/tasks/raw -a oracle -e docker -n 1 \
  --jobs-dir .runs/msbench-oracle
harbor run -p msbench/bingo/tasks/raw-documented -a oracle -e docker -n 1 \
  --jobs-dir .runs/msbench-oracle
harbor run -p msbench/bingo/tasks/raw-scripted -a oracle -e docker -n 1 \
  --jobs-dir .runs/msbench-oracle
harbor run -p msbench/bingo/tasks/aspire -a oracle -e docker -n 1 \
  --jobs-dir .runs/msbench-oracle
unset MSBENCH_RAW_APP_CONTEXT MSBENCH_ASPIRE_APP_CONTEXT
```

Unlike MSBench's Git-backed execution, these standard Harbor commands run the
local task directories directly. The environment variables select the local
shared apps as Docker's named build contexts instead of fetching them from Git.
They do not change the source layout or require a staging/copy script.
Compose 2.17+ and a BuildKit-capable builder are
required. Oracle mode does not prove a model's ability
to complete the task. Offline structural/grader checks are available with
`node --test msbench/benchmark.test.mjs`.

## Environment and grading

All images contain .NET 10.0.100, Node 24.14.0, Docker 28.0.4/Compose and
Aspire CLI 13.6.0, plus Azure CLI, `jq`, and `unzip` for agent provisioning.
Application restore/build/startup belongs to the task, not
image construction. The Aspire task declares skills and MCP in `task.toml`.
The selected MSBench agent must consume the declared capabilities to measure
the full treatment. Trajectory resumption is a separate, optional runner
capability, not a requirement for multi-step tasks.

Each step has a 900-second agent limit and a 300-second verifier limit. Final
reward is binary, using Harbor's `final` aggregation. The graders enforce
endpoint and health-report contracts, preservation of previous JSON outputs,
unchanged application inputs, dependency readiness/seed data, application
listener ownership, frontend API/SignalR proxying and a database/Redis
round-trip workflow. Redis verification handles the Aspire image's TLS.
Earlier steps check report shape and immutable checkpoints; the final Redis
step performs the live stack checks. Intermediate rewards are not independent
proof that every reported service was healthy.

The only environment bootstrap script starts a **private Docker daemon**
needed by Compose and Aspire. There is no host Docker socket mount or host
port publication. Fixed internal names/ports are isolated per trial.
The outer container is privileged: use dedicated disposable compute, not a
security boundary for hostile agents. Cloud execution also requires a runner
that permits this privileged Compose environment.

See the [MSBench authoring guide](https://msbenchapp.azurewebsites.net/documentation/3-how-to-create-a-new-benchmark)
and [Harbor multi-step format](https://docs.harborframework.com/tasks/multi-step).
