# Verified source-built managed Linux x64 Bingo baseline

## Result

**Passed:** a complete same-source Linux x64 payload, managed self-contained CLI, and six matched Hosting/SDK packages ran the original .NET 10 Bingo application through normal bundle extraction and a real private-Docker lifecycle.

This is explicitly a **nonshipping, non-NativeAOT, untrimmed development configuration**. It is not a shipping NativeAOT performance baseline. No prebuilt Aspire product artifact was substituted, no product source was changed, and no benchmark/model submission was made.

The previously blocked NativeAOT attempt remains a separate historical failure. This successful experiment avoided ILC entirely while retaining the existing layout builder, extraction checks, bundle leases, matching source/package identity, and application model.

## Source and build provenance

| Field | Verified value |
| --- | --- |
| Origin | `https://github.com/microsoft/aspire.git` |
| Worktree | `/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-upgraded-couscous` |
| App-managed branch | `sebros/agentic-build-baseline` |
| HEAD/base | `d698a4f9cb800649791da2b3d81c5850330072c1` |
| Dirty status | Clean before and after the experiment |
| Product version | `17.0.0-baseline.gd698a4f9cb80` |
| Source input | Exact committed-source archive retained in session files |
| Source archive SHA256 | `03ce952b043901e099e05a14a9df03dec8b76714f41df0ec3c2c036da1f313da` |
| Build source volume | `aspire-agentic-baseline-x64-source-81fbe89f` |
| Isolated build artifact root inside that volume | `/src/artifacts-managed/` |
| Target/configuration | `linux-x64`, Release |
| Successful build interval | `2026-11-05T00:08:04Z` to `2026-11-05T00:17:35Z` |
| Build SDK image | `mcr.microsoft.com/dotnet/sdk@sha256:db7d1f28c0805ea69fe43f73e54cffd2a0689a0c637a6078328e27c5aab2314a` |
| Actual SDK | `11.0.100-rc.2.26504.105`, exact repository pin |
| Actual SDK host | Linux x64, Ubuntu 26.04, under Docker Desktop emulation on macOS ARM64 |
| Global installations | Unchanged |

The source archive has no usable container-local Git metadata, so the build explicitly supplied the full verified `SourceRevisionId`, `RepositoryCommit`, and `RepositoryUrl`, with `EnableSourceControlManagerQueries=false`. The same values and version suffix were exported for child MSBuild processes. All six package repository elements were checked for the exact full commit and origin. Ten generated component/package assembly informational-version files were checked for the exact product version.

## Durable output locations

All new outputs, caches, fixture copies, and logs use the persistent **session folder**, not the workspace's ignored `artifacts/` tree.

Evidence and scripts:

```text
/Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline/managed
```

Final artifact root:

```text
/Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline/managed/output
```

Key entries:

- `aspire-agentic-managed-linux-x64.tar.gz`: portable CLI, six packages, exact fixture overlay, resolved build provenance, and per-file checksum manifest.
- `cli/`: actual x64 CLI plus required native companion and XML file.
- `packages/`: six exact-version packages.
- `aspire-17.0.0-baseline.gd698a4f9cb80-linux-x64.tar.gz`: standard complete payload archive, also embedded in the CLI.
- `bingo-original/`: unmodified legacy fixture.
- `bingo-overlay/`: fixture-only package/version/source overlay used successfully.
- `logs/`: exact stage commands/output, disk guards, package/component provenance, overlay diff, runtime-image identity, and portable verification.
- `lifecycle/`: actual command outputs, sanitized summary inputs, endpoint/health evidence, inner-Docker logs and cleanup result.
- `provenance/`: resolved dependency assets, assembly-version sources, build SDK inventory, complete payload file hash list.

The complete portable archive's **134 manifest-listed files were re-read and SHA256-verified directly from the archive** after packing.

## Artifact identities

Paths are relative to the final artifact root.

