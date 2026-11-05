# Aspire agentic-development research

Living protocol, worktree/artifact ledger, execution log, and decision register.
Started 2026-11-04. This document distinguishes planned experiments from executed
evidence; pending work is not a product improvement or a positive result.

**Execution status: the bounded pilot is complete and published.**
Twenty-two unique Terra model conditions executed:
I01 (2), D01 (7), F01/M01 (4), A01 (2), X01 (3), S01 (2), and P01 (2).
Three original native zeros are preserved alongside successful exact-source
local regrades under corrected F01/A01 graders, not overwritten.
The complete source-built managed Bingo baseline and empty-JSON contract fix
are verified. P01's final public relay graph and one new X01 combined skills/MCP
condition passed local and independent native remote no-model gates before
their three original model attempts, which all passed. All actual model/CLI
identities and final public trace hashes are recorded. No condition was rerun
to obtain a better result.
Earlier storage/setup blocks and pending-language execution entries are retained
as dated history, not current state. Genuine conversation continuation and
cross-application/model generalization remain explicitly unmeasured.

## Objective and current answer

Determine when Aspire increases independently verified task completion within a
fixed budget, or reduces time/cost at comparable correctness. Separately identify
changes to Aspire, project-local skills, and MCP that cause improvements.
Do not optimize the benchmark to obtain a favorable answer.

Current evidence supports directly discoverable executable workflows, not a
general claim that Aspire beats well-supported raw development. See
[FINDINGS.md](FINDINGS.md) and the original experiment reports.

## Completed pilot: result index

All observations below use verified `gpt-6.1-terra`, Copilot CLI `1.0.99-0`,
the same packaged runner, fresh single-step conversations and 900/300-second
agent/verifier budgets. They are **one sample per unique condition**, not
replicates or significance estimates. Timings are native agent durations;
infrastructure/setup/oracle/replay durations are excluded.

