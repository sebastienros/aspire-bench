#!/usr/bin/env bash
# Preconfigured publishing (PLAN T3.4), environment setup before the agent: the environment-owned
# PostgreSQL and Redis on an external network, the catalog seeded by the application's own migration
# worker, the base images of the production Dockerfiles pulled, and the grader's snapshot. Nothing of
# the application is built or started here: the production images are built during the trial.
set -Eeuo pipefail
cd /app
step() { echo "[$(date -u +%H:%M:%S)] $*"; }
# A pull that stalls or fails is retried; three failures end the setup (an infrastructure failure).
pull() {
    local attempt
    for attempt in 1 2 3; do
        if timeout 600 docker pull -q "$1"; then return 0; fi
        step "pull $1 failed (attempt $attempt)"; sleep $((attempt * 15))
    done
    return 1
}
for image in postgres:18.3 redis:8.6 \
    mcr.microsoft.com/dotnet/sdk:10.0.100-noble mcr.microsoft.com/dotnet/aspnet:10.0.12-noble \
    node:24.14.0-bookworm-slim nginxinc/nginx-unprivileged:1.28-alpine; do
    step "pull $image"
    pull "$image"
done
step "dependencies"
docker network create --label benchmark.owner=environment bingo-net
docker volume create --label benchmark.owner=environment bingo-data
docker run -d --name bingo-db --network bingo-net --label benchmark.owner=environment \
    -p 127.0.0.1:5432:5432 -v bingo-data:/var/lib/postgresql \
    -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=LocalDatabase1! -e POSTGRES_DB=bingo postgres:18.3
docker run -d --name bingo-cache --network bingo-net --label benchmark.owner=environment \
    -p 127.0.0.1:6379:6379 redis:8.6
for _ in {1..60}; do
    if docker exec bingo-db pg_isready -U postgres -d bingo; then break; fi
    sleep 1
done
docker exec bingo-db pg_isready -U postgres -d bingo
step "seed"
# The migration worker built with the image (Debug), against the published database port.
ConnectionStrings__db='Host=127.0.0.1;Database=bingo;Username=postgres;Password=LocalDatabase1!' \
    Authentication__AdminPassword='LocalAdmin1!' DOTNET_ENVIRONMENT=Production \
    timeout 300 dotnet src/BingoBoard.MigrationService/bin/Debug/net10.0/BingoBoard.MigrationService.dll
step "reference bundle"
# Reference production bundle of the player frontend (Vite builds are reproducible on the same Node),
# outside /app, so the grader can tell the served bundle was built from these sources.
(cd src/bingo-board && VITE_DOTNET_VERSION=10 npx vite build --outDir /opt/benchmark/reference-dist --emptyOutDir --logLevel warn)
step "snapshot"
node /opt/benchmark/publishing/grade.mjs setup
step "done"
