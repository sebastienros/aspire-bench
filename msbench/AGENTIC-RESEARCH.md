# Aspire agentic-development research

Living protocol, worktree/artifact ledger, execution log, and decision register.
Started 2026-11-04. This document distinguishes planned experiments from executed
evidence; pending work is not a product improvement or a positive result.

## Objective and current answer

Determine when Aspire increases independently verified task completion within a
fixed budget, or reduces time/cost at comparable correctness. Separately identify
changes to Aspire, project-local skills, and MCP that cause improvements.
Do not optimize the benchmark to obtain a favorable answer.

Current evidence supports directly discoverable executable workflows, not a
general claim that Aspire beats well-supported raw development. See
[FINDINGS.md](FINDINGS.md) and the original experiment reports.

| Question | Existing evidence | Missing proof / next experiment |
|---|---|---|
| Does Aspire improve real development? | Original startup/assessment runs did not establish a speed advantage | Functional change/repair tasks against raw-scripted, with hidden behavioral grading |
| Do focused skills help? | Specific health guidance reduced within-Aspire health sum from 145.3 to 41.3 s (three trials/arm) | Same knowledge/recipe, varied trigger only; unseen names/apps |
| Must the router/general skills be removed? | Startup remained directly selected with the full bundle available | Routing and safety coverage outside startup; no removal justified |
| Is the CLI itself slow? | Health `describe` commands took 0.09-0.14 s; generic workflow was slower overall | Hold observations constant and vary known-target/reporting guidance separately |
| Do explicit integration names help agents? | PR 21279 local output exposes Redis/PostgreSQL and passes Docker oracles | Matched parent/treatment source builds, then randomized model trials |
| Does MCP help? | Installation is not use; no startup advantage established | Natural CLI/MCP choice on scoped diagnosis/trace tasks, with verified availability/use |
| Does retained context help? | Prior runner probes did not prove conversation continuation | Validate runner/thread continuity first; fresh handoff remains separate |
| Is Bingo sufficient? | Supports HTTP, Vue proxy/HMR, PostgreSQL, Redis and SignalR | Add iteration/diagnosis first; use eShop only for genuine topology/queue transfer needs |

## Repositories, worktrees, branches, artifacts

No forks. No main checkout is modified by this coordinator. `main` on origin is
the durable program record; this app-managed worktree publishes with
`git push origin HEAD:main`. Local `main` is checked out elsewhere and is not
silently moved. Per-trial product changes belong on isolated Aspire branches,
not the benchmark baseline. Do not overwrite another session's changes.

| Role | Repository / origin | Workspace | Branch / revision | State / artifacts |
|---|---|---|---|---|
| Program, scenarios, results | `sebastienros/aspire-bench`, `https://github.com/sebastienros/aspire-bench.git` | `/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-legendary-memory` | `sebros/msbench-benchmark-variants`; starting origin/main `3bd7aa49d82cc5b836455d9f9b5bf30bb7223f51` | Active coordinator; commits publish direct main, no PR |
| Aspire source baseline | `microsoft/aspire`, verified `https://github.com/microsoft/aspire` | `/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-upgraded-couscous` | `sebros/agentic-build-baseline`; clean base `d698a4f9cb800649791da2b3d81c5850330072c1` | Child session `31a2bfab-2c9d-4125-985d-e85f4fa77709`; managed Linux ARM64 build in progress, x64/bundled artifact not yet established |
| Historical PR binary experiment | Public upstream PR artifacts, mirrored with approval | Harbor Docker tasks under `aspire-health/tasks/cli-pr21279` | `6676979b2bb4ed074568b84c84fb36a196d38f06`, version `17.0.0-pr.21279.g6676979b` | [Build manifest](aspire-health/pr21279-build.json); local validation only, not a matched causal control |
| Future CLI metadata treatment | `microsoft/aspire` origin | Not created | Not created; must share control base | Pending baseline build and one-change hypothesis |
| Future skill/MCP treatments | Origin-backed worktrees as needed | Not created | Not created | Do not label proposed branches as existing |
| Optional eShop transfer | `dotnet/eShop` | Not checked out for this program | Unselected | Aspirified/raw equivalence must be verified, not assumed |

