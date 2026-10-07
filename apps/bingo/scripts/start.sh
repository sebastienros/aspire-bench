#!/usr/bin/env bash
set -euo pipefail
# shellcheck source-path=SCRIPTDIR
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

MODE="${1:-}"
if [[ $# -gt 1 ]] || [[ -n "$MODE" && "$MODE" != --foreground && "$MODE" != --daemon ]]; then
    echo "Usage: bash start.sh [--foreground] (set CONTAINER_RUNTIME=podman or docker)" >&2
    exit 1
fi
if [[ -z "$MODE" ]]; then
    require_command node
    exec node "$START_DIR/scripts/launch.mjs"
fi
if [[ "$MODE" == --daemon ]]; then
    trap '' HUP
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
        echo "Container cleanup failed. Use the harness to clean this run's owned resources." >&2
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
    if [[ "$MODE" == --daemon ]]; then exec 3>&-; fi
    cd src/BingoBoard.MigrationService
    dotnet bin/Debug/net10.0/BingoBoard.MigrationService.dll
)
(
    if [[ "$MODE" == --daemon ]]; then exec 3>&-; fi
    cd src/BingoBoard.Admin
    exec dotnet bin/Debug/net10.0/BingoBoard.Admin.dll
) >.script-state/admin.log 2>&1 &
ADMIN_PID=$!
wait_for "admin backend" version_ready "http://localhost:$ADMIN_PORT"
(
    if [[ "$MODE" == --daemon ]]; then exec 3>&-; fi
    cd src/bingo-board
    exec node node_modules/vite/bin/vite.js --host localhost --port "$FRONTEND_PORT" --strictPort
) >.script-state/frontend.log 2>&1 &
FRONTEND_PID=$!
wait_for "player frontend" http_ready "http://localhost:$FRONTEND_PORT/"
check_application

echo "Player: http://localhost:$FRONTEND_PORT | Admin: http://localhost:$ADMIN_PORT (user: admin)"
echo "Logs: $START_DIR/.script-state | The harness owns cleanup; database data is preserved."
if [[ "$MODE" == --daemon ]]; then
    kill -0 "$ADMIN_PID" "$FRONTEND_PID"
    printf 'ready\n' >&3
    exec 3>&-
else
    echo "Press Ctrl+C to stop."
fi
while kill -0 "$ADMIN_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
    sleep 1
done
echo "An application process exited unexpectedly. Inspect .script-state/*.log." >&2
exit 1
