#!/usr/bin/env bash
set -Eeuo pipefail
source /opt/benchmark/diagnostics.sh
p01_step working-directory
cd /app
for image in postgres:18.3 redis:8.6 \
    mcr.microsoft.com/dotnet/sdk:10.0.100-noble \
    mcr.microsoft.com/dotnet/aspnet:10.0.12-noble \
    node:24.14.0-bookworm-slim nginxinc/nginx-unprivileged:1.28-alpine; do
    p01_step "pull-$image"
    docker pull "$image"
done
p01_step create-external-network
docker network create --label benchmark.owner=environment p01-net
p01_step create-data-volume
docker volume create --label benchmark.owner=environment p01-data
p01_step start-postgres
docker run -d --name p01-db --network p01-net \
    --label benchmark.owner=environment -p 127.0.0.1:5432:5432 \
    -v p01-data:/var/lib/postgresql \
    -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=LocalDatabase1! -e POSTGRES_DB=bingo \
    postgres:18.3
p01_step start-redis
docker run -d --name p01-cache --network p01-net \
    --label benchmark.owner=environment -p 127.0.0.1:6379:6379 redis:8.6
p01_step postgres-readiness
for attempt in {1..60}; do
    if docker exec p01-db pg_isready -U postgres -d bingo; then break; fi
    sleep 1
done
p01_step seed-database
ConnectionStrings__db='Host=127.0.0.1;Database=bingo;Username=postgres;Password=LocalDatabase1!' \
    Authentication__AdminPassword='LocalAdmin1!' \
    DOTNET_ENVIRONMENT=Production \
    dotnet /opt/benchmark/seed/BingoBoard.MigrationService.dll
p01_step snapshot-owned-inputs
node /opt/benchmark/grade.mjs setup
p01_step setup-complete
