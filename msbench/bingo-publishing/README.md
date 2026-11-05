# P01: Bingo isolated local publishing

**Both original Terra production-publishing runs passed.**
Raw observed 144.4 s/36 tools/USD 0.09848; Aspire 324.5 s/60 tools/USD 0.14063.
There is no observed Aspire speed or cost advantage in this one-sample pair.
[Model report](PILOT.md) separates actual model results from the local/remote
oracle history below.

Both final public-input local deployment oracles also pass. Raw and Aspire build
from the same published common/business snapshots, run real production
containers, and pass their behavioral and negative cases. The final validation
used the coordinator-approved **direct Docker fallback**, not a native Harbor
pass: a native final attempt stalled in readiness without a task container.
Earlier native Harbor fixture-development oracles also passed with an explicit
local common override. Those local validation jobs did not execute a model or
provision a cloud deployment. [evidence.json](evidence.json) separates local
development, public-input direct validation, final native remote validation
and subsequent actual model outcomes.
**The final native remote oracle now passes.**
Public-input passing receipts refer to snapshot `1f9f961`. Subsequent local DNS
relay fixes also pass both production oracles, but use an explicit local common
context. The coordinator has now published final common `7420e30`, locally built
and smoke-checked both exact public-Git images, and pinned task graph `ffed19f`.
Independent remote no-model gate
[2026110561495368](https://msbenchapp.azurewebsites.net/run-analysis/2026110561495368)
passed with reward 1/no exception using [relay-dataset.jsonl](relay-dataset.jsonl).
Its exported DNS plan proves actual configured `127.0.0.11`, relayed through
private `172.16.0.1`; progress reaches ready and the full production verifier passes.
[Receipt](evidence/final-remote-oracle.json) binds native result/output hashes.
The two original Terra conditions then both passed: raw
[2026110562064652](https://msbenchapp.azurewebsites.net/run-analysis/2026110562064652)
and Aspire
[2026110562064656](https://msbenchapp.azurewebsites.net/run-analysis/2026110562064656).
Actual model call events and CLI provenance were verified. Intermediate diagnostic builds at
`648f323`, earlier public production receipts at `1f9f961` and the new final
relay image builds have separate entries in the evidence manifest.

The parent initially published tasks at `a206e498adc445865f05a49546a5e085956de0dd`
and submitted one representative **no-model** CES oracle,
[2026110558453858](https://msbenchapp.azurewebsites.net/run-analysis/2026110558453858),
to verify native remote execution before any model spending.
[portable-dataset.jsonl](portable-dataset.jsonl) and
[execution-ledger.json](execution-ledger.json) retain the immutable graph,
two distinct conditions, and the gate's subsequent result. No model result is
implied by local direct-Docker success.

## Bounded comparison

| Arm | Supplied support | Required deployment |
|---|---|---|
| `raw-scripted` | Production Dockerfiles, useful Docker/Compose recipe, fixed application inputs | Hand-authored Compose and repeatable `deployment/deploy.sh` |
| `aspire` | Same production Dockerfiles/application/recipe, CLI and Hosting 13.6.0, minimal AppHost | AppHost Docker Compose environment, generated artifacts and Aspire prepare/build pipeline |

Both use **the identical raw production business source**, not a weaker raw
application or an Aspire-only feature. Both deploy the original .NET 10 admin and
the Vue production bundle served by nginx. The original nginx template already
proxies `/api/version-info` and SignalR `/bingohub`, including WebSockets. The
AppHost is a transient deployment producer, never a service in the deployed app.

The private Docker environment supplies independently owned PostgreSQL/Redis
containers, an external network, original seed data and randomized extra state.
Their IDs/start times/configuration/mounts/network attachments and prior contents
must survive. Network and volume identity/configuration are snapshotted separately,
excluding the network's legitimately changing application-container membership.
Only the two application containers are deployment-owned. This is intentionally
an application publishing task against provisioned dependencies, **not** a
whole-environment provisioning task or demonstration of database deployment.
No dev server/AppHost is prestarted. Dependency/setup time is outside the equal
900-second agent budgets; verifiers each have 300 seconds.

Only `deployment/` and the Aspire AppHost are editable. Immutable input hashes
cover the original application, dependency lockfiles, Dockerfiles, credentials,
guidance and toolchain input files. This is a constrained publishing task, not
open-ended application redesign. No skill or MCP treatment is exposed.
Shared guidance explicitly requires Compose project `p01-deploy` and service IDs
`boardadmin`/`bingoboard`, matching the ownership verifier. This prospective
pre-model clarification changes no runtime behavior; earlier receipts retain
their original immutable-input hashes.

## Independent runtime gate

The grader is outside `/app`; it does not read an agent success report. It checks
container ownership, actual process/configuration and loopback port bindings,
no source/output mounts, Production configuration, and actual published .NET
DLL/static nginx workloads. HTTP checks require real admin login with both wrong
and correct passwords, an Identity cookie and authenticated catalog, matching
admin/frontend runtime versions, and the original compiled Vue bundle's hash.

A real WebSocket SignalR connection through nginx retrieves the database catalog,
including an unpredictable preexisting active square and excluding its inactive
counterpart. A fresh player board must contain 25 valid squares and appear in
the real supplied Redis store. An invalid SignalR method must fail. Existing SQL
rows and Redis state must survive. Production-only behavior is respected:
`/api/demo/producer/*` is Development-only in Bingo and is **not** required as a
production capability.

The Aspire grader independently republishes the agent's AppHost and compares
generated Compose with deployed Compose, rather than accepting hand-authored
YAML containing a token such as `AddDockerComposeEnvironment`. Actual local
containers and behavior must also pass; artifacts alone cannot earn reward.
Byte equality deliberately rejects hand-ejected artifacts, including otherwise
harmless edits. The script/config/output directory convention is part of the task.

The oracle includes explicit rejection cases for no deployment, publish-only
Aspire artifacts, immutable-input changes, lost existing Redis state, stopped
deployment, a **live actual Vite dev server**, and ejected Aspire YAML. Both
passing local oracles executed their applicable rejection cases and restored the
correct deployment before final grading. Grader-produced `checks.json` receipts
are retained with each run's verifier logs; no agent report is trusted.

Root inside a privileged task container can tamper with local controls. Protected
paths and hashing are regression controls, not a hardened adversarial sandbox.
The deployment restriction (published DLL + nginx) is deliberately narrow; it is
not a universal grader for every legitimate production architecture.

## Source and API pins

- Both application contexts: `sebastienros/aspire-bench` commit
  `baacba3e17181491c9a4d419db7d0e6763c3d363`,
  `msbench/bingo/common/raw-app`.
- Upstream application: `sebastienros/aspireify-workshop` commit
  `c902c52de9a11a7139602ec11264ec3e71a92c38`, MIT. Existing benchmark adaptations
  are preserved. No historical task or source snapshot is changed.
- New owned overlays: a production .NET Dockerfile, exact Node build image,
  root build-context exclusions, deployment guidance/inputs, and initial AppHost.
- .NET SDK `10.0.100-noble`, ASP.NET runtime `10.0.12-noble`, Node
  `24.14.0-bookworm-slim`, Docker `28.0.4-dind`, PostgreSQL `18.3`, Redis `8.6`,
  nginx `nginxinc/nginx-unprivileged:1.28-alpine`. The nginx tag is not an immutable
  digest; final grader receipts record resolved dependency/runtime image IDs and
  RepoDigests alongside deployed workload image IDs.
- Aspire CLI installer explicitly requests `13.6.0`; AppHost SDK and Docker
  Hosting both pin `13.6.0`. No CLI 17/package 13.6 runtime mixture is claimed.
  Actual local CLI execution reports
  `13.6.0+56f3e9c0d216c0c7069dabb49dd0464e4827744f`.

Before any AppHost edits, host CLI
`17.0.0-preview.1.26530.1+a76b57a995db8e2e00ad64c3fadd7c2c825e98b9`
provided `aspire docs search/get` and `aspire docs api search/get` for Docker
Compose, JavaScript production deployment, `AddDockerComposeEnvironment`,
`PublishAsStaticWebsite`, `PublishWithContainerFiles` and `AddDockerfile`.
Current docs were **not** treated as evidence that newer static-site overloads
exist in 13.6. Instead, NuGet metadata inspection confirmed these exact 13.6 APIs:

```text
Aspire.Hosting.DockerComposeEnvironmentExtensions:
  AddDockerComposeEnvironment, ConfigureComposeFile, WithDashboard(false)
Aspire.Hosting.ContainerResourceBuilderExtensions:
  AddDockerfile(builder, name, contextPath, dockerfilePath = null, stage = null)
Aspire.Hosting.Docker.Resources.ComposeFile:
  Name, Networks, Services
Aspire.Hosting.Docker.Resources.ComposeNodes.Network:
  External (bool?), inherited Name (string)
Aspire.Hosting.Docker.Resources.ComposeNodes.Service:
  Image (string?), Networks (List<string>), Ports (List<string>)
```

Inspection used `dnx dotnet-inspect -y -- member ... --package
Aspire.Hosting.Docker@13.6.0` and `Aspire.Hosting@13.6.0`. The installed inspector
does not support the skill's `--oneline` example; its actual `--help` and `-n`
syntax were used. A native compile probe also passed against exact Hosting
13.6.0; the local Aspire oracle then executed the actual AppHost publish/build/
prepare pipeline. Newer static-site overloads were not assumed or used.

## Executed evidence

### Public graph gate

The coordinator reported that remote Docker Bake refused sibling-local named
contexts in another scenario before agent execution. Both P01 tasks now default
to the **public Git-pinned** common snapshot at the time of those receipts,
`1f9f96148571f1b7343a9989df7776ac8cb78951:msbench/bingo-publishing/common`,
not `../../../common`. GitHub resolution and exact common-tree equality were
verified before final builds. Both final direct-Docker builds used this Git pin
and the original business-source pin, with no local named-context override and
no broad Bake filesystem permission grant. Local fixture development can still
explicitly override `MSBENCH_PUBLISHING_COMMON_CONTEXT`; any common-file change
requires publication and a new pin before final validation. These local Git
builds prove portable input availability, not CES runner compatibility.
The current relay dataset instead pins task `ffed19f` and common `7420e30`;
historical dataset/receipt pins remain unchanged.

Exact upstream tag `v13.6.0` (commit
`56f3e9c0d216c0c7069dabb49dd0464e4827744f`) also confirms that `aspire do`
accepts `--output-path` and Docker Compose prepare writes
`.env.<IHostEnvironment.EnvironmentName>`, not the publish placeholder `.env`.
The oracle therefore applies `.env.Production` with the supplied Production
environment. Actual local prepare and application deployment exercised that
environment-file convention.

`node --test msbench/bingo-publishing/dns.test.mjs
msbench/bingo-publishing/experiment.test.mjs` passes all 16 DNS/contract tests.
`node --check common/grade.mjs`, shell syntax checks and
`git diff --check` pass. These are not substitutes for the runtime gate.

### Passing fixture-development oracles

Durable job root:
`/Users/sebastienros/.copilot/session-state/3efaa765-dfb1-4afd-b958-13b40879b4ec/files/p01-oracles/`.

| Job | Reward | Agent/oracle seconds | Verifier seconds | Cases |
|---|---:|---:|---:|---|
| `p01-raw-v5` | 1 | 34.826 | 0.758 | Production behavior + no-op, immutable input, lost Redis state, nonrunning app, live Vite rejected |
| `p01-aspire-v5` | 1 | 83.567 | 1.826 | Same, plus publish-only and ejected YAML rejected; independent AppHost republish |

These are **oracle validation timings**, not model-development performance.
Both run ARM64 Linux Docker locally. The receipts show .NET `10.0.12`, 42 SQL
rows (41 active), correct/wrong authentication results and preserved state.
The production Vue asset is `/assets/index-BP5Eb6X6.js`, SHA-256
`61744bcce7106da6dcbf5becf3fb71eae6cfadc8170ab66a3c72494946618093`.

The development invocation used this explicit override, sequentially per arm:

```bash
MSBENCH_PUBLISHING_COMMON_CONTEXT="$PWD/msbench/bingo-publishing/common" \
harbor run --path msbench/bingo-publishing/tasks/raw-scripted --agent oracle \
  --jobs-dir <durable-job-root> --job-name p01-raw-v5 \
  --n-concurrent 1 --force-build --no-delete
```

Use the Aspire task path and job name for its arm. No broad Bake filesystem
permission entitlement is applied. These native runs are retained separately
from final public-input validation below.

### Final public-input oracles, 2026-11-05

| Job | Method | Reward | Outer build / setup seconds | Oracle / verifier seconds |
|---|---|---:|---|---|
| `p01-raw-scripted-public-direct-v1` | Direct Docker, exact task | 1 | 47.235 / 51.937 | 23.548 / 0.496 |
| `p01-aspire-public-direct-v1` | Direct Docker, exact task | 1 | 39.526 / 49.795 | 69.591 / 1.616 |

Both use the exact task Dockerfiles/entrypoint, 4 CPUs, 8192 MiB memory, the same
read-only solution/test mounts and log paths, `timeout 900` for the solution and
`timeout 300` for the verifier. Build and setup are outside the oracle budget.
The host did not enforce the declared 20480 MiB task storage budget. No app is
prestarted and no Docker socket from the host is mounted. Each task launches its
own private Docker daemon; published workloads have no source/output bind mounts.
The native Harbor agent/verifier wrapper itself was bypassed, so these results
do not establish native runner behavior or agent timing.

Both recorded the same business-input SHA-256:
`71a1c09b07e3f3c3720fbe187bbe979bf7363773fded14484ebaccf7a688eb6e`.
Their frontend bundle hash, .NET runtime, 42-row/41-active catalog, and resolved
six dependency/build/runtime image digests also match. Each receipt records the
deployed workload image IDs, loopback bindings and successful independent checks.
Raw rejects all five common shortcut cases; Aspire rejects those plus publish-only
and hand-ejected artifacts. The correct deployment is restored before grading.
Both outer containers are stopped/removed and the sole local Docker slot was
explicitly returned to the coordinator. No shared restart or prune was used.

Exact commands, step exit codes/times and receipt hashes are in each durable
`result.json`. The task-specific fallback runner is retained as
`<durable-job-root>/run-public.mjs`, SHA-256
`eca54b0c37924fdd8d737c0ea358a0e5c9e16215502ece8e852c736de9e3b174`.
It was invoked sequentially from this worktree:

```bash
node <durable-job-root>/run-public.mjs raw-scripted
node <durable-job-root>/run-public.mjs aspire
```

Its build shape is ordinary Docker with public named contexts:

```bash
docker build --progress=plain --tag <owned-image> \
  --build-context publishing-common=https://github.com/sebastienros/aspire-bench.git#1f9f96148571f1b7343a9989df7776ac8cb78951:msbench/bingo-publishing/common \
  --build-context bingo-source=https://github.com/sebastienros/aspire-bench.git#baacba3e17181491c9a4d419db7d0e6763c3d363:msbench/bingo/common/raw-app \
  msbench/bingo-publishing/tasks/<arm>/environment
```

### Native runner boundary remains open

The final native attempt used `env -u MSBENCH_PUBLISHING_COMMON_CONTEXT -u
MSBENCH_PUBLISHING_SOURCE_CONTEXT harbor run ... --force-build`, job
`p01-raw-public-v1`. Its log reports image OS inspection exit 1 for the expected
content-addressed `hb__...` image, followed by failing healthchecks. Read-only
Docker queries showed no task container; the readiness loop was stopped rather
than allowed to run all 300 retries. The result is `CancelledError` with null
agent/verifier results and no reward, **not** an application/oracle failure.

Root cause is unresolved. Harbor reports `0.20.0`, MSBench CLI `0.3.67`, Docker
Engine `28.0.4` and Compose `5.6.1` on `desktop-linux`. The actual Python path,
Docker-environment module SHA-256 and mtime, result/trial-log hashes and exact
observations are recorded in `evidence.json`. The coordinator reported no
installation change; no causal claim about another actor or a version change is
made. This session did not modify site-packages, Docker configuration or global
tools. The direct fallback uses the same final task code but does not erase this
runner limitation. No final Aspire native attempt was launched after it.

### Remote setup failure and diagnostic-only follow-up

The coordinator reported CES no-model oracle `2026110558453858`, public task
revision prefix `a206`: the image built and its container was created/started,
then setup exited 1 **before the agent**. No native grade or model result exists;
`/app/deployment` was absent. The supplied export shows only Compose-up reporting
the container exit, not the redirected setup stderr. The original result/export
remains with the coordinator. This is separate from the earlier local native
runner observation and does not invalidate or expand the recorded local passes.
There is **no root-cause evidence yet**, so no DNS, filesystem, resource or
application cause is inferred.

The follow-up changes setup observability only:

- Entrypoint and setup inherit an `ERR` trap that reports the exact exit status,
  last setup phase, source basename and line, then preserves that status.
- Descriptor 3 keeps container stderr available while normal setup output is
  redirected. Major phases also write `/logs/environment/progress.log`.
- On failure, a bounded reporter emits sanitized setup/dockerd/info tails to
  container stderr and `/logs/environment/setup-diagnostics.log`, with structured
  failure metadata in `/logs/environment/failures.jsonl`.
- Raw logs remain under `/opt/benchmark/private-logs`, outside declared artifacts.
  Sensitive log lines and URL credentials/query values are redacted; commands and
  environment variables are not dumped. Both tasks declare `/logs/environment`
  for artifact collection, including when deployment output does not exist.

Synthetic non-Docker tests prove that the trap retains a nonzero failure code and
surfaces redacted evidence despite normal stderr redirection. They also cover
credential/URL/control-character redaction and both task artifact declarations.
No Docker, model submission or retry was performed for this follow-up. The
coordinator must publish/repin these common files and run its single no-model
diagnostic job. Whether an infrastructure runner collects artifacts from an
already-exited setup container remains a runner responsibility; declaring paths
alone does not prove that transport. Container stderr supplies a second route.

### DNS discovery diagnostic and resolver-preserving repair

The next coordinator-owned diagnostic, `2026110559322086`, successfully exported
sanitized environment artifacts. Its failure metadata proves
`phase=dns-discovery`, exit 1, entrypoint line 8, before dockerd or application
setup logs exist. The remote `/etc/resolv.conf` content was not exported, so
**the actual remote resolver format is still unknown**. This narrows the failure
to DNS derivation; it does not prove a specific nameserver or outer network.

The former derivation code rejected a valid loopback-only nameserver when no
Docker `ExtServers` comment was available. A local representative reproduction
now covers that case without inventing upstream DNS:

- The existing nonloopback and explicit Docker-upstream paths remain direct.
- For an explicitly configured loopback resolver with no nonloopback upstream,
  the private daemon uses an outer UDP/TCP relay forwarding only to those exact
  configured loopback addresses. The relay binds only the private Docker bridge
  gateway, not host-published ports or `0.0.0.0`.
- Bridge and network-pool `/24` subnets are chosen from private IPv4 space after
  excluding actual outer routes, interface subnets and resolver addresses.
  If no suitable subnet exists, setup fails explicitly. Only this owned outer
  container's network namespace is changed; host DNS/routes are untouched.
- Upstream failures/timeouts are logged without query names. Only supplied
  resolvers are tried; exhaustion/capacity returns DNS SERVFAIL. There is no
  guessed public resolver or success-shaped fallback.
- `dns-plan.json`, readiness and relay logs expose the selected safe plan.
  Failure diagnostics include configured nameserver IPs, whether Docker
  metadata exists, plan errors and relay failures, not raw resolver search
  domains or environment values.

Unit tests exercise exact binary UDP/TCP request/response forwarding, fragmented
TCP frames, timeouts/SERVFAIL, supplied-upstream failover, loop refusal, overload
and route/address conflicts. No DNS-library dependency was added.

Local runtime proof uses a task-owned outer Docker network with the actual
configured `127.0.0.11` resolver. The fixture runner removes **only comments**
from that container's resolver file, keeping its nameserver/options unchanged;
it never edits host DNS. This produces the representative missing-metadata
condition. The plan selects bridge/relay `172.16.0.1/24` and a separate
`172.16.1.0/24` pool, forwarding to `127.0.0.11` in the same outer namespace.
A real BuildKit Dockerfile `RUN` resolves `api.nuget.org` using **both UDP and
TCP** through the chosen gateway, then the original production oracle runs.

| Local common-input job | Resolver path | RUN DNS UDP/TCP | Reward | Oracle / verifier seconds |
|---|---|---|---:|---|
| `p01-raw-scripted-dns-stub-v2` | Loopback relay | Pass | 1 | 23.380 / 0.508 |
| `p01-aspire-dns-stub-v1` | Loopback relay | Pass | 1 | 73.326 / 1.684 |
| `p01-raw-scripted-dns-direct-v1` | Existing direct `192.168.65.7` | Pass | 1 | 25.947 / 0.539 |

Both relay-arm production checks still read .NET `10.0.12`, the same Vue bundle,
the original business-source hash and all preserved data/ownership. Raw's five
and Aspire's seven negatives pass. Owned outer containers and proof networks
were removed, and the sole local Docker slot was explicitly returned.
The first probe-only attempt, `p01-raw-scripted-dns-stub-v1`, completed setup but
its experimental `docker build --network bridge` flag was rejected by BuildKit;
the corrected probe uses `--network default`. That failed attempt is retained,
not counted as a production pass or hidden as a rerun.

Exact runner commands and evidence are retained under the same durable job root:
`run-relay.mjs` (SHA-256
`a5203c54d472cdaf44c92bd42c88b38c69bf41874775e2ec2e39b751df269c48`)
and `dns-probe/`. These are **local-common direct Docker checks**, not republished
Git-context or CES results. The outer engine reports `29.9.2`; the task's private
daemon remains pinned to Docker `28.0.4`. CPU/memory and 900/300-second
oracle/verifier limits remain matched. Later stderr-plan/diagnostic-tail guards
and the shared Compose identity wording are covered by static tests; the
recorded runtime receipts are not relabeled as different file versions.

The parent must publish/repin the new common snapshot, then run its remote
no-model gate and inspect the actual remote plan/outcome. No remote job,
model submission, global DNS edit or host port publication was performed here;
local representative success is not claimed to establish the remote root cause.

### Concrete failures corrected

| Attempt | Observed failure / correction |
|---|---|
| `p01-raw-v2` | Public-context image built; nested `overlay2` mount failed with `invalid argument`. Stopped promptly on exited setup; use the original private-DinD recipe's `vfs`. |
| `p01-raw-v3` | Seeding passed; nested builds failed NuGet/npm resolution while task HTTP worked. Child resolver fell back to unreachable Google DNS. Explicit inherited upstream resolved the same host; daemon now derives validated upstreams from resolv.conf/Docker metadata, with no guessed public fallback. Manually stopped; no final native trial result was written. |
| `p01-raw-v4` | Actual production deployment built and ran, but bundle hash differed: SDK's inherited `DOTNET_VERSION=10.0.0` changed the golden Vue build; Node used default `10`. Both builds now explicitly use `VITE_DOTNET_VERSION=10`; business code unchanged. |
| `p01-aspire-v2` | Publish created `aspire.config.json` and correctly tripped immutable-input grading. Supply the known AppHost settings before snapshotting; do not relax hashing. |
| `p01-aspire-v3` | Prepare/build succeeded but default dashboard added a third service/port collision, and generated image tags disagreed with built Dockerfile tags. Disable dashboard for matched two-workload topology. |
| `p01-aspire-v4` | `WithContainerBuildOptions(LocalImageTag)` did not synchronize prepare references in 13.6; image pulls failed. Removed this experimental path. Pair `WithImageTag("local")` with documented `ConfigureComposeFile` service `Image`, keeping durable customization in the AppHost, not generated YAML/env edits. |

The ordinary NuGet advisory for pinned transitive `MessagePack` 2.5.302 remains
visible; no advisory is suppressed or package family silently upgraded.

### Earlier shared-host failure, retained

Both original commands below were attempted once, concurrently, before the
coordinator reported the shared-host failure:

```bash
harbor run --path msbench/bingo-publishing/tasks/raw-scripted --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name p01-raw-v1 --n-concurrent 1
harbor run --path msbench/bingo-publishing/tasks/aspire --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name p01-aspire-v1 --n-concurrent 1
```

Both results contain `RuntimeError`, `agent_result: null`,
`verifier_result: null`, and no reward. Raw BuildKit reports:
`write /var/lib/docker/buildkit/containerd-overlayfs/metadata_v2.db:
input/output error`. Both also fail reading Docker's `docker-buildx` file.
At stop time, `df -h .` reported 926 GiB total, 901 GiB used, 2.8 GiB available,
100% capacity. The coordinator/source-builder additionally reported read-only
metadata errors and earlier 1.2 GiB available. That report is separate from the
direct paired errors above.

The coordinator subsequently restored the engine and granted a sole runtime
slot. Corrected runs were sequential, with observed headroom remaining above
10 GiB, and their owned outer containers were removed by Harbor. No unrelated
containers were restarted/deleted and no shared engine prune/restart was used.

**Remaining gate:** the parent must establish native Harbor/CES execution before
model submission. Local production publishing/deployment and the final public
input graphs are verified; no Linux x64/CES/model result is claimed. The parent
owns dataset registration, final task commit pins and model submissions; no
submittable dataset is included here.