| Artifact | Bytes | SHA256 |
| --- | ---: | --- |
| `aspire-agentic-managed-linux-x64.tar.gz` | 312,642,722 | `ba7ac0f96774050cd82e969bae726233f556b138d1054899f1fa215a72613c14` |
| `cli/aspire` | 380,814,691 | `d7ab2f16d3a519e6da299c07e3e1f7b65495adec0552a02fa3001983413654c5` |
| Complete payload archive | 257,589,605 | `95d96c68563c1c83801febbcba91152dcc1f051f20c17370393e4f63350b1533` |
| `cli/libhex1binterop.so` | See `SHA256SUMS` | `1f06a0d471c52fc72b7d3e2e526a30d8b10cf758acdf3e8225407c96352ebf06` |
| `packages/Aspire.AppHost.Sdk.17.0.0-baseline.gd698a4f9cb80.nupkg` | See artifact | `b85a8bf135de181795599d05c4a771d18577fd886c1f97c31eda32a83f52d113` |
| `packages/Aspire.Hosting.17.0.0-baseline.gd698a4f9cb80.nupkg` | See artifact | `8fe84f33769ec8cefbad2bdf661343632fbd395f21b4a633117b862cb95e123b` |
| `packages/Aspire.Hosting.AppHost.17.0.0-baseline.gd698a4f9cb80.nupkg` | See artifact | `5d9c4000435d201c4710dd160b5ef171a504ff05205df183c75e9e6e2c1b0fa4` |
| `packages/Aspire.Hosting.JavaScript.17.0.0-baseline.gd698a4f9cb80.nupkg` | See artifact | `30dcfb30ef3f214df5bacb455146182f5aba9aa90a7ced8bcbf76d01822f6112` |
| `packages/Aspire.Hosting.PostgreSQL.17.0.0-baseline.gd698a4f9cb80.nupkg` | See artifact | `5e1dfbdf84a603fd6d03fb56b86b0e9598f7b594d7a57340876e70a62d2fb8a1` |
| `packages/Aspire.Hosting.Redis.17.0.0-baseline.gd698a4f9cb80.nupkg` | See artifact | `d226047a194ece79e0cc3e100d95ab0168100bbe457166357c4d7dc0af6466a3` |

The complete payload contains **1,244 files / 642,884,164 uncompressed bytes**. `provenance/payload-files.json` records every file's path, size, and SHA256. `PORTABLE-SHA256SUMS` covers the CLI, six packages, fixture overlay, and provenance inside the portable archive. Keep the entire `cli/` directory, not only the executable.

## Exact lower-storage build configuration

The shipping specification describes NativeAOT components. There is no single documented switch that turns the entire shipping bundle into a managed one. This development recipe combines standard .NET publish overrides with the repository's existing documented layout/reuse and managed-CLI mechanisms.

`build-stage.sh` publishes these directly, retaining their normal RID-specific output paths:

```bash
dotnet publish src/<project>/<project>.csproj \
  -c Release -r linux-x64 --self-contained true \
  -p:PublishAot=false -p:PublishTrimmed=false \
  -p:RuntimeIdentifiers=linux-x64 \
  -p:ArtifactsDir=/src/artifacts-managed/ \
  -p:SourceRevisionId=d698a4f9cb800649791da2b3d81c5850330072c1 \
  -p:RepositoryCommit=d698a4f9cb800649791da2b3d81c5850330072c1 \
  -p:RepositoryUrl=https://github.com/microsoft/aspire \
  -p:EnableSourceControlManagerQueries=false \
  -p:VersionSuffix=baseline.gd698a4f9cb80
```

Projects: `Aspire.Managed`, `Aspire.Dashboard`, `Aspire.TerminalHost`, `Aspire.Hosting.Native.Server`.

The managed helper retains its required self-contained single-file/native-library embedding settings. Dashboard, TerminalHost, and native-server-named component use multi-file self-contained managed output, retaining their runtime DLLs, native sidecars, static assets, and generated ATS contract. Server v2's name is unchanged; its compilation mode in this experiment is managed, not NativeAOT.

The standard layout is then assembled using freshly source-built outputs:

```bash
dotnet msbuild eng/Bundle.proj /t:Build \
  -p:TargetRid=linux-x64 -p:Configuration=Release \
  -p:SkipManagedBuild=true \
  -p:SkipAppHostServerBuild=true \
  -p:SkipNativeBuild=true \
  <the same source/version/artifact properties>
```

This still restores target DCP and invokes the standard layout builder/archive operation. It does not use a prebuilt Aspire product. Linux requires no tray.

The CLI is published separately with:

```bash
dotnet publish src/Aspire.Cli/Aspire.Cli.csproj \
  <the same managed publish and source/version properties> \
  -p:PublishSingleFile=true \
  -p:BundlePayloadPath=/src/artifacts-managed/bundle/aspire-17.0.0-baseline.gd698a4f9cb80-linux-x64.tar.gz \
  -o /out/cli
```

The six matched packages were each restored and packed in Release from the same source/version into `/out/packages`. The obsolete SDK was included because the benchmark fixture still uses its supported-for-migration legacy model. No unrelated integration package version was substituted.

Exact top-level build command:

```bash
bash /Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline/managed/run-build.sh
```

That script checks the exact clean worktree, then creates one ephemeral x64 builder container per stage. It records **physical host filesystem free space before and after every stage** and exits if available space is below 10 GiB. The smallest recorded value during build was about 45.8 GiB. No ILC stage was started.

The configured output root separates this experiment from earlier native intermediates. `-p:RuntimeIdentifiers=linux-x64` limits avoidable multi-RID restore breadth. Build source/intermediates now occupy about 2.6 GiB inside the retained volume; session build NuGet cache is about 1.6 GiB.

## Legacy fixture overlay: runtime-proved sufficient

Exact fixture source:

```text
sebastienros/aspire-bench
baacba3e17181491c9a4d419db7d0e6763c3d363
msbench/bingo/common/aspire-app
```

Its source archive remains at `../x64/bingo-source-baacba3e.tar.gz`; SHA256 `7b74962cdc10ebffd35be3bc7b1fa43c39de077eaeabdd0109d4e4a6198aaf58`.

Only these fixture files changed:

| File | Change |
| --- | --- |
| `apphost.cs` | `Aspire.AppHost.Sdk` plus PostgreSQL, Redis, JavaScript package directives changed from `13.6.0` to `17.0.0-baseline.gd698a4f9cb80` |
| `Directory.Packages.props` | The same three Hosting central package versions updated to the same exact baseline version |
| `NuGet.config` | Local `/baseline/packages` source mapped specifically to `Aspire.*`; nuget.org retained for other fixture dependencies |

`logs/fixture-overlay.diff` preserves the full exact delta. The following stayed unchanged:

- `global.json`: .NET SDK `10.0.100`, stable-only selection.
- Every application project's `net10.0` target.
- The legacy `#:sdk`/`#:project`/generated `Projects.*`/`AddProject<T>` model.
- Redis/Postgres image tags, resource names, dependencies, health checks, Vite app, HTTP commands, custom command model, application code, and frontend package manifests.
- `AspireUseCliBundle=true`.

**A wholly different AppHost model was not required for this verified scenario.** The fixture-only exact-package/source overlay compiled and ran successfully. This confirms compatibility for this fixture and lifecycle, not every deprecated API or every polyglot/native-server feature.

## Private runtime image and isolation

Runtime image: `aspire-agentic-managed-bingo:d698a4f9`.

Image ID returned by Docker:

```text
sha256:00b2a7aa78deeaea0b03abbfade91a193f13f3bec8cf471e291e713999f0812a
```

Resolved bases from the actual build log:

| Base | Digest |
| --- | --- |
| .NET SDK `10.0.100-noble` | `sha256:c7445f141c04f1a6b454181bd098dcfa606c61ba0bd213d0a702489e5bd4cd71` |
| Node `24.14.0-bookworm-slim` | `sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8` |
| Docker `28.0.4-dind` | `sha256:4de6a5668da5d138bf9c18b29d2702e43c8773daee085087ba4fac61a6d34b7f` |

Actual runtime: **Linux x86_64, .NET SDK 10.0.100, Node v24.14.0, inner Docker 28.0.4 using `vfs`**.

`Dockerfile.runtime` copies only the needed Node and Docker tools into the .NET 10 SDK environment; it does not install prebuilt Aspire. The source-built CLI/payload/packages are mounted from the durable artifact root.

The outer container was privileged solely for its **private Docker daemon**. It mounted no host Docker socket and published no host ports. Inspection of actual mounts and empty `HostConfig.PortBindings` was recorded in `logs/outer-runtime-isolation.json`. Its network/resource names exist only within the task's private daemon. The `.NET 10` SDK is in that private image, not installed globally.

Exact top-level runtime command:

```bash
bash /Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline/managed/run-runtime.sh
```

## Actual bundle and Bingo lifecycle

Lifecycle interval: **2026-11-05T00:18:32Z to 00:20:18Z**. Final lifecycle exit code: **0**.

| Command/check | Actual result |
| --- | --- |
| Exact artifact `aspire --version` | `17.0.0-baseline.gd698a4f9cb80` |
| `aspire setup --install-path /opt/aspire-baseline --non-interactive --nologo` | Exit 0; standard versioned bundle extraction and validation succeeded |
| Required extracted paths | Managed helper, Dashboard, Blazor script, external SQLite, TerminalHost and Hex1b sidecar, AppHost Server and ATS contract, and DCP all nonempty |
| Private daemon readiness | Inner Docker 28.0.4/vfs responsive; initially no running containers |
| `aspire start --apphost /app/apphost.cs --launch-profile http --non-interactive --isolated --format Json --nologo` | Exit 0; actual fixture compiled and launched |
| `aspire wait boardadmin --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo` | Exit 0; Healthy after 31.5 seconds |
| `aspire wait bingoboard --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo` | Exit 0; Healthy after 0.1 seconds |
| `aspire describe --apphost /app/apphost.cs --format Json --non-interactive --nologo` | Exit 0; parsed snapshot wrapper and expected resources |
| Admin allocated endpoint `/health` | HTTP success, body `Healthy` |
| Frontend allocated endpoint `/` | HTTP success, returned frontend HTML |
| `aspire stop --apphost /app/apphost.cs --non-interactive --nologo` | Exit 0; reported AppHost stopped successfully |
| `aspire ps --format json --non-interactive --nologo` after stop | Exactly `[]` |
| Inner running containers after stop | None |
| Outer runtime removal | `--rm` completed; no task-owned outer containers remain |

Observed selected resource states:

| Display name | Type | State | Health/exit |
| --- | --- | --- | --- |
| `cache` | Container | Running | Healthy |
| `postgres` | Container | Running | Healthy |
| `db` | PostgresDatabaseResource | Running | Healthy |
| `migrations` | Project | Finished | Exit code 0 |
| `boardadmin` | Project | Running | Healthy |
| `bingoboard` | Executable | Running | Healthy |

Actual endpoint extraction followed `resources[].displayName` plus `urls[].url`, not an assumed scalar URL field. The allocated private-container URLs were `http://localhost:44531` and `http://localhost:40195`; they are historical test endpoints, no longer running.

The standard payload layout and extraction checks were retained. No validation bypass, empty-payload placeholder, or custom fake executable was used.

## Resource cleanup

The lifecycle asserted no running inner containers after `aspire stop`. The final inner-Docker listing briefly retained one **stopped** Redis object (`Exited (137)`) before daemon teardown; no running workload was left. The private daemon was then stopped and waited, and the outer `--rm` container was removed, discarding its private daemon storage and remaining stopped objects.

All owned ephemeral build, provenance, and runtime containers had finished and were absent in the final `docker ps -a --filter name=aspire-managed` check. No host socket or host-published application port was used. No shared Docker prune/restart or image/volume deletion was performed by this phase.

The private runtime image, exact source/intermediate volume, portable artifacts, session dependency caches, and evidence are intentionally retained. The Docker execution slot was returned to the parent after the lifecycle/cleanup passed.

Space records:

- Before successful managed build: about 52.7 GiB available.
- After runtime image: about 44.8 GiB available.
- During runtime observation: about 37.9 GiB available.
- After runtime cleanup: about 38.5 GiB available.
- After final packaging/inspection: about 43.3 GiB available.

All recorded values stayed above the 10 GiB stop threshold. Small changes between observations can include other activity on this shared host; no exclusive attribution is made.

## Errors and infrastructure caveats

1. A preliminary ARM64-host cross-publish with `-r linux-x64` produced an x64 compiler-analyzer assembly that could not load in the ARM64 compiler process (`CS8034`, incompatible architecture). The successful recipe uses the matching **x64 SDK under emulation**. No product code or compiler-analyzer bypass was introduced.
2. Between two calls, the workspace's entire ignored `artifacts/` directory disappeared, including older baseline paths and the first attempt's log. The parent independently observed its own ignored `.runs` directory disappearing and confirmed it had not deleted this workspace. The cause is **unknown**; no attribution to Aspire, Docker, the parent, or external cleanup is established. The exact source commit remained clean. This phase moved all new logs, outputs, fixtures, and caches into session files and reconstructed the fixture from its immutable source archive.
3. Consequently, the prior report's historical ARM64 hashes/results remain historical evidence, but its old worktree artifact paths must **not** be claimed as currently available. This successful x64 archive is in the durable location given above and was independently checksum-verified.
4. The earlier shipping/native build's storage failure is not repaired by claiming this configuration is NativeAOT. This is a separate verified non-AOT alternative. No native ILC job ran in the successful build.
5. The obsolete SDK package pack emitted the repository's missing-readme advisory; no relevant build or lifecycle command failed in the successful sequence.
6. Raw lifecycle snapshots can contain synthetic, generated runtime connection values and ephemeral access URLs. Keep raw logs private as evidence; use `logs/resource-summary.json` and this report for public ledger summaries.

## Scope and compatibility limits

- Verified target is **Linux x64/glibc** in the recorded Ubuntu .NET 10 private-Docker environment. macOS, Windows, Alpine/musl, other architectures, and arbitrary older distributions are not proved by this result.
- CLI, Dashboard, TerminalHost, and Server v2 component target .NET 11; they carry their own self-contained runtimes. The managed helper targets .NET 10 and is also self-contained. The Bingo application and file-based AppHost remain .NET 10 and use the private SDK 10.0.100.
- The bundle contains all standard Linux components. Actual runtime coverage is the **legacy C# Bingo** workflow, including Dashboard startup as part of the AppHost. Server v2/ATS guest execution and TerminalHost-specific interactions were not separately exercised.
- No production signing, NativeAOT performance equivalence, broad test-suite pass, release readiness, or all-language integration compatibility is claimed.
- Readiness here means the exact source-built **nonshipping managed** baseline can reproduce this fixture's isolated Bingo lifecycle. Parent integration into a Harbor task must retain the exact archive/fixture/package/source configuration and its private-Docker constraints.

## Matched treatment requirements

Keep the portable artifact hash, exact source commit, recipe, runtime image digests, fixture overlay, and resolved third-party inputs as the control provenance. A treatment must use a separate origin-backed app-managed branch/worktree from the same base and record its actual patch/commit, dirty state, commands, and artifact hashes.

Use the **same managed/non-AOT/untrimmed** configuration, SDK, target architecture, package/version identity semantics, runtime image, and unchanged fixture model on both sides. A NativeAOT treatment compared against this managed control would confound the intended treatment. Use separate output/cache identities to avoid stale packages and repeat normal extraction plus this lifecycle before submitting benchmarks.

The earlier bounded candidate remains the no-running-AppHost non-follow JSON snapshot contract. No treatment implementation was made here.

## Evidence index

Sibling scripts: `build-stage.sh`, `run-build.sh`, `Dockerfile.runtime`, `run-runtime.sh`, `run-lifecycle.sh`.

Important durable output files:

- `logs/{managed,dashboard,terminal,server,layout,cli}.log`
- `logs/package-*.log`
- `logs/host-space.log`
- `logs/package-provenance.json`
- `logs/assembly-versions.json`
- `logs/fixture-overlay.diff`
- `logs/runtime-image.log`, `runtime-image-inspect.json`, `outer-runtime-isolation.json`
- `logs/runtime-console.log`, `outer-container-cleanup.txt`
- `logs/resource-summary.json`, `portable-verification.json`
- `lifecycle/setup.stdout`, `setup.stderr`
- `lifecycle/start.stdout`, `start.stderr`
- `lifecycle/wait-boardadmin.stdout`, `wait-bingoboard.stdout`
- `lifecycle/describe.json`, `endpoints.json`, `admin-health.txt`, `frontend.html`
- `lifecycle/stop.stdout`, `stop.stderr`, `ps-after-stop.json`
- `lifecycle/private-docker-running.txt`, `private-docker-final.txt`, `private-dockerd.log`
- `lifecycle/lifecycle.exit`, `started-at.txt`, `finished-at.txt`
- `provenance/*`, `SHA256SUMS`, `PORTABLE-SHA256SUMS`

No upstream push, PR, model run, or source-code change was performed.
