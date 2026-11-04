# Aspire no-AppHost JSON contract trial

## Result

One isolated product-contract treatment is committed and proved. Successful, non-follow `aspire describe --format json` and its `resources` alias now emit the normal empty snapshot wrapper when no AppHost is running. Existing diagnostics and exit code 0 are preserved. Error results, table output, Mermaid output, and JSON-follow output retain their behavior.

The matching managed Linux ARM64 CLI was built from the exact clean treatment commit and executed after independent archive extraction in a fresh container with networking disabled. Both targeted Debug and committed-source Release runs passed all 66 `DescribeCommandTests` cases. No push, pull request, benchmark submission, x64 build, full bundle, or treatment Hosting package build was performed.

## Local branch ledger and source provenance

| Field | Value |
| --- | --- |
| Repository origin, fetch and push | `https://github.com/microsoft/aspire.git` |
| Worktree | `/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-glowing-spoon` |
| App-managed trial branch | `sebros/agentic-empty-json` |
| Previous generated branch | `sebros/glowing-spoon` |
| Baseline branch, left unchanged | `sebros/agentic-build-baseline` |
| Exact base and trial parent | `d698a4f9cb800649791da2b3d81c5850330072c1` |
| Change commit | `fafe64823d80e8f34fa5fc773ac9d9d9ba64f375` |
| Commit subject | `Emit empty JSON snapshots when no AppHost is running` |
| Commit trailer | `Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>` |
| Dirty state after commit and before build | Clean |
| Control build version | `17.0.0-baseline.gd698a4f9cb80` |
| Treatment build version | `17.0.0-emptyjson.gfafe64823d80` |
| Persistent evidence root | `/Users/sebastienros/.copilot/session-state/a53c2bbf-6e11-432d-b09d-a98d2944a049/files/empty-json` |

The branch was renamed through the app before any edits. This is an origin-backed worktree, not a fork. The baseline branch still resolves to the exact base. Other workspaces and the main checkout were not changed. The control archive was copied read-only from the baseline artifact location into this trial's evidence tree; its archive SHA256 and every archived checksum were verified.

The baseline report used was `/Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline/baseline-report.md`. `source-base.tar` reproduces the baseline source archive checksum exactly. `source-treatment.tar` is `git archive HEAD` of the clean treatment commit, not a dirty bind-mount build. Raw provenance is in `source-provenance.log` and `change-commit.log`.

## Contract and product changes

Read `AGENTS.md`, applicable CLI/XML-doc/temp-directory/test-review instructions, `docs/contributing.md`, `docs/specs/cli-output-formats.md`, command/resolver/result handling, existing tests and test services, build configuration, and the baseline recipe before implementing.

The documented command contract permits this treatment. JSON snapshots already use a `resources` wrapper. The previous "one or more" wording omitted a valid connected-but-empty model, which already produced an empty wrapper. The explicit empty-stdout contract is for Mermaid, not JSON. `DescribeCommand_WhenNoAppHostRunning_ReturnsSuccess` already established that no running AppHost is a successful empty result.

The product change is confined to the unsuccessful connection-result branch in `DescribeCommand.ExecuteAsync`. It first calls the unchanged `AppHostConnectionResultHandler.DisplayFailureAsInformation`, then invokes the existing empty snapshot serializer only when that handler returned success, the requested format is JSON, and follow is false. It does not change resolver error classification, catch errors, introduce a fallback for exceptions, or serialize an empty result for a nonzero exit.

Existing no-AppHost success semantics also apply if a name or an existing-but-not-running explicit AppHost was requested; this change does not invent a new failure in those cases. A missing resource in a connected AppHost still goes through the normal resource lookup and fails. Invalid explicit project paths and noninteractive ambiguity still fail before serialization.

Six committed files:

- `src/Aspire.Cli/Commands/DescribeCommand.cs`: reuse the existing serializer for the successful empty JSON snapshot.
- `docs/specs/cli-output-formats.md`: document zero-resource snapshots, diagnostics, errors, and empty follow streams.
- `tests/Aspire.Cli.Tests/Commands/DescribeCommandTests.cs`: seven targeted test methods, 15 test cases.
- Three generated Verify JSON baselines: both no-AppHost aliases and a connected empty AppHost, each containing the normal empty wrapper.

Coverage includes no-AppHost success for both aliases, a connected empty model, invalid explicit AppHost paths for both aliases, missing named resources in a connected model, discovery exceptions, noninteractive ambiguity, table/default/follow informational output, empty Mermaid output, and empty JSON-follow output. Existing connected-resource, NDJSON deduplication, follow disconnect, resource selection, and topology tests were run unchanged.

No CI job, selection gate, project, loose CI input, runtime fixture dependency, or quarantine/outerloop attribute changed; this trial does not require test-trigger-map changes.

## Exact runtime proof

All probes ran in separate fresh containers using the same pinned image, with `--network none`, the same empty working directory `/tmp/empty-workspace`, the same isolated home `/tmp/agentic-empty-json-home`, and the same environment/arguments. No sockets or AppHosts from the host were mounted. The control artifact was `/evidence/control/cli/aspire`; the treatment artifact was `/portable/cli/aspire`, independently extracted from the treatment archive and checksum-verified.

Primary command on each artifact:

```bash
aspire describe --format json --non-interactive --nologo
```

| Probe arguments, before shared `--non-interactive --nologo` | Control exit | Treatment exit | Control stdout bytes | Treatment stdout bytes | Control/treatment stderr bytes |
| --- | --- | --- | --- | --- | --- |
| `describe --format json` | 0 | 0 | 0 | 22 | 103 / 103 |
| `resources --format json` | 0 | 0 | 0 | 22 | 103 / 103 |
| `describe --format json --apphost missing.csproj` | 7 | 7 | 0 | 0 | 158 / 158 |
| `describe --format json --follow` | 0 | 0 | 0 | 0 | 103 / 103 |
| `describe --format mermaid` | 0 | 0 | 0 | 0 | 103 / 103 |
| `describe --format mermaid --follow` | 1 | 1 | 0 | 0 | 200 / 200 |
| `describe --format table` | 0 | 0 | 103 | 103 | 0 / 0 |
| `describe --format table --follow` | 0 | 0 | 103 | 103 | 0 / 0 |

Control JSON stdout is exactly zero bytes. Treatment JSON stdout is exactly the following 22 UTF-8 bytes, including its final newline:

```json
{
  "resources": []
}
```

Both primary JSON stderr streams are byte-for-byte identical. The following JSON-escaped representation preserves the exact informational emoji and newline bytes:

```json
"Scanning for running AppHosts...\n\u2139\ufe0f No running AppHost found. Use 'aspire run' to start one first.\n"
```

Invalid-path stderr preserves the error message `The --apphost option specified a project that does not exist.` Mermaid-follow stderr preserves `The Mermaid output format does not support --follow. Omit --follow to export a resource graph snapshot.` Both continue to print a diagnostic log path. Only that per-invocation log-file basename differs between control and treatment; `verify-comparison.py` normalizes exactly `cli_YYYYMMDDTHHMMSS_<8-hex>.log` for error-stream equality checks. Raw stderr files are not normalized. Every unaffected stdout and every non-error stderr stream matches byte-for-byte.

`comparison.json` stores every complete stdout/stderr string, byte count, and exit code, including the original error log paths. `control/probes/` and `treatment/probes/` preserve separate `.command`, `.stdout`, `.stderr`, and `.exit` files for all nine probes, including version. `logs/control-probes.log`, `logs/treatment-probes.log`, and `logs/comparison-verification.log` retain the summaries and assertion outcomes.

## Test evidence and exact commands

The pinned cached SDK was used, not the host's available RC3 SDK. `dotnet test` restored missing packages and built the smallest relevant test project; no full repository build was needed. All test selectors are MTP-native and exclude quarantined/outerloop cases.

Initial command, in `/src` in the pinned Linux ARM64 image:

```bash
dotnet test --project tests/Aspire.Cli.Tests/Aspire.Cli.Tests.csproj \
  --no-launch-profile -p:PublishAot=false \
  -p:SourceRevisionId=d698a4f9cb800649791da2b3d81c5850330072c1 \
  -p:RepositoryCommit=d698a4f9cb800649791da2b3d81c5850330072c1 \
  -p:RepositoryUrl=https://github.com/microsoft/aspire \
  -p:EnableSourceControlManagerQueries=false \
  -- --filter-class '*.DescribeCommandTests' \
  --filter-not-trait 'quarantined=true' --filter-not-trait 'outerloop=true'
```

