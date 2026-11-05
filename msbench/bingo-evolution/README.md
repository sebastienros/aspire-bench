# Bingo bounded feature and schema evolution

**Both local runtime pairs verified. Remote packaging remains pending.**
All four exact final tasks passed sequential force-built Docker oracles with
reward 1, no exceptions and seven rejected negative cases each. Earlier setup,
reference-solution and shared-host failures remain recorded below. No model
comparison or CES-ready publication is claimed.

The parent portable-graph correction now pins `evolution-common` to public
`2842205e02055cfe4b47e06bf2f5bbfa28f5dca8`, the exact recovered runtime source,
rather than a repository-sibling filesystem context. Runtime input hashes
remain unchanged. This avoids the newly observed remote Bake entitlement
failure without broad filesystem grants; a representative remote oracle still
must establish packaging/execution before first model submissions.

Independent static Harbor task pairs for roadmap **F01** and **M01** in the
[research protocol](../AGENTIC-RESEARCH.md). Historical Bingo/I01 fixtures are
unchanged. No model evaluation, cloud submission, push, or PR is part of this
work. Local reference oracles are fixture/grader validation, not pass@1 or
evidence that Aspire improves agent performance.

| Scenario | Shared user outcome | Independent functional proof |
|---|---|---|
| F01 | Player/admin live active-square catalog, exact type filter, database label/type and Redis called-state | Fresh imported IDs/labels/types, hidden inactive/null-type rows, sort/filter/unknown filter, call/clear and immediate label refresh; direct SQL and Redis observations |
| M01 | Add persisted 280-character square descriptions using an additive EF migration over old records | Real column/default/nullability/length and applied history; old row/user identity and complete original contents; legacy inactive and newly inserted records; GET/PUT, exact text/boundaries/errors, direct SQL writes read through HTTP |

Both pairs are **warm-running**: private Docker setup launches the original
application and seeds hidden random PostgreSQL/Redis state before agent time.
Agents may change application source anywhere in `/app`, add files, and
rebuild/restart app processes. This is not a cold-edit/startup comparison.
The existing dependency containers must stay running and their identities,
start times and restart counts must remain unchanged.

The F01 feature is a bounded read API, not a new UI design or another proxy-only
task: its implementation must join real database definitions and Redis state,
then expose it through the player origin. M01 evolves the existing square
entity/migration pipeline; it does not invent a separate service or framework.

## Matching, guidance and pins

`tasks/{f01,m01}-{raw-scripted,aspire}` are four real static task directories,
not transformed Vally fixtures. Within a scenario the user prompts, source
oracle and verifier entrypoint are byte-identical across arms. Only application
orchestration/guidance and the oracle's reload adapter differ.

Both use .NET SDK image `10.0.100-noble`, Node `24.14.0-bookworm-slim`, Docker
`28.0.4-dind`, PostgreSQL `18.3`, Redis `8.6`, original application package pins,
and Aspire CLI `13.6.0`. Original application contexts are immutable commit
`baacba3e17181491c9a4d419db7d0e6763c3d363`. No custom-source CLI is substituted.
Raw also retains the historical CLI installation in the common tool image,
but has no AppHost or exposed Aspire skills.

The raw README retains useful launch/check scripts and adds a supported targeted
backend reload/migration workflow; the supervisor tracks the replacement PID
without restarting dependencies. Aspire retains its AppHost, allocated origins,
normal resource operations, and eight exposed skills (seven general skills at
`1fcca7e91c89716f0e4a8bf7324da13a39f70c66` plus the original startup overlay).
`skills_dir = "/opt/aspire-skills"` is explicit. MCP is disabled. User prompts
name outcomes, not Aspire commands or a preferred solution. Neither availability
nor oracle CLI use is evidence of model skill/tool use.

Equal budgets: **900 s agent**, **300 s verifier**, 1,200 s image build;
4 CPUs/8 GiB. Readiness is an explicit pre-agent gate. Setup durations are
not credited as agent development time.

