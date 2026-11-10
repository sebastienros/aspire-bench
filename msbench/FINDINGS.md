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

**Matched mechanism preparation:** Task-local CLI 13.6 actually generated the
seven skills in `.github/skills`; compared with the pinned bundle, only router/
init and two associated reference files differ. Monitoring knowledge is
unchanged. A separate focused-trigger cell changes only monitoring's discovery
description, retaining its identity/body/references. A persistent native 13.6
MCP client completed initialize/tools-list with 14 tools, including AppHost
list/selection; its server does not support host-17's `--apphost` switch.
[Treatment definitions](bingo-diagnostics/MECHANISMS.md) preserve these concrete
version distinctions. Live Docker backchannel and natural agent use remain
unverified; no speed benefit is inferred from this preparation.

**Actual diagnostic use:** The [D01 Terra pilot](bingo-diagnostics/PILOT.md)
passed all seven valid conditions after separately labeled pre-model build
failures. Monitoring plus MCP was actually consumed (four MCP calls, nine Bash
calls), unlike I01. Its observed time was 68.1 s versus skills-only 94.1,
MCP-only 120.5, CLI-only 127.4 and raw 72.4. One observation per condition is
not a general gain or significance result; guidance/tool interaction is the
promising mechanism, not mere MCP availability.

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

**Remote graph follow-up:** All seven initially submitted diagnostic cells
failed at image build, before agent execution, because remote Docker Bake
required `fs.read` access for repository-sibling local named contexts.
[Receipts](bingo-diagnostics/evidence/remote-build-failures.json) preserve the
exact warning and IDs. Correct the build graph using immutable Git contexts
with the same verified contents rather than granting broad filesystem access.
Local runtime success does not establish remote frontend portability.
Any replacement remains labeled infrastructure recovery, not a model retry
or another independent sample.

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

**Initial limits / status:** Local fixture/reference proof, not an autonomous agent
success or measured adoption benefit. A01 has one adoption arm, not a trivial
raw-launcher comparison. Source immutability makes this a bounded adoption
scenario, not permission to skip instrumentation in scenarios requiring traces.
The first oracle predates added fixed-port/secret guards; final-task Docker
validation was interrupted by the shared host failure. No model run is eligible
until the final task is validated; static tests are not a substitute.

**Recovered adoption gate:** Final original and generated-skill adoption
oracles both passed after engine recovery, including the final port/secret
guards and source-preserving functional behavior. The two conditions differ
only in the actual CLI-13.6-generated router/init knowledge. This is local
setup/grader proof, not yet an autonomous-agent success or generator benefit.

## F12: Local publishing needs a production runtime and image-identity gate

**Paired evidence:** The [P01 publishing scenario](bingo-publishing/README.md)
and [manifest](bingo-publishing/evidence.json) retain the original paired
shared-host image-build I/O failures and subsequent concrete fixture corrections.
After owner-controlled engine recovery, raw `p01-raw-v5` and Aspire
`p01-aspire-v5` each pass with reward 1. They execute real .NET 10.0.12/nginx
Production workloads, correct/wrong admin login, original Vue bundle hashes,
WebSocket SignalR/database catalog and fresh Redis boards, preserving existing
data and environment-owned dependency/network/volume identity. No-op, immutable
input edits, lost prior state, nonrunning workloads and a live Vite server are
rejected; Aspire additionally rejects publish-only and ejected YAML artifacts.
Those passing development oracles used local common input overrides. Final
public-Git-input direct Docker oracles subsequently pass both arms with reward 1,
matching business-source and frontend hashes and all six resolved runtime/build
image digests. Both enforce equal 900/300-second solution/verifier budgets;
their different validation method is explicitly recorded.