- Initial run: exit 2, 63 passed and 3 expected new Verify snapshots failed because no baselines existed. Each received file was reviewed as exactly the empty wrapper and accepted by renaming it to `.verified.json`.
- Debug rerun: exit 0, 66 passed, 0 failed, 0 skipped. Raw log: `logs/tests-final.log`.

Final command against the exact committed source in the clean build volume:

```bash
dotnet test --project tests/Aspire.Cli.Tests/Aspire.Cli.Tests.csproj \
  --no-launch-profile -c Release -p:PublishAot=false \
  -p:SourceRevisionId=fafe64823d80e8f34fa5fc773ac9d9d9ba64f375 \
  -p:RepositoryCommit=fafe64823d80e8f34fa5fc773ac9d9d9ba64f375 \
  -p:RepositoryUrl=https://github.com/microsoft/aspire \
  -p:EnableSourceControlManagerQueries=false \
  -p:VersionSuffix=emptyjson.gfafe64823d80 \
  -- --filter-class '*.DescribeCommandTests' \
  --filter-not-trait 'quarantined=true' --filter-not-trait 'outerloop=true'
```

Result: exit 0, 66 passed, 0 failed, 0 skipped. Raw log: `logs/tests-committed-release.log`. The earlier tests used the base archive plus the recorded trial patch, then accepted snapshots; the final Release run used the committed treatment archive containing all baselines.

No test failure remains. `git diff --check` passed before the commit. No full unit, E2E, GitHub Actions, or Azure pipeline run was performed.

## Matched build and dependencies

| Field | Both control and treatment |
| --- | --- |
| Image | `mcr.microsoft.com/dotnet/sdk:11.0.100-rc.2` |
| Immutable image ID/repo digest | `sha256:e2438fd800a09d2d761aefe4edd30675c8f1db8958e4423c0844cc9a0240e60f` |
| Container OS | Ubuntu 26.04, Linux ARM64, glibc 2.43 |
| SDK | `11.0.100-rc.2.26504.105`, SDK commit `820230c386` |
| MSBuild | `18.12.0-1.26504.105+820230c38` |
| Runtime | `11.0.0-rc.2.26504.105`, ARM64 |
| CLI target | `net11.0`, `linux-arm64` |
| Configuration | Release |
| Publish | Managed, self-contained, single-file; `PublishAot=false`, `PublishSingleFile=true` |
| Channel | Default `local`; no acquisition-channel override or install sidecar |
| Source staging | `git archive` extracted into a Docker-managed Linux filesystem at `/src` |
| Source metadata | Explicit full `SourceRevisionId`, `RepositoryCommit`, origin URL, SCM queries disabled |

Version suffixes deliberately follow the same `<label>.g<12-character-source-commit>` methodology: `baseline.gd698a4f9cb80` and `emptyjson.gfafe64823d80`. Version strings differ, but there are no channel/version overrides changing discovery behavior. This is a bounded output-contract comparison, not a byte-reproducible or performance benchmark.

The treatment source volume is `aspire-agentic-empty-json-build-f71131c1`; the earlier test volume is `aspire-agentic-empty-json-f71131c1`. The private package cache is under this worktree's ignored `artifacts/agentic-empty-json/nuget`, separate from baseline outputs/caches. It was populated by this trial's test restore and then reused by its publish restore. No SDK installation, manifest, NuGet source, or global tool was changed.

`verify-comparison.py` compared resolved external package names/versions and SHA512 values from both `project.assets.json` files: all **87 CLI package identities** and all **3 TypeSystem package identities** match. The native `libhex1binterop.so` SHA256 also matches the baseline. Resolved assets, SDK information, `ldd`, and glibc details are retained under `treatment/provenance/` and inside the portable archive.

Exact host build invocation:

```bash
bash /Users/sebastienros/.copilot/session-state/a53c2bbf-6e11-432d-b09d-a98d2944a049/files/empty-json/run-build.sh
```

It verifies the branch, clean HEAD, and exact commit, creates the isolated source volume, extracts the committed archive, and runs these operative commands:

