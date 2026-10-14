#!/usr/bin/env bash
set -euo pipefail
cd /app

export ConnectionStrings__db="Host=localhost;Port=$POSTGRES_PORT;Database=bingo;Username=postgres;Password=postgres"
export ConnectionStrings__cache="localhost:$REDIS_PORT"
export ASPNETCORE_URLS="http://localhost:$ADMIN_PORT"
export BINGO_ADMIN_URL="http://localhost:$ADMIN_PORT"

dotnet build AspireifyBingo.slnx --nologo
(cd src/bingo-board && npm ci)
docker compose -f compose.yaml up -d
ready=0
for attempt in {1..60}; do
    if docker compose -f compose.yaml exec -T postgres pg_isready -U postgres -d bingo &&
       [[ "$(docker compose -f compose.yaml exec -T redis redis-cli ping)" == PONG ]]; then
        ready=1
        break
    fi
    sleep 1
done
[[ "$ready" == 1 ]]
(cd src/BingoBoard.MigrationService && dotnet bin/Debug/net10.0/BingoBoard.MigrationService.dll)

mkdir -p .manual-state
nohup bash -c 'cd src/BingoBoard.Admin && exec dotnet bin/Debug/net10.0/BingoBoard.Admin.dll' \
    </dev/null >.manual-state/admin.log 2>&1 &
echo "$!" >.manual-state/admin.pid
nohup bash -c 'cd src/bingo-board && exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort' \
    </dev/null >.manual-state/frontend.log 2>&1 &
echo "$!" >.manual-state/frontend.pid

ready=0
for attempt in {1..60}; do
    if ! kill -0 "$(cat .manual-state/admin.pid)" 2>/dev/null ||
       ! kill -0 "$(cat .manual-state/frontend.pid)" 2>/dev/null; then
        cat .manual-state/admin.log .manual-state/frontend.log >&2
        exit 1
    fi
    if curl --fail --silent --max-time 2 "http://localhost:$ADMIN_PORT/login" >/dev/null &&
       curl --fail --silent --max-time 2 "http://127.0.0.1:$FRONTEND_PORT/api/version-info" >/dev/null; then
        ready=1
        break
    fi
    sleep 1
done
[[ "$ready" == 1 ]]
printf '{"admin":"http://localhost:%s","frontend":"http://127.0.0.1:%s"}\n' \
    "$ADMIN_PORT" "$FRONTEND_PORT" >benchmark-endpoints.json
