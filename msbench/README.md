# MSBench / Harbor

This is a separate, ready-configured Harbor benchmark. The application
sources, Dockerfiles, prompts, skills/MCP configuration and graders live
under `msbench/bingo/`. They are maintained independently of the Vally
fixtures and experiment files. There is no exporter, conversion or
synchronization between the two.

## Layout and variants

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

| Variant | Application and guidance | Aspire skills/MCP |
|---|---|---|
| `raw` | Raw app, lifecycle-only README | None |
| `raw-documented` | Raw app, manual setup README | None |
| `raw-scripted` | Raw app, launcher/check scripts and README | None |
| `aspire` | Aspire app | Seven skills and stdio MCP |

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

Both `msbench-cli` and `harbor` must be on PATH. For pipx, add its executable
directory to the current shell if needed:

```bash
export PATH="$HOME/.local/bin:$PATH"
command -v msbench-cli harbor
```

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
  --backend local --workers 1 --harbor-resume-trajectory
```

Change `--variant` to `raw-documented`, `raw-scripted`, or `aspire`, keeping
agent/model and run settings fixed. Omit `--backend local` or choose a
supported CES backend for cloud execution.

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
origin, `https://github.com/sebastienros/aspire-bench`, and currently selects
the published `sebros/msbench-benchmark-variants` branch.
While working on a pushed branch, edit `task_repo_commit` in the four rows to
that branch, and change the Git source ref in all four tasks'
`environment/docker-compose.yaml` files to that branch.
For reproducible runs, first pin the Compose Git contexts to a pushed commit
containing the shared apps, then commit/push the updated task definitions and
pin the dataset's `task_repo_commit` values to that task commit SHA.
There is no custom source-ref override script.

Tasks use Docker Compose's `build.additional_contexts` and Dockerfile
`COPY --from=raw-app` or `COPY --from=aspire-app` to load their shared directory
from this origin repository.
This works even when MSBench sparse-checks out only a selected task folder.
The shared-app source currently selects the same published branch as the
dataset. Builds require network access to GitHub.

Local MSBench execution requires its optional Harbor runtime
(`msbench-cli[harbor]`); the documented runtime is Harbor 0.20.0.
Prebuilt images are not required: Harbor builds each task's Dockerfile.

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
The selected MSBench agent must support consuming these capabilities and
trajectory resumption; CLI flags alone do not prove effective discovery or
same-conversation continuation.

Each step has a 900-second agent limit and a 300-second verifier limit. Final
reward is binary, using Harbor's `final` aggregation. The graders enforce
endpoint and health-report contracts, preservation of previous JSON outputs,
unchanged application inputs, dependency readiness/seed data, application
listener ownership, frontend API/SignalR proxying and a database/Redis
round-trip workflow. Redis verification handles the Aspire image's TLS.

The only environment bootstrap script starts a **private Docker daemon**
needed by Compose and Aspire. There is no host Docker socket mount or host
port publication. Fixed internal names/ports are isolated per trial.
The outer container is privileged: use dedicated disposable compute, not a
security boundary for hostile agents. Cloud execution also requires a runner
that permits this privileged Compose environment.

See the [MSBench authoring guide](https://msbenchapp.azurewebsites.net/documentation/3-how-to-create-a-new-benchmark)
and [Harbor multi-step format](https://docs.harborframework.com/tasks/multi-step).
