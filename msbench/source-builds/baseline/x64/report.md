# Complete Linux x64 source baseline: evidenced storage blocker

## Outcome

**Blocked before a complete Linux x64 artifact or Bingo lifecycle could be verified.** The documented complete bundle build ran from the exact baseline source, successfully published the Linux x64 managed helper, and reached Dashboard NativeAOT object emission. The initial missing-linker prerequisite was resolved in a private builder image. The subsequent attempt failed with filesystem I/O errors, read-only temporary paths, and an I/O failure in Docker's containerd metadata database while the host backing filesystem was at 100% capacity.

No prebuilt Aspire CLI/PR payload was substituted. No ARM64 baseline was presented as x64-compatible. No Bingo AppHost was started, no model benchmark was submitted, and no global SDK/tool installation, product file, upstream branch, or PR was changed. The original verified ARM64 baseline and exact no-AppHost JSON proofs were rehashed and preserved.

## Unchanged source and platform provenance

| Field | Value |
| --- | --- |
| Origin | `https://github.com/microsoft/aspire.git` |
| Worktree | `/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-upgraded-couscous` |
| Branch | `sebros/agentic-build-baseline` |
| HEAD/base | `d698a4f9cb800649791da2b3d81c5850330072c1` |
| Dirty status | Clean before and after the compatibility phase |
| Source input | Original exact-commit `git archive`, extracted into a distinct Docker volume |
| Source archive SHA256 | `03ce952b043901e099e05a14a9df03dec8b76714f41df0ec3c2c036da1f313da` |
| x64 source volume | `aspire-agentic-baseline-x64-source-81fbe89f` |
| Requested product version | `17.0.0-baseline.gd698a4f9cb80` |
| Target/configuration | `linux-x64`, Release |
| x64 SDK image | `mcr.microsoft.com/dotnet/sdk@sha256:db7d1f28c0805ea69fe43f73e54cffd2a0689a0c637a6078328e27c5aab2314a` |
| Actual x64 SDK | `11.0.100-rc.2.26504.105`, exact `global.json` pin |
| Actual x64 runtime | `11.0.0-rc.2.26504.105` |
| Actual container platform | Ubuntu 26.04, Linux x86_64 under Docker Desktop emulation on an ARM64 macOS host |
| Native-prerequisite image | `aspire-agentic-baseline-x64-builder:d698a4f9` |
| Builder image ID reported by Docker | `sha256:ec10f1b7f59571ca5c375f058e6b288da6afac6e2b9741bcdf0f74bf7fb57e58` |

The x64 SDK image was pulled explicitly using `--platform linux/amd64`; the original cached ARM64 image remains pinned by its original digest. Only private Docker images received additional tools. The private builder installed `clang` and `zlib1g-dev` after the missing-linker failure; its build transcript records the actual resolved OS package versions. No repository SDK pin, package manifest, feed configuration, or shared Docker settings were edited.

## Smallest documented complete build at this commit

The authoritative local complete-payload path is `eng/Bundle.proj`, documented in `docs/specs/bundle.md` under **Build Process** and in `docs/contributing.md` under **localhive**. For this fixed Bingo fixture, avoid a repository-wide all-integration `localhive` pack and use:

1. The complete Linux x64 bundle target, including the final CLI.
2. Exact-version packages for `Aspire.Hosting`, `Aspire.Hosting.AppHost`, `Aspire.AppHost.Sdk`, `Aspire.Hosting.Redis`, `Aspire.Hosting.PostgreSQL`, and `Aspire.Hosting.JavaScript`.

All six packages must come from this same commit/version. The legacy fixture does not need `Aspire.Hosting.Dotnet` while its retained `AddProject<T>` compatibility model is used. A future intentional migration to `AddDotnetProject` would change that package set and the model and must not be silently mixed into a control.

`eng/Bundle.proj` publishes the self-contained `Aspire.Managed`, NativeAOT Dashboard and TerminalHost, native AppHost Server v2, target-platform DCP, payload layout/archive, and finally the NativeAOT CLI with the payload embedded. Linux has no tray requirement. Although legacy C# Bingo does not opt into native Server v2, the current complete layout tool requires that payload. `SkipNativeBuild=true` only skips the final CLI, not the native payload components. `SkipManagedBuild=true` requires existing matching component outputs; neither switch makes missing payloads optional.

The exact attempted command, from `/src` in the pinned/private x64 container, was:

