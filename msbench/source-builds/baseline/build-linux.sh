#!/usr/bin/env bash
set -euo pipefail

cd /src
readonly revision=d698a4f9cb800649791da2b3d81c5850330072c1
readonly suffix=baseline.gd698a4f9cb80
readonly output="${BASELINE_OUTPUT:-/src/artifacts/agentic-baseline}"
mkdir -p "$output/logs" "$output/cli" "$output/packages"

export DOTNET_CLI_TELEMETRY_OPTOUT=1
export DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
export MSBUILDTERMINALLOGGER=false
export NUGET_PACKAGES="${NUGET_PACKAGES:-$output/nuget}"

# The worktree's .git file references host-only metadata. Supply the verified
# source identity explicitly rather than stamping an unknown container revision.
common=(
  -p:SourceRevisionId="$revision"
  -p:RepositoryCommit="$revision"
  -p:RepositoryUrl=https://github.com/microsoft/aspire
  -p:EnableSourceControlManagerQueries=false
  -p:VersionSuffix="$suffix"
)

exec > >(tee "$output/logs/build.log") 2>&1
set -x
date -u '+%Y-%m-%dT%H:%M:%SZ'
dotnet --info
dotnet restore src/Aspire.Cli/Aspire.Cli.csproj \
  -p:RuntimeIdentifier=linux-arm64 -p:PublishAot=false "${common[@]}"
dotnet publish src/Aspire.Cli/Aspire.Cli.csproj --no-restore \
  -c Release -r linux-arm64 --self-contained \
  -p:PublishAot=false -p:PublishSingleFile=true \
  -o "$output/cli" "${common[@]}" \
  -bl:"$output/logs/cli-publish.binlog"

for project in Aspire.Hosting Aspire.Hosting.AppHost Aspire.Hosting.Dotnet; do
  dotnet restore "src/$project/$project.csproj" "${common[@]}"
  dotnet pack "src/$project/$project.csproj" --no-restore \
    -c Release -o "$output/packages" "${common[@]}" \
    -bl:"$output/logs/$project-pack.binlog"
done

"$output/cli/aspire" --version
"$output/cli/aspire" describe --help
date -u '+%Y-%m-%dT%H:%M:%SZ'
