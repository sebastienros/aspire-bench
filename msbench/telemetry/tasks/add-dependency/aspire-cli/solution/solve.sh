#!/usr/bin/env bash
# Reference solution, add a dependency (PLAN T3.2): Redis in the AppHost, referenced by boardadmin,
# which keeps its distributed cache there instead of in process memory. Shape A (default): the
# StackExchange.Redis cache package the project already references. Shape B (SOLUTION_SHAPE=client):
# the Aspire client integration. Then the AppHost is restarted (stop, wait for its containers, start).
set -euo pipefail
cd /app
v=17.1.0-preview.1.26567.3
aspire add Aspire.Hosting.Redis --apphost /app/apphost.cs --non-interactive --nologo
node - "${SOLUTION_SHAPE:-}" <<'JS'
const fs = require("node:fs");
const shape = process.argv[2];
let host = fs.readFileSync("/app/apphost.cs", "utf8");
host = host.replace('var db = builder.AddPostgres("postgres")', 'var cache = builder.AddRedis("cache");\n\nvar db = builder.AddPostgres("postgres")');
host = host.replace('var admin = builder.AddProject<Projects.BingoBoard_Admin>("boardadmin", launchProfileName: "http")\n',
    'var admin = builder.AddProject<Projects.BingoBoard_Admin>("boardadmin", launchProfileName: "http")\n    .WithReference(cache)\n    .WaitFor(cache)\n');
if (!host.includes("WithReference(cache)")) throw new Error("AppHost edit failed");
fs.writeFileSync("/app/apphost.cs", host);
const program = "/app/src/BingoBoard.Admin/Program.cs";
let code = fs.readFileSync(program, "utf8");
const memory = "builder.Services.AddDistributedMemoryCache();";
if (!code.includes(memory)) throw new Error("Program.cs edit failed");
code = code.replace(memory, shape === "client"
    ? 'builder.AddRedisDistributedCache("cache");'
    : 'builder.Services.AddStackExchangeRedisCache(options =>\n    options.Configuration = builder.Configuration.GetConnectionString("cache"));');
fs.writeFileSync(program, code);
JS
if [[ "${SOLUTION_SHAPE:-}" == client ]]; then
    sed -i "s#</ItemGroup>#  <PackageVersion Include=\"Aspire.StackExchange.Redis.DistributedCaching\" Version=\"$v\" />\n  </ItemGroup>#" /app/Directory.Packages.props
    # The client integration needs a newer StackExchange.Redis cache package than the repo pins (NU1605).
    sed -i 's#Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="10.0.12"#Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="10.0.15"#' /app/Directory.Packages.props
    dotnet add src/BingoBoard.Admin/BingoBoard.Admin.csproj package Aspire.StackExchange.Redis.DistributedCaching
fi
aspire stop --apphost /app/apphost.cs --non-interactive --nologo
for _ in $(seq 1 120); do [[ -z "$(docker ps -aq --filter "name=^${BENCH_RUN_ID}-")" ]] && break; sleep 1; done
aspire start --apphost /app/apphost.cs --non-interactive --isolated --nologo
aspire wait boardadmin --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo
aspire wait bingoboard --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo
