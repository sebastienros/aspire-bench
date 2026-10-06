#!/usr/bin/env bash
set -euo pipefail
# shellcheck source-path=SCRIPTDIR
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

if [[ $# -ne 0 ]]; then
    echo "Usage: bash start.sh (set CONTAINER_RUNTIME=podman or docker)" >&2
    exit 1
fi
for tool in dotnet node npm curl; do require_command "$tool"; done
initialize_runtime

for port in "$POSTGRES_PORT" "$REDIS_PORT" "$ADMIN_PORT" "$FRONTEND_PORT"; do
    if (echo >/dev/tcp/localhost/"$port") 2>/dev/null; then
        echo "Port $port is already in use. Stop the conflicting service before starting." >&2
        exit 1
    fi
done

cd "$START_DIR"
dotnet build AspireifyBingo.slnx --nologo
(cd src/bingo-board && npm ci)

export ConnectionStrings__db="Host=localhost;Port=$POSTGRES_PORT;Database=bingo;Username=postgres;Password=postgres"
export ConnectionStrings__cache="localhost:$REDIS_PORT"
export Authentication__AdminPassword="${Authentication__AdminPassword:-admin}"
export ASPNETCORE_ENVIRONMENT=Development
export DOTNET_ENVIRONMENT=Development
export ASPNETCORE_URLS="http://localhost:$ADMIN_PORT"
export BINGO_ADMIN_URL="http://localhost:$ADMIN_PORT"

mkdir -p .script-state
ADMIN_PID=""
FRONTEND_PID=""
# shellcheck disable=SC2329
cleanup() {
    local status=$?
    trap - EXIT INT TERM
    for pid in "$FRONTEND_PID" "$ADMIN_PID"; do
        if [[ -n "$pid" ]]; then
            kill "$pid" 2>/dev/null || true
            wait "$pid" 2>/dev/null || true
        fi
    done
    if ! compose stop; then
        echo "Container cleanup failed. Run scripts/clean.sh." >&2
        status=1
    fi
    exit "$status"
}
trap 'cleanup' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

compose up -d
wait_for PostgreSQL postgres_ready
wait_for Redis redis_ready
(
    cd src/BingoBoard.MigrationService
    dotnet bin/Debug/net10.0/BingoBoard.MigrationService.dll
)
(
    cd src/BingoBoard.Admin
    exec dotnet bin/Debug/net10.0/BingoBoard.Admin.dll
) >.script-state/admin.log 2>&1 &
ADMIN_PID=$!
wait_for "admin backend" version_ready "http://localhost:$ADMIN_PORT"
(
    cd src/bingo-board
    exec node node_modules/vite/bin/vite.js --host localhost --port "$FRONTEND_PORT" --strictPort
) >.script-state/frontend.log 2>&1 &
FRONTEND_PID=$!
wait_for "player frontend" http_ready "http://localhost:$FRONTEND_PORT/"
check_application

echo "Player: http://localhost:$FRONTEND_PORT | Admin: http://localhost:$ADMIN_PORT (user: admin)"
echo "Logs: $START_DIR/.script-state | Press Ctrl+C to stop; database data is preserved."
while kill -0 "$ADMIN_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
    sleep 1
done
echo "An application process exited unexpectedly. Inspect .script-state/*.log." >&2
exit 1
