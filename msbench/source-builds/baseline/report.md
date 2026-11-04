# Aspire agentic-development source-build baseline

## Result and scope

Verified one unchanged-source baseline: a self-contained, single-file, **managed Linux ARM64 CLI** plus three matching core Hosting NuGet packages. The CLI runs after offline extraction of the portable archive, and a separate .NET 11 program loads the built Hosting package and builds the expected application model.

This is suitable for bounded CLI output-contract experiments. It is **not a complete Aspire bundle, a verified Bingo orchestration environment, or a Linux x64 Harbor image**. No benchmark was submitted. No product files were changed, committed, pushed, or proposed in a PR.

## Source provenance

| Field | Verified value |
| --- | --- |
| Origin, fetch and push | `https://github.com/microsoft/aspire.git` (not a fork) |
| Worktree | `/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-upgraded-couscous` |
| App-managed branch | `sebros/agentic-build-baseline` |
| Previous generated branch | `sebros/upgraded-couscous` |
| HEAD, base commit, and local `origin/main` | `d698a4f9cb800649791da2b3d81c5850330072c1` |
| Base commit subject | `fix(ci): Fix internal build (#21774)` |
| Base commit author date | `2026-11-04T17:27:25-05:00` |
| Dirty status, before and after | Clean: `git status --porcelain=v1` emitted no entries |
| Build version | `17.0.0-baseline.gd698a4f9cb80` |
| First provenance capture | `2026-11-04T22:49:21Z` |
| Successful source build | `2026-11-04T22:51:21Z` to `2026-11-04T22:52:15Z` |

`origin/main` was inspected locally, not fetched. This baseline does not claim to be the latest remote commit after the recorded time. Other existing remotes were not used or changed. The main checkout was not read or modified.

The successful build consumed a `git archive` of the exact clean commit on a Docker-managed Linux filesystem. It did not consume unstaged host files. The archive is retained as:

`/Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline/source-d698a4f9cb800649791da2b3d81c5850330072c1.tar`

SHA256: `03ce952b043901e099e05a14a9df03dec8b76714f41df0ec3c2c036da1f313da`

The worktree `.git` file points to host metadata unavailable inside the container. Therefore the commands explicitly supplied the verified `SourceRevisionId`, `RepositoryCommit`, and `RepositoryUrl`, with `EnableSourceControlManagerQueries=false`. All three resulting `.nupkg` repository elements were checked for the exact full commit and origin. Assembly informational versions contain the explicit version suffix, **not an additional full commit hash**.

## Build environment and instructions

- Host: macOS 15.8, Darwin ARM64.
- Build/runtime container: Ubuntu 26.04, Linux ARM64, glibc 2.43.
- Existing, cached image: `mcr.microsoft.com/dotnet/sdk:11.0.100-rc.2`.
- Image ID and reported repo digest: `sha256:e2438fd800a09d2d761aefe4edd30675c8f1db8958e4423c0844cc9a0240e60f`.
- SDK: `11.0.100-rc.2.26504.105`, exact `global.json` pin; SDK commit `820230c386`.
- MSBuild: `18.12.0-1.26504.105+820230c38`.
- Runtime: `11.0.0-rc.2.26504.105`, ARM64.
- Configuration: Release.
- CLI target: `net11.0`, `linux-arm64`, `PublishAot=false`, `PublishSingleFile=true`, self-contained.
- Core Hosting and Hosting.Dotnet targets: `net10.0`.
- Hosting.AppHost targets: `net10.0;net11.0`; its package also embeds MSBuild tasks for `net10.0` and `net472`.
- Default CLI acquisition-channel metadata: `local`, as configured by `Aspire.Cli.csproj`.

Read `docs/contributing.md`, `global.json`, `eng/Versions.props`, the build entry points, `localhive.sh`, `eng/Bundle.proj`, and the selected project/dependency definitions before building. `docs/contributing.md` documents source CLI execution, local package generation, and portable `localhive` archives. Direct project restore/publish/pack was chosen to avoid building every integration, obsolete AppHost SDK, template, test, dashboard, native server, and tray.

The exact pinned SDK was already installed in the cached Docker image. Project-scoped `dotnet restore` ran before publish/pack. No `restore.sh` SDK bootstrap was required, no global SDK/tool installation was changed, and no package feeds or repository manifests were edited. NuGet restore/cache output is isolated under this worktree's ignored artifacts directory. The obsolete `Aspire.AppHost.Sdk` was not needed for this current-core baseline.

## Reproduction commands

Persistent evidence directory:

