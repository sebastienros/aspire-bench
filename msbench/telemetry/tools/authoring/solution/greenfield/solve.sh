#!/usr/bin/env bash
# Reference solution, greenfield (PLAN T3.3). Shape A (default): the starter template, Postgres added
# with `aspire add`. Shape B (SOLUTION_SHAPE=single-file): a file-based apphost.cs and a minimal API
# written by hand. Both must pass the same verifier (local gate).
set -euo pipefail
version=17.1.0-preview.1.26567.3
cd /app
if [[ "${SOLUTION_SHAPE:-}" == single-file ]]; then
    dotnet new web --name Api --output /app/Api --framework net10.0 >/dev/null
    cat >/app/apphost.cs <<CS
#:sdk Aspire.AppHost.Sdk@$version
#:package Aspire.Hosting.PostgreSQL@$version
#:project Api/Api.csproj

var builder = DistributedApplication.CreateBuilder(args);
var db = builder.AddPostgres("postgres").AddDatabase("db");
builder.AddProject<Projects.Api>("api").WithReference(db).WaitFor(db);
builder.Build().Run();
CS
    cat >/app/nuget.config <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="aspire" value="/usr/local/aspire/packages" />
  </packageSources>
</configuration>
XML
    apphost=/app/apphost.cs
else
    aspire new aspire-starter --name Shop --output /app/Shop --non-interactive --nologo
    aspire add Aspire.Hosting.PostgreSQL --apphost /app/Shop/Shop.AppHost/Shop.AppHost.csproj --non-interactive --nologo
    node - <<'JS'
const fs = require("node:fs");
const p = "/app/Shop/Shop.AppHost/AppHost.cs";
let s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
s = s.replace('var builder = DistributedApplication.CreateBuilder(args);\n',
    'var builder = DistributedApplication.CreateBuilder(args);\n\nvar db = builder.AddPostgres("postgres").AddDatabase("db");\n');
s = s.replace('AddDotnetProject("apiservice"', 'AddDotnetProject("api"');
s = s.replace('.WithHttpHealthCheck("/health");\n\nbuilder.AddDotnetProject("webfrontend"',
    '.WithHttpHealthCheck("/health")\n    .WithReference(db)\n    .WaitFor(db);\n\nbuilder.AddDotnetProject("webfrontend"');
if (!(s.includes('AddDatabase("db")') && s.includes('"api"') && s.includes("WithReference(db)"))) throw new Error(s);
fs.writeFileSync(p, s);
JS
    apphost=/app/Shop/Shop.AppHost/Shop.AppHost.csproj
fi
aspire start --apphost "$apphost" --non-interactive --nologo
aspire wait api --apphost "$apphost" --non-interactive --timeout 600 --nologo