## Protected grader and negative cases

The common grader is copied into `/opt/benchmark`, not `/app`. Setup records
all original square columns (including inactive rows), complete user records,
applied migration history, database/table OIDs, dependency identity, endpoint
file digest, called-state and a separate random Redis sentinel.
It checks them before and after fresh functional probes.

Only guidance/scripts/skills, exact package/SDK manifests, original applied
migrations, endpoint metadata, and outside-workspace grader inputs are
protected. There is no single-file source allowlist. New migrations and the
snapshot are editable. Grading ignores success reports.

Every oracle first proves the unchanged app plus a success JSON report fails.
It then builds a plausible hardcoded implementation and proves the real grader
rejects it: F01 returns an empty catalog; M01 applies the real migration but
discards description writes. After installing the correct implementation it
also rejects guidance changes, valid-but-swapped endpoints, changed legacy
inactive contents, a copied/rebuilt table with identical rows, and lost unrelated
Redis state, restoring each mutation before the final positive run.

M01 checks new SQL inserts omitting Description, exact whitespace/quotes/newlines,
empty/280/281-character bounds, missing/null inputs, unknown IDs, no mutation on
invalid writes, SQL-origin updates, and old inactive records. F01 checks unknown
filters and old producer 400/404 contracts. Both preserve login, version proxy,
SignalR negotiation, and original import/status/call/clear behavior.

The container agent has root: these are hidden test and integrity regression
controls, not a hardened adversarial sandbox. No browser-rendered UI, SignalR
message delivery, rollback compatibility, concurrency, or production deployment
claim is made.

## Reproduction and evidence

```bash
node --test msbench/bingo-evolution/experiment.test.mjs
EVIDENCE_ROOT=/absolute/path/to/durable/session/files/bingo-evolution
mkdir -p "$EVIDENCE_ROOT/jobs"
harbor run --path msbench/bingo-evolution/tasks/f01-raw-scripted --agent oracle \
  --force-build --jobs-dir "$EVIDENCE_ROOT/jobs" --job-name final-f01-raw-scripted --n-concurrent 1
harbor run --path msbench/bingo-evolution/tasks/f01-aspire --agent oracle \
  --force-build --jobs-dir "$EVIDENCE_ROOT/jobs" --job-name final-f01-aspire --n-concurrent 1
harbor run --path msbench/bingo-evolution/tasks/m01-raw-scripted --agent oracle \
  --force-build --jobs-dir "$EVIDENCE_ROOT/jobs" --job-name final-m01-raw-scripted --n-concurrent 1
harbor run --path msbench/bingo-evolution/tasks/m01-aspire --agent oracle \
  --force-build --jobs-dir "$EVIDENCE_ROOT/jobs" --job-name final-m01-aspire --n-concurrent 1
```

Default Docker contexts fetch the pinned origin repository, never a fork.
For local validation without refetching, set `MSBENCH_RAW_APP_CONTEXT` or
`MSBENCH_ASPIRE_APP_CONTEXT` to the corresponding absolute
`msbench/bingo/common/{raw,aspire}-app` directory after verifying it matches the
pinned commit. The runtime/scenario/skills/verifier remain unchanged.

### Local outcomes, 2026-11-04

Final results after Docker recovery and actual fixture/reference fixes:

| Exact final task | Reward / exception | Trial / oracle / verifier seconds | Native evidence |
|---|---|---|---|
| `f01-raw-scripted` | 1 / none | 57.3 / 11.9 / 1.7 | [Result](evidence/final-f01-raw-scripted-result.json), [oracle](evidence/final-f01-raw-scripted-oracle.txt), [verifier](evidence/final-f01-raw-scripted-verifier.txt) |
| `f01-aspire` | 1 / none | 67.3 / 16.9 / 1.9 | [Result](evidence/final-f01-aspire-result.json), [oracle](evidence/final-f01-aspire-oracle.txt), [verifier](evidence/final-f01-aspire-verifier.txt) |
| `m01-raw-scripted` | 1 / none | 58.7 / 12.5 / 2.2 | [Result](evidence/final-m01-raw-scripted-result.json), [oracle](evidence/final-m01-raw-scripted-oracle.txt), [verifier](evidence/final-m01-raw-scripted-verifier.txt) |
| `m01-aspire` | 1 / none | 57.7 / 16.6 / 2.3 | [Result](evidence/final-m01-aspire-result.json), [oracle](evidence/final-m01-aspire-oracle.txt), [verifier](evidence/final-m01-aspire-verifier.txt) |

