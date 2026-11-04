# Bingo runtime diagnosis: D01 / H01, resource-scoped S01

**Status: implemented, runtime validation blocked. Do not submit model runs.**
Neither Docker oracle passed. The current fixtures, real incident injection,
runtime negative cases and final functional grader remain unverified end to end.
No inference, replication, push or PR was performed. Historical tasks and
`AGENTIC-RESEARCH.md` are unchanged.

This is a new static Harbor scenario, not Vally conversion and not I01's
explicit-file frontend edit. Its matched prompts name a user-visible symptom:
the player and admin login pages load, but calling a square fails. They disclose
neither the faulty resource nor the repair, and prescribe no Aspire commands.
The application is intended to be running before the agent; source changes are
prohibited because the defect is runtime state, not routing.

## Intended fixture and independent proof

Both arms reuse the original Bingo application and startup paths. The raw arm
retains useful start/check/launcher scripts, real process logs and Compose
metadata. The Aspire arm retains CLI/Hosting 13.6.0 and the seven unchanged
original general skills in both native and declared skill locations. MCP is
disabled. The old application-specific startup skill is deliberately not copied:
it hardcodes historical resource names and writes timing artifacts irrelevant to
this already-running, held-out topology. No runtime source/fixture conversion
occurs; task overlays and additional build contexts are static.

| Property | Matched contract |
|---|---|
| Application | Original Bingo admin, Vue player, PostgreSQL and Redis |
| Toolchains | .NET SDK 10.0.100 noble; Node 24.14.0; Docker 28.0.4; Aspire 13.6.0 |
| Budget | Agent 900 s, verifier 300 s; setup separate |
| Instance | Fixed hold-out seed 47, namespace `amber47` |
| Logical names | Redis `spindle`, PostgreSQL `folio`, Aspire admin `usher`, player `parquet`, migrations `binder`; connection keys stay `cache`/`db` |
| Fault | `docker pause` on the owned, connection-verified Redis container |
| Decoy | Separate real Redis `amber74-spindle`, different project label, no published port, Redis maxmemory 16 MB |
| Agent surface | `/app`, normal runtime tools/logs; `benchmark-endpoints.json` and `DIAGNOSTICS.md` |
| External grader | `/opt/benchmark`, not an agent-written assessment |

Seed 47 is a deterministic held-out naming/topology instance, not randomized
sampling or proof of transfer. S01 is **resource-scoped**, not a second complete
app/worktree. The decoy reuses the already-required Redis image and has no
additional .NET/Node build. Its ownership is distinct from the actual backend's
connection endpoint; no large second application is needed.

Setup must first exercise real HTTP/API/SignalR-negotiation and database/Redis
behavior, identify actual backend/frontend processes, and match the backend's
live connection environment to exact published dependency ports. It then imports
a random persistent square, records all pre-fault square rows, calls the square,
and creates independent random cache/neighbor sentinels. Only then is the owned
dependency paused.

Readiness deliberately means **the incident has been reproduced**, not that
the application is healthy: setup requires the actual call to return HTTP 500
with the application's failure message while the player, login and proxied
version still return 200. A ready file is written only after this real probe
and invariant capture. No fake exception/log fixtures or prewritten success
reports are used. H01 tests the distinction between page/process availability
and functional readiness; it does not assert every Aspire resource stays green.

The grader is designed to require:

- Fresh nonce import confirmed directly in the owned PostgreSQL database;
  call/clear confirmed both by status API and the exact Redis hash values.
- A separate fresh Redis SET/GET/DEL roundtrip, original square rows and call
  state, random Redis data and neighboring workload data preserved.
- Existing login/player/version/SignalR negotiation and 400/404 error behavior.
- Unchanged source/config/guidance/endpoints, actual backend/frontend PID/start
  identity/environment, container IDs/images/mounts/ports/ownership/start times.
- Exactly one owned unpause, no other lifecycle action across the private daemon.
  Docker events reject a transient wrong-target pause/unpause even when final
  state is restored, in addition to final-state checks.

Oracle-only negative code is outside the agent image. It is designed to reject
no-op/page-only success, source/guidance shortcuts, substituted endpoints, lost
cache/call/database state, neighboring data modification, wrong-target runtime
actions, and wrong-target actions hidden by restoring final state. Unit tests
also reject replacement, restart and broad-reset snapshots/events.

After deliberate negative mutations are restored, the reference harness re-arms
the same pause fault and advances **only** the protected event observation window.
It does not rebase process/container identities, source/endpoint hashes or data
preservation inputs. The subsequent repair is one exact-ID unpause. This is a
grader-development procedure, not model behavior, a model retry, or a proposed
agent workaround.