**Improvement candidate / design:** Evaluate published .NET + production-served
Vue with real login, version routing, WebSocket SignalR/database catalog and
Redis behavior; keep environment-owned dependencies and prior data unchanged.
Do not treat Vite proxies, AppHost containers, Development-only producer APIs,
generated YAML text, or publish-only output as completed production deployment.
Use exact release-family APIs and matching image identities. Actual CLI
`13.6.0+56f3e9c0` compiled and ran the AppHost publish/prepare/build path. Its
prepare defaults emitted deployment tags that did not match Dockerfile build
tags; the successful model pairs `WithImageTag("local")` with documented
`ConfigureComposeFile` service `Image`, disables the optional dashboard for the
matched two-workload topology, and applies `.env.Production`. No YAML/env
ejection or newer unsupported static-site API is used.

**Limits / status:** Local production runtime and final public-input graph checks
pass. A final native Harbor attempt instead looped in readiness with no task
container visible; it was stopped, has null agent/verifier results and no reward.
The coordinator-approved direct fallback built/ran the exact tasks without
modifying global tools, but is not a native runner pass. Native Harbor/CES
execution was required before model submission and has since passed separately,
as recorded below. Oracle timing is not an agent-efficiency result. Those local
receipts alone make no CES/x64/model or broader production architecture
claim. The scenario
publishes application containers against supplied dependencies; it does not
provision the whole environment. Root-local controls are not an adversarial
sandbox. No shared restart/prune, cloud provisioning, model submission or repeat
sweep was performed; historical tasks/tracker are untouched.

**Portability/source follow-up:** Both common named contexts at those direct
validation runs used public Git snapshot `1f9f9614`, verified tree-equal before the builds,
not a sibling-local `../../../common` requiring remote Bake filesystem permission.
No local named-context override or entitlement bypass was used for those runs.
Nested Docker also needed the established
`vfs` recipe and explicit inheritance of the task's actual upstream DNS; it must
not guess public resolvers. Vue golden/published builds use identical version
inputs, avoiding a false bundle-hash failure from the SDK's ambient environment.