```text
/Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline
```

Exact successful top-level build command:

```bash
bash /Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline/run-container.sh
```

That retained script verifies HEAD and cleanliness, exports the commit, and invokes `build-linux.sh` in the pinned container. Docker source volume: `aspire-agentic-baseline-source-81fbe89f`. Container source path: `/src`; published artifact path: `/out`; worktree-isolated NuGet cache: `/cache`.

The exact build commands and MSBuild arguments are in `build-linux.sh` and `artifacts/agentic-baseline-linux/logs/build.log`. The operative commands are:

```bash
common=(
  -p:SourceRevisionId=d698a4f9cb800649791da2b3d81c5850330072c1
  -p:RepositoryCommit=d698a4f9cb800649791da2b3d81c5850330072c1
  -p:RepositoryUrl=https://github.com/microsoft/aspire
  -p:EnableSourceControlManagerQueries=false
  -p:VersionSuffix=baseline.gd698a4f9cb80
)
dotnet restore src/Aspire.Cli/Aspire.Cli.csproj -p:RuntimeIdentifier=linux-arm64 -p:PublishAot=false "${common[@]}"
dotnet publish src/Aspire.Cli/Aspire.Cli.csproj --no-restore -c Release -r linux-arm64 --self-contained -p:PublishAot=false -p:PublishSingleFile=true -o /out/cli "${common[@]}" -bl:/out/logs/cli-publish.binlog
for project in Aspire.Hosting Aspire.Hosting.AppHost Aspire.Hosting.Dotnet; do
  dotnet restore "src/$project/$project.csproj" "${common[@]}"
  dotnet pack "src/$project/$project.csproj" --no-restore -c Release -o /out/packages "${common[@]}" -bl:"/out/logs/$project-pack.binlog"
done
```

The scripts are evidence, not product changes. The preserved Docker volume and NuGet cache permit inspection/repetition; use a fresh, isolated volume and cache for any matched-treatment build. A repeatable recipe is established, not a claim that timestamps, archives, or provenance captures reproduce byte-for-byte.

## Persistent artifacts and SHA256

All paths below are relative to:

`/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-upgraded-couscous/artifacts/agentic-baseline-linux`

| Artifact | SHA256 |
| --- | --- |
| `aspire-agentic-baseline-linux-arm64.tar.gz` | `a166a9f469a90931b36ea53f9bed568f577fc46f19e2d4fba5bc64f7fbceee6e` |
| `cli/aspire` | `3a80602e141af72f27131073ebf656c5e16ec54e71e716a1a2c821500ae64c73` |
| `cli/libhex1binterop.so` | `285d3f2994da13cc31bd29e757d34adca86c9777248a9898f57eef44368e84fc` |
| `packages/Aspire.Hosting.17.0.0-baseline.gd698a4f9cb80.nupkg` | `f408b5f542a1aa8e1740800185bc079e11b06bdda218d1985fdd38c0d610c759` |
| `packages/Aspire.Hosting.AppHost.17.0.0-baseline.gd698a4f9cb80.nupkg` | `c50a764ac1995c246e1020275a16b02f898274a07e26572256e795e47fcfae54` |
| `packages/Aspire.Hosting.Dotnet.17.0.0-baseline.gd698a4f9cb80.nupkg` | `3f979620c0a4833e1fa84b7c6cd5c7d3413e177b3731c75ee99a24cca74db7bb` |

Archive size: 54,049,491 bytes. CLI size: 130,581,127 bytes. Keep the entire `cli` directory, including `libhex1binterop.so`, rather than copying only `aspire`.

The archive contains `cli/`, `packages/`, resolved build inputs under `provenance/`, and `SHA256SUMS`. The manifest covers every file in those directories. Its checksums passed after extraction to `/portable` in a fresh offline container.

`provenance/*.project.assets.json` preserves the resolved CLI, TypeSystem, Hosting, Hosting.AppHost, and Hosting.Dotnet dependencies. `provenance/dotnet-info.txt`, `cli-ldd.txt`, and `glibc.txt` record the exact SDK/runtime environment. Separate raw binaries and MSBuild binlogs remain in the Docker source volume or worktree artifact logs.

## Actual runtime validation

All checks below used the built artifact path, never a globally installed `aspire`.

