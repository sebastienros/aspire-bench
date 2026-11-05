# P01: Bingo isolated local publishing

**Both local deployment oracles pass; final public-context validation is pending.**
Raw `p01-raw-v5` and Aspire `p01-aspire-v5` each earned reward 1 with real production
containers and all applicable negative cases. Those fixture-development runs
explicitly used the local common-context override. The corrected common snapshot
must now be published, pinned and exercised through both default public Git
graphs before model submission. No model run, push, PR or cloud provisioning was
performed here. [evidence.json](evidence.json) retains failed attempts as well as
passing results; the earlier shared-host disk failure is not erased.

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
are retained with the native Harbor verifier logs; no agent report is trusted.

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
to the **public Git-pinned** common snapshot at
`265fe63f927c9c36bde3c7b85e9ba4be03365db0:msbench/bingo-publishing/common`,
not `../../../common`. That public snapshot matched the pre-runtime guard
changes and was exercised by raw `p01-raw-v2` through successful image build.
It is now older than the runtime corrections below. Local fixture
development can explicitly override `MSBENCH_PUBLISHING_COMMON_CONTEXT`.
Any common-file change requires publishing and updating the public pin before
portable validation. No broad Bake filesystem permission grant is used.
Final public snapshot replacement and both default-context oracles remain
required; a local tree build alone does not establish remote graph portability.

Exact upstream tag `v13.6.0` (commit
`56f3e9c0d216c0c7069dabb49dd0464e4827744f`) also confirms that `aspire do`
accepts `--output-path` and Docker Compose prepare writes
`.env.<IHostEnvironment.EnvironmentName>`, not the publish placeholder `.env`.
The oracle therefore applies `.env.Production` with the supplied Production
environment. Actual local prepare and application deployment exercised that
environment-file convention.

`node --test msbench/bingo-publishing/experiment.test.mjs` passes all five
structural tests. `node --check common/grade.mjs`, shell syntax checks and
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
permission entitlement is applied. The final graph must instead use public
named contexts with **no** local override.

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

**Remaining gate:** publish/pin the corrected common files and execute both
final public-context oracles sequentially. No Linux x64/CES model execution has
been established. The parent owns dataset registration, final task commit pins
and model submissions; no submittable dataset is included here.