```bash
dotnet msbuild eng/Bundle.proj /t:Build \
  /p:TargetRid=linux-x64 /p:Configuration=Release \
  /p:VersionSuffix=baseline.gd698a4f9cb80 \
  /p:SourceRevisionId=d698a4f9cb800649791da2b3d81c5850330072c1 \
  /p:RepositoryCommit=d698a4f9cb800649791da2b3d81c5850330072c1 \
  /p:RepositoryUrl=https://github.com/microsoft/aspire \
  /p:EnableSourceControlManagerQueries=false \
  -bl:/out/logs/complete-bundle.binlog
```

The matching values were also exported in the container environment so the bundle target's child `dotnet` commands inherit source/version identity. Package restore occurs as part of the child `dotnet publish` commands. The SDK was present and exact; another repository-local SDK bootstrap was not necessary for the reached build stages.

Exact scripts are retained next to this report:

- `build-complete.sh`: environment and complete bundle command.
- `run-complete.sh`: exact source/cleanliness checks, Docker volume extraction, pinned-image invocation and logging.
- `Dockerfile.builder`: exact base image and missing-native-prerequisite installation.
- `build-fixture-packages.sh`: same-commit six-package restore/pack recipe.

**Do not rerun these scripts while Docker storage remains unhealthy.** The original `run-complete.sh` captures the stock-SDK attempt; the successful prerequisite-image build and subsequent third bundle invocation are recorded separately below.

## Actual attempts and distinct failures

All paths in this section are relative to the worktree.

| Attempt | Actual progress | Result |
| --- | --- | --- |
| x64 SDK execution probe | `dotnet --info` ran as Linux x86_64 and reported the exact SDK pin | Passed |
| First source extraction, x64 `tar` | Failed to create nested source paths with `Function not implemented` under emulation | Exit 2; no product build started |
| Alternate `11.0.100-rc.2-noble` tag probe | Requested a different Ubuntu base with the same SDK pin | Tag not found; no fallback product used |
| Source extraction via the existing pinned ARM64 image into the same dedicated volume, followed by x64 build | Managed helper restored, compiled, and published for Linux x64 | Extraction workaround succeeded |
| Complete bundle attempt 2, stock x64 SDK | Reached Dashboard publish | Exit 1: native linker `clang` or `gcc` absent |
| Private NativeAOT prerequisite image | `apt-get install --no-install-recommends clang zlib1g-dev` | Image built successfully; missing linker resolved |
| Complete bundle attempt 3, prerequisite image | Managed helper republished; Dashboard reached `Generating native code` | Docker/build storage I/O failure; outer command exit 125 |
| Architecture-neutral fixture-package build in the existing ARM64 source volume | Repacked exact-commit Hosting package, then began AppHost restore | Parallel job failed loading runtime `libSystem.Native.so` with I/O error; outer exit 125 |

The third bundle attempt was launched as:

```bash
docker run --rm --platform linux/amd64 \
  --name aspire-baseline-x64-build-81fbe89f \
  --mount type=volume,source=aspire-agentic-baseline-x64-source-81fbe89f,target=/src \
  --mount type=bind,source="$PWD/artifacts/agentic-baseline/nuget",target=/cache \
  --mount type=bind,source="$PWD/artifacts/agentic-baseline-x64",target=/out \
  --mount type=bind,source=/Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline,target=/evidence,readonly \
  --workdir /src aspire-agentic-baseline-x64-builder:d698a4f9 \
  bash /evidence/x64/build-complete.sh \
  > artifacts/agentic-baseline-x64/logs/complete-build-attempt3.log 2>&1
```

The package job used the same mounts except that `/src` came from the original exact-source volume and its executable image was the pinned ARM64 SDK, running `/evidence/x64/build-fixture-packages.sh`. Packages are architecture-neutral, but this was not represented as a native x64 bundle build. It failed before producing the complete fixture package set.

Decisive native failure:

```text
Error : Input/output error :
'/src/artifacts/obj/Aspire.Dashboard/linux-x64/Release/net11.0/linux-x64/native/Aspire.Dashboard.o.tmp'
System.IO.IOException : Input/output error
...
Failed to delete the temporary file ... Read-only file system
...
Error waiting for container:
write /var/lib/desktop-containerd/daemon/io.containerd.metadata.v1.bolt/meta.db: input/output error
```

The independent package job also reported:

```text
libSystem.Native.so: cannot open shared object file: Input/output error
Failed to create CoreCLR, HRESULT: 0x80131524
```

The host's `df -h .` changed from 31 GiB available before the phase to about 1.2 GiB available / 100% capacity at failure. A later read showed 2.8 GiB available, still 100% reported capacity. The reported 860 GiB free *inside* the initial container did not establish sufficient physical backing capacity for Docker Desktop's sparse disk.

