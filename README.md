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
Raw must expose zero skills/MCP servers; Aspire must expose exactly seven
snapshotted skills and live Aspire MCP tools. Unexpected inherited configuration
or missing tools fails closed. Requires Aspire, but not Docker or an inference
token.

`smoke` launches both real stacks serially **without an agent/model call**, runs
the common objective verifier, and cleans up even on failures/interruption.
Startup may download public NuGet/npm packages and images. Smoke establishes
infrastructure readiness, not agent quality.

## Real paired evaluation

**No paid agent evaluation occurs during setup, validation, dry-run or smoke.**
A real evaluation requires an explicit consent flag and model:

```bash
# Token authorized for your Copilot subscription; never write it to a file.
export COPILOT_GITHUB_TOKEN="$(gh auth token)"
npm run bench -- eval --model gpt-5.5 --pairs 3 --timeout 15m --allow-paid
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
volume, unique containers/Compose project and allocated ports. Raw uses its
Bash launcher; Aspire uses exact-target `aspire start --non-interactive
--isolated` and `aspire wait`. Dependency restoration, builds and application
startup are still the agent's task, not pre-completed work.

Results default to ignored `.runs/<timestamp>/`; `--output DIR` requires a new
directory. Recreate the deterministic, **free** paired comparison with:

```bash
npm run bench -- compare .runs/<timestamp>
```

| Artifact | Meaning |
|---|---|
| `metadata.json` | Source/harness commits, tool versions, OS/architecture, model, timeout and experiment identity |
| `paired.json`, `comparison.md` | Success/cost summary; unavailable failure metrics are N/A, not zero |
| `<pair>-<variant>/visibility.json` | Actual loaded skills and agent-visible tools checked before inference |
| `<pair>-<variant>/proof.json` | Host-side verifier checks and separate setup/grading durations |
| Vally timestamped subdirectories | Native JSONL outcomes, Markdown report, SDK session logs and OTel trajectories |
| `<pair>-<variant>/workspace.json` | Retained disposable runtime workspace identity/location |

Vally 0.17's native `vally compare` invokes a paid prompt judge; its experiment
runner does not yet wire custom executor/grader plugins. This small serial
driver therefore uses native `vally eval` with plugins and a free paired metric
report instead. Vally still owns inference, normalized metrics, trajectory
capture and native reports.

Compare objective success first, then costs among successful trials. Cheap
failures are not improvements. Tokens are SDK/Vally usage metrics, not billing
estimates; inspect raw usage events for missing telemetry. Report sample size,
failures, model, timeout and environment. One pair is an infrastructure check,
not a statistically meaningful finding. The first live agent comparison is
intentionally pending.

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
copied project-locally to treatment `.agents/skills`. Upstream skill-evaluation
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
image tags are not immutable digests. The treatment bundles AppHost,
health/telemetry, skills and MCP; this experiment cannot attribute differences
to one component. Future ablations can separate those factors.

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
npm run bench -- cleanup /tmp/aspirebench-<exact-run-directory>
```

This removes that run's services/disposable data, not retained files. The
host-generated ownership manifest is trusted local state; never edit it or
point cleanup at an arbitrary directory.

## Add an application or scenario

Add licensed, self-contained snapshots under `apps/<name>/<variant>/`, record
source commits/adaptations/licenses in `provenance.json`, and register variants
and scenarios, including an explicit `adapter`, in `apps/registry.json`.
Register its launch/verifier implementation in `harness/adapters.ts`; unknown
adapters fail closed. Add one common Vally spec under
`scenarios/`, not different objectives for control and treatment. The runner
discovers apps/scenarios from the registry; the paired driver expects two
variants.

A new architecture needs its own smoke/verifier adapter and cleanup ownership
contract. Do not silently grade it using Bingo endpoints/tables. Add positive
and negative verifier/isolation/cleanup tests, then run `validate`, `dry-run`
and non-agent `smoke` before spending evaluation credits.