These are **reference-oracle/fixture timings**, not model or agent-efficiency
comparisons. All four final outputs reject the unchanged/report-only app,
hardcoded behavior, guidance mutation, valid swapped origins, legacy inactive
row corruption, same-row table recreation, and unrelated Redis loss.
Each preserves all 43 original square records, the complete original user,
database/table OIDs, prior history and called-state. Both M01 outputs show
the real non-null `varchar(280)` empty-default column, all 43 legacy descriptions
backfilled empty, an additional applied migration, fresh omitted-column SQL
inserts, exact text and boundaries, SQL-origin updates, and 400/404 contracts.
F01 records fresh IDs/filter/label refresh and direct Redis `False` after clear.

[recovered-local-validation.json](evidence/recovered-local-validation.json)
records exact commands, native hashes, final runtime-input hashes, intermediate
failures and parsed SQL/Redis/schema/OID/nonce proof. The final four jobs were
sequential with `--force-build`, no automatic retries, and checked >10 GiB
headroom before each; observed minimum was approximately 36 GiB.
All 13 relevant structural/negative/evidence tests passed, along with shell
syntax and whitespace checks. Frozen common/runtime input hashes are checked
against the recorded final sources, not just native reward values.
Native text logs are byte-exact (including CLI trailing spaces); whitespace
lint is disabled only for `evidence/*.txt` to preserve their recorded hashes.
Full recovery jobs/logs are durable, not under a worktree's ignored `.runs`:

```text
/Users/sebastienros/.copilot/session-state/ab478c48-b1ee-44e3-8192-f23af9975dd4/files/bingo-evolution/
  jobs/final-{f01-raw-scripted,f01-aspire,m01-raw-scripted,m01-aspire}/
```

### Failures and corrections, retained rather than retried away

Initial blocked evidence at commit `276b240f`:

| Attempt | Result | Evidence |
|---|---|---|
| `evolution-f01-raw-v1` | Reward 1, no exception; report/no-op, hardcoded catalog and five integrity/data-loss negatives rejected | [Native trial](evidence/f01-raw-v1-result.json), [oracle output](evidence/f01-raw-v1-oracle.txt), [verifier](evidence/f01-raw-v1-verifier.txt) |
| `evolution-f01-aspire-v1` | Pre-agent setup failed: `Owned Redis required`; helper could not recognize the Redis image | Observed `docker logs --tail 100 d77b3ee29d2f`; [ledger](evidence/validation.json); `.runs/msbench-oracle/evolution-f01-aspire-v1/` |
| `evolution-f01-aspire-v2` | Did not reach Harbor launch: the preceding task-owned container cleanup blocked on the Docker API | No task/model attempt; exact shell stopped |
| `evolution-m01-raw-v1` | Setup passed and oracle started; cancelled without a completed grade during shared-host failure | `.runs/msbench-oracle/evolution-m01-raw-v1/{job.log,result.json}` |
| `evolution-m01-aspire-v2` | Harbor launch failed before a trial: Docker daemon unavailable | [Launch output](evidence/m01-aspire-v2-launch.txt) |
| Focused plus historical structural/negative tests | 11 passed; shell syntax and whitespace checks passed | `node --test msbench/benchmark.test.mjs msbench/bingo-iteration/experiment.test.mjs msbench/bingo-evolution/experiment.test.mjs` |