The compiler emitted the existing expected `IL2026` framework reflection warning before failing; the fatal condition was I/O, not that warning. NuGet also emitted `NU1903` for the pinned `Microsoft.DotNet.ILCompiler` version, referencing `https://github.com/advisories/GHSA-p3jp-9v83-76w9`. This warning is preserved in logs, not remediated by changing the requested SDK/source.

No complete payload archive was created, the final x64 CLI publish was not reached, and no source-built x64 `aspire --version` or Bingo lifecycle succeeded. No linker/architecture/compatibility success is inferred from managed-helper compilation.

## Exact legacy Bingo compatibility inspection

Fixture source: `sebastienros/aspire-bench` commit `baacba3e17181491c9a4d419db7d0e6763c3d363`, path `msbench/bingo/common/aspire-app`.

The fixture archive was downloaded through authenticated `gh api` and retained as `bingo-source-baacba3e.tar.gz` next to this report. SHA256: `7b74962cdc10ebffd35be3bc7b1fa43c39de077eaeabdd0109d4e4a6198aaf58`.

Unmodified extracted fixture: `artifacts/agentic-baseline-x64/bingo-original`. A separate `bingo-overlay` copy was staged but **no overlay was applied** before the storage blocker. A complete directory comparison confirmed the two are identical.

Observed original fixture:

- File-based `apphost.cs` pins `Aspire.AppHost.Sdk@13.6.0`.
- AppHost package directives pin PostgreSQL, Redis, and JavaScript Hosting packages at `13.6.0`; central package entries repeat these versions.
- The model uses generated `Projects.BingoBoard_*` types with `AddProject<T>`, plus Redis, Postgres/database, Vite, health checks, HTTP commands, and custom command results.
- `AspireUseCliBundle=true` is already set.
- `global.json` pins .NET SDK `10.0.100` with `rollForward=latestFeature`, `allowPrerelease=false`.
- The application projects target `net10.0`.
- The fixture's original NuGet configuration is nuget.org-only; it cannot resolve the unpublished local `17.0.0-baseline...` package set without a fixture-local source overlay.

Static evidence at the exact Aspire base supports a **fixture-only package/version/source overlay as the first compatibility path, not a required whole-model rewrite**:

| Evidence at `d698a4f9` | Consequence |
| --- | --- |
| `src/Aspire.AppHost.Sdk/Aspire.AppHost.Sdk.csproj:1-17` remains packable | Legacy SDK package still exists |
| `src/Aspire.AppHost.Sdk/SDK/Sdk.in.props:1-20` retains `IsAspireHost`, workload marker, and Microsoft.NET.Sdk import | Legacy SDK still composes the C# build |
| `src/Aspire.AppHost.Sdk/SDK/Sdk.in.targets:20-43` defaults `TreatProjectReferencesAsResources=true` | Legacy `#:project` resource metadata path is retained |
| Same targets `:62-66` issue warning `ASPIRE012`, not an unconditional migration error | Obsolete SDK is retained for staged migration |
| `src/Aspire.Hosting.AppHost/build/Aspire.Hosting.AppHost.in.targets:51-107` generates `Projects.* : IProjectMetadata` classes | Generic `AddProject<Projects.BingoBoard_*>` metadata model is still represented |
| `src/Aspire.Hosting/ProjectResourceBuilderExtensions.cs:71-77` and `:188-197` retain generic `AddProject` overloads marked `[Obsolete]` without `error: true` | Replacement with `AddDotnetProject` is recommended, not statically mandatory |
| Hosting and the fixture integrations target `net10.0`; AppHost package includes `net10.0;net11.0` | The application's existing .NET 10 target is not statically incompatible |
| AppHost targets `:163-166` error `ASPIRE010` when CLI bundle use is disabled | The standalone minimal managed baseline cannot substitute for the complete matching payload |

The candidate scratch overlay would update **all** relevant Aspire SDK/package pins from `13.6.0` to `17.0.0-baseline.gd698a4f9cb80`, including central entries, and route `Aspire.*` restores to only the exact local package directory. The application project model and SDK 10 pin should remain unchanged for the first compatibility attempt; a private runtime image must therefore carry .NET SDK/runtime 10 in addition to the complete self-contained Aspire payload. The CLI's own .NET 11 build target does not by itself require rewriting Bingo as a .NET 11 AppHost.

**This is static compatibility evidence, not a passing compilation or lifecycle result.** The complete SDK/integration package set was not produced, no fixture compile was executed, and the HTTP/custom-command surfaces were not runtime-validated. Any subsequent actual compile failure could expose further required fixture deltas. Do not claim that a version-only overlay has already been proved sufficient.

The parent supplied a previously validated private-Docker recipe at `sebastienros/aspire-bench` commit `80365e57f03e1c37e507f5673ed03bc31b83608e`, path `msbench/aspire-health/tasks/cli-pr21279/environment`, and its `steps/startup/solution/solve.sh`. Those files were read only as prior art. Its prebuilt PR CLI/packages were **not fetched or used**.

## Lifecycle still required after storage recovery

The parent recipe requires a private Docker daemon, no host socket or published host ports, and fixture values `BENCH_RUN_ID=harbor-bingo`, `COMPOSE_PROJECT_NAME=harbor-bingo`, and `Parameters__admin_password=Benchmark1!`. That password is a public synthetic fixture input, not a host credential.

After producing and verifying the complete same-source x64 payload and six packages, create a private task image carrying the fixture's .NET 10 SDK/runtime, Node/npm, Docker client/daemon, and the local package/source overlay. Preserve the same fixture resource model first. Do not reuse the prior PR payload or point the model at unrelated published Hosting versions.

The exact application checks still to run in that private environment are:

```bash
aspire --version
aspire start --apphost /app/apphost.cs --launch-profile http \
  --non-interactive --isolated --format Json --nologo
aspire wait boardadmin --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo
aspire wait bingoboard --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo
aspire describe --apphost /app/apphost.cs --format Json --non-interactive --nologo
aspire stop --apphost /app/apphost.cs --non-interactive --nologo
```

Verify actual allocated HTTP URLs from `resources[].displayName` plus `urls[].url`, endpoint responses, migration completion, expected resource states, and absence of running task-owned application resources after stop. `start`, `wait`, `describe`, and `stop` were **not run** in this phase because a complete source artifact was not available.

## Cleanup status and precisely scoped candidates

No shared Docker prune, restart, image deletion, volume deletion, or broad filesystem cleanup was performed. After the failure inventory was preserved, only the 42 exact phase-new NuGet package/version directories identified below were removed with per-path checks.

Both owned build commands ended with Docker exit 125 after I/O errors. Explicit bounded stops were attempted for:

- `aspire-baseline-x64-build-81fbe89f` (observed container ID `5803425af9244f91bd64fcea43aa375244f9f2e50cac074f4142f45c4888ee36`).
- `aspire-baseline-bingo-package-build-81fbe89f` (observed container ID `7ff873784e71052684b25e3e3e20ee17c70d31f45d9278ad83612f0b65836160`).

Each `docker stop --time 10 <name>` was bounded by a 20-second subprocess timeout and timed out. An earlier `docker ps` inspection also hung and its client process was stopped. **Remote object removal/final container state remains unverified.** No Bingo private daemon or application resource was launched by this phase. The named source extraction and SDK probes used ephemeral containers and had completed before the metadata failure.

Phase-owned host paths, measured without Docker:

| Path | Allocated size | Disposition |
| --- | --- | --- |
| `artifacts/agentic-baseline-x64` | 5.2 MiB total | Only this phase's outputs |
| `artifacts/agentic-baseline-x64/logs` | 1.9 MiB | Preserve failure, cleanup, and cache-inventory evidence |
| `artifacts/agentic-baseline-x64/packages` | 1.8 MiB | Incomplete extra Hosting-only package output; not a usable Bingo package set |
| `artifacts/agentic-baseline-x64/bingo-original` | 740 KiB | Exact fixture source, retained evidence |
| `artifacts/agentic-baseline-x64/bingo-overlay` | 740 KiB | Identical unmodified duplicate; disposable if desired |
| Session `files/baseline/x64` before this report | 856 KiB | Preserve scripts and immutable fixture source archive |
| Existing `artifacts/agentic-baseline/nuget` | Grew from 2.3 GiB to 4.0 GiB | Do not remove the whole preexisting baseline cache |

`artifacts/agentic-baseline-x64/logs/new-cache-candidates.json` preserves the inventory of 42 newly introduced package/version directories totaling about 1,405.5 MiB allocated, selected by this phase's metadata times and excluding packages referenced by preserved original baseline assets.

The cleanup script validated **all 42 targets before deleting any**: each resolved to exactly one package/version directory under this isolated cache, no target or package parent was a symlink, none appeared in the original preserved baseline asset manifests, and each directory's allocated size still matched the captured inventory. The whole cache was not deleted.