## Actual local Docker evidence, 2026-11-04

| Attempt | Actual observation | Result / retained evidence |
|---|---|---|
| `diagnostics-raw-v1` | Image built; raw startup and healthy HTTP/DB/Redis checks reached decoy creation. Nested Docker rejected the decoy's original cgroup memory limit. | Setup failed before fault injection or agent execution; `.runs/msbench-oracle/diagnostics-raw-v1/` |
| `diagnostics-aspire-v1` | Image built; Aspire start returned live AppHost/CLI PIDs and startup waited for `usher`. No completed readiness/fault/oracle evidence was obtained before Docker API became unavailable. | Stopped owned runner; `.runs/msbench-oracle/diagnostics-aspire-v1/` |
| `diagnostics-raw-v2` | Launched after replacing decoy `--memory 64m` with Redis `--maxmemory 16mb`; Harbor healthcheck later failed with `Command timed out after 30 seconds`. | Shared host infrastructure failure; no verified symptom/repair; `.runs/msbench-oracle/diagnostics-raw-v2/` |
| Bounded Docker probes | Both `docker version` and `docker ps` exceeded 15 s. | No shared restart/prune or further Docker launches attempted |
| Host disk probe | `df -h .`: 926 GiB size, 901 GiB used, 2.8 GiB available, **100%** reported capacity | Coordinator also reported containerd metadata I/O/read-only failures and halted Docker work |
| Static/negative policy checks | All 32 current benchmark tests pass, including six scenario tests; JavaScript/Bash syntax checks pass | Runtime negative tests were **not** executed successfully |

The concrete raw-v1 error was:

```text
unable to apply cgroup configuration: cannot enter cgroupv2
"/sys/fs/cgroup/docker" with domain controllers -- it is in threaded mode
```

The memory-cap change is a compatibility correction, not a validated runtime
fix. There is **no evidence** that nested `docker pause`, the seeded incident
probe, final functional recovery, or both live negative suites work on this host.
An initial suspicion about the freezer is not a root-cause finding; the observed
host storage failure independently blocks further validation. Do not promote
the implementation into a fixture-usable or pilot-usable result.

[validation.json](validation.json) records exact attempt/container identifiers,
the blocker and command provenance. Logs remain in ignored `.runs/`; no credentials
or dashboard login tokens are committed.

## Source and workspace provenance

- Repository/origin: `sebastienros/aspire-bench`,
  `https://github.com/sebastienros/aspire-bench.git`, no fork.
- Local branch: `sebros/bingo-runtime-diagnosis`.
- Worktree:
  `/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-super-funicular`.
- Local baseline: `80365e5` (full SHA in `validation.json`).
- Original application snapshot: benchmark commit
  `baacba3e17181491c9a4d419db7d0e6763c3d363`; original workshop source
  `sebastienros/aspireify-workshop@c902c52de9a11a7139602ec11264ec3e71a92c38`.
- Seven original general skills:
  `1fcca7e91c89716f0e4a8bf7324da13a39f70c66`.
- Lifecycle/hash/HTTP/process/TLS helpers copied from existing I01/original
  tasks; new overlays rename orchestration resources without changing application
  functionality or introducing a producer proxy repair.

Image tags, package versions and the original install-script workflow are pinned
as in I01; image digests, installer bytes and transitive NuGet restore are not
newly locked here. Native local evidence is Linux ARM64 via Docker on macOS, not
AMD64/cloud compatibility proof. No source-built Aspire binary is substituted.

## Resume gate after shared infrastructure is healthy

Do not submit a model run until **both** commands produce reward 1 and actual
incident/negative evidence files can be inspected:

```bash
node --test msbench/bingo-diagnostics/experiment.test.mjs
harbor run --path msbench/bingo-diagnostics/tasks/raw-scripted --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name diagnostics-raw-fixed --n-concurrent 1
harbor run --path msbench/bingo-diagnostics/tasks/aspire --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name diagnostics-aspire-fixed --n-concurrent 1
```

Use distinct validation names after a real fixture fix, not repeated model
trials. Inspect `/logs/environment/incident-evidence.json`,
`negative-evidence.json`, verifier output and reward, then record their actual
contents/checksums. If nested pause is unsupported, treat that as a new evidenced
fixture portability blocker before selecting a different real fault.

Isolation is regression-oriented, not hardened: container root can inspect or
tamper with protected grader files, and Docker event history is finite. Static
test success is not a substitute for the missing Docker gate. No dataset or
model-submission ledger is supplied while that gate remains blocked.
