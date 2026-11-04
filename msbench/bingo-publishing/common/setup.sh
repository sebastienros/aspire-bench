#!/usr/bin/env bash
set -euo pipefail
cd /app
for image in postgres:18.3 redis:8.6 \
    mcr.microsoft.com/dotnet/sdk:10.0.100-noble \
    mcr.microsoft.com/dotnet/aspnet:10.0.12-noble \
    node:24.14.0-bookworm-slim nginxinc/nginx-unprivileged:1.28-alpine; do
    docker pull "$image"
done
docker network create --label benchmark.owner=environment p01-net
docker volume create --label benchmark.owner=environment p01-data
docker run -d --name p01-db --network p01-net \
    --label benchmark.owner=environment -p 127.0.0.1:5432:5432 \
    -v p01-data:/var/lib/postgresql \
    -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=LocalDatabase1! -e POSTGRES_DB=bingo \
    postgres:18.3
docker run -d --name p01-cache --network p01-net \
    --label benchmark.owner=environment -p 127.0.0.1:6379:6379 redis:8.6
for attempt in {1..60}; do
    if docker exec p01-db pg_isready -U postgres -d bingo; then break; fi
    sleep 1
done
ConnectionStrings__db='Host=127.0.0.1;Database=bingo;Username=postgres;Password=LocalDatabase1!' \
    Authentication__AdminPassword='LocalAdmin1!' \
    DOTNET_ENVIRONMENT=Production \
    dotnet /opt/benchmark/seed/BingoBoard.MigrationService.dll
node /opt/benchmark/grade.mjs setup