Exactly 42 directories were then removed, totaling **1,473,822,720 allocated bytes**. `targeted-cache-cleanup.json` records every actual absolute deleted path and byte count, baseline-reference checks, timestamps, and before/after `df`. `cleanup-phase-cache.py` preserves the exact guarded cleanup operation.

Largest removed versions were `microsoft.netcore.app.runtime.linux-x64/10.0.13` (134.7 MiB), individual .NET 11 RC2 NativeAOT runtime packages (about 97-116 MiB each), `sqlite/3.53.4` (78.7 MiB), and `runtime.linux-x64.microsoft.dotnet.ilcompiler/11.0.0-rc.2.26504.105` (47.6 MiB). A resumed build will have to restore these phase-only downloads again.

Post-cleanup host disk: 926 GiB size, 900 GiB used, **4.0 GiB available, still 100% reported capacity**. Remaining isolated NuGet cache: 2.6 GiB. All **137 package/version directories** referenced by the preserved baseline asset manifests still exist, and all 42 exact cleanup targets are absent. This cleanup does not establish that Docker/containerd is healthy. No Docker retry followed cleanup. The original complete ARM64 `SHA256SUMS` manifest, archive, CLI, and exact JSON stdout/stderr evidence were reverified after cleanup and match their original hashes.

Potential large incomplete output is inside the **new** Docker volume `aspire-agentic-baseline-x64-source-81fbe89f`, notably the failed Dashboard `.o.tmp` path shown above. Its size cannot be inspected safely through the unresponsive daemon. The new builder image and x64 SDK image are identified above; their current reclaimable sizes are unverified. The host growth cannot be attributed entirely to this task in a shared environment. Do not manipulate or delete Docker Desktop's broad backing disk file to recover this one build.

Keep the original `aspire-agentic-baseline-source-81fbe89f` volume and `artifacts/agentic-baseline-linux` verified baseline separate from the incomplete x64 source/output.

## Integrity and evidence

Preserved original outputs:

| Artifact | SHA256 |
| --- | --- |
| Original `aspire-agentic-baseline-linux-arm64.tar.gz` | `a166a9f469a90931b36ea53f9bed568f577fc46f19e2d4fba5bc64f7fbceee6e` |
| Original `cli/aspire` | `3a80602e141af72f27131073ebf656c5e16ec54e71e716a1a2c821500ae64c73` |
| Original no-AppHost JSON stdout (0 bytes) | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Original no-AppHost JSON stderr | `2022e89493f73589d4cc020e0b4f093a86600065f3634e438790b14372583060` |

Failure evidence under `artifacts/agentic-baseline-x64/logs`:

| File | SHA256 |
| --- | --- |
| `complete-build-attempt1.log` | `7592f71b97abee3f1fae739868521b224e0c6a8453a589a94d2753cd1669b20f` |
| `complete-build-attempt2.log` | `73a5b5be687f99d9991f9d291f62e4da0ae6c42a2f8ba7aef90c5c0da3e9a069` |
| `complete-build-attempt3.log` | `0ae21a9a683935e8b789b23c47efeae2fc73c1a9a2d6808dfeeca3ca30f0a79e` |
| `fixture-package-build.log` | `820e68e4ea1084bb9020c33912474f514d5820d4175b86f6456c97c67df9e5f5` |
| `container-cleanup.log` | `dc4e6d1c3e5bca7ebc32bb12be964c1543945ac97670d6d99f44df07eb3edb1c` |

Also retain `builder-image.log`, `complete-bundle.binlog` (may be incomplete after I/O failure), `new-cache-candidates.json`, `targeted-cache-cleanup.json`, and this report's sibling scripts. There is **no final complete Linux x64 CLI/payload checksum to report**.

## Exact blocking prerequisite and next boundary

A **healthy, writable Docker storage backend with sufficient physical host backing capacity for NativeAOT object emission** is required before another attempt. The container's advertised virtual free space is insufficient evidence; containerd metadata writes and ordinary file operations must be healthy again. Recovery/space reclamation on this shared host is outside this bounded source-build task and was not attempted destructively.

After storage recovery, use the retained linker-prerequisite image and exact source/version recipe, finish the native Dashboard/TerminalHost/server/CLI payload, finish all six matched fixture packages, apply and record only the fixture overlay, then run the actual private Bingo lifecycle. Until those steps pass, the complete source-built x64 Bingo baseline is **blocked/unverified**, not compatible or benchmark-ready.
