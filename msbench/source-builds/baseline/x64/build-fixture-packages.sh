#!/usr/bin/env bash
set -euo pipefail

cd /src
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export MSBUILDTERMINALLOGGER=false
export NUGET_PACKAGES=/cache
mkdir -p /out/packages
common=(
  -p:SourceRevisionId=d698a4f9cb800649791da2b3d81c5850330072c1
  -p:RepositoryCommit=d698a4f9cb800649791da2b3d81c5850330072c1
  -p:RepositoryUrl=https://github.com/microsoft/aspire
  -p:EnableSourceControlManagerQueries=false
  -p:VersionSuffix=baseline.gd698a4f9cb80
)
set -x
for project in Aspire.Hosting Aspire.Hosting.AppHost Aspire.AppHost.Sdk Aspire.Hosting.Redis Aspire.Hosting.PostgreSQL Aspire.Hosting.JavaScript; do
  dotnet restore "src/$project/$project.csproj" "${common[@]}"
  dotnet pack "src/$project/$project.csproj" --no-restore -c Release \
    -o /out/packages "${common[@]}"
done
