# P01: Bingo isolated local publishing (blocked draft)

**NOT Docker-validated. Not eligible for model submission or a completed P01
deployment result.** Both local oracle attempts failed during environment image
builds, before the solution or verifier ran. The shared Docker host exhausted
disk and returned BuildKit/containerd and package-manager I/O errors. The
coordinator explicitly stopped further Docker work; only this task's commands
were stopped. No engine restart, prune, model run, push, PR, or cloud provisioning
was performed. [evidence.json](evidence.json) preserves the paired failure
classification and exact local result hashes.

## Intended bounded comparison

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
Their IDs/start times/configuration/mounts and prior contents must survive.
Only the two application containers are deployment-owned. This is intentionally
an application publishing task against provisioned dependencies, **not** a
whole-environment provisioning task or demonstration of database deployment.
No dev server/AppHost is prestarted. Dependency/setup time is outside the equal
900-second agent budgets; verifiers each have 300 seconds.

Only `deployment/` and the Aspire AppHost are editable. Immutable input hashes
cover the original application, dependency lockfiles, Dockerfiles, credentials,
guidance and toolchain input files. This is a constrained publishing task, not
open-ended application redesign. No skill or MCP treatment is exposed.

## Intended independent runtime gate (not yet executed)

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
deployment, a **live actual Vite dev server**, and ejected Aspire YAML. None of
these rejection tests has run locally; do not describe them as proven.

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
  digest; resolved dependency/runtime image digests still need recording.
- Aspire CLI installer explicitly requests `13.6.0`; AppHost SDK and Docker
  Hosting both pin `13.6.0`. No CLI 17/package 13.6 runtime mixture is claimed.
  CLI 13.6 installation/execution was **not reached** by the failed builds.

Before any AppHost edits, host CLI
`17.0.0-preview.1.26530.1+a76b57a995db8e2e00ad64c3fadd7c2c825e98b9`
provided `aspire docs search/get` and `aspire docs api search/get` for Docker
Compose, JavaScript production deployment, `AddDockerComposeEnvironment`,
`PublishAsStaticWebsite`, `PublishWithContainerFiles` and `AddDockerfile`.
Current docs were **not** treated as evidence that newer static-site overloads
exist in 13.6. Instead, NuGet metadata inspection confirmed these exact 13.6 APIs:

```text
Aspire.Hosting.DockerComposeEnvironmentExtensions:
  AddDockerComposeEnvironment, ConfigureComposeFile
Aspire.Hosting.ContainerResourceBuilderExtensions:
  AddDockerfile(builder, name, contextPath, dockerfilePath = null, stage = null)
Aspire.Hosting.Docker.Resources.ComposeFile:
  Name, Networks, Services
Aspire.Hosting.Docker.Resources.ComposeNodes.Network:
  External (bool?), inherited Name (string)
Aspire.Hosting.Docker.Resources.ComposeNodes.Service:
  Networks (List<string>), Ports (List<string>)
```

Inspection used `dnx dotnet-inspect -y -- member ... --package
Aspire.Hosting.Docker@13.6.0` and `Aspire.Hosting@13.6.0`. The installed inspector
does not support the skill's `--oneline` example; its actual `--help` and `-n`
syntax were used. This confirms API availability, **not** compilation or target
pipeline compatibility.

## Executed evidence and recovery prerequisite

### Portable graph follow-up

The coordinator reported that remote Docker Bake refused sibling-local named
contexts in another scenario before agent execution. Both P01 tasks now default
to the **public Git-pinned** common snapshot at
`7bdc746445b887d1c61b228e9d6d59f378589fe8:msbench/bingo-publishing/common`,
not `../../../common`. GitHub resolves that commit and local `git diff` proves
its common tree matches this draft. This removes the known graph portability
hazard; it is not a remote image-build or model-readiness result. Local fixture
development can explicitly override `MSBENCH_PUBLISHING_COMMON_CONTEXT`.
Any common-file change requires publishing and updating the public pin before
portable validation. No broad Bake filesystem permission grant is used.

Exact upstream tag `v13.6.0` (commit
`56f3e9c0d216c0c7069dabb49dd0464e4827744f`) also confirms that `aspire do`
accepts `--output-path` and Docker Compose prepare writes
`.env.<IHostEnvironment.EnvironmentName>`, not the publish placeholder `.env`.
The oracle therefore applies `.env.Production` with the supplied Production
environment. This fixes a source-confirmed draft error before Docker execution;
the final pipeline still requires runtime validation.

`node --test msbench/bingo-publishing/experiment.test.mjs` passes all four
structural tests. `node --check common/grade.mjs`, shell syntax checks and
`git diff --check` pass. These are not substitutes for the runtime gate.

Both commands below were attempted once, concurrently, before the coordinator
reported the shared-host failure:

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

**Exact remaining prerequisite:** recover adequate shared-host disk headroom and
a writable, responsive Docker/BuildKit engine under its owner's control. Then
build/run **each final task sequentially**, establish actual CLI 13.6 version,
AppHost compilation, `prepare-compose`/output/env-file conventions, external
network/endpoint generation, HTTP/SignalR behavior and all negative cases within
budgets. The files changed while the first builds were running, so the recorded
failed attempt checksums are not claims about the final draft. No successful
image, deployment, oracle reward or Linux x64 compatibility has been established.
The parent should register a dataset and pin the final task commit only after
these gates pass; no submittable dataset is included here.
