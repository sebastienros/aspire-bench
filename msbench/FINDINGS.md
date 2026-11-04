# Aspire improvement findings

Record actionable lessons from the benchmarks here, including negative results.
This is the cross-experiment register; individual experiment READMEs retain
full run tables, reproduction commands, and measurement definitions.

Distinguish observed behavior from proposed improvements. A benchmark finding
is not an upstream fix, a general performance guarantee, or proof of causation.
Update an existing entry when new evidence strengthens or contradicts it.

The [agentic-development research program](AGENTIC-RESEARCH.md) records the
prospective protocol, local source-build inventory, new scenario roadmap, and
evidence gates. Planned experiments there are not additional empirical findings.

## F01: A directly discoverable startup skill avoids repository discovery

**Evidence:** In the [recipe-location comparison](aspire-startup/README.md#observed-recipe-location-results),
the same recipe appeared either in the README or in one `aspire-startup`
skill, with identical location-neutral prompts and no MCP. All three
model-executed skill trials loaded the skill first and immediately ran the
recipe; README trials searched the workspace and inspected AppHost/config files.
All six executed trials passed.

Median pre-launch time was 8.9 seconds for the skill versus 14.3 seconds
for README-only; outside-recipe time was 14.9 versus 23.0 seconds.
Total medians were 72.4 versus 86.3 seconds.

**Improvement candidate:** Expose a clearly named, self-contained startup
workflow with a precise trigger. Avoid requiring a router, broad repository
inspection, or multiple reference reads when the AppHost and task are known.

**Limits / status:** Promising, not adopted upstream. Three valid samples
per arm; two skill trials were infrastructure replacements. Readiness waits
also differed. The total-time difference is not a causal estimate of skill
benefit. This was application-specific guidance with explicit readiness and
endpoint commands, not proof that `aspire run` alone satisfies the task.

**Follow-up completed:** The
[specific health skill comparison](aspire-health/README.md) extends this
pattern to service HTTP checks, PostgreSQL readiness/data checks, and
authenticated Redis TLS checks. Both arms preserve all seven original
skills and add the same startup skill; only the treatment adds the three
health skills. All six original model trials and 24 steps passed without
exceptions or replacements. Median services/database/Redis times fell from
48.5/42.8/45.7 seconds to 14.1/16.2/12.2; the median per-trial health-step
sum fell 71.6%, from 145.3 to 41.3 seconds. All nine treatment health
invocations loaded the matching skill first and immediately dispatched its
recipe, with no router/broad-skill handoff or prior repository discovery.
Median health-step input tokens, including cache, fell 63.4%.

This tests discoverable application-specific recipes together with narrow
triggers, not specificity alone. The unchanged startup control was slower
(75.5 versus 83.1 seconds), largely within its launch/readiness shell; do
not call every step a win or infer zero metadata overhead. Existing skills
remain unchanged. The report maps project-local recipe generation and
possible router/monitoring handoffs without claiming any general skill is
replaceable.

**Trigger-boundary finding:** Without the new health skills, five of six
services/database invocations loaded the experimental startup skill despite
the app already running. With explicit health intent coverage, all six
selected the matching health skill instead. Exclude already-running
health-only assessments from startup's description, and measure routing
after that change; a narrow-looking skill can still overmatch adjacent tasks.
No reference reads occurred in either arm, so these gains are not evidence
that reference-file loading was the bottleneck.

**CLI follow-up completed:** The
[common CLI health comparison](aspire-health/CLI-README.md) replaces the
three application-specific probe skills with one generic
`aspire describe [resource] --format table` health skill, keeping a fresh
type-specific control. Both local four-step Docker oracles passed, and all
six original model trials and 24 steps passed without exceptions or
replacements. All nine CLI health assessments selected the common skill and
made one successful table query, with no protocol fallbacks or reference
reads. Median per-trial health-step time increased from 38.3 to 79.3 seconds
(107.2%); health-step tool calls increased from 10 to 35 and input tokens
including cache from 161,884 to 364,927. The unchanged startup control was
also slower (79.8 versus 89.8 seconds), so do not attribute the entire
four-step difference to health checks. The
[trace investigation](aspire-health/CLI-README.md#trace-investigation-resource-identity-versus-extra-workflow-turns)
locates the additional work outside the health command. This comparison
changes observation method, app-specific guidance, reporting recipes, and
skill granularity together; configured Aspire health does not establish
independent protocol or seed-data validation.

## F02: Shorter guidance is not automatically faster end-to-end

**Evidence:** The [compact-skill comparison](aspire-startup/README.md#observed-compact-skill-results)
replaced seven skills with one short skill pointing to the same README.
Median outside-recipe time fell from 21.9 to 19.5 seconds, but full agent
time did not improve: 83.7 versus 85.2 seconds. All six executed trials passed.
The [four-cell ablation](aspire-startup/README.md#observed-startup-results)
also showed similar median launch-command times across capability treatments
(18.8-20.0 seconds) despite different discovery overhead.

**Improvement candidate:** Optimize unnecessary decisions and reference
transitions, not merely word count. Measure pre-launch discovery separately
from application launch, readiness waiting, and reporting.

**Limits / status:** Observed negative result. Small samples and actual skill
consumption varied. A shorter startup-only skill does not replace the broader
capabilities or safety requirements of general-purpose Aspire skills.

**CLI health trace follow-up:** Across all three completed CLI trials,
`describe --format table` itself took only 0.09-0.14 seconds. The generic
skill added AppHost/workspace discovery and separate report-writing/
validation turns. In the first Redis pair, 8.09 of the extra 10.32 seconds
occurred after `describe` completed; the type-specific recipe writes its
report during its probe shell. Optimize the complete workflow, not merely
replace several probe commands with one CLI command. Tool-event gaps do not
measure internal reasoning directly.

## F03: Endpoint discovery needs an accurate, isolation-safe contract

**Evidence:** The original Aspire trajectories incurred endpoint-name and
schema mistakes and substantial post-readiness work. The
[startup ablation recipe](aspire-startup/README.md#measurement) matches
`resources[].displayName` rather than isolation-suffixed resource `name`,
and reads `urls[].url`, not `endpoints[]`. With that recipe, extraction took
0.15-0.26 seconds in the four-cell ablation.

**Improvement candidate:** Put a concise, tested endpoint-discovery example
next to startup instructions. Consider a directly consumable CLI/MCP endpoint
summary that avoids resource-name and schema inference.

**Limits / status:** Recipe validated in this benchmark; product/API change
only proposed. Historical startup medians cannot isolate the recipe's effect
because task scope and prompts also changed. Command/wait completion does not
measure the earliest possible HTTP readiness.

**Resource-identity follow-up:** The CLI health tables show Redis as
`cache / Container`, with only indirect `rediss://` and dashboard resource-ID
hints. The database is more identifiable: `db / PostgresDatabaseResource`
and a separate `postgres / Container` row. Expose integration identity
alongside stable logical resource identity rather than requiring inference
from arbitrary names or links. This is an API/UX improvement candidate, not
an established cause of the timing difference: completed traces searched
AppHost/guidance before `describe` and did not show failed scoped lookups
after reading the table.

**Upstream implementation / local follow-up:** The separate
[PR 21279 toolchain variant](aspire-health/CLI-README.md#pr-21279-toolchain-follow-up)
pins [microsoft/aspire#21279](https://github.com/microsoft/aspire/pull/21279)
at `6676979b`, using matching CLI, AppHost SDK, and Hosting packages
`17.0.0-pr.21279.g6676979b`. The real table now shows
`cache / Redis`, `postgres / PostgreSQL Server`, and
`db / PostgreSQL Database`; JSON exposes `serviceDisplayName`.
Native and explicit AMD64 local Docker oracles passed all four steps and
final verification with unchanged skills/prompts/reporting recipes.
Public PR artifacts are preserved with user approval and checksum-verified
so builds need no GitHub credentials. Old fixtures/results remain intact.
The new `aspire-health-cli-pr21279` dataset defaults to the PR build and
includes an unchanged CLI control pinned to the same task commit.
This validates availability and compatibility, not reduced agent churn:
no new model trials have run, and comparing this toolchain to 13.6.0 would
not isolate this PR from other product changes. Replacing the CLI alone
does not add service display metadata to old Hosting packages.

## F04: Capability installation and actual usage must be verified separately

**Evidence:** Original cloud runs did not consume the supplied skills until
they were also installed in Copilot's native `.github/skills` location, in
addition to Harbor's declared skill root. Later trajectories confirmed real
skill loading. See [original benchmark evidence](README.md).
In the four-cell startup ablation, MCP-only trials made no Aspire MCP calls;
only one combined-treatment trial called `list_apphosts`. All six
skill-enabled ablation trials loaded orchestration guidance.

**Improvement candidate:** Validate client-native skill discovery and MCP
configuration, then inspect actual tool calls before attributing outcomes to
those capabilities. For an MCP usability experiment, choose a task that
requires its functionality rather than forcing irrelevant calls.

**Limits / status:** Installation fix implemented in benchmark images.
Availability is not consumption; no startup MCP speed benefit was established.
The shared app contains MCP configuration, so no-MCP images must explicitly
remove it to avoid treatment contamination.

**Development-task follow-up:** In the [Terra I01 pilot](bingo-iteration/README.md#completed-terra-pilot),
all eight Aspire skills were advertised, but the agent loaded none and called
no Aspire CLI command. Both arms repaired the frontend with the same patch.
A successful Aspire-app task does not demonstrate skill/MCP value when the
agent uses ordinary code/HTTP tools; choose runtime diagnosis next rather
than force tool calls into an irrelevant task.

## F05: Multi-step session continuity is a runner contract, not workspace reuse

**Evidence:** The [Copilot continuation probe](aspire-startup/README.md#continuation-retry-with-msbench-0367)
exited before model actions and later invocations refused execution because
of a retained runner lock. The [Codex control](aspire-startup/README.md#alternative-agent-continuation-control)
passed all four steps in both modes but created four distinct threads even
with resume enabled. Its packaged runner invoked `codex exec` without
reloading conversation history.

**Improvement candidate:** Until a runner demonstrably reloads its session,
make skills/MCP workflows usable from a fresh conversation against an already
running application. Once supported, evaluate whether retained context avoids
repeated discovery and health-assessment work.

**Limits / status:** Genuine continuation comparison remains blocked.
Not evidence of an Aspire defect or a definitively identified submission-CLI
bug. The initial Copilot exit remains unexplained.
Reported on [devdiv-microsoft/msbench#2020](https://github.com/devdiv-microsoft/msbench/issues/2020#issuecomment-6326811393).

## F06: Setup failures must not become model or Aspire failures

**Evidence:** Experiments encountered a missing Copilot platform package
during agent setup and HTTP 503/504 responses fetching the Aspire installer
during Docker builds. These attempts never reached model execution.
Experiment READMEs retain failed run links and explicitly labeled replacements.

**Improvement candidate:** Track image-build and agent-setup reliability
separately from task correctness and startup latency. Consider bounded
installer-download retries or prevalidated build artifacts as an independent
infrastructure improvement, without silently changing comparison treatments.

**Limits / status:** Failures classified and retained; infrastructure hardening
is not implemented by this finding. These events do not establish an Aspire
runtime or model-reasoning failure.

**Full-roadmap execution follow-up:** Concurrent local source/scenario work
encountered a shared-host storage/engine failure: host disk reached 100% capacity
(parent observation 2.8 GiB available; builder minimum 1.2 GiB), native compilation
and containerd metadata reported I/O/read-only failures, and independent Docker
`version`/`ps` requests each timed out after 12 seconds.
[Blocker evidence](execution-blockers/2026-11-04-docker-storage.json) separates
observations from a suspected nested-cgroup/freezer contribution; the exact
cause across concurrent workloads is not established.

Stop new launches, preserve task-owned evidence, and require owner-controlled
engine/storage recovery followed by sequential final-task runtime validation.
Do not prune/restart shared Docker or submit unvalidated task drafts to obtain
apparently complete model results. Static tests and an older oracle pass do not
validate a subsequently modified final image/grader.

## F07: Broader skill availability need not add startup discovery churn

**Evidence:** The [orchestration-availability comparison](aspire-startup/README.md#observed-orchestration-availability-results)
added the full, unchanged orchestration skill alongside the self-contained
startup skill, with everything else matched and no router/MCP. Raw model
prompt logs confirmed both skills were advertised. All three combined
trials selected only `aspire-startup`, just like the three valid controls.
Each trial made exactly one pre-launch tool call (the skill load), with
zero orchestration-reference reads. All six executed trials passed.

Median pre-launch time was 8.3 seconds combined versus 8.8 seconds startup-only;
outside-recipe time was 14.9 versus 15.1 seconds. Full medians were 78.8
versus 75.0 seconds, with variable readiness waits.

**Improvement candidate:** Keep a narrow, directly discoverable entry point
for known startup work while retaining broad orchestration guidance for
cases that need it. Investigate routing/trigger behavior before removing
the broader skill on the assumption that its mere presence adds churn.

**Limits / status:** Negative availability-overhead result, not proof of zero
cost. Three samples per arm, including one control infrastructure replacement.
The orchestration body was never loaded, so this does not measure the cost
of its invocation or negate discovery overhead observed in other skill-bundle
experiments. Any forced-invocation test must be reported separately.

**Full-bundle follow-up:** The
[complete predefined bundle comparison](aspire-startup/README.md#observed-full-bundle-results)
advertised all seven original skills plus startup in every full-bundle
trial. Again, all three trials selected only `aspire-startup`, with no
router/orchestration load, one pre-launch tool call, and zero reference
reads, matching the three startup-only controls. All six original
submissions executed and passed without replacements.

Pre-launch medians were 8.5 seconds full-bundle versus 9.0 seconds control;
outside-recipe medians were 16.3 versus 15.2 seconds. Total medians were
85.3 versus 71.1 seconds, alongside readiness-wait medians of 48.4 versus
35.2 seconds. Do not turn the absence of routing churn into a claim of zero
overall cost, or attribute readiness variation to the bundle from three
samples.

**Adoption direction:** An additive startup entry point is supported as a
candidate; neither orchestration nor the router needs to be removed to
enable direct selection in this scenario. Retain all existing skill content
until a generalized startup skill and broader routing/safety tests establish
what overlap can be removed. The measured skill hardcodes Bingo paths,
resource names, and timing artifacts, so it is not yet a drop-in upstream
skill. Startup success alone does not validate editor ownership, ambiguous
targets, worktree isolation across hosts, or stop/restart behavior.

## F08: Running-app changes need behavioral and preservation checks

**Evidence:** The new [Bingo player API routing scenario](bingo-iteration/README.md)
starts each app before the agent and requests a frontend routing change. Both
raw-scripted and Aspire local Docker oracles passed. Both graders rejected
unchanged routing, an out-of-scope change, invalid endpoints, and lost preexisting
called-state before accepting the correct repair. Fresh cross-origin requests
exercise actual database/Redis effects and backend error passthrough. No agent
JSON assessment is used.

**Improvement candidate:** Measure supported running-app iteration and targeted
verification, rather than assuming a green process/resource proves development
success. Use runtime behavior plus data/process preservation as promotion gates.

**Completed model pilot:** Exactly one original `gpt-6.1-terra` attempt per arm
passed, with native call events confirming the model and CLI provenance
confirming 1.0.99-0. Raw/Aspire native agent time was 74.5/80.7 seconds,
tool calls 20/24, and runner-reported costs USD 0.05016/0.06658. Both made
the same proxy addition. Neither loaded a skill or used Aspire CLI.

**Limits / status:** No demonstrated Aspire advantage; one sample per arm is
not a causal estimate or significance result. The prompt names the editable
frontend config; this is not a distributed root-cause localization benchmark.
MCP is disabled. Preserve this negative result and build D01, rather than rerun
identical conditions to seek a win. Discovery HTTP 403 did not prevent explicit
Terra execution. The pinned client used default capability metadata when its
model catalog was unavailable; all model-call IDs remained Terra.

## F09: Successful empty CLI observations need a consistent JSON contract

**Evidence:** The [local source baseline](source-builds/aspire-baseline.json)
at `d698a4f9` builds/runs in an isolated Linux ARM64 container.
`aspire ps --format json` returns `[]`, whereas non-follow
`aspire describe --format json --non-interactive --nologo` with no running
AppHost returns exit 0 and zero stdout bytes, with a diagnostic on stderr.
The [source-build report and exact commands](source-builds/baseline/report.md)
are committed alongside the manifest; large binaries/logs remain at the recorded
local artifact paths.

**Improvement candidate:** Emit the normal empty resources JSON wrapper for the
specific successful no-AppHost snapshot case. Preserve actual errors and
table/Mermaid/stream behavior; do not convert failures into successful empty data.

**Implemented locally:** Same-base branch `sebros/agentic-empty-json`, commit
`fafe64823d80e8f34fa5fc773ac9d9d9ba64f375`, emits the existing
`{"resources":[]}` wrapper only for successful non-follow JSON empty snapshots.
[Matched binary evidence](source-builds/empty-json/report.md) shows control
exit 0/stdout 0 bytes versus treatment exit 0/stdout 22 bytes, with byte-identical
stderr. Invalid-path exit 7 and table/Mermaid/follow behavior remain unchanged.
All 66 DescribeCommand cases passed in both Debug and exact-source Release.
Resolved external package versions/hashes match. The
[portable patch](source-builds/empty-json/change.patch) reconstructs the local
change; no upstream push/PR was made.

**Limits / status:** Verified product-contract improvement, not demonstrated
agent-efficiency gain or upstream adoption. The source builds are managed,
unbundled Linux ARM64 and have not run Bingo, so they must not replace the
validated Harbor toolchain yet. Connected/error command cases use existing
repository test services; offline binaries verify the empty/error format cases.

## F13: Orchestration adoption can preserve existing business code

**Evidence:** The [A01 local adoption fixture](bingo-adoption/README.md) starts
from raw Bingo with no AppHost. Its reference solution adds only an AppHost and
CLI configuration, then runs the real admin/frontend, migrations, PostgreSQL,
Redis and SignalR under Aspire. Existing source and guidance remain unchanged.
The first Docker oracle passed and rejected absent orchestration/unrelated edits.

**Improvement candidate:** Make project-local adoption guidance distinguish the
minimum working resource graph from optional telemetry/ServiceDefaults work.
Grade runtime behavior and connections rather than generated code or framework
version labels.

**Limits / status:** Local fixture/reference proof, not an autonomous agent
success or measured adoption benefit. A01 has one adoption arm, not a trivial
raw-launcher comparison. Source immutability makes this a bounded adoption
scenario, not permission to skip instrumentation in scenarios requiring traces.
The first oracle predates added fixed-port/secret guards; final-task Docker
validation was interrupted by the shared host failure. No model run is eligible
until the final task is validated; static tests are not a substitute.

## F12: Local publishing needs a production runtime gate; P01 remains blocked

**Paired evidence:** The [P01 publishing draft](bingo-publishing/README.md)
and [failure manifest](bingo-publishing/evidence.json) preserve one raw and one
Aspire local Docker oracle attempt. Both failed during environment-image build,
before any agent solution or verifier: BuildKit returned file/metadata
`input/output error`; raw also failed syncing dpkg state. Shared-host disk
exhaustion was reported by the coordinator, with a direct local observation of
100% disk capacity and 2.8 GiB available. Neither arm has a deployment, reward,
executed functional check, or model result. Four structural tests pass only.

**Improvement candidate / design:** Evaluate published .NET + production-served
Vue with real login, version routing, WebSocket SignalR/database catalog and
Redis behavior; keep environment-owned dependencies and prior data unchanged.
Do not treat Vite proxies, AppHost containers, Development-only producer APIs,
generated YAML text, or publish-only output as completed production deployment.
Use exact release-family APIs: current documentation plus 13.6 NuGet inspection
confirmed `AddDockerComposeEnvironment`, `ConfigureComposeFile` and
`AddDockerfile`; it did not establish runtime compatibility.

**Limits / status:** Blocked, NOT Docker-validated and not eligible for model
submission. The implementation and intended rejection cases are scaffolding,
not observed passes or proof of Aspire benefit. Recover the shared engine under
its owner's control, then sequentially establish image builds, CLI/Hosting 13.6
publish/prepare behavior and both positive/negative runtime oracles. Only owned
runner commands were stopped; no shared restart/prune, cloud provisioning,
model submission, or repeat sweep. Historical tasks/tracker are untouched.

## F11: Feature/data-evolution checks need real state; local pair gates remain blocked

**Evidence:** The [bounded F01/M01 tasks](bingo-evolution/README.md#local-outcomes-2026-11-04)
extend Bingo without changing historical fixtures. F01 adds an actual active
catalog joining PostgreSQL definitions to Redis called-state through player and
admin origins. M01 specifies an additive persisted-description migration over
preexisting active/inactive squares and users. Prompts are matched and
outcome-neutral; raw has useful reload/migration scripts, Aspire has eight
explicitly exposed skills and ordinary resource operations, with MCP disabled.

The initial F01 raw Docker oracle passed (reward 1, no exception), including
fresh nonces, direct SQL/Redis observations and seven rejected no-op/hardcoded/
integrity/data-loss cases. In particular, recreating a table with identical rows
was rejected using its original database/table identity, not just row counts.
[Native result and output](bingo-evolution/evidence/validation.json) retain the
evidence. All 11 new/relevant historical structural and negative tests passed.

**Failure / limits:** F01 Aspire failed before agent execution when the new
grader could not recognize its Redis image. The matcher assumed unqualified
names; registry qualification is the working diagnosis, but the original image
string was not retained. The candidate fixture fix is not runtime-reverified
and is not evidence of an Aspire product failure. Shared-host
disk exhaustion and an unresponsive Docker daemon then prevented completion of
the replacement and both M01 validations. The initial raw oracle predates the
image-name/artifact-list changes. **Neither final matched pair is verified or
model-ready.** No completed M01 positive grade, model attempt, performance
comparison, or observed skill/tool-use benefit is claimed. Setup/oracle runtime
is not agent-development time.

**Improvement candidate / status:** Keep schema/data correctness independent of
resource readiness: compare original identifiers and contents, preserve migration
history and database/table identity, and verify fresh writes/negative inputs
through HTTP plus SQL/Redis. This mechanism has partial local proof, not an
adopted product change. Complete both exact final Docker oracles only after the
shared host is healthy; withhold cloud datasets/submissions until that gate.

## F10: Runtime diagnosis fixtures must pass the infrastructure gate first

**Actual evidence:** The new [D01/H01 Bingo diagnosis fixtures](bingo-diagnostics/README.md)
were implemented as matched static raw-scripted/Aspire tasks designed to pause
the owned Redis's writes, with held-out logical names, a tiny separately owned neighboring Redis,
and external functional/data/identity/event grading. The raw Docker build and
healthy application checks reached decoy creation, where nested Docker rejected
the original cgroup memory limit with a threaded-cgroup error. The decoy now uses
Redis's own 16 MB maxmemory rather than a Docker cgroup memory limit; that
correction has **not** passed a Docker oracle.

Further validation was blocked by the shared host: Docker version/ps each
exceeded bounded 15-second probes, `df -h .` reported 100% capacity and 2.8 GiB
available, and the coordinator reported containerd metadata I/O/read-only
failures. Owned runner commands were stopped; no shared Docker restart/prune
or new model submission was attempted.

**Improvement candidate:** Keep warm runtime-diagnosis and wrong-instance safety
grading separate from explicit-file frontend iteration. Require a reproduced
functional incident, fresh owned PostgreSQL/Redis effects, pre-fault data/process
preservation and lifecycle-event checks before evaluating an agent. Page,
process, Redis PING or read availability alone is not write recovery. The eight passing structural/
negative-policy tests establish only the grader's static contract.

**Safety correction, still unvalidated:** The initial nested Docker-pause
implementation was removed from every runnable setup/oracle/negative path.
Current setup uses Redis's documented bounded `CLIENT PAUSE 1800000 WRITE`;
reference repair uses `CLIENT UNPAUSE`. Fresh SET/GET/DEL on the owned and
neighboring instances proves intended write recovery without requiring a tool
choice or a Docker paused-state change. All container start times/identities
must remain unchanged, Docker lifecycle events are forbidden, and an expired
fault deadline cannot count as repair. Visible wrong-target Redis controls
are rejected, but direct Redis traffic is not guaranteed observable in Docker
events. No new Docker launch was attempted after the correction.

**Limits / status:** **Runtime-unvalidated, infrastructure-blocked. Neither
Docker oracle passed and no actual seeded fault/recovery or live negative-suite
success was obtained.** This is not evidence that Aspire helps diagnosis, that
the selected pause is portable, or that wrong-instance repair is solved. The
neighbor is one resource, not a full second app/worktree. Preserve the failed
attempts and finish the Docker gate after infrastructure recovery; do not infer
benchmark correctness from implemented checks or repeat model conditions.

## Recording future findings

Give each finding a stable ID and include evidence links, exact observed
behavior or metrics, an actionable improvement candidate, limits, and status.
Keep negative/null results and contradictory evidence. Identify infrastructure
replacements, distinguish capability availability from actual use, and do not
pool experiments with different prompts or guidance. When an improvement is
implemented or reported upstream, link it and retain the original evidence.
