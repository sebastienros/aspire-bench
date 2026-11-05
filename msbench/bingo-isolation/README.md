# S01: two actual Bingo applications in sibling workspaces

**Status: static-ready draft; seven focused tests and both Harbor configuration
checks pass. No runtime validation or model result.** X01 remains the
priority runtime gate. Do not start Docker until the parent explicitly grants
the sole local slot after X01. This new directory is separate from unchanged
D01 and X01 conditions.

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

If both runtime oracles pass, this is two **actual application instances in
sibling workspace directories** under one private Harbor runner, not two
editor-owned app sessions, two host-managed git worktrees, two Docker daemons or
two physical hosts. Those ownership boundaries cannot be reproduced honestly by
calling a Redis-only decoy a second app; editor/process-host ownership needs a
separate host integration experiment. No external editor ownership is required
for this narrower full-app namespace/connection/resource-selection question.
Success is not independent-app/domain transfer or statistical generalization.

Raw startup reuses restored binaries/packages but still performs the existing
normal incremental build and `npm ci`; the shared npm/NuGet cache avoids a new
dependency download path. Aspire independently starts each AppHost, retaining
normal source-build and `npm ci` semantics. Setup must actually pass within the
declared resource budget; static feasibility is not a runtime result.

## Static validation and packaging

```bash
python3 msbench/bingo-isolation/package.py
node --test msbench/bingo-isolation/experiment.test.mjs
```

The deterministic USTAR archive is local to each task `environment` and contains
only these readable runtime sources plus the unchanged X01 ACL/native-adapter
modules. Tests enforce byte-for-byte source equivalence and exclude extra
members/solutions. All other build contexts are immutable public Git sources:
`d3694ec111609a79073dcba35bc1f1b1c9517d8f` for original Bingo, corrected diagnostics
adapters and useful raw workflow; `1fcca7e91c89716f0e4a8bf7324da13a39f70c66` for
the original seven skills. No outside-environment Bake fs.read grant is needed.
Changing X01 is not required: this draft imports and snapshots its read-only
adapters, never its fixed X01 setup/condition.

After the explicit grant, and **only after priority X01 has finished**, run the
new raw and Aspire oracle gates sequentially, with unique job names and logs
under this child's session files:

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