```bash
common=(
  -p:SourceRevisionId=fafe64823d80e8f34fa5fc773ac9d9d9ba64f375
  -p:RepositoryCommit=fafe64823d80e8f34fa5fc773ac9d9d9ba64f375
  -p:RepositoryUrl=https://github.com/microsoft/aspire
  -p:EnableSourceControlManagerQueries=false
  -p:VersionSuffix=emptyjson.gfafe64823d80
)
dotnet restore src/Aspire.Cli/Aspire.Cli.csproj \
  -p:RuntimeIdentifier=linux-arm64 -p:PublishAot=false "${common[@]}"
dotnet publish src/Aspire.Cli/Aspire.Cli.csproj --no-restore \
  -c Release -r linux-arm64 --self-contained \
  -p:PublishAot=false -p:PublishSingleFile=true \
  -o /evidence/treatment/cli "${common[@]}" \
  -bl:/evidence/treatment/logs/cli-publish.binlog
```

Publish/restore succeeded. Raw logs are `logs/docker-build.log` and `treatment/logs/build.log`; the MSBuild binary log is `treatment/logs/cli-publish.binlog`. Source provenance was captured at `2026-11-04T23:02:47Z`; the successful publish reached version verification at `2026-11-04T23:03:17Z`.

## Artifacts and SHA256

Paths are relative to the persistent evidence root above.

| Artifact | Bytes | SHA256 |
| --- | --- | --- |
| `control/baseline.tar.gz` | 54049491 | `a166a9f469a90931b36ea53f9bed568f577fc46f19e2d4fba5bc64f7fbceee6e` |
| `control/cli/aspire` | 130581127 | `3a80602e141af72f27131073ebf656c5e16ec54e71e716a1a2c821500ae64c73` |
| `aspire-agentic-empty-json-linux-arm64.tar.gz` | 51882663 | `0de862ef619039e15377459705cd40a059e02959156ce19b792900afa79c2bd4` |
| `treatment/cli/aspire` | 130581132 | `13a00a7aadcfa1b68d9eef97ec267de5acdafa04bd05480aa3b3a1b984d09b84` |
| `treatment/cli/libhex1binterop.so` | 71960 | `285d3f2994da13cc31bd29e757d34adca86c9777248a9898f57eef44368e84fc` |
| `source-base.tar` | 153681920 | `03ce952b043901e099e05a14a9df03dec8b76714f41df0ec3c2c036da1f313da` |
| `source-treatment.tar` | 153692160 | `3b9dfc43e9479ca553646781c60190f7d97e7059ed2dc7cb70726a070be0533b` |

The treatment portable archive contains only `cli/`, `provenance/`, and its `SHA256SUMS`. Keep the entire CLI directory, including its native interoperability library. Checksums passed after extraction to `/portable` in the fresh offline execution container. The control archive additionally contains baseline core Hosting packages, which were checksum-verified but are not part of this CLI-only treatment.

The root `SHA256SUMS` covers the retained evidence files; the control and treatment trees also retain their own artifact manifests. Both source volumes and this worktree/cache are intentionally retained. Every Docker run used `--rm` and exited; no AppHost, service, or benchmark process was left running.

## Limitations and handoff

This proves only the no-running-AppHost output contract and narrowly related regression behavior. Real connected-resource output and discovery failure/ambiguity were tested through the repository's existing command infrastructure and test services, not through a real running AppHost. Invalid-path and incompatible-format errors were also verified using the published artifact.

The artifact is Linux ARM64/glibc managed/self-contained, not NativeAOT and not x64. No compatibility claim is made for x64 Harbor tasks, Alpine/musl, older distributions, macOS-native, or Windows execution. The image has the pinned .NET SDK, although the published CLI is self-contained.

There is no matching full Aspire bundle: DCP, dashboard, native/polyglot AppHost server, templates, and integration payloads are omitted. No treatment Hosting package was generated, and no Bingo `new`/`run`/`wait`/`describe`/`stop` lifecycle was exercised. Do not mix the differently versioned control Hosting packages with this CLI and call it a matched orchestration benchmark.

This local artifact ledger and all raw evidence are ready for the parent to record in `sebastienros/aspire-bench`. No model benchmark was submitted. Stop after this single verified change.