For every custom build record source SHA, branch and base, diff/dirty status,
build command, SDK/runtime/RID, package versions, absolute artifact path, SHA-256,
tests, actual executable version, and Linux Docker compatibility. Native macOS
CLI success does not imply a usable Linux Harbor artifact. Preserve exact
control/treatment binaries; never compare mutable branch names alone.

Large logs and downloaded outputs stay in ignored `.runs/`; commit compact
manifests and factual summaries. Cloud runs must record MSBench run IDs/URLs and
task/toolchain/agent/model pins. Never commit credentials or runtime login tokens.

## Evaluation protocol

### Comparisons and fairness

1. Product-value comparison: equivalent Bingo behavior with useful raw
   documentation/scripts versus supported Aspire workflow. Give both arms working
   setup and equivalent user outcomes; no intentionally weak raw baseline.
2. Mechanism comparison: same Aspire code/build, CLI/skills/MCP changed one factor
   at a time. Later use a skills x MCP 2x2 where the scenario justifies it.
3. Distinguish ordinary raw observability from instrumentation-matched raw
   observability. Separate instrumentation benefit from querying/tool integration.
4. Keep language, names, faults, required artifacts, output requirements and
   verification depth matched. Do not conflate configured resource health with
   independent SQL/data/protocol checks.
5. Do not force MCP in the natural-choice experiment. Record configured,
   advertised, reachable, called, and useful as separate facts. Forced-use
   diagnostics are explicitly labeled.

### Outcomes and evidence

Primary: pass@1, independently verified within an equal 900-second agent budget.
User-directed low-budget model preference: discover an accessible GPT 6.1 Terra
identifier before submission and use it for both new pilot arms if supported;
never silently substitute a model or call it comparable to historical Luna runs.
Verifier budget 300 seconds. Pre-agent image
setup/readiness is separately timed and must succeed before the agent is evaluated.

Secondary: elapsed agent time, failures/timeouts, cost when actually reported,
input/cache/output tokens, tool calls, unnecessary discovery, failed commands,
unnecessary restarts, scope violations, data loss and unsafe shortcuts. Include
failed attempts rather than reporting only successful-run medians. Timeouts are
censored at the declared limit, not omitted. Preserve per-task results.

Use hidden, outside-workspace graders and protected inputs; verify behavior with
fresh nonces, negative inputs and preserved state, not the agent's report. Restrict
editable files only when inherent to the narrowly defined task. Prove the grader
rejects an unchanged/broken application and plausible cheats. Do not expose oracle
solutions to the model. Distinguish test access isolation from a hardened adversarial
sandbox; an agent with container root can potentially tamper with local graders.

### Pilot, replication and stopping rules

Initial development pilot: one original model attempt per arm per new scenario,
two total, after both local Docker oracles and negative tests pass. This is a
grader/runner feasibility pilot, not statistical evidence of superiority.
No automatic retry of model/task failures. Infrastructure failures before model
execution are recorded separately; at most one explicitly labeled replacement
per arm in this pilot. Stop submissions on a broken grader, unreachable model,
or provenance mismatch. Never rerun until a preferred outcome appears.

User-directed execution constraint: avoid resubmitting the same benchmark with
the same conditions. Before submission check an experiment fingerprint including
task commit, scenario/arm, fault seed, toolchain, skills/MCP, agent/package/model,
budgets, and conversation mode against recorded runs. Retrieve existing results
instead of rerunning. Do not start a repeat sweep; additional replication requires
a stated evidence need and explicit budget decision. Docker oracle reruns after
a real fixture/grader fix are validation, not repeated model trials.

After the pilot, preregister repetitions using observed variability, the desired
minimum practical benefit and a power/precision calculation. Randomize/interleave
arm order and fault instances; publish the order. Repetitions within one fixture
are not independent application samples. Use clustered analysis by scenario/app,
completion-rate intervals and time/cost intervals; do not promote three samples
into a broad significance claim. Declare primary comparisons before collecting.

