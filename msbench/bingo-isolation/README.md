# S01: two actual Bingo applications in sibling workspaces

**Status: both direct-Docker oracle/verifier gates passed, after priority X01.
No native Harbor/cloud/model result is claimed.** The explicit parent sole-slot
grant preceded runtime work; all owned runners were removed and the slot
returned after the four X01/S01 gates. This new directory is separate from
historical D01 and the X01 fault/name condition.

The original S01 resource-scoped Redis decoy was not two-app proof. This pair
starts **two complete original Bingo applications** in `/app` and
`/neighbor-app`: each has its own actual .NET admin process, Vue/Vite process,
PostgreSQL container/database/volume, Redis container, backend connection
configuration and HTTP origins. The fixture requires four distinct app PIDs,
four distinct HTTP origins and four actual dependency containers. Both use the
same logical resource names (`spindle`, `folio`, `usher`, `parquet`, `binder`) to
make an unqualified resource-name repair ambiguous. Namespace ownership differs:
`willow29` is the requested target; `willow92` is the other real app.

| Property | Contract |
|---|---|
| Target | `/app`, namespace `willow29`; raw ports 54320/63790/18080/15173 |
| Other real app | `/neighbor-app`, namespace `willow92`; raw ports 54321/63791/18081/15174 |
| Aspire origins | Independently allocated by each file-based AppHost; no fixed-port substitution |
| Shared setup work | First app's compiled binaries, restored NuGet packages and `node_modules` copied to sibling; live `.aspire`, `.script-state`, endpoints and git metadata excluded |
| Fault | Persistent Redis ACL write-category denial only in the target |
| Pre-agent proof | Actual target call HTTP500 with PING/read available; other real app's fresh SQL/Redis/HTTP call/clear/status still works |
| Grade | Both real app flows plus original data, users/history, SQL identities, process identities/env, original credentials/TLS/ACL/config and all four containers preserved |
| Negative contracts | No-op; wrong-app repair; healthy wrong-app endpoint substitution; either app source/cache mutation; other app SQL/call-state mutation; restored-final-state wrong-app ACL actions |
| Treatment | Raw useful scripts/logs versus Aspire 13.6 plus original seven general skills, MCP off |
| Budget | Agent 900 s, verifier 300 s, setup separate |

Both apps are exercised with independent fresh nonces. Every HTTP import is
confirmed in its actual PostgreSQL and absent from the other application's
PostgreSQL; call/clear is confirmed in its exact Redis and absent from the other
Redis and status API. Both frontend/login/version/SignalR-negotiation and
400/404 paths are checked. The grader does not accept a report or resource-green
indicator. Original credentials are verified against actual backend environments
and ACL/password hashes, TLS is retained, and permission recovery must restore the
original complete ACL, not reset authentication.

The grade is outside both source directories, not a hardened root-adversarial
sandbox. Visible wrong-neighbor mutations are checked in Docker exec events;
shell-obfuscated protocol actions may not be visible. The oracle's deliberate
negative mutations are restored and its event window alone advances before
re-arming the same target fault. Preservation baselines are never rebased.
Hidden negative/oracle code is excluded from environment archives.

## What this does and does not establish

Both runtime oracles passed with two **actual application instances in
sibling workspace directories** under one private Docker runner, not two
editor-owned app sessions, two host-managed git worktrees, two Docker daemons or
two physical hosts. Those ownership boundaries cannot be reproduced honestly by
calling a Redis-only decoy a second app; editor/process-host ownership needs a
separate host integration experiment. No external editor ownership is required
for this narrower full-app namespace/connection/resource-selection question.
Success is not independent-app/domain transfer or statistical generalization.

Raw startup reuses restored binaries/packages but still performs the existing
normal incremental build and `npm ci`; the shared npm/NuGet cache avoids a new
dependency download path. Aspire independently starts each AppHost, retaining
normal source-build and `npm ci` semantics. Both setups and grades actually
passed under 4 CPU/8 GiB limits; this is not inferred from static feasibility.

## Static validation and packaging

```bash
python3 msbench/bingo-isolation/package.py
node --test msbench/bingo-isolation/experiment.test.mjs
```

The deterministic USTAR archive is local to each task `environment` and contains
only these readable runtime sources plus the shared X01 ACL/native-adapter
modules. Tests enforce byte-for-byte source equivalence and exclude extra
members/solutions. All other build contexts are immutable public Git sources:
`d3694ec111609a79073dcba35bc1f1b1c9517d8f` for original Bingo, corrected diagnostics
adapters and useful raw workflow; `1fcca7e91c89716f0e4a8bf7324da13a39f70c66` for
the original seven skills. No outside-environment Bake fs.read grant is needed.
This fixture imports and snapshots shared adapters, never X01's fixed
setup/condition. The observed Redis 8.6 redundant-positive-grant canonicalization
correction is included in both snapshots; denials, credentials, flags,
key/channel selectors and server configuration remain strict.

Native Harbor reproduction commands, for a separately repaired runner
and only while holding an explicitly granted sole slot:

```bash
harbor run --path msbench/bingo-isolation/tasks/raw-scripted --agent oracle \
  --jobs-dir /Users/sebastienros/.copilot/session-state/1526d9f0-55be-4ead-a2e3-c0ade15b900f/files/jobs \
  --job-name s01-two-app-raw-v1 --n-concurrent 1 --force-build
harbor run --path msbench/bingo-isolation/tasks/aspire --agent oracle \
  --jobs-dir /Users/sebastienros/.copilot/session-state/1526d9f0-55be-4ead-a2e3-c0ade15b900f/files/jobs \
  --job-name s01-two-app-aspire-v1 --n-concurrent 1 --force-build
```

Stop on a concrete prerequisite rather than label static code or a resource-only
proof as plan completion. No model submissions, repeat-condition runs, push,
PR or shared cleanup belong to this child. The parent records final Git task
pins/provenance and may admit at most one original model attempt per new arm
only after the actual paired local gate.

[validation.json](validation.json) records the current static/runtime distinction,
source provenance and exact scope boundaries.

## Actual local runtime gate, 2026-11-05

| Arm / job | Actual result |
|---|---|
| Raw `s01-raw-direct-v1` | Two real admin/player pairs, four HTTP origins and four dependencies; 12 negatives rejected; oracle and external verifier reward 1 |
| Aspire `s01-aspire-direct-v1` | Two independently allocated AppHosts, actual backend proxy/credential/TLS ownership; 12 negatives rejected; oracle and external verifier reward 1 |

After X01 exposed the native Harbor 0.20.0 no-image/no-container/no-output
wrapper anomaly, the parent-authorized direct runner built the exact portable
Git contexts, ran the normal entrypoint at 4 CPU/8 GiB, required actual two-app
readiness, ran the task solution under 900 s and the external verifier under
300 s, and checked the real reward file. No global Harbor edit/upgrade occurred.
[Runtime receipts](evidence/local-runtime.json) retain exact source/payload
checksums, image/container identities, all four real process identities/origins,
incident and negative evidence, verifier output and raw-log checksums/paths.
Runtime source and deterministic archive hashes are checked by the focused tests.

Reproduction uses the session-owned script recorded with SHA-256 in those
receipts:
`python3 /Users/sebastienros/.copilot/session-state/1526d9f0-55be-4ead-a2e3-c0ade15b900f/files/direct_oracle.py msbench/bingo-isolation/tasks/<arm> <unique-job-name>`.
No model runs, push, PR or shared cleanup occurred. The evidence supports the
bounded two-real-app resource-selection/preservation question, not editor/host
ownership, remote AMD64 equivalence or generalized superiority.
