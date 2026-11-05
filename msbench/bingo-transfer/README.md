# Bingo held-out fault/name transfer: X01 / reserved F14

**Status: static implementation checked; both Docker gates pending.**
Only this new directory is changed. Historical D01 tasks and their seven passing
local oracles remain untouched and are not rerun. No model run, PR or push is
performed by this child. The parent owns task pinning and at most one original
`gpt-6.1-terra` attempt per new arm after both local gates.

X01 reuses original Bingo, not eShop. There is no demonstrated Bingo limitation
that requires a second application for this bounded question. Both static Harbor
tasks receive the same neutral symptom prompt, no prescribed command/tool order,
and the same external behavioral/data/security grade. Raw retains its useful
launch/check/log workflow; Aspire retains CLI/Hosting 13.6.0 and the seven
unchanged original general skills, with MCP disabled.

| Property | New condition |
|---|---|
| Namespace / fixed name instance | `cedar83`, seed 83 |
| Logical names | Redis `quill`, PostgreSQL `ledger`, admin `steward`, frontend `mosaic`, migration `scribe` |
| Connection keys | Original `cache` and `db`, unchanged |
| Real unrelated neighbor | `cedar38-quill`, separate Compose ownership, no host port |
| Fault family | `ACL SETUSER default -@write` on the backend's exact Redis user/container |
| Contrast with D01 | Persistent command permission denial, not `CLIENT PAUSE WRITE`, Docker freezer, pause expiry, fake logs or name-only variation |
| Recovery | In-place permission restoration; reference oracle restores `+@write` without changing credentials or server config |
| Budgets | Agent 900 s, verifier 300 s; setup measured separately |

## Live setup and independent grade

Before injection, setup verifies the real HTTP/API/SignalR-negotiation roundtrip,
seeds preserved SQL and Redis data, and identifies actual backend/frontend process
identities. Connection ownership uses the corrected D01 adapters: exact Docker
identity and actual Aspire proxy URLs, existing Redis TLS/`REDIS_PASSWORD`, and
PostgreSQL `PGPASSWORD` with Aspire `db` versus raw `bingo`. Shared adapters are
imported from the immutable public source, not edited or copied into historical
tasks.

Setup captures **actual** `ACL LIST`, Redis authentication/TLS/persistence config,
the backend's live credential and transport agreement, database rows/users/history
and table/database identity. Raw's original nopass/no-TLS state is retained;
Aspire's original generated password/TLS is retained, not weakened to match raw.
Only command permissions change. Redis PING/GET and the app read/status paths
must remain working while an actual Redis SET returns NOPERM and the real app
call returns HTTP500. No ready marker is written without those observations.

The fault does not expire into success; it lasts until repaired or the task's
private daemon is removed by Harbor. Reference recovery uses the existing
administrative permission on the same default user, without an added control
credential. The operation remains target-scoped even though it denies the write
category for all clients of that one resource. Original ACL users, password
hashes, flags, key/channel selectors and server config must be restored exactly.

The grader does not trust an agent-written report or the hidden setup receipt.
It requires fresh nonce SQL import, actual Redis SET/GET/DEL plus app call/clear
and status effects on the exact target, no fresh write in the neighbor, prior
data/users/history/identity and original credentials/TLS/config preserved, and
existing frontend/login/version/SignalR-negotiation plus 400/404 behavior.
Source/guidance/endpoints, actual process identities/environments and container
inventory/configuration/start identities must remain unchanged. Docker lifecycle
events, visible wrong-neighbor ACL mutations, credential resets and broad Redis
configuration changes are rejected, including restored-final-state shortcuts.

Oracle-only negative scripts are not copied into the agent image. They exercise
no-op/read-only health, wrong-neighbor repair, source/endpoint shortcuts, lost
cache/call/SQL/neighbor data, incomplete permission recovery, and wrong-neighbor
ACL mutations hidden by restoring final state. Unit contracts additionally
reject credential resets, transport mismatch, replacements and broad lifecycle
changes. After deliberate negative mutations, the oracle restores all original
security/data and re-arms the same ACL denial, advancing only the protected event
window, never the preservation baseline. This is local grader validation, not
a model retry.

Isolation is an external, outside-`/app` grade, not a hardened adversarial
sandbox: container-root agents may reach protected files or hide shell mutations
from textual exec-event inspection. Do not infer arbitrary-tamper resistance.

## Gates and evidence

Static check:

```bash
node --test msbench/bingo-transfer/experiment.test.mjs
```

Each task environment contains an identical deterministic `transfer-common.tar`
snapshot of the four readable `common/` files. Docker ADD extracts it at build
time. Focused tests compare every archive member to source, reject extra members,
and require the two archives to match. Historical adapters/application/scripts
remain public Git-pinned additional contexts. No additional context traverses
outside `environment`, and no remote Bake `fs.read` grant is required.
After shared source edits regenerate both snapshots with standard-library tar
packaging (USTAR, sorted names, uid/gid/mtime 0); rerun the focused archive test.
This is static build packaging, not runtime task/source conversion.

**Do not run Docker until the parent explicitly grants the sole local slot.**
After that grant, run each new arm once, sequentially, with no model agents:

```bash
harbor run --path msbench/bingo-transfer/tasks/raw-scripted --agent oracle \
  --jobs-dir /Users/sebastienros/.copilot/session-state/1526d9f0-55be-4ead-a2e3-c0ade15b900f/files/jobs \
  --job-name x01-raw-v1 --n-concurrent 1 --force-build
harbor run --path msbench/bingo-transfer/tasks/aspire --agent oracle \
  --jobs-dir /Users/sebastienros/.copilot/session-state/1526d9f0-55be-4ead-a2e3-c0ade15b900f/files/jobs \
  --job-name x01-aspire-v1 --n-concurrent 1 --force-build
```

Keep all logs/caches/jobs in this session's files, not ignored worktree `.runs`
or artifacts. Inspect reward, actual incident/negative receipts and verifier
output. Stop after the two verified local arms/negatives or a concrete blocked
prerequisite. A real fixture correction may justify another local validation
attempt; identical-condition model reruns are forbidden.

[F14.json](evidence/F14.json) is the reserved evidence entry and provenance
record. It has no model results. This condition tests one new held-out
fault-family/name instance within the original application, **not independent-app
transfer or statistical generalization** and not an Aspire advantage.

## Source and provenance

Origin is `https://github.com/sebastienros/aspire-bench.git`, not a fork.
Worktree `/Users/sebastienros/.copilot/copilot-worktrees/aspire-bench/sebros-vigilant-pancake`,
local branch `sebros/bingo-held-out-fault-transfer`, inherited parent base
`a2c88ccb6abb426d5fb4d4c93862971f085d7058`.
Immutable public application/common-adapter/workflow task source:
`d3694ec111609a79073dcba35bc1f1b1c9517d8f`.
Original seven-skill snapshot:
`1fcca7e91c89716f0e4a8bf7324da13a39f70c66`.
Original Bingo upstream:
`sebastienros/aspireify-workshop@c902c52de9a11a7139602ec11264ec3e71a92c38`.
AppHost changes are only the five logical name substitutions; useful scripts
are inherited, with raw dependency lookup names overlaid at image build time.
There is no runtime task/source conversion or application behavior edit.

Image tags/installers/transitive restore follow the original pinned-version
workflow, not newly locked image digests. Local Linux ARM64 Docker evidence, if
obtained, is not itself cloud AMD64 or model compatibility proof. The parent must
record task commit, actual runner/model pins and unique fingerprints before
submission; no mutable task reference or provisional dataset is created here.