F01 raw's initial trial was 93.7 s; its reference-oracle execution was
13.7 s and verifier 1.6 s. Existing MessagePack NU1902 warnings were
observed, not changed.
Both local source contexts were independently checked against the pinned
commit: 97 raw and 101 Aspire files matched, and Git reported no context diff.

Recovery exposed concrete issues that were corrected before the final four runs:

| Recovery attempt | Observed failure / correction |
|---|---|
| `recovered-f01-aspire-v1` | A healthy-state wait on the completed migration worker failed; one-shot completion is not resource health |
| `recovered-f01-aspire-v2`, `recovered-f01-aspire-diagnostic`, `recovered-f01-aspire-logs` | Rebuild acknowledged success but stopped/completed projects did not start. Console logs confirmed no replacement process. Explicit `resource start` after rebuild restored the admin and reran migrations without touching dependencies |
| `recovered-m01-raw-v1` | Valid unknown-ID PUT returned 405, not 404: empty `NotFound()` triggered global status-code reexecution against a GET-only page. The reference now uses the original producer API's nonempty 404 response pattern |

Those five failed trials all recorded reward 0, with native results/oracle/
verifier output preserved in `evidence/recovered-*-{result.json,oracle.txt,verifier.txt}`.
Passing intermediate revisions are separately recorded, not presented as final
source evidence. A pre-launch log-directory race was fixed before Harbor ran;
it was not a task/model attempt.

The final helper selects exact owned roles/names/Compose labels rather than
image strings. Actual final `Config.Image` values are captured in verifier
proof: raw `redis:8.6`/`postgres:18.3`, Aspire
`docker.io/library/redis:8.6`/`docker.io/library/postgres:18.3`.
Read-only prior art from parent D01 supplied database `db` versus raw `bingo`,
container-owned `PGPASSWORD`, Redis `REDISCLI_AUTH`, and TLS/CA flags.
Security was not disabled, and app-facing Aspire origins still come from its
allocated CLI proxy endpoints, not guessed container-published ports.

The coordinator reported host disk falling to approximately 1.2 GiB with
containerd metadata I/O/read-only failures and an unresponsive Docker API.
This child independently observed the hung Docker calls, the daemon-unavailable
launch error, and `/System/Volumes/Data` at 100% (2.8 GiB available at inspection).
Only this child's running shell/process trees were stopped. No daemon restart,
prune or shared cleanup was attempted. Recovery resumed only after the
coordinator granted the single local validation slot, which was returned after
the final four passes.
Source files total about 300 KiB; the initial broad artifact collection retained
123 MiB locally, so final task artifacts select source paths rather than `src/`
including build products and node_modules.

[validation.json](evidence/validation.json) preserves the original failed/
interrupted ledger and hashes the initial raw outputs; its blocked status is
historical, superseded by the recovery ledger. The original ignored run trees
subsequently vanished externally for an unknown reason. Committed compact
evidence survived; all recovery evidence uses durable session files.

### Portable build graph gate remains separate

The local runtime gate passes, but `evolution-common: ../../../common` is
outside each task's environment build directory. The coordinator observed
CES/Docker Bake rejecting the corresponding D01 sibling graph before any agent
ran because it required filesystem read entitlement. Local Docker success
does **not** prove this graph portable. No broad permission bypass was applied.

After integration/publication, the parent must pin all four `evolution-common`
contexts to the exact public origin source:

```text
https://github.com/sebastienros/aspire-bench.git#<published-source-SHA>:msbench/bingo-evolution/common
```

Then independently prove the portable build-on-demand graph and retain its
provenance. The runtime ledger freezes common/helpers/guidance/solutions; a
compose-context pin is a separately evidenced packaging delta, not a model
retry or a new agent result. An MSBench dataset remains withheld until this
gate; publication/submission belongs to the parent, not this child.
Any future model pilot requires fresh condition fingerprints, one original
attempt per arm and no automatic repeats. No model attempts were made.
