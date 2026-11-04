#!/usr/bin/env bash
set -euo pipefail

cd /src
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
export MSBUILDTERMINALLOGGER=false
export NUGET_PACKAGES=/cache
export SourceRevisionId=d698a4f9cb800649791da2b3d81c5850330072c1
export RepositoryCommit="$SourceRevisionId"
export RepositoryUrl=https://github.com/microsoft/aspire
export EnableSourceControlManagerQueries=false
export VersionSuffix=baseline.gd698a4f9cb80
mkdir -p /out/logs
set -x
date -u '+%Y-%m-%dT%H:%M:%SZ'
dotnet --info
dotnet msbuild eng/Bundle.proj /t:Build \
  /p:TargetRid=linux-x64 /p:Configuration=Release \
  /p:VersionSuffix="$VersionSuffix" \
  /p:SourceRevisionId="$SourceRevisionId" \
  /p:RepositoryCommit="$RepositoryCommit" \
  /p:RepositoryUrl="$RepositoryUrl" \
  /p:EnableSourceControlManagerQueries=false \
  -bl:/out/logs/complete-bundle.binlog
date -u '+%Y-%m-%dT%H:%M:%SZ'
