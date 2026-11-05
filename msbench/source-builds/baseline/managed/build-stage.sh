#!/usr/bin/env bash
set -euo pipefail

cd /src
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export MSBUILDTERMINALLOGGER=false
export NUGET_PACKAGES=/cache
export ArtifactsDir=/src/artifacts-managed/
export SourceRevisionId=d698a4f9cb800649791da2b3d81c5850330072c1
export RepositoryCommit="$SourceRevisionId"
export RepositoryUrl=https://github.com/microsoft/aspire
export EnableSourceControlManagerQueries=false
export VersionSuffix=baseline.gd698a4f9cb80
common=(
  -p:ArtifactsDir="$ArtifactsDir"
  -p:SourceRevisionId="$SourceRevisionId"
  -p:RepositoryCommit="$RepositoryCommit"
  -p:RepositoryUrl="$RepositoryUrl"
  -p:EnableSourceControlManagerQueries=false
  -p:VersionSuffix="$VersionSuffix"
)
publish=(
  -c Release -r linux-x64 --self-contained true
  -p:PublishAot=false -p:PublishTrimmed=false -p:RuntimeIdentifiers=linux-x64
)
set -x
date -u '+%Y-%m-%dT%H:%M:%SZ'
case "$1" in
  managed)
    dotnet publish src/Aspire.Managed/Aspire.Managed.csproj "${publish[@]}" "${common[@]}"
    ;;
  dashboard)
    dotnet publish src/Aspire.Dashboard/Aspire.Dashboard.csproj "${publish[@]}" "${common[@]}"
    ;;
  terminal)
    dotnet publish src/Aspire.TerminalHost/Aspire.TerminalHost.csproj "${publish[@]}" "${common[@]}"
    ;;
  server)
    dotnet publish src/Aspire.Hosting.Native.Server/Aspire.Hosting.Native.Server.csproj "${publish[@]}" "${common[@]}"
    ;;
  layout)
    dotnet msbuild eng/Bundle.proj /t:Build -p:TargetRid=linux-x64 -p:Configuration=Release \
      -p:SkipManagedBuild=true -p:SkipAppHostServerBuild=true -p:SkipNativeBuild=true "${common[@]}"
    cp /src/artifacts-managed/bundle/aspire-17.0.0-baseline.gd698a4f9cb80-linux-x64.tar.gz /out/
    ;;
  cli)
    dotnet publish src/Aspire.Cli/Aspire.Cli.csproj "${publish[@]}" "${common[@]}" \
      -p:PublishSingleFile=true \
      -p:BundlePayloadPath=/src/artifacts-managed/bundle/aspire-17.0.0-baseline.gd698a4f9cb80-linux-x64.tar.gz \
      -o /out/cli
    ;;
  package:*)
    project="${1#package:}"
    dotnet restore "src/$project/$project.csproj" "${common[@]}"
    dotnet pack "src/$project/$project.csproj" --no-restore -c Release \
      -o /out/packages "${common[@]}"
    ;;
  *)
    printf 'Unknown build stage: %s\n' "$1" >&2
    exit 2
    ;;
esac
date -u '+%Y-%m-%dT%H:%M:%SZ'