Use warm running-app tasks for iteration and cold-start tasks separately.
Maintain startup as a diagnostic control, not a benefit credited to every step.
Fresh conversations and verified resumed conversations are separate strata.

### Promotion gates

| Gate | Required proof |
|---|---|
| Fixture usable | Both images built/run locally; correct oracle passes; broken/shortcut cases fail; same behavior and source provenance |
| Pilot usable | Actual selected model/client, original attempts and exceptions recorded; runtime exercise, not only generated code |
| Candidate promising | Correctness maintained, useful effect beyond noise, mechanism visible in traces; no safety/data regression |
| Product change justified | Matched builds or one-factor skill/MCP treatment; relevant unit/contract tests plus functional scenario |
| General claim | Held-out names/faults/topology, second app and model/runner; report regressions, setup/adoption cost and limits |

## Scenario roadmap

| ID / priority | Task and Bingo basis | External proof | State |
|---|---|---|---|
| I01 / first | Repair/extend player-origin producer API routing in the already-running Vue app | Real frontend -> admin -> database/Redis call/status/clear round trip; preserve prior data and version/SignalR behavior | Implementing |
| D01 / next | Diagnose distributed failure with a healthy process but failed operation | Broken fixture fails, correct targeted repair passes; random fault instance; logs/trace evidence | Planned |
| H01 / next | Reject misleading readiness or stale endpoint evidence | Functional negative probe fails even if process/resource is green | Planned |
| F01 | Add a cross-service capability/cache behavior | Hidden fresh data, both positive and negative contracts | Planned |
| M01 | Migrate schema without losing existing data | Pre/post record identity and contents, new behavior | Planned |
| S01 | Two similar running apps/worktrees | Exact-target repair, other app and data unchanged | Planned |
| A01 | Add a dependency or adopt Aspire | Functional wiring, no hardcoded ports/secrets; setup cost included | Planned |
| P01 | Publish and run isolated local deployment | Deployed functional checks, no dev-runtime assumptions | Planned |
| X01 | Transfer to eShop / TypeScript / polyglot | Unseen topology/names, instrumentation parity and functional equivalence | Deferred until Bingo limits are demonstrated |

Existing startup/health experiments remain regression controls, not replacements
for development scenarios. Generated project-local skills are a treatment to test,
not presumed equivalent to handcrafted benchmark-specific guidance.

## Execution and decision log

### 2026-11-04: program initialization

- Verified clean benchmark worktree and origin/main at `3bd7aa4`; Docker reports
  Linux/aarch64 and both `msbench-cli` and `harbor` are available.
- Created isolated Aspire build session/worktree; build provenance pending.
- Builder verified clean origin/main `d698a4f9`, pinned SDK
  `11.0.100-rc.2.26504.105`, and cached Linux ARM64 SDK image
  `sha256:e2438fd800a09d2d761aefe4edd30675c8f1db8958e4423c0844cc9a0240e60f`;
  compilation/runtime validation remains in progress.
- Selected I01 because Bingo already has admin producer endpoints and a Vue
  proxy limited to `/api/version-info`. This supports a real running-app routing
  change without inventing a queue/worker service or claiming a distributed
  diagnosis benchmark already exists.
- Baselines and historical datasets remain untouched. No new inference results.
- Main local checkout is occupied by another worktree. Keep durable tracking
  on origin/main rather than force-switching or altering that checkout.
- User requested avoiding duplicate-condition model runs and selecting accessible,
  low-budget models such as GPT 6.1 Terra. New pilots follow this constraint;
  no old startup/health scenario is resubmitted just to reproduce history.

## Next actions / unresolved decisions

Finish I01's matched tasks, local Docker oracle/negative tests and immutable
dataset, then run the bounded two-attempt pilot. Capture the source builder's
evidence. Only then select the first matched CLI/skill/MCP optimization and
preregister its experiment. Larger sweeps and eShop conversion are not yet run.