**Remote setup / DNS follow-up:** Coordinator-owned no-model CES oracle
`2026110558453858` exited setup before the agent; the subsequent sanitized
diagnostic `2026110559322086` proves failure in DNS discovery before dockerd,
but does not reveal the remote resolver file or establish its exact format.
The [local repair evidence](bingo-publishing/README.md#dns-discovery-diagnostic-and-resolver-preserving-repair)
adds an explicit UDP/TCP relay for configured outer loopback resolvers lacking
upstream metadata, with nonoverlapping bridge/network selection against actual
outer routes. It preserves those resolvers instead of guessing a public one,
logs failures and returns SERVFAIL rather than fabricating success.
Both local loopback-only production oracles and a direct-resolver regression
pass, including real Dockerfile RUN UDP/TCP DNS, preserved ownership/data and
all applicable negatives. This is representative local proof, not a remote
root-cause or CES pass. The parent must publish/repin and inspect its remote
no-model gate before any model submission. Shared guidance also now explicitly
states the project/service IDs already required by grading, prospectively
avoiding hidden identity constraints; earlier receipts remain version-scoped.
The final relay common snapshot `7420e30` is now public, both exact public-Git
images have been locally built and smoke-checked, and task graph `ffed19f`
passed remote no-model gate `2026110561495368`, reward 1/no exception. The
exported plan proves the actual remote configured resolver is `127.0.0.11`;
private relay `172.16.0.1` preserves it and setup reaches ready before the
full native production grade. This new remote evidence is not a relabeling
of the older `1f9f961` production receipts or intermediate `648f323` diagnostic
builds. Only then were the two original prospective Terra conditions submitted,
`2026110562064652` (raw) and `2026110562064656` (Aspire).

**Model outcome:** Both passed native full production grading, with actual
Terra/CLI identity verified and no observed protected-path access. Raw took
144.4 s/36 tools/USD 0.09848; Aspire took 324.5 s/60 tools/USD 0.14063.
No skill/MCP treatment was exposed. Aspire's public shell requests contained
19 documentation-command mentions across eight invocations, including
version/API/Compose discovery and some guessed not-found paths/IDs.
A concise, version-matched complete publishing recipe is a candidate, not an
already measured improvement or evidence of a CLI documentation defect.
The [model report](bingo-publishing/PILOT.md) retains exact native timing,
cost/token/hash provenance and the adverse observation: no speed/cost advantage
in this pair, n=1 per arm. Oracle/setup timings are not pooled with agent time.

**Comparison-design correction:** The original Aspire fixture omitted its
complete deployment target/frontend, leaving that wiring to the agent.
The raw arm also authored Compose, but the preparation work was not equivalent.
Those measurements therefore do not isolate operation of two already
configured apps. User-directed [preconfigured variants](bingo-publishing/CONFIGURED.md)
now provide the complete AppHost and matching raw Compose plus a deployment
command before the agent starts, with identical outcome-only prompts.
Existing model results remain unchanged; new fixture validation is not a new
model sample or retroactive evidence of a speed difference.
Both new native local Harbor oracles now pass reward 1/no exception, with
six/eight negative cases and byte-identical retained raw/AppHost configurations.
[Receipt](bingo-publishing/configured-evidence.json) and
[new dataset](bingo-publishing/configured-dataset.jsonl) bind the tested inputs.
No new cloud/model submission was made.

## F11: Feature/data-evolution correctness needs real state, not readiness

**Evidence:** The [bounded F01/M01 tasks](bingo-evolution/README.md#local-outcomes-2026-11-04)
extend Bingo without changing historical fixtures. F01 adds an actual active
catalog joining PostgreSQL definitions to Redis called-state through player and
admin origins. M01 specifies an additive persisted-description migration over
preexisting active/inactive squares and users. Prompts are matched and
outcome-neutral; raw has useful reload/migration scripts, Aspire has eight
explicitly exposed skills and ordinary resource operations, with MCP disabled.

**Verified locally under the original v1 grader:** After recovery, both F01/M01
pairs passed all four sequential force-built Docker oracles (reward 1, no exceptions), with
seven rejected no-op/hardcoded/integrity/data-loss cases each. Real SQL/Redis
checks preserve 43 old square records and the complete original user, migration
history and database/table OIDs. Recreating a table with identical rows is
rejected, not just checked by row counts. Both M01 graders prove the actual
non-null `varchar(280)` empty-default column, all old descriptions backfilled
empty, a new applied migration, fresh SQL defaults and exact HTTP writes/
negative inputs; F01 proves fresh catalog filtering, label refresh and call/
clear state. [Native results and parsed runtime proof](bingo-evolution/evidence/recovered-local-validation.json)
retain source/evidence hashes and failures separately.

**Failures and actual corrections:** Initial image-name matching and shared-host
disk/Docker failures remain in the historical ledger. Final runtime proof
captures registry-qualified Aspire image names; helpers select owned roles,
use database `db` versus raw `bingo`, and retain authenticated Redis TLS/CA
verification. Recovery also exposed an invalid healthy wait on a completed
worker, explicit `resource start` needed after rebuilding stopped/completed
projects with the pinned CLI, and a reference empty 404 response reexecuted as
PUT 405. Supported starts and the original producer's nonempty 404 pattern
resolved these without dependency replacement or security bypass. Five failed
recovery trials retain reward 0 alongside the final passes.

**F01 overgrading found in the first actual model attempt:** The Aspire agent
implemented the requested catalog-only player proxy. Catalog and real SQL/Redis
checks passed, but the grader also demanded a new frontend producer write proxy
for legacy 400/404 checks, despite that behavior never existing in the baseline.
The [v2 correction](bingo-evolution/README.md#f01-grading-correction-v2-2026-11-05)
moves only those two checks to the original admin origin, without expanding the
prompt or changing M01. Original cloud reward 0 and local v1 source hashes are
preserved as historical evidence; the cloud result is grader-invalid, not a
capability loss. A catalog-only-proxy regression passes corrected grading and
rejects v1. The [exact saved-patch Docker regrade](bingo-evolution/evidence/f01-grader-v2.json)
now reproduces the old 404-versus-400 failure and passes the full corrected
grader with reward 1/no exception, preserving 43 original square records,
original user, OIDs and Redis state. It uses no reference application solution.
The first local replay stopped at a missing patch-transport final LF; original
bytes/failure are retained and only a separately hashed LF-normalized copy was
used. Output source Git blob IDs and runtime SHA-256 values match the original
native model diff. This is a local aarch64 regrade of an original x86_64 attempt,
not another model sample; native cloud reward 0 remains unchanged and is
explicitly marked grader-invalid. No model rerun or resampling was performed.

**Limits:** Local fixture/grader proof only, not agent-performance evidence or
an Aspire advantage. No model attempt or observed model skill/tool-use benefit
is claimed; oracle/setup time is not agent-development time. The portable
CES build graph remains a separate pending gate: the sibling common context
is outside the environment directory. Parent D01 submissions encountered
Docker Bake filesystem-entitlement rejection before agents ran. Parent must
pin the public Git common context and verify build-on-demand packaging; no
cloud dataset/readiness claim is made for these tasks yet.

**Improvement candidate / status:** Keep schema/data correctness independent of
resource readiness: compare original identifiers and contents, preserve migration
history and database/table identity, and verify fresh writes/negative inputs
through HTTP plus SQL/Redis. This mechanism now has matched local runtime proof,
not an adopted product change. Preserve useful raw scripts and supported Aspire
recipes explicitly, including one-shot completion and restart semantics.
Withhold cloud datasets/submissions until the independent portable-build gate.

**Portable graph preparation:** The parent now references public
`2842205e02055cfe4b47e06bf2f5bbfa28f5dca8` for the exact final common contents,
with no outside-environment local filesystem context. Runtime hashes still
match the verified snapshot; representative remote execution is the next
gate before model submissions.

**Portable execution gate passed:** Remote no-model validation
2026110507252286 passed both final F01/M01 Aspire cases. Adoption's generated
condition likewise passed remote oracle 2026110507371146. Exact native
receipts are committed alongside execution ledgers; these are not model
successes or additional independent samples.

**Model migration follow-up:** Both M01 original Terra attempts passed the
actual additive schema/data/default/error contract. Raw/Aspire native agent
times were 145.1/271.9 seconds in this one-per-arm pilot. Visible Aspire detours
included absent EF tooling/Python, password/quoting probes, EF snapshot integrity
checks and HTTP 405/400 correction. Do not attribute this to slow CLI execution
or claim existing orchestration guidance covers database migration efficiently.
Available-tool/credential/schema/error-contract recipes are improvement
candidates; Project-v2 migration is a different intent. No repeated run was
submitted to improve this slower observation.

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

**Initial limits / status:** **Runtime-unvalidated, infrastructure-blocked. Neither
Docker oracle passed and no actual seeded fault/recovery or live negative-suite
success was obtained.** This is not evidence that Aspire helps diagnosis, that
the selected pause is portable, or that wrong-instance repair is solved. The
neighbor is one resource, not a full second app/worktree. Preserve the failed
attempts and finish the Docker gate after infrastructure recovery; do not infer
benchmark correctness from implemented checks or repeat model conditions.

**Recovered final gate:** [All seven local cells passed](bingo-diagnostics/evidence/recovered-local-validation.json)
after controlled engine recovery. Raw/Aspire/MCP faults were actually reproduced:
HTTP 500 with pages/PING/read paths serving, then exact-target protocol recovery
and fresh SQL/Redis effects passed. Wrong-target/data/source/endpoint/no-op
negatives were rejected. MCP additionally selected the actual AppHost, read
its held-out resources and observed failure logs.

The first recovered Aspire validation caught raw-only probe assumptions about
proxy ports, database names, credentials and TLS. Correct adapters preserve
native security and match actual resource identities/URLs, rather than weakening
the checks. This is fixture/capability proof, not model efficiency or universal
Aspire benefit. Initial failed attempts are not relabeled.

**Completed model pilot:** All seven actual Terra conditions recovered the
operation and passed preservation/negative grading. The combined skills/MCP
run was fastest in this observation, but only 4.3 s faster than raw. The
description-only trigger and generator conditions also loaded monitoring;
generated monitoring knowledge was unchanged. Preserve these conditional
results and test the different fault/name transfer rather than rerunning
identical conditions or declaring Aspire universally faster.

## F15: Independent graders must not expand the requested behavior

**Observed evidence:** The [F01 Terra pilot](bingo-evolution/PILOT.md) produced
an Aspire solution that passed actual catalog/data/filter/refresh checks but
received reward 0 for not proxying unrelated producer writes through the
frontend. The prompt requires the catalog at both origins and preserving
existing producer behavior; original frontend write proxying did not exist.
This is a grader-scope defect, not established agent failure.

**Initial correction protocol:** Retain original reward/evidence, narrow legacy-write
negative checks to their original admin origin, and replay the exact saved
model patch against fresh external state without more inference. Do not
silently convert 0 to 1 or alter the solution/prompt.

**Completed F01 adjudication:** The unchanged saved source now passes full v2
functional/preservation grading in an independent local replay that also
reproduces v1's overgrading failure. Source Git blobs/SHA-256 and the single
transport-only EOF newline correction are recorded in
[f01-grader-v2.json](bingo-evolution/evidence/f01-grader-v2.json).
Original native 0 remains unchanged; no new model attempt or reference
implementation was substituted.

**Limits / status:** One concrete evaluation defect. A passing reference oracle
can hide overgrading if its implementation does more than the user requested.
Require explicit baseline/prompt/grade alignment checks in addition to
no-op and cheating negatives.

**Adoption follow-up:** Both A01 original grades also stopped at a byte-level
central-package immutability rule. Both solutions only added compatible
orchestration package registrations without changing original dependencies.
The [review](bingo-adoption/PILOT.md) narrows that restriction semantically and
separates logical connection key `db` from a valid physical database name.
Original 0 scores/patches are preserved; the exact-source no-model replay
requirement was completed as recorded below.

Both A01 actual Terra runs completed with no trial exception and measured
412.8/535.7 seconds (original/generated); generated used fewer tool calls but
was slower. Those metrics and original 0 scores remain recorded through
adjudication. No repeated inference was used to produce a preferred conclusion.

**Completed A01 adjudication:** Both byte-exact saved solutions now pass the
[corrected external grader](bingo-adoption/evidence/a01-regrade-v2-report.json)
in fresh local reconstructions, with original native 0 scores preserved.
No reference AppHost, solution/credential fix or new model call was used.
The replay platform is aarch64 versus original x86_64, explicitly recorded.
Generated-skill `WithoutHttpsCertificate()` is original model behavior and
was not changed to secure a pass; functional success is not production
security-equivalence evidence.

## F14: Fault transfer and real two-app safety need distinct runtime proof

**Evidence:** The [X01 ACL-denial case](bingo-transfer/README.md) changes both
resource names and the real write-failure mechanism from D01. Both final local
direct-Docker oracle/verifier gates passed with original passwords/TLS/config,
data, target/neighbor identity and twelve negative checks preserved. Redis 8.6
can retain redundant positive ACL grants after restoration; comparison
canonicalizes only a universally granted positive-only command set, not
credentials, denials, selectors or configuration.

The separate [S01 case](bingo-isolation/README.md) actually starts two full
Bingo applications with four app processes, four HTTP origins and four
dependency containers. Both local direct-Docker gates passed target repair,
fresh SQL/Redis/HTTP effects and absence in the other app, plus both original
identities/security/data and twelve negative cases. A Redis-only decoy was
not relabeled as two-app proof.

**Limits / status:** The original local direct-Docker gates are not native
Harbor results. Native local Harbor stalled without creating an image/container;
direct Docker used the exact published input graph, limits, entrypoint, oracle
and verifier. Subsequent representative native remote no-model gate
`2026110558919112` passed before the four completed unique model pilots below.
Sibling workspaces in one private
runner do not establish two editor-owned sessions, host-git worktree ownership,
cross-host isolation, unrelated application transfer or statistical generalization.

**Improvement direction:** Keep stable AppHost/resource/connection identity in
CLI/MCP, distinguish functional readiness from healthy reads, and require
target-scoped repair plus unchanged other-workload evidence. Do not select by
resource-name substring or normalize away authentication to simplify probes.

**X01 model outcome:** Both original Terra solutions passed the native cloud
functional/security/preservation contract. Raw took 49.5 s / estimated USD
0.0530, original-skill Aspire 82.4 s / USD 0.0951; monitoring was loaded, and
neither accessed protected grader paths. This shows narrow transfer feasibility,
not an Aspire speed gain. A single additional combined skills/MCP condition
is declared to test D01's mechanism under this different fault; original
conditions will not be repeated.

The [combined follow-up](bingo-transfer/SKILLS-MCP.md) has independently passed
one actual native local Harbor oracle with exact live AppHost/resource/NOPERM
MCP assertions, all 12 negatives and final external grade. Native stdout/results
are retained; separately uncollected environment JSON is not claimed preserved.
Its published graph passed remote no-model gate `2026110561653346`, reward 1/
no exception, with the same exact live MCP assertions. The single new Terra
condition `2026110562064654` passed native reward 1/no exception in 98.6 s,
47 tools and USD 0.11735. Router/monitoring loaded; **nine actual successful MCP
calls** queried resources/traces/structured/console logs, including actual
NOPERM. No protected-path access was observed. Capability and natural tool use
transferred, but the D01 timing advantage did not: this observation is slower
and more expensive than both original X01 arms. Do not equate actual MCP use
with efficiency or repeat the condition to seek a win.
The initial local dataset-selection
error submitted no run; the default baseline rows remain present only for
MSBench's variant validation and are not selected for re-execution.

**S01 model outcome:** Both actual two-app Terra solutions passed native
functional, original-security and other-app preservation checks. Raw observed
56.4 s / USD 0.0631; original-skill Aspire 68.4 s / USD 0.0863 with monitoring
loaded. Neither accessed protected grader paths. Both workflows selected the
correct target; no observed correctness advantage or Aspire speed gain is
established. [Report](bingo-isolation/PILOT.md) retains the full scope boundary.

## F16: On Aspire main, the shipped skills and MCP make diagnosis slower and costlier than the raw app

**Evidence:** The [telemetry suite](telemetry/README.md) runs two runtime faults
(`slow-sql`, `read-only`) against the raw app and the aspirified app on the daily build
`17.1.0-preview.1.26559.1+4954c76a`, with live traffic, outcome-only prompts and an
HTTP/SQL verifier. [Results](telemetry/RESULTS.md) pool 348 graded trials over five
rounds (6 infrastructure failures recorded separately). With the eight shipped
skills and the MCP server, the aspirified app took +28% to +141% agent time and +125%
to +242% input tokens against the raw app on luna and terra (p ≤ 0.004 in all four
cells, exact Mann-Whitney), and +15% / +3% time with +122% / +92% tokens on sol
(tokens and cost p ≤ 0.004, 6 vs 6). On luna, `read-only`, the root cause was removed
in 2 of 6 trials against 9 of 9 for raw.

**Mechanisms observed:** the duration filter that solves `slow-sql` sits three hops deep
(router, `aspire-monitoring`, its reference) and no shipped-skills trial used it (0 of
48); luna loaded no skill at all in 4 of 6 skills-only trials; guidance favors unbounded
output (`aspire otel traces --format Json` is 188 KB here).

**Improvement candidate:** [SKILLS-PROPOSAL.md](telemetry/SKILLS-PROPOSAL.md).

**Limits / status:** One application, two database-side faults, both of which also
leave a signal in the raw app's log file. This supersedes the n=1 13.6 observations for
these task types; it does not generalize to faults with no log signal.

## F17: A focused diagnosis skill removes the penalty; removing the router makes it reliable

**Evidence:** Same suite. `aspire-lean` (new 4.5 KB `aspire-diagnose`, router removed,
`aspire-monitoring` description narrowed, no MCP) against shipped skills + MCP:
−29% to −67% agent time and −55% to −83% input tokens, p ≤ 0.004 in all four luna and
terra cells; on sol −18% / −11% time and −47% / −35% tokens (`slow-sql` p ≤ 0.004,
`read-only` not significant, 6 vs 6). `aspire-diagnose` was loaded in 45 of 45 graded
`aspire-lean` trials on three models (138 of 138 across every `lean`-based arm), and
every one of its 21 `slow-sql` trials ran the duration filter that 0 of 30
shipped-skills trials used. Adding the skill next to the router (`aspire-plus`) was
selected in only 4 of 6 luna trials and took 167 s against 93 s on `read-only`.

**Against the raw app:** a win on luna `slow-sql` (−34% time, −48% tokens, −39% cost;
p = 0.04 / 0.01 / 0.01, 9 vs 12), a non-significant lead on luna `read-only` (−16% /
−25% / −20%; p = 0.08 to 0.19, 12 vs 9), 13% slower on terra `slow-sql` (p = 0.02), no
time difference on terra `read-only` or sol, and 17% to 25% more input tokens on sol.

**Improvement candidate:** Ship `aspire-diagnose`; remove or drastically shrink the
router; give each skill a symptom-based trigger that excludes its neighbours.

**Limits / status:** Measured, not upstreamed. The router's guardrail role was not
exercised. The dependency step of the skill names PostgreSQL and Redis only.

## F18: MCP telemetry tools fill an 8k-token budget on every call

**Evidence:** `SharedAIHelpers.MaximumListTokenLength = 8192`. On the live incident
`list_traces`, `list_structured_logs` and `list_console_logs` each return 30 to 35 KB,
with or without a `search` filter; `list_resources` returns 10 KB for 8 resources.
[Captured sizes](telemetry/evidence/agent-surface/mcp-sizes.txt). MCP-only agents read
about 300 KB of MCP output per trial, and the two arms with the shipped MCP server are
the only ones that failed `read-only` on luna: they patched the application instead of
the database.

**Implemented locally:** [0001-mcp-compact-telemetry.patch](telemetry/upstream/0001-mcp-compact-telemetry.patch)
on `sebros/agentic-telemetry-output` (base `4954c76a`): `list_traces` returns one
summary per trace (slowest child span with its statement, first failed span) and takes
`limit` and `traceId`; `list_structured_logs` takes `limit` and `severity`. 25 unit
tests pass, 5 of them new. `list_traces {}` drops from 31,797 to 8,988 characters and a
filtered call to 2,854.

**Measured:** against an unpatched source-built control, agent time fell in all eight
cells (−6% to −36%); input tokens fell 8% to 62% when MCP was the agent's main route.
With both product patches and the lean skills (`aspire-lean-mcp-all`) against the
same arm on the shipped tool shape: −12% to −32% time in all four luna and terra
cells, and the agent made MCP its main route (median 5 to 10 MCP calls and one CLI
call per trial, against 2 to 3 MCP calls and 4 to 7 CLI calls before). That arm is at
or below the raw app on time in five of six model × scenario cells. Three trials per
arm: a consistent direction, not a proven effect size.

**Limits / status:** Not upstreamed. The default output shape of `list_traces` changes.
`list_resources` and `list_console_logs` are untouched and still large.

## F19: Table borders and dashboard links dominate what an agent reads from the CLI

**Evidence:** In `aspire-lean` trials, 57 KB of the 75 KB read from the Aspire CLI came
from `aspire describe` and the trace list. Each row carries box-drawing borders and a
dashboard URL; as a tool result every border character is a multi-byte escape.

**Implemented locally:** [0002-cli-plain-output.patch](telemetry/upstream/0002-cli-plain-output.patch)
on `sebros/agentic-plain-output` (13 lines): no table border and no dashboard link when
output is redirected. `aspire describe` 4,244 → 1,086 bytes; slow-trace list
6,863 → 1,561 bytes. Endpoint URLs are kept.

**Measured:** `aspire-lean-plain` against the unpatched source-built control, 3 trials
per arm, six model × scenario cells: characters returned to the agent by all tools
−21% to −59%; agent time −12% to +1% (at or below the control in five cells); input
tokens −23% to +2% (lower in five cells); no cell significant. The lean skill already
bounds every CLI call, so the borders and links are a small share of a trial's input,
most of which is the conversation prefix re-sent on each model call.

**Limits / status:** A context saving, not a measurable speed-up on its own; worth
upstreaming for the bytes. The trace detail table still omits the SQL text, so the
skill has to send agents to JSON for one trace. See
[RESULTS.md](telemetry/RESULTS.md#cli-plain-output-when-redirected).

## F20: Phase timing separates diagnosis from repair-style variance

**Evidence:** Two trials of the same arm can differ by 50 s because one model run also
writes an EF migration for its index. The collector now records seconds until the root
cause first appears in a tool result and until the first repair command. On luna
`slow-sql`: raw 25 s, `aspire-lean` 28 s, shipped skills + MCP 105 s to see the cause.

**Improvement candidate:** Report these phases for every diagnosis scenario and judge
skills and tools on time-to-cause, not only total time.

**Limits / status:** The markers are scenario-specific regular expressions over tool
arguments and results.

## F21: Cold start is slower with Aspire whatever the skills; removing the router needs an owner for each former job

**Evidence:** `cold-start` scenario, 5 arms × 3 models × 3 trials, all 45 passed
([RESULTS.md](telemetry/RESULTS.md#cold-start)). Every Aspire arm is 19% to 63% slower
than the raw app (raw 33 to 41 s; Aspire 49 to 56 s, except one cell) because the
agent runs `aspire start`, `aspire wait` for each endpoint and `aspire describe` for
the URLs where the raw agent runs one start script and `curl`; the CLI with no skills
is as fast as any skill set. In the `lean` set, which had removed the router without
adding a start skill, luna selected `aspire-orchestration` 3 of 3 and read its 29 KB of
references plus a `git status` / `git worktree list` / `aspire ps` detection sequence
before starting: 82 s and 249k tokens, twice the raw app. With `aspire-start`
(selected 9 of 9) luna is back at 51 s and 116k tokens, level with the shipped skills
(52 s) and the bare CLI (49 s); terra and sol are unchanged by it.

**Improvement candidate:** Ship `aspire-start` alongside the router's removal (a
skill-design rule: every job a router fronted needs an owner skill). For the product,
a start command that blocks until resources are ready and prints their endpoints
would remove the `wait` and `describe` steps that every Aspire trial ran.

**Limits / status:** 3 trials per cell (smallest attainable p = 0.10); one
application; measured, not upstreamed.

## F22: Aspire main's Redis container serves TLS on 6379, so the documented `redis-cli` recipe fails inside it

**Evidence:** On `17.1.0-preview.1.26559.1`, `AddRedis` starts the container with
`--tls-port 6379 --port 6380 --requirepass $REDIS_PASSWORD` and a generated
certificate. `docker exec <redis> redis-cli PING` therefore gets `I/O error` /
`Connection reset by peer`, and the container log shows `SSL routines::wrong version
number`. The shipped `aspire-terminals` reference lists `redis-cli` as the tool for a
Redis resource terminal with no port or TLS note, and the first version of this suite's
`aspire-diagnose` skill carried the same bare command. Found while building the
`slow-redis` scenario; the harness and the exporter now probe for the plain port.

**Improvement candidate:** Either publish the plain port as the primary one for local
tooling, or make every Aspire-authored `redis-cli` instruction (skills, docs, MCP tool
descriptions, dashboard terminal hints) say `-p 6380` or `--tls --insecure`. An agent
that hits the reset error with no hint spends a diagnosis cycle on the tool instead of
the incident.

**Limits / status:** Observed on the pinned daily only; not checked on the 13.x line.
`aspire-diagnose` updated with the `-p 6380` note before round 6. Not reported upstream.

## Recording future findings

Give each finding a stable ID and include evidence links, exact observed
behavior or metrics, an actionable improvement candidate, limits, and status.
Keep negative/null results and contradictory evidence. Identify infrastructure
replacements, distinguish capability availability from actual use, and do not
pool experiments with different prompts or guidance. When an improvement is
implemented or reported upstream, link it and retain the original evidence.