| Check | Result and evidence |
| --- | --- |
| `/out/cli/aspire --version` | Exit 0; `17.0.0-baseline.gd698a4f9cb80` |
| `/out/cli/aspire describe --help` | Exit 0; expected resource argument and table/JSON/Mermaid formats |
| `/baseline/cli/aspire ps --format json --non-interactive --nologo` | Exit 0; stdout `[]` in an offline, empty environment |
| Extract archive; `sha256sum --quiet -c SHA256SUMS` | Exit 0; all archived files match |
| `/portable/cli/aspire --version` and `ps --format json ...` | Exit 0; same version and `[]` after independent offline extraction |
| Local Hosting model smoke | Exit 0; exact built package version loaded; one `ExecutableResource` named `baseline-probe` |
| Package provenance inspection | All three packages have the exact version, origin URL, and full base commit |

Hosting smoke command: `dotnet /baseline/smoke/BaselineModelSmoke.dll`, in the pinned container with `--network none`. Its actual output:

```json
{"HostingVersion":"17.0.0-baseline.gd698a4f9cb80","Runtime":".NET 11.0.0-rc.2.26504.105","Architecture":"Arm64","Resources":[{"Name":"baseline-probe","Type":"ExecutableResource"}]}
```

The smoke references exact-version local Hosting and Hosting.Dotnet packages, restores outside the repository from the local package directory plus the approved `dotnet-public` feed, then compiles with zero warnings/errors. It builds and disposes an application model; **it does not start DCP, launch that executable resource, or validate the AppHost package's full orchestration path**. Smoke source and build script are retained under the evidence directory's `smoke/` and `smoke-linux.sh`; compiled smoke files are under `artifacts/agentic-baseline-linux/smoke/`, outside the portable archive.

## Errors and limitations

1. Initial Docker build from the macOS bind mount published the CLI but failed `dotnet pack Aspire.Hosting` with `DirectoryNotFoundException: Could not find a part of the path '/src/src/Aspire.Hosting'`, inside NuGet `PathResolver.PerformWildcardSearch`. The directory existed and was visible to shell inspection. Retrying from the unchanged commit exported to a Docker Linux volume succeeded for all packages. This supports an environment/filesystem issue; no product fix or deeper root-cause claim was made. Do not use the incomplete first `artifacts/agentic-baseline` output as the baseline; that directory retains the isolated NuGet cache.
2. The initial Hosting smoke incorrectly expected the full commit to be appended to `AssemblyInformationalVersion`. The actual informational version is the exact supplied version only. The scratch probe was corrected to require that exact version; full commit/origin checks were separately performed against every package's repository metadata. The initial failed probe log was retained. No product rebuild/change was needed.
3. This CLI is managed/self-contained, **not NativeAOT**, and embeds no Aspire bundle. It omits DCP, dashboard, TerminalHost, polyglot/native AppHost server, templates, and integration packages beyond core .NET support. The core AppHost package expects a matching CLI bundle for standard C# orchestration, so these packages alone do not prove `aspire run`, `new`, or Bingo succeeds.
4. Verified platform is Linux **ARM64/glibc** only, in Ubuntu 26.04. ELF inspection reports AArch64 and `/lib/ld-linux-aarch64.so.1`. Native dependencies include libc, libstdc++, libgcc, libm, libdl, librt, and libpthread. Full .NET system/globalization dependencies must also exist in the target image. There is no claim of Alpine/musl, older-distribution, macOS-native, Windows, or Linux x64 compatibility.
5. Self-contained CLI execution does not require a separate .NET runtime installation, but project operations still need a suitable SDK. Hosting libraries target .NET 10; the verified consumer smoke targets .NET 11. A .NET 10 consumer/runtime was not executed.
6. This is not ready to place into an x86-64 Harbor task unchanged. Confirm task architecture first. A Linux x64 build and actual execution in the intended x64 image are needed for x64 Harbor, along with matched bundle/package/template dependencies and a real Bingo start/wait/describe/stop smoke.
7. Repository unit/E2E suites were not run because no product code changed. The evidence is targeted publish/pack, package-metadata checks, offline CLI execution, extracted-archive checks, and the out-of-tree Hosting model smoke. No GitHub/Azure build was triggered.

## One bounded treatment candidate

**Make successful no-AppHost JSON snapshot output parseable for `aspire describe --format json` and its `resources` alias.**

Actual baseline reproduction, in a fresh offline container with no AppHosts:

```bash
/baseline/cli/aspire describe --format json --non-interactive --nologo
```

Observed exit code: `0`; stdout: **0 bytes**; stderr:

```text
Scanning for running AppHosts...
No running AppHost found. Use 'aspire run' to start one first.
```