| Scenario / report | Conditions | Raw seconds | Aspire seconds / outcome |
|---|---:|---:|---|
| [I01 routing repair](bingo-iteration/README.md#completed-terra-pilot) | 2 | 74.5 | 80.7; both native passes, no Aspire tools used |
| [D01 false-health diagnosis](bingo-diagnostics/PILOT.md) | 7 | 72.4 | Original skills 94.1; combined skills/MCP 68.1; all seven native passes |
| [F01 live catalog](bingo-evolution/PILOT.md) | 2 | 93.1 | 107.4; original native zero preserved, unchanged source passes corrected local grader |
| [M01 additive migration](bingo-evolution/PILOT.md) | 2 | 145.1 | 271.9; both native passes, old rows/OIDs/state preserved |
| [A01 cold adoption](bingo-adoption/PILOT.md) | 2 | Not a raw comparison | Original/generated skills 412.8/535.7; both original native zeros preserved, unchanged sources pass corrected local grading |
| [X01 held-out ACL fault](bingo-transfer/PILOT.md) | 3 | 49.5 | Original skills 82.4, combined 98.6; all native passes, combined genuinely uses nine MCP calls |
| [S01 two complete apps](bingo-isolation/PILOT.md) | 2 | 56.4 | 68.4; both native passes and preserve the other app |
| [P01 production publishing](bingo-publishing/PILOT.md) | 2 | 144.4 | 324.5; both native passes with real Production .NET/nginx/SignalR/SQL/Redis |

There are **19 native reward-1 records and three grader-invalid native zeros**.
The three exact-source successful replays are separate local ARM64 adjudication
evidence for original cloud x64 sources, not new model samples or rewritten
native grades. See [F01](bingo-evolution/evidence/f01-grader-v2.json) and
[A01](bingo-adoption/evidence/a01-regrade-v2-report.json). Original agent times
and costs remain unchanged. A01's generated source retains its original
plaintext choice; functional acceptance is not production-security equivalence.

Total runner-reported model cost for these 22 conditions is **USD 2.48302085**,
not an independently billed amount. It excludes historical startup/health
experiments, all infrastructure/oracle/replay work, optional analysis, and
coordinator/child credits. D01's seven original setup failures executed no model;
their labeled replacements, not the failures, are the seven samples above.
All three final model trajectories parsed without escape normalization;
earlier D01 normalizations retain their separate disclosures and raw hashes.

**Answer:** This portfolio does not demonstrate a general Aspire speed/cost
advantage over strong raw scripts. D01's combined sample was 4.3 seconds faster
than raw with nearly equal estimated cost, but X01's genuinely used combined
MCP workflow was slower than both prior arms. This is capability/use transfer,
not transfer of an efficiency advantage. Generated adoption used fewer calls
but took longer. Correctness passed under the stated/adjudicated contracts,
without an observed Aspire correctness advantage on the matched pairs.

### Concrete changes and evidence boundaries

| Change / recommendation | Implemented or measured proof |
|---|---|
| Emit valid empty JSON for a successful empty resource snapshot | [Local source fix](source-builds/empty-json/report.md), branch `sebros/agentic-empty-json`, change `fafe6482`: 66 focused Debug/Release cases and matched binary proof, 0 to 22 stdout bytes; no upstream merge or measured agent speed claim |
| Make the complete known-target workflow directly discoverable | Startup/specific health recipes reduce discovery in their original experiments; generic CLI health guidance was slower. Keep routing/safety coverage, avoid mandatory broad discovery/reporting, and use exact version-matched endpoint/resource schemas |
| Offer operation-aware, bounded MCP diagnosis rather than forcing more tool calls | D01 and X01 actually consume MCP/logs. X01's nine successful calls exposed NOPERM but cost more time; installed/advertised/reachable/used/useful/faster remain separate facts |
| Provide a complete version-matched production publishing recipe | P01 exposes 60 versus 36 tools and substantial API discovery. Explicit image tags, `.env.Production`, dashboard/topology and external ownership conventions are locally/remote validated; a recipe speed improvement itself has not been measured |
| Grade requested behavior and semantic configuration, not reference text | Corrected F01 origins and A01 additive dependency/actual physical-DB checks; original zeros, exact patches, one transport-only final-LF normalization and all unchanged-source replay provenance retained |

The [complete managed x64 source payload](source-builds/aspire-managed-baseline.json)
and six matching packages passed normal extraction and real Bingo
start/wait/describe/HTTP/stop. Its 312,642,722-byte archive was rehashed at closeout
to `ba7ac0f96774050cd82e969bae726233f556b138d1054899f1fa215a72613c14`.
This is a nonshipping managed/untrimmed build, not NativeAOT performance parity;
the model portfolio consistently uses CLI/Hosting 13.6.0.

The pilot does not establish second-application/model transfer, editor-owned
or cross-host worktree isolation, production security equivalence, or genuine
conversation continuation. [Transfer/continuity review](TRANSFER-AND-CONTINUITY.md)
records the inspected eShop and unchanged runner limitations. These are limits
of the completed bounded study, not silently pending model reruns.

### Questions after this pilot

| Question | Existing evidence | Missing proof / next experiment |
|---|---|---|
| Does Aspire improve real development? | Completed routing, diagnosis, feature, migration, adoption, publishing and two-app pilots; no general efficiency/correctness advantage demonstrated | Predeclared randomized replication, second application/model and practical effect thresholds before a general claim |
| Do focused skills help? | Specific health guidance reduced within-Aspire health sum from 145.3 to 41.3 s; D01 description-only case observed 81.5 vs 94.1 s with identical body | More fault/name transfer and replication; one metadata sample is not a causal latency estimate |
| Must the router/general skills be removed? | Startup remained directly selected with the full bundle available | Routing and safety coverage outside startup; no removal justified |
| Is the CLI itself slow? | Health `describe` commands took 0.09-0.14 s; generic workflow was slower overall | Hold observations constant and vary known-target/reporting guidance separately |
| Do explicit integration names help agents? | PR 21279 local output exposes Redis/PostgreSQL and passes Docker oracles | Matched parent/treatment source builds, then randomized model trials |
| Does MCP help? | Actual use and passing diagnosis transfer from D01 to X01, but combined X01 98.6 s is slower than skills-only 82.4/raw 49.5 | A bounded operation-aware summary/workflow treatment and independent replication; do not force irrelevant calls |
| Does retained context help? | Prior runner probes did not prove conversation continuation | Validate runner/thread continuity first; fresh handoff remains separate |
| Is Bingo sufficient? | Completed HTTP/proxy, SQL/Redis, SignalR, production and two-app scenarios; held-out names and a different real fault | Still one application topology; eShop needs honest raw parity before queue/multiservice transfer claims |

## Repositories, worktrees, branches, artifacts

No forks. No main checkout is modified by this coordinator. `main` on origin is
the durable program record; this app-managed worktree publishes with
`git push origin HEAD:main`. Local `main` is checked out elsewhere and is not
silently moved. Per-trial product changes belong on isolated Aspire branches,
not the benchmark baseline. Do not overwrite another session's changes.

| Role | Repository / origin | Workspace | Branch / revision | State / artifacts |
|---|---|---|---|---|
| Program, scenarios, results | `sebastienros/aspire-bench`, `https://github.com/sebastienros/aspire-bench.git` | `/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-legendary-memory` | `sebros/msbench-benchmark-variants`; starting origin/main `3bd7aa49d82cc5b836455d9f9b5bf30bb7223f51` | Active coordinator; commits publish direct main, no PR |
| Aspire source baseline | `microsoft/aspire`, verified `https://github.com/microsoft/aspire` | `/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-upgraded-couscous` | `sebros/agentic-build-baseline`; clean base `d698a4f9cb800649791da2b3d81c5850330072c1` | [Complete managed x64 payload + 6 packages](source-builds/aspire-managed-baseline.json) verified through normal extraction and actual Bingo lifecycle; not shipping NativeAOT parity. Old ARM64 worktree paths disappeared; historical report retained |
| Historical PR binary experiment | Public upstream PR artifacts, mirrored with approval | Harbor Docker tasks under `aspire-health/tasks/cli-pr21279` | `6676979b2bb4ed074568b84c84fb36a196d38f06`, version `17.0.0-pr.21279.g6676979b` | [Build manifest](aspire-health/pr21279-build.json); local validation only, not a matched causal control |
| Empty-JSON CLI treatment | `microsoft/aspire` origin | `/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-glowing-spoon` | `sebros/agentic-empty-json`; base `d698a4f9`; change `fafe64823d80e8f34fa5fc773ac9d9d9ba64f375` | [Manifest](source-builds/aspire-empty-json.json), [proof/patch](source-builds/empty-json/report.md); 66 targeted cases pass in Debug and Release, offline matched binaries verified |
| D01 skill/MCP treatments | Same benchmark origin | `/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-super-funicular` | `sebros/bingo-runtime-diagnosis` | Seven conditions integrated/published; no active runtime |
| F01/M01 and exact-source regrades | Same benchmark origin | `/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-friendly-memory` | `sebros/bingo-feature-and-migration` | Integrated/published; original source patches and native/replay receipts retained |
| P01 production runtime / DNS | Same benchmark origin | `/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-jubilant-enigma` | `sebros/bingo-local-publishing` | Integrated/published; child runtime slot returned; final remote/model reports owned by coordinator |
| X01/S01 transfer / combined MCP | Same benchmark origin | `/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-vigilant-pancake` | `sebros/bingo-held-out-fault-transfer` | Integrated/published; native local MCP proof and original receipts retained |
| Optional eShop transfer | `dotnet/eShop` | Not checked out for this program | Unselected | Aspirified/raw equivalence must be verified, not assumed |

For every custom build record source SHA, branch and base, diff/dirty status,
build command, SDK/runtime/RID, package versions, absolute artifact path, SHA-256,
tests, actual executable version, and Linux Docker compatibility. Native macOS
CLI success does not imply a usable Linux Harbor artifact. Preserve exact
control/treatment binaries; never compare mutable branch names alone.

Current large logs and downloaded outputs stay in persistent session
`files/research-20261104/`, not the previously disappeared ignored `.runs/`.
Commit compact manifests and factual summaries. Cloud runs must record MSBench run IDs/URLs and
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
| I01 / first | Repair/extend player-origin producer API routing in the already-running Vue app | Real frontend -> admin -> database/Redis call/status/clear round trip; preserve prior data and version/SignalR behavior | [Completed Terra pilot](bingo-iteration/README.md#completed-terra-pilot): both pass, no demonstrated Aspire advantage; do not repeat identical conditions |
| D01 / next | Diagnose distributed failure with a healthy process but failed operation | Broken fixture fails, correct targeted repair passes; random fault instance; logs/trace evidence | [Seven unique Terra conditions completed](bingo-diagnostics/PILOT.md), all native passes; combined observed 68.1 s versus raw 72.4 s, n=1 per cell |
| H01 / next | Reject misleading readiness or stale endpoint evidence | Functional negative probe fails even if process/resource is green | Combined D01 actually verified HTTP500 with pages/PING/reads serving; no-op/page-only and stale-endpoint cases rejected |
| F01 | Add a cross-service capability/cache behavior | Hidden fresh data, both positive and negative contracts | [Original pair completed](bingo-evolution/PILOT.md); raw native pass, Aspire original zero separately corrected by unchanged-source local regrade; no model rerun |
| M01 | Migrate schema without losing existing data | Pre/post record identity and contents, new behavior | [Both original model runs passed](bingo-evolution/PILOT.md); 43 legacy rows preserved, raw 145.1 s versus Aspire 271.9 s |
| S01 | Two similar running apps/worktrees | Exact-target repair, other app and data unchanged | Both original native model runs passed with two full Bingo apps; raw 56.4 s versus Aspire 68.4 s. Editor/host-worktree ownership not claimed |
| A01 | Add a dependency or adopt Aspire | Functional wiring, no hardcoded ports/secrets; setup cost included | Both original native zeros preserved; exact unchanged-source local regrades pass corrected semantic dependency/physical-DB contract. Generated plaintext choice preserved, no security-equivalence claim |
| P01 | Publish and run isolated local deployment | Deployed functional checks, no dev-runtime assumptions | Both local production oracles, final native remote relay gate and two unique Terra models pass; raw 144.4 s versus Aspire 324.5 s |
| X01 | Transfer to eShop / TypeScript / polyglot | Unseen topology/names, instrumentation parity and functional equivalence | ACL fault + held-out names: all three unique model runs pass; raw 49.5 s, skills 82.4 s, combined MCP 98.6 s. Natural MCP use transfers, observed D01 timing advantage does not; eShop parity not assumed |

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

### 2026-11-04: first reproducible artifacts and scenario

- Published initial protocol milestone `df973b5` directly to origin/main.
- Published I01 task/build-evidence milestone `5f441f9`; the
  [new dataset](bingo-iteration/dataset.jsonl) pins both arms to that exact source.
  The [pilot ledger](bingo-iteration/pilot-ledger.json) records the failed
  discovery paths, two subsequently admitted explicit-model submissions, and
  unique condition fingerprints, and subsequently verified runtime results.
- Source baseline build succeeded from an exact clean `git archive` of
  `d698a4f9`, using a Docker-managed Linux filesystem after a macOS bind-mount
  NuGet enumeration failure. No product changes were needed. Portable archive
  `aspire-agentic-baseline-linux-arm64.tar.gz`, 54,049,491 bytes, SHA-256
  `a166a9f469a90931b36ea53f9bed568f577fc46f19e2d4fba5bc64f7fbceee6e`.
  Full paths, checksums, version `17.0.0-baseline.gd698a4f9cb80`, and limitations
  are in the [manifest](source-builds/aspire-baseline.json).
  The [full build report](source-builds/baseline/report.md) and exact successful
  shell commands are also committed; these record the actual local paths and
  retained source-volume/cache rather than pretending to be portable installers.
- Verified offline extraction/checksums/version/`ps` plus an out-of-tree Hosting
  application-model smoke. This does not start DCP or prove Bingo compatibility.
- Reproduced a bounded contract gap: no-AppHost `describe --format json` exits
  0 with empty stdout, unlike `ps`'s `[]`. A same-base isolated treatment
  branch has proved an empty resources wrapper without altering actual errors.
- I01 both raw-scripted and Aspire Docker oracles passed. Adding four runtime
  negative grader cases also passed in both arms: unchanged app, unrelated source
  edit, invalid endpoint file, and lost prior state were rejected. Correct repair
  then passed real frontend/admin/SQL/Redis behavior and error checks. Raw logs:
  `.runs/msbench-oracle/bingo-iteration-{raw,aspire}-{v1,negatives}/`.
- All 26 current benchmark structural/negative unit tests passed. Oracle
  durations are not agent-performance results.
- Accessible staging Agent Registry queried. Model discovery returned HTTP 403
  through both the built-in dev1 index and an explicit staging index, using the
  installed CLI's normal auth path. No duplicate-condition submission, silent
  model substitution, upgrade, or speculative proxy-bypass was attempted.
  Logs: `.runs/agentic-research/{model-discovery,staging-discovery}.log`.

### 2026-11-04: first matched source change and Terra admission

- After the user supplied exact model ID `gpt-6.1-terra`, normal explicit-model
  submission succeeded despite discovery HTTP 403. Do not equate discovery
  failure with model/runtime unavailability.
- Exactly two original pilot runs: raw
  [2026110483094426](https://msbenchapp.azurewebsites.net/run-analysis/2026110483094426)
  and Aspire
  [2026110483115812](https://msbenchapp.azurewebsites.net/run-analysis/2026110483115812).
  Same historical runner package/vendor CLI, new Terra model, no repeat flag,
  no comparison with historical Luna timings. Results/provenance verified below.
- Local product change committed only on Aspire trial branch at `fafe6482`.
  Same-base binaries: JSON empty snapshot stdout changes from 0 to 22 bytes,
  valid `{"resources":[]}`, with identical stderr and exit 0. Invalid-path
  exit 7 and table/Mermaid/follow output remain unchanged. All 66 focused tests
  pass in both Debug and committed-source Release. Matching dependencies are
  recorded in the [comparison](source-builds/empty-json/comparison.json).
- The [report](source-builds/empty-json/report.md),
  [manifest](source-builds/aspire-empty-json.json), and portable git-format patch
  preserve branch/commit/reproduction proof. Archive SHA-256
  `0de862ef619039e15377459705cd40a059e02959156ce19b792900afa79c2bd4`.
  This is a contract fix, not evidence of faster agents or a complete Bingo
  source-build toolchain. No upstream PR/push.

## Next actions / unresolved decisions

### 2026-11-04: Terra pilot completion

Both original I01 runs passed the protected grader, no trial exceptions or
replacements. All 9 raw / 13 Aspire model-call start and final-result events
identify `gpt-6.1-terra`, all successful; CLI provenance resolves 1.0.99-0.
Native agent elapsed was 74.5/80.7 seconds, tool calls 20/24, estimated cost
USD 0.05016/0.06658 (approximately USD 0.117 total, not a billing audit).
Both made the same proxy addition, with data/process preservation verified.

All eight Aspire skills were advertised, but neither trial loaded any skill
or used Aspire CLI. This constrained frontend task did not naturally exercise
runtime orchestration/observability. The result establishes feasibility, not
an Aspire advantage or a causal cost of metadata. Preserve it; do not rerun
identical conditions. [Report](bingo-iteration/README.md#completed-terra-pilot)
and [machine results](bingo-iteration/pilot-results.json) retain the evidence.

The old client lacked a model catalog and used default capabilities; actual
model IDs were unchanged. Optional report analysis later rejected unavailable
`claude-sonnet-4.6` because resume commands omitted the disable-analysis variable.
This is not a benchmark failure or a Terra substitution. Set the variable on
every future submission/resume/report/extract command.

### Next actions

Complete matching Linux x64/full payload+Bingo smoke before inserting custom
source builds into Harbor. Build D01 next, then test generated project-local
skills and natural MCP use on meaningful diagnosis work. Larger sweeps and
eShop conversion are not yet run.

### 2026-11-04: full roadmap execution authorized

User directed execution through the rest of the plan in autopilot. Continue
one original Terra attempt per new condition, not repeated I01/startup/health
submissions. Skills/MCP comparisons need verified capabilities, not forced calls.
Roadmap entries may terminate as concretely blocked or empirically inconclusive;
do not manufacture evidence or assert a general benefit.

| Workstream | Origin-backed worktree / branch | Responsibility |
|---|---|---|
| D01/H01/S01 | `/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-super-funicular`, `sebros/bingo-runtime-diagnosis` | Real runtime faults and wrong-target safety, private Docker proof |
| F01/M01 | `/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-friendly-memory`, `sebros/bingo-feature-and-migration` | Cross-layer feature and existing-data evolution |
| P01 | `/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-jubilant-enigma`, `sebros/bingo-local-publishing` | Real local container publishing, not AppHost/Vite-as-production |
| Complete source build | Existing `sebros/agentic-build-baseline` worktree, base unchanged | Documented x64/full payload compatibility and actual Bingo lifecycle, or evidenced prerequisite |
| A01 and trial coordination | This coordinator worktree/branch | Cold adoption task, provenance, immutable datasets, low-budget pilot ledger and final synthesis |

No child submits models or pushes upstream; parent integrates local commits and
records every custom branch/artifact and measured result. The source-build
workstream must not substitute old prebuilt PR packages into a custom-build claim.

Integrated draft commits: P01 child `72c958b8` as coordinator `7bdc746`;
F01/M01 child `276b240f` as coordinator `1788f1c`. Both child branches remain
local, origin-backed and clean at handoff; neither is a model-ready task set.
Their READMEs/manifests retain exact partial/failed validation receipts.
Diagnosis child commits `e1f68c18` and mandatory safety correction `195b99d3`
were integrated together as `5bc6b05` and `802dfd5`; do not restore only the
first revision. The final default uses bounded Redis `CLIENT PAUSE ... WRITE`
and protocol unpause, not a nested Docker freezer. All corrected Docker
oracles require `--force-build` after recovery to avoid historical unsafe images.

### 2026-11-04: shared-host execution gate failed

The full source build reached Dashboard native compilation after resolving a
missing-clang prerequisite in a private builder. It then reported object/temp
I/O and read-only failures, followed by containerd metadata I/O failures. Host
disk dropped to 1.2 GiB in the builder's observation; parent independently
measured 100% capacity / 2.8 GiB available. Parent's bounded `docker version`
and `docker ps` both timed out after 12 seconds. P01 image builds reported
BuildKit/dpkg/metadata I/O too. A nested-cgroup/freezer contribution near a
diagnostic fault attempt is also suspected, not proved.

All workstreams were told to stop new Docker/model launches, stop only exact
owned commands, and preserve evidence. Parent stopped its own final-adoption
and tools-image sessions; shared engine/container state remains unverifiable.
No shared restart/prune or unrelated process termination is authorized or claimed.
The [blocker manifest](execution-blockers/2026-11-04-docker-storage.json) lists
observations and prerequisites. This is not an Aspire/model performance result.

Source-builder cleanup removed only 42 new isolated-cache package/version
directories absent from all preserved baseline dependency assets, freeing
1,473,822,720 allocated bytes. All 137 original baseline package directories and
the original CLI/archive/checksums were reverified. Exact
[cleanup receipt](source-builds/baseline/x64/targeted-cache-cleanup.json) and
[complete-build report](source-builds/baseline/x64/report.md) are committed.
Source, SDK/image refs, commands, failed build stages and candidate fixture-only
version/source overlay are retained. The overlay has not compiled or run Bingo.

A later parent observation found 9.7 GiB available / 99% capacity, but a fresh
12-second `docker version` request still timed out. Additional free space was
not attributed wholly to the targeted cleanup. Engine recovery remains unproved,
and container/volume stop/removal receipts remain unknown. No shared restart or
prune was used to force progress.

Independent work still established that the installed host CLI can generate
seven embedded project-local skills (40 files) and complete a real MCP
initialize/tools-list handshake (13 tools), without Docker or inference.
[Preflight evidence](agent-surface-preflight/README.md) records the exact
host 17.0 preview version. This is not matched 13.6 capability verification or a
factorial efficiency result; do not silently install those assets into old arms.

Remaining inference is blocked until each final task passes local Docker
validation. No I01/startup/health run was repeated, and no new MSBench spending
was incurred during this blocked execution stage. Local drafts/evidence and
branch ledgers are retained so recovery does not require rediscovering the work.

#### Evidence required to finish after recovery

| Question/stage | Current answer | Next proof required |
|---|---|---|
| Minimum adoption | Raw Bingo can be orchestrated without changing business code; first A01 oracle passed | Final grader/image pass after added port/secret guards, then one unique Terra adoption pilot |
| Diagnosis/false health/target safety | New held-out-name diagnostic fixture being prepared; no runtime recovery pass established | Safe Redis-protocol fault, both final Docker oracles/negatives, then unique raw/Aspire pilots |
| Feature/schema evolution | Drafts and partial local evidence being preserved | Both final arms pass independent behavior/data-preservation oracles before inference |
| Local deployment | Production-serving paired drafts, no running deployment validated | Actual 13.6 publish/prepare/build/run + functional/auth/catalog checks in both arms |
| Skills/MCP efficiency | Host generation/transport exists; matched live capability and use unknown | Matched D01 readiness, then natural-choice factorial and observed tool use |
| Complete custom source build | ARM64 contract proof exists; full x64 attempt blocked | Complete payload on task architecture and actual Bingo lifecycle before substitution |
| Continuation | Prior pinned-runner probes did not prove resumed conversations | A genuinely changed runner/session contract; do not rerun identical known-broken conditions |
| Transfer/general claim | Bingo still represents the next scenarios; eShop conversion not yet justified | Held-out-name/fault runtime passes; independent app/model replication only if a claim warrants its cost |

After recovery serialize local image/native builds and check host/engine headroom
before starting expensive work. The roadmap is not declared complete while
these gates remain blocked.

All integrated static suites now pass 44 tests:
`node --test msbench/benchmark.test.mjs msbench/*/*.test.mjs`.
This includes diagnostic policy/negative assertions, not a claim that the
unexecuted live recovery scenarios passed. No additional inference was performed
after the completed I01 pair.

### 2026-11-04: controlled recovery and resumed execution

User instructed continued autonomous recovery. The supported Desktop restart
timed out. After verifying exact Docker-owned PIDs, parent sent SIGTERM to the
hung GUI/backend processes and SIGKILL only to the remaining unresponsive
backend supervisor after graceful termination failed. Supported Desktop start
succeeded; actual Docker `info`/`ps` responded (28.0.4, Linux/aarch64).
No factory reset, shared prune, volume deletion, or unrelated process kill.

Archived inspect/log receipts for six explicitly verified stopped scenario
containers, then removed only those six containers. Their labels tied them
to this program's worktrees; unrelated containers were untouched. Host free
space rose to 42 GiB. The dedicated incomplete source-build volume was measured
at approximately 0.9 GiB and retained. One source builder now owns the local
Docker slot; it is attempting a lower-storage managed complete payload with
actual layout/runtime validation, explicitly not shipping NativeAOT parity.

Ignored `.runs` and source-worktree `artifacts/` then disappeared unexpectedly
between calls. Cause unknown; neither parent nor builder had an active broad
cleanup operation. Tracked reports/source were intact. New binaries, scratch
assets, caches, logs and run downloads now live in durable session `files/`
directories; immutable inputs are reconstructed from preserved archives.
Do not invent an attribution or resubmit historical model conditions because
local downloads disappeared.

Prepared [unique diagnostic mechanism cells](bingo-diagnostics/MECHANISMS.md):
CLI-only, original skills-only, MCP-only, both, actual generated skills, and a
description-only focused trigger. The original skills-only D01 result will be
reused between product/factorial reports, not counted as a second independent
sample. Each new condition requires a final local image/runtime gate.

Actually generated seven skills with task-local CLI
`13.6.0+56f3e9c0d216c0c7069dabb49dd0464e4827744f`; only four generated files differ
from the pinned bundle, and monitoring knowledge is unchanged. Separately,
focused-trigger changes only the monitoring discovery description while retaining
its identity/body/references. A matched native 13.6 MCP handshake advertised
14 tools. Docker backchannel and natural agent use remain to be verified.

### 2026-11-04: full source baseline and diagnostic gates pass

The lower-storage source configuration built every complete Linux x64 payload
component, six matching packages and the embedded CLI from unchanged `d698a4f9`.
Normal `aspire setup` extraction, legacy .NET 10 Bingo compilation/start,
admin/player waits, resource snapshot, HTTP health, stop/empty-ps and private
Docker cleanup passed. Only package versions/local source changed in the
fixture; no whole AppHost rewrite or application SDK upgrade was needed.
[Report](source-builds/baseline/managed/report.md),
[manifest](source-builds/aspire-managed-baseline.json) and exact scripts are
committed. Portable archive 312,642,722 bytes, SHA-256
`ba7ac0f96774050cd82e969bae726233f556b138d1054899f1fa215a72613c14`.
This is explicitly managed/untrimmed/nonshipping, not NativeAOT speed parity.

After fixing raw-only proxy-port/database/authentication assumptions, all seven
final D01 image/oracle cells passed with actual incident and negative evidence.
MCP-only and combined oracles also proved real AppHost selection/resource/
failure-log access. [Receipts](bingo-diagnostics/evidence/recovered-local-validation.json)
retain actual rewards and checksums; these are not model results.

The generator's four changed files are router/init-related; therefore a unique
[generated-skill adoption condition](bingo-adoption/README.md) is also prepared
to exercise that changed knowledge, rather than treating unchanged monitoring
as a broad generator-effect test. Every pending adoption/evolution/deployment
cell still needs its own final local gate. No duplicate model condition is run.

### 2026-11-04: portable remote-build gate

Submitted seven distinct D01 conditions once each, in recorded randomized
order (seed 20261104), after all local runtime gates passed. All seven remote
jobs failed before model execution: newer Docker Bake denied filesystem-read
entitlement for the relative outside-environment named contexts. No model
tokens, agent time, or rewards were generated. Preserve every original run ID
in the [ledger](bingo-diagnostics/pilot-ledger.json) and
[failure manifest](bingo-diagnostics/evidence/remote-build-failures.json).

Corrected portable graphs reference exact public Git snapshots of the already
validated common and skill contents, instead of weakening filesystem boundaries.
The changed graph must be validated before any labeled infrastructure
replacement. Other evolving/deployment/transfer task families are being checked
for the same remote portability issue before first submission.

Remote oracle-only graph validation
[2026110504832466](https://msbenchapp.azurewebsites.net/run-analysis/2026110504832466)
passed reward 1/no exception on the portable generated-skill cell, including
actual fault, negative and recovery checks. It used no model. This clears the
packaging gate for explicitly labeled infrastructure replacements; original
seven no-model failure receipts remain distinct and are not counted as samples.

The next held-out transfer case is now being implemented in a separate
origin-backed worktree:
`/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-vigilant-pancake`,
branch `sebros/bingo-held-out-fault-transfer`. It changes namespace/names and
uses real Redis ACL write denial rather than the original pause fault.
Static work is ready; no Docker/model execution before its serialized slot.

### 2026-11-04: diagnostic model results

All seven labeled replacement conditions actually ran `gpt-6.1-terra` with
resolved CLI 1.0.99-0 and passed protected runtime/preservation grading.
Original seven jobs had failed before any model execution and remain classified
as infrastructure, not model failures. [Pilot report](bingo-diagnostics/PILOT.md)
and [exact metrics](bingo-diagnostics/pilot-results.json) preserve both histories.

| Condition | Native agent seconds | Actual tool use |
|---|---:|---|
| Raw scripted | 72.4 | 33 ordinary tool calls |
| CLI/no guidance | 127.4 | 41 ordinary tool calls |
| Original skills | 94.1 | Monitoring loaded, 33 calls |
| MCP only | 120.5 | Seven MCP calls, 43 total |
| Original skills + MCP | 68.1 | Monitoring + four MCP calls, 31 total |
| Generated skills | 80.6 | Same unchanged monitoring body, 32 calls |
| Description-only trigger | 81.5 | Same monitoring body, 33 calls |

The combined run's 4.3-second edge over raw is not proof of product superiority.
Within this case guidance plus tools is the promising observable mechanism.
The generator changed router/init, not the loaded monitoring knowledge.
One sample per cell, old client catalog behavior, uncontrolled scheduling/cache,
and regression-oriented root-container isolation constrain interpretation.
Seven malformed native tool-output JSONL lines were normalized only in memory
as literal invalid-escape backslashes; no events or raw files were discarded.
Runner cost estimates sum to approximately USD 0.698, not billing.

F01/M01 both final local pairs now also passed after correcting actual restart,
credential and HTTP error-body contracts; portable public-Git graph proof and
their model pilots are next. P01 and X01 still own/await the serialized local
runtime slot; no unvalidated cell is submitted to a model.

### 2026-11-05: evolution/adoption model pilots

Representative remote no-model gates 2026110507252286 (both evolution Aspire
scenarios) and 2026110507371146 (generated adoption) passed reward 1 without
exceptions. Published fixed task revision `25947262` in portable datasets.
Six original, distinct Terra pilots then submitted without repeat flags:

| Condition | Run |
|---|---|
| F01 raw | [2026110557440610](https://msbenchapp.azurewebsites.net/run-analysis/2026110557440610) |
| F01 Aspire | [2026110557444836](https://msbenchapp.azurewebsites.net/run-analysis/2026110557444836) |
| M01 raw | [2026110557449044](https://msbenchapp.azurewebsites.net/run-analysis/2026110557449044) |
| M01 Aspire | [2026110557453174](https://msbenchapp.azurewebsites.net/run-analysis/2026110557453174) |
| A01 original skills | [2026110557457266](https://msbenchapp.azurewebsites.net/run-analysis/2026110557457266) |
| A01 generated skills | [2026110557461446](https://msbenchapp.azurewebsites.net/run-analysis/2026110557461446) |

These are new task/skill conditions, not repeated I01 or health runs. Actual
model/cost/grade verification remains pending; submission is not success.
Production P01 runtime fixes from child `3421ee85` were integrated as public
`1f9f9614`; the child is validating both exact public-context images before
handing the sole local Docker slot to X01.

### 2026-11-05: evolution outcomes and grader review

All four original evolution runs have completed with actual Terra/CLI identity.
M01 raw and Aspire both passed real schema/data preservation; native agent times
145.1/271.9 seconds. F01 raw passed at 93.1 seconds. F01 Aspire's original
reward 0 at 107.4 seconds exposed an evaluation defect: the verifier demanded
frontend proxying of unrelated producer writes, although only catalog needed
both origins and the baseline frontend lacked write proxying.

[Interim report](bingo-evolution/PILOT.md) and
[original metrics](bingo-evolution/pilot-results.json) preserve that disputed
score. A narrow grader correction plus exact-source no-model replay is being
prepared; no solution rewrite or repeated model attempt. Corrected success is
not yet asserted. This is a new empirical evaluation-quality finding (F15).

Both A01 original grades also stopped at an overly broad central-package
immutability check: the models registered the same three compatible Aspire
13.6 packages without changing original dependencies/business code. A second
grader assumption confused logical resource/key `db` with physical database
name. [Adoption review](bingo-adoption/PILOT.md) preserves original 0 scores,
exact model patches and the narrow semantic correction; fresh no-model replays
remain pending. A reference solution passing is not sufficient proof that a
grader admits every valid implementation.

### 2026-11-05: production, held-out and real two-app gates

P01's final public-context direct-Docker gates both passed actual production
.NET/nginx, correct/wrong login, original frontend hashes, WebSocket catalog,
Redis and dependency/network/volume preservation. Native local Harbor had a
metadata-only no-container stall; its source/module provenance is retained,
and direct validation is not labeled native success. Remote no-model oracle
2026110558453858 built its image but exited during setup before agent/grade;
opaque setup diagnostics are being improved rather than paying for a blind
model run.

X01's distinct ACL-denial/name pair and S01's two-real-app pair both passed
local direct runtime gates with twelve negative checks per arm. The same
source code and limits were used; no model outcome is inferred. Child branch
`sebros/bingo-held-out-fault-transfer` commits `ad8528f`, `3bcd6ff`, `acfec6e`
were integrated as `ef10a2e`, `b0dc549`, `67f2ac1`. Portable environment-local
archives plus immutable Git contexts avoid sibling filesystem entitlements.

The representative native remote no-model gate
[2026110558919112](https://msbenchapp.azurewebsites.net/run-analysis/2026110558919112)
was submitted for both Aspire transfer/isolation cases at task source `67f2ac1`.
It remains separate from any later Terra condition. Only after it passes can
four new model conditions be submitted. See execution ledgers in each family.
The [transfer/continuity review](TRANSFER-AND-CONTINUITY.md) records why eShop's
raw parity is not presumed and genuine conversation continuation remains unmeasured.

### 2026-11-05: completed adjudications and held-out observations

The exact saved F01 source now passes full corrected grading in a clean local
replay, which also reproduces original v1's overgrading failure. Both exact
A01 sources likewise pass semantic package/physical-database/functional
grading without solution repair. Original native zeros remain preserved,
replays use aarch64 versus original x86_64, and no new model sample or faster
agent time is invented. See [F01 proof](bingo-evolution/evidence/f01-grader-v2.json)
and [A01 proof](bingo-adoption/evidence/a01-regrade-v2-report.json).

X01's native remote oracle passed, then two unique Terra models both passed:
raw [2026110559505696](https://msbenchapp.azurewebsites.net/run-analysis/2026110559505696),
Aspire [2026110559509846](https://msbenchapp.azurewebsites.net/run-analysis/2026110559509846).
Raw observed 49.5 s/20 tools/USD 0.0530; original-skill Aspire
82.4 s/36 tools/USD 0.0951 with monitoring loaded. Preserve the slower result;
no repeated raw/skills condition. One new combined skills/MCP follow-up is
declared to test D01's promising interaction on the different fault.

S01's native remote oracle also passed with two full apps, then two unique
models were submitted:
raw [2026110559660216](https://msbenchapp.azurewebsites.net/run-analysis/2026110559660216)
and Aspire [2026110559664314](https://msbenchapp.azurewebsites.net/run-analysis/2026110559664314).
Actual model/grade verification remains pending.

P01's no-model diagnostic successfully exported safe progress/failure tails:
setup fails specifically at DNS discovery before the private daemon. The exact
resolver input/root cause is not yet asserted. A configured-loopback DNS
compatibility fix is being developed with explicit transport tests, not a
public-resolver fallback or a paid model retry.

### 2026-11-05: true two-app model completion

Both S01 original Terra runs passed native grading: raw 56.4 s/24 calls/
USD 0.0631; original-skill Aspire 68.4 s/29 calls/USD 0.0863 with monitoring.
Actual model/CLI identity and no protected-path access were checked. Both
correctly scoped the repair while preserving the other complete app and
original credentials/TLS/ACL/config/data. [Report](bingo-isolation/PILOT.md)
and [exact results](bingo-isolation/pilot-results.json) make clear this is
sibling workspace scope under one private runner, not editor/cross-host proof.
There is no observed Aspire correctness or speed advantage in this pair.

### 2026-11-05: final remote gates, remaining models and closeout

Final P01 common `7420e30` was publicly pinned by task graph `ffed19f`.
Both exact public-Git images were built and smoke-checked locally after the
child's real loopback/direct production and negative-case proofs. Native remote
no-model [2026110561495368](https://msbenchapp.azurewebsites.net/run-analysis/2026110561495368)
then passed with exported actual `127.0.0.11` -> private `172.16.0.1` relay plan
and complete ready progress. This resolves the final remote gate without
guessing the old failed runs' exact resolver bytes or changing host DNS.

Only then did P01's two original Terra conditions execute: raw
[2026110562064652](https://msbenchapp.azurewebsites.net/run-analysis/2026110562064652)
passed at 144.438336 s/36 calls/USD 0.09847690; Aspire
[2026110562064656](https://msbenchapp.azurewebsites.net/run-analysis/2026110562064656)
passed at 324.509960 s/60 calls/USD 0.14063245. Both actual Production workloads
and preserved supplied state pass the independent verifier.
[Final report](bingo-publishing/PILOT.md) records substantial public API
discovery but makes no causal attribution of the full 180.1-second difference.

X01 combined's independent native no-model
[2026110561653346](https://msbenchapp.azurewebsites.net/run-analysis/2026110561653346)
passed exact live MCP AppHost/resource/NOPERM assertions. Its sole new Terra
condition [2026110562064654](https://msbenchapp.azurewebsites.net/run-analysis/2026110562064654)
passed at 98.645066 s/47 calls/USD 0.1173459, actually using nine successful MCP
calls with NOPERM log responses. This is slower than both prior X01 arms:
capability and natural use transfer, but D01's small timing edge does not.
The initial incomplete local dataset selection submitted no run; baseline rows
were restored unchanged only to satisfy default-variant representation.

All 22 unique model identities/client versions, native results and trace hashes
are recorded; no final model trace needed JSON escape normalization or showed
protected-path access. Runner-estimated model cost is USD 2.48302085. All original
grader-invalid zeros, infrastructure failures, exact-source adjudications and
local/native/direct/remote method boundaries remain intact. Corrected future
F01/A01 datasets were not used for fresh model samples.

The managed source archive was rehashed successfully at its durable artifact
path. Source/benchmark child worktrees and evidence are retained, not archived
or pruned. The parent observed no local Docker containers after final image
smokes; completed cloud runs are retrieved rather than resubmitted. The current
result index above is authoritative over older dated pending entries.
