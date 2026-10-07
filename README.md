# aspire-bench

A local [Vally](https://microsoft.github.io/vally/) harness comparing **agent
effectiveness** on a raw application and its aspirified counterpart. This is not
an HTTP load test. The first scenario is **launch and verify the application**:
objective success, elapsed agent time, tokens, tool calls, and turns.

Bingo is a licensed snapshot of
[aspireify-workshop's `sebros/bench` branch](https://github.com/sebastienros/aspireify-workshop/tree/sebros/bench).
Both fixtures contain the same C#/SignalR backend, migration worker, data
model, and Vue/Vite frontend, with PostgreSQL 18.3 and Redis 8.6. The treatment
uses `03-observe/csharp` with ServiceDefaults and OTel.
Exact commits, licenses, and adaptations are recorded in
[`apps/bingo/provenance.json`](apps/bingo/provenance.json) and
[`treatment/provenance.json`](treatment/provenance.json).

## Local setup

Use macOS or Linux with Bash, curl, `lsof`, Git, Node **24+**, a stable **.NET 10
SDK**, Docker with a running daemon and Compose v2, and **Aspire CLI 13.6.x**.
The initial harness supports local Unix Docker sockets, not Windows or remote
TLS Docker contexts. Install prerequisites through their official installers;
the harness does not install global tools or change global configuration.

```bash
git clone https://github.com/sebastienros/aspire-bench.git ~/github/aspire-bench
cd ~/github/aspire-bench
npm ci --ignore-scripts
npm run validate
npm run bench -- plan
npm run bench -- preflight
npm run bench -- dry-run
npm run bench -- smoke
```

`validate` type-checks, runs unit tests, and validates the registry and specs
against the pinned Vally API. CI runs only this offline validation: no auth,
Docker, or paid inference.

`dry-run` creates fresh workspaces and starts actual Copilot SDK sessions
**without sending a prompt**. It initializes the tool catalog, queries skills
and MCP servers, verifies their exact identities, and saves `visibility.json`.
Each variant must expose exactly its declared skills/MCP servers; the default
raw control exposes neither, and full Aspire exposes seven snapshotted skills
and live Aspire MCP tools. Unexpected inherited configuration
or missing tools fails closed. Requires Aspire, but not Docker or an inference
token.

`smoke` launches both real stacks serially **without an agent/model call**, runs
the common objective verifier, and cleans up even on failures/interruption.
Startup may download public NuGet/npm packages and images. Smoke establishes
infrastructure readiness, not agent quality.

## Direct Vally evaluation

### Native local-snapshot experiment

[`experiments/bingo.experiment.yaml`](experiments/bingo.experiment.yaml) is the
comparison source of truth: native Vally `repo-comparison`, a shared eval,
baseline `raw`, serial `execution.workers: 1`, and exactly three varying axes:
`/environment/files`, `/environment/skills`, `/environment/mcpServers`.
Local directories are copied through Vally's `environment.files` contract.
There are no remote clones, new app repositories, or sibling/harness files in
an agent workspace. Paths in variant overrides resolve relative to the
experiment file. Vally resolves, hashes and rejects undeclared configuration
drift before any agent starts.

| Variant | Application snapshot | Aspire skills | Aspire MCP |
|---|---|---|---|
| `raw` | Raw, README-only manual lifecycle | No | No |
| `raw-scripted` | Same raw app, lifecycle management scripts | No | No |
| `aspire-none` | Aspire | No | No |
| `aspire-mcp` | Aspire | No | Yes |
| `aspire-skills` | Aspire | Yes | No |
| `aspire` | Aspire | Yes | Yes |

All four Aspire cells use the **same AppHost/application snapshot**. This
supports AppHost-only comparison and skills/MCP ablation without assuming the
raw app supports Aspire MCP. "Skills/MCP" here means Aspire-specific additions,
not ordinary shell/file tools. Enabling skills also exposes the runtime's skill
loader. Configuration discovery and global skills/MCP remain disabled in all
cells.

**Default selection remains `raw,aspire`: two trials per pair, not six.**
By explicit naming decision, `raw` now means the README-only manual fixture;
the preserved management-script fixture is `raw-scripted`.
`--variants` selects explicit names or `all`; `--pairs` repeats that selected
set. Each repetition reverses variant order to reduce order bias.

```bash
# No inference: inspect resolved native plan and all six effective catalogs.
npm run bench -- plan
npm run bench -- dry-run --variants all

# Paid commands: only run intentionally with a subscription token.
bash scripts/run.sh --model gpt-6-luna --variants aspire-none,aspire-mcp --pairs 1 --allow-paid
bash scripts/run.sh --model gpt-6-luna --variants all --pairs 1 --allow-paid

# Explicit manual versus scripted launch comparison (paid, only when authorized).
bash scripts/run.sh --model gpt-6-luna --variants raw,raw-scripted --pairs 1 --allow-paid
```

Every selection uses the same shared prompt, model, limits and objective grader.
Native arrays replace inherited arrays, maps deep-merge, and `null` clears
inherited MCP maps; offline tests verify these contracts and all six native
staging/execution cells without inference.

The new `apps/bingo/raw/` is a distinct self-contained source snapshot with
build/dependency configuration, Compose for PostgreSQL/Redis only, and a README.
It contains no lifecycle scripts, AppHost, skills, MCP or hidden scripted copy.
Native `environment.files` stages only that folder into the raw agent workspace,
not `raw-scripted`, sibling apps or the host harness. The README documents
configuration, build/install, dependency readiness, migrations/seeding,
individual detached backend/frontend launches, endpoint submission and
working-directory-checked stopping. It is not a replacement launcher file.
`npm run bench -- smoke --variants raw` executes those actual README start/stop
commands in an owned workspace without inference; setup never prestarts an
evaluation.

**No paid agent evaluation occurs during setup, validation, dry-run or smoke.**
A real evaluation requires an explicit consent flag and model:

```bash
# Token authorized for your Copilot subscription; never write it to a file.
export COPILOT_GITHUB_TOKEN="$(gh auth token)"
bash scripts/run.sh --model gpt-5.5 --pairs 3 --timeout 15m --allow-paid
unset COPILOT_GITHUB_TOKEN
```

Alternatively export `GH_TOKEN` or `GITHUB_TOKEN`. The SDK does not inherit
your logged-in Copilot user, personal settings, or OAuth files. Token/account
policy must permit the selected model. Enterprise managed restrictions may
still apply; visibility validation rejects changes to the declared treatment.

Both variants receive the **same prompt, model, timeout, objective grader and
threshold**. Runs are serial: one worker, one trial per Vally invocation, and
**no automatic retries**. Pair order alternates raw-first/treatment-first.
Each trial has a new copied workspace, isolated HOME/Copilot config, fresh data
volume, unique containers/Compose project and allocated ports. Raw follows its
manual README; `raw-scripted` uses its Bash launcher; Aspire uses exact-target
`aspire start --non-interactive --isolated` and `aspire wait`. Dependency restoration, builds and application
startup are still the agent's task, not pre-completed work.

Results default to ignored `.runs/<timestamp>/`; `--output DIR` requires a new
directory. Recreate the deterministic, **free** paired comparison with:

```bash
bash scripts/report.sh .runs/<timestamp>
```

| Artifact | Meaning |
|---|---|
| `metadata.json` | Source/harness commits, tool versions, OS/architecture, model, timeout, selected variants, recorded fixture/lifecycle definitions and baseline |
| `experiment.yaml`, `experiment-plan.json`, `<pair>-<variant>/plan.json` | Native experiment, resolved effective specs, hashes and declared varying axes |
| `paired.json`, `comparison.md` | Derived after cleanup from native JSONL and lifecycle status; unavailable failure metrics are N/A, not zero |
| `<pair>-<variant>/visibility.json` | Actual loaded skills and agent-visible tools checked before inference |
| `<pair>-<variant>/agent.json`, `proof.json` | Host executor identity/setup duration and program grader checks/grading duration |
| `<pair>-<variant>/vally.log`, `cleanup.log`, `exit-code`, `cleanup-exit-code` | CLI diagnostics and lifecycle completion; failed/incomplete cleanup cannot count as success |
| `<pair>-<variant>/session-logs/` | Exported SDK session history, including interrupted runs when available |
| Vally timestamped subdirectories | Native JSONL outcomes, Markdown report, SDK session logs and OTel trajectories |
| `<pair>-<variant>/workspace.json` | Retained disposable runtime workspace identity/location |

Vally 0.17's native `vally compare` invokes a paid prompt judge; its experiment
runner parses `grader_plugins`, `executor_plugins` and `eval_plugin` but does
**not load them**. Running `vally experiment run` directly would lose required
isolation hooks. Small lifecycle scripts therefore use the native
`resolveExperiment` API (including merge/drift/hash validation), then invoke
**`vally eval` directly**, with `--executor-plugin`, one worker and no retries.
The shared spec uses Vally's **built-in `program` grader** to run
`scripts/verify.sh`; there is no custom grader plugin or in-memory proof map.
Plugin fields are deliberately not placed in the manifest.

`scripts/run.sh` selects/repeats named variants, alternates order and calls
`scripts/setup.sh` followed by `scripts/trial.sh`. Setup copies/configures but
does **not** launch the application. The trial script calls the pinned local CLI:

```bash
node node_modules/@microsoft/vally-cli/dist/index.js eval \
  -e "$TRIAL/eval.yaml" --work-dir "$RUNTIME/app" \
  --workspace "$RUNTIME/workspaces" --output-dir "$TRIAL" \
  --workers 1 --max-retries 0 --require-pass \
  --executor-plugin "$PWD/dist/plugin.js" --shutdown-timeout 3m
```

Use `scripts/trial.sh`, rather than pasting this command into an ambient shell:
it passes the isolated runtime environment, keeps credentials only in memory,
and traps failure, interruption and a bounded lifecycle deadline.
The program grader independently verifies the still-running application and
cleans owned resources; the shell finalizer calls `scripts/cleanup.sh` again
even if execution fails or grading never runs. `scripts/report.sh` reads native
JSONL after cleanup; reporting does not orchestrate inference. The existing
`npm run bench -- eval ...` command is a compatibility alias for `scripts/run.sh`.

Vally owns local file/skill staging, inference, normalized metrics, trajectories
and native reports. The scripts only supply per-run owned HOME/services/auth,
retain evidence and produce a free comparison. The minimal executor controls
SDK auth/config discovery and asserts staged inputs/effective catalogs before
inference; arbitrary setup scripts cannot enforce those session-level controls.
Vally's default executor enables configuration discovery and does not expose
our exact skills/extensions/history restrictions or catalog assertions.
The scripts do not independently reconstruct variant specs from registry
fixtures. Runtime-generated IDs/ports/homes are unique per trial rather than
experimental factors; secrets remain outside manifest artifacts.

Compare objective success first, then costs among successful trials. Cheap
failures are not improvements. Tokens are SDK/Vally usage metrics, not billing
estimates; inspect raw usage events for missing telemetry. Report sample size,
failures, model, timeout and environment. One pair is an infrastructure check,
not a statistically meaningful finding. The first local Luna pair was inconclusive:
raw timed out and an already-fixed cleanup observer defect invalidated the
Aspire verdict despite passing application checks. Those private local
artifacts are retained unchanged, not published as a benchmark claim.
**Historical runs named `raw` before this split used the scripted fixture**,
including the original Luna runs. Do not relabel or reinterpret them as manual.
Reports use recorded metadata/provenance, never the current registry to infer
past variant meanings. New runs record lifecycle definitions explicitly; reports
of older runs flag the naming boundary rather than silently resolving old `raw`
against today's manual fixture.

## Objective success

The agent leaves the stack running and writes loopback admin/frontend origins
to `benchmark-endpoints.json`. Its self-report is not evidence. Before cleanup,
the host verifier checks:

1. Fixture source/guidance is unchanged; endpoints belong to newly created
   run-owned processes; dependency containers belong to this run.
2. PostgreSQL accepts connections; actual Identity/BingoSquare tables contain
   migration and seed data; Redis answers authenticated PING when required.
3. Real admin login HTML and player frontend are accessible. The frontend API
   proxy reaches the backend and its SignalR proxy negotiates transports.
4. A fresh square can be imported into PostgreSQL, called, observed in
   Redis-backed producer status and cleared through the application's developer
   API. Both variants receive the identical workflow.

Timeouts, modified fixtures, mocks, missing endpoints/host evidence, failed
workflow assertions and cleanup failures cannot count as success. Grading is
not based on agent-answer greps, health endpoints alone or a file's presence.

## Treatment, timing and limitations

All seven upstream Aspire `SKILL.md` files and **all their references** are
copied project-locally by native `environment.skills`, one directory per skill
at the workspace root (Vally 0.17's supported layout). Upstream skill-evaluation
fixtures are excluded. This is a complete licensed guidance snapshot, not
hand-written substitutes. `aspire agent init` is the supported regeneration
path for future snapshots; never copy personal skill/config directories.
Treatment has `.github/mcp.json`, but the SDK explicitly receives
`aspire agent mcp`: Vally does not discover workspace MCP JSON.

The minimal executor delegates inference/metrics to Vally's Copilot SDK executor,
controls discovery, disables personal/built-in skills, plugins, extensions,
cross-session history and hosted GitHub MCP, and checks the effective catalog
before inference. Raw has no AppHost, active ServiceDefaults, Aspire skills or
checkpoint documentation. Original Bingo content/version fields may mention
Aspire; those are application data, not orchestration guidance.

Fixture copying, executable/config isolation and visibility checks are setup;
verification/cleanup are post-task work. These are excluded from reported agent
elapsed time. Agent restore/build/launch remain included. Native SDK/session
startup overhead remains in Vally time. Setup and grading durations are recorded
separately.

This is **configuration/resource isolation, not an OS security sandbox**.
The cooperative local agent has shell access; Aspire is not hidden from raw's
PATH. The common prompt forbids leaving the workspace or replacing/editing the
application, and objective checks reject tampering, but a malicious agent can
reach host files, Docker or the network. Use trusted fixtures/skills, preferably
on a dedicated disposable machine. Tokens are passed only through the child
environment, not saved in specs. Session logs may contain sensitive output:
review/redact all runtime artifacts before publishing them.

NuGet/npm caches, image downloads, file-based .NET SDK caches, CPU contention
and network variability affect startup. Versions/service tags are pinned, but
image tags are not immutable digests. The default raw/full-Aspire pair bundles
AppHost, health/telemetry, skills and
MCP, so it cannot attribute differences to one component. Select the named
Aspire ablation cells to measure skills and MCP separately; AppHost versus raw
still bundles orchestration, health and telemetry.

Script-installed Aspire may select its install sidecar before `ASPIRE_HOME`.
The harness copies only the installed executable, without that sidecar, into
the disposable treatment home; no settings or credentials are copied.
HTTP profiles avoid certificate trust prompts and automatic certificate
generation is disabled. Short macOS runtime paths accommodate Unix sockets.

## Cleanup and recovery

Cleanup first stops the **exact** Aspire AppHost, never `--all` or `--force`.
It then terminates only newly created processes whose kernel-reported cwd is
inside the owned runtime root, and removes only exact run-owned containers,
volumes and Compose networks. No global prune or name-based process killing.
SIGINT/SIGTERM trigger cleanup; SIGKILL or host crashes cannot.

Runtime directories/logs are retained for diagnosis. After a hard crash, use
the exact runtime root recorded in `workspace.json`:

```bash
bash scripts/cleanup.sh /tmp/aspirebench-<exact-run-directory>
```

This removes that run's services/disposable data, not retained files. The
host-generated ownership manifest is trusted local state; never edit it or
point cleanup at an arbitrary directory.

## Add an application or scenario

Add licensed, self-contained snapshots under `apps/<name>/<variant>/`, record
source commits/adaptations/licenses in `provenance.json`, and register variants
and scenarios, including an explicit `adapter` and native `experiment` path, in
`apps/registry.json`. Add a manifest under `experiments/` declaring local staging,
baseline, serial workers, and only intentional `vary` axes.
Register its launch/verifier implementation in `harness/adapters.ts`; unknown
adapters fail closed. Add one common Vally spec under
`scenarios/`, not different objectives for control and treatment. Setup
discovers apps/scenarios from the registry and resolves variant specs from the
native manifest. Keep variant-selection defaults explicit so adding a cell
does not silently increase evaluation spend.

A new architecture needs its own smoke/verifier adapter and cleanup ownership
contract. Do not silently grade it using Bingo endpoints/tables. Add positive
and negative verifier/isolation/cleanup tests, then run `validate`, `dry-run`
and non-agent `smoke` before spending evaluation credits.