The informational line has the CLI's informational emoji prefix in the raw log. Candidate treatment: for the narrowly identified no-running-AppHost success case in **non-follow JSON mode**, emit the existing snapshot wrapper `{"resources":[]}` to stdout. Preserve exit 0 and stderr diagnostics. Preserve errors for invalid explicit paths, failed discovery, ambiguous AppHosts, or missing named resources. Do not convert genuine failures into successful empty results, and do not alter table, Mermaid, or NDJSON-follow behavior.

Evidence and seams:

- `src/Aspire.Cli/Commands/DescribeCommand.cs:172-175`: unsuccessful connection resolution returns the informational handler before JSON snapshot serialization.
- `src/Aspire.Cli/Commands/AppHostConnectionResultHandler.cs:22-33`: non-project-resolution failure is intentionally reported as success.
- `src/Aspire.Cli/Backchannel/AppHostConnectionResolver.cs:214-216`: no discovered connections produces the no-AppHost result.
- `tests/Aspire.Cli.Tests/Commands/DescribeCommandTests.cs:36-49`: existing test covers success with no AppHost, but not JSON stdout.
- `tests/Aspire.Cli.Tests/Commands/DescribeCommandTests.cs:251-279`: snapshot wrapper prior art.
- `tests/Aspire.Cli.Tests/Commands/DescribeCommandTests.cs:1173-1190`: Mermaid no-AppHost behavior explicitly remains empty stdout.
- `docs/specs/cli-output-formats.md:298-343`: related snapshot/stream contracts to update on the future treatment branch.

Later treatment tests should invoke the real command infrastructure with separate stdout/stderr writers, use complete JSON/snapshot assertions rather than substring absence checks, and cover: both command aliases producing exactly one empty resources wrapper; existing empty-but-connected model output; nonzero errors retaining their semantics; unchanged table/Mermaid/follow behavior. Also repeat the exact offline binary reproduction against both control and treatment. No candidate implementation or tests were added in this baseline.

Focused future command:

```bash
dotnet test --project tests/Aspire.Cli.Tests/Aspire.Cli.Tests.csproj --no-launch-profile -- --filter-class "*.DescribeCommandTests" --filter-not-trait "quarantined=true" --filter-not-trait "outerloop=true"
```

## Matched control/treatment requirements

Keep this clean source branch and the immutable archive/hashes as the control provenance. Create treatment from the exact base commit in a separate app-managed origin-backed worktree, then record its actual patch/commit, dirty state, image digest, SDK, target RID, configuration, commands, package identities, and artifact hashes in the parent's evidence ledger.

Use the same pinned build image, build flags, source-export path, local channel semantics, and resolved third-party dependencies on both sides. Avoid sharing per-build output directories or package-version caches. Give each artifact tree a distinct filesystem location; choose version labels deliberately and keep any identity-sensitive behavior equal. Do not benchmark a new-version treatment against a stale cached control package.

For the bounded no-AppHost output-contract comparison, the present unbundled CLI is sufficient once a matching treatment is built. For actual Bingo task comparisons, first provision and verify the full matching payload on the **task's actual architecture**, using the same packaging recipe for control/treatment. Add only task-required integration packages and run an actual Bingo lifecycle smoke before any benchmark submission. That work is outside this one-baseline scope.

## Evidence index and retention

Under the session evidence directory:

- `source-provenance.log`: original source/branch/origin/dirty/image capture.
- `build-linux.sh`, `run-container.sh`: exact successful source-build recipe.
- `docker-build.log`, `hosting-pack-diagnostic.log`: initial bind-mount attempt and NuGet stack trace.
- `docker-linux-volume-build.log`: successful source publish/pack transcript.
- `final-cli-runtime.log`: exact version, `ps`, and no-AppHost JSON observation.
- `portable-archive-runtime.log`: independent offline extraction/checksum/CLI checks.
- `hosting-smoke-build.log`, `hosting-runtime.log`: final successful Hosting model smoke.
- `hosting-runtime-initial-failed.log`: retained scratch-probe assumption failure.
- `artifact-hashes.log`: artifact manifest and portable archive SHA256.
- `source-d698a4f9cb800649791da2b3d81c5850330072c1.tar`: exact source snapshot.

Under `artifacts/agentic-baseline-linux/logs/`: the successful build transcript, CLI publish binlog, three package binlogs, raw stdout/stderr and exit capture for the contract candidate, and `package-provenance.json`.

All named Docker run containers were ephemeral and exited; no server or benchmark process was left running. The worktree, source-volume, local NuGet cache, output artifacts, archive, scripts, and logs were intentionally retained for the parent ledger and later matched builds.
