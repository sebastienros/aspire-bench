# Bingo bounded feature and schema evolution

**Blocked, not model-ready.** F01 raw passed its initial Docker oracle and all
seven negative cases. F01 Aspire exposed a setup-grader image-name defect,
with a candidate fix applied locally but not rerun successfully. Shared-host disk exhaustion and an
unresponsive Docker daemon then interrupted validation. Neither matched pair
has cleared the two-arm gate; M01 has no completed positive Docker grade.

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
harbor run --path msbench/bingo-evolution/tasks/f01-raw-scripted --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name evolution-f01-raw-validation --n-concurrent 1
harbor run --path msbench/bingo-evolution/tasks/f01-aspire --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name evolution-f01-aspire-validation --n-concurrent 1
harbor run --path msbench/bingo-evolution/tasks/m01-raw-scripted --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name evolution-m01-raw-validation --n-concurrent 1
harbor run --path msbench/bingo-evolution/tasks/m01-aspire --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name evolution-m01-aspire-validation --n-concurrent 1
```

Default Docker contexts fetch the pinned origin repository, never a fork.
For local validation without refetching, set `MSBENCH_RAW_APP_CONTEXT` or
`MSBENCH_ASPIRE_APP_CONTEXT` to the corresponding absolute
`msbench/bingo/common/{raw,aspire}-app` directory after verifying it matches the
pinned commit. The runtime/scenario/skills/verifier remain unchanged.

### Local outcomes, 2026-11-04

| Attempt | Result | Evidence |
|---|---|---|
| `evolution-f01-raw-v1` | Reward 1, no exception; report/no-op, hardcoded catalog and five integrity/data-loss negatives rejected | [Native trial](evidence/f01-raw-v1-result.json), [oracle output](evidence/f01-raw-v1-oracle.txt), [verifier](evidence/f01-raw-v1-verifier.txt) |
| `evolution-f01-aspire-v1` | Pre-agent setup failed: `Owned Redis required`; helper could not recognize the Redis image | Observed `docker logs --tail 100 d77b3ee29d2f`; [ledger](evidence/validation.json); `.runs/msbench-oracle/evolution-f01-aspire-v1/` |
| `evolution-f01-aspire-v2` | Did not reach Harbor launch: the preceding task-owned container cleanup blocked on the Docker API | No task/model attempt; exact shell stopped |
| `evolution-m01-raw-v1` | Setup passed and oracle started; cancelled without a completed grade during shared-host failure | `.runs/msbench-oracle/evolution-m01-raw-v1/{job.log,result.json}` |
| `evolution-m01-aspire-v2` | Harbor launch failed before a trial: Docker daemon unavailable | [Launch output](evidence/m01-aspire-v2-launch.txt) |
| Focused plus historical structural/negative tests | 11 passed; shell syntax and whitespace checks passed | `node --test msbench/benchmark.test.mjs msbench/bingo-iteration/experiment.test.mjs msbench/bingo-evolution/experiment.test.mjs` |

F01 raw's initial whole job was 93.7 s; its reference-oracle execution was
13.7 s and final verifier 1.6 s. These are **not agent/model performance
measurements**. Existing MessagePack NU1902 warnings were observed, not changed.
Both local source contexts were independently checked against the pinned
commit: 97 raw and 101 Aspire files matched, and Git reported no context diff.

The candidate qualified-image fix now matches the final path component
(`redis:8.6` or `postgres:18.3`) rather than assuming no registry prefix.
Qualification is the working diagnosis; the original `Config.Image` string was
not retained before the Docker API failure. The final common
grader, narrowed artifact list, and raw reload failure-recovery guard have
**not** been rerun in Docker; do not
treat the initial raw pass as proof of the complete final revision.
No positive M01 compilation/runtime result or supported Aspire reload behavior
is inferred from static tests.

The coordinator reported host disk falling to approximately 1.2 GiB with
containerd metadata I/O/read-only failures and an unresponsive Docker API.
This child independently observed the hung Docker calls, the daemon-unavailable
launch error, and `/System/Volumes/Data` at 100% (2.8 GiB available at inspection).
Only this child's running shell/process trees were stopped. No daemon restart,
prune, shared cleanup, or further Docker/model work was attempted.
Source files total about 300 KiB; the initial broad artifact collection retained
123 MiB locally, so final task artifacts select source paths rather than `src/`
including build products and node_modules.

[validation.json](evidence/validation.json) records the failed/interrupted
attempts separately from successful evidence and hashes the native raw outputs.
Large logs remain under ignored `.runs/msbench-oracle/`. An MSBench dataset is
deliberately withheld until both pairs pass the exact final local Docker
oracles; publication/submission belongs to the parent, not this child.
Any future model pilot requires fresh condition fingerprints, one original
attempt per arm and no automatic repeats. No model attempts were made.
