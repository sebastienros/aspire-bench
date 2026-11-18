#!/usr/bin/env bash
set -euo pipefail
# shellcheck source-path=SCRIPTDIR
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

MODE="${1:-}"
if [[ $# -gt 1 ]] || [[ -n "$MODE" && "$MODE" != --foreground && "$MODE" != --daemon ]]; then
    echo "Usage: bash start.sh [--foreground]" >&2
    exit 1
fi
if [[ -z "$MODE" ]]; then
    require_command node
    exec node "$START_DIR/scripts/launch.mjs"
fi
if [[ "$MODE" == --daemon ]]; then
    trap '' HUP
fi
for tool in dotnet curl "$RUNTIME"; do require_command "$tool"; done
"$RUNTIME" compose version >/dev/null

for port in "$SQL_PORT" "$RABBITMQ_PORT" "$API_PORT"; do
    if (echo >/dev/tcp/localhost/"$port") 2>/dev/null; then
        echo "Port $port is already in use. Stop the conflicting service before starting." >&2
        exit 1
    fi
done

cd "$START_DIR"
dotnet build Shop.slnx --nologo

export ConnectionStrings__shopdb="Server=localhost,$SQL_PORT;Database=shopdb;User ID=sa;Password=$SQL_PASSWORD;TrustServerCertificate=true"
export ConnectionStrings__messaging="amqp://shop:$RABBITMQ_PASSWORD@localhost:$RABBITMQ_PORT"
export ASPNETCORE_ENVIRONMENT=Development
export DOTNET_ENVIRONMENT=Development
export ASPNETCORE_URLS="http://localhost:$API_PORT"

mkdir -p .script-state
API_PID=""
WORKER_PID=""
# shellcheck disable=SC2329
cleanup() {
    local status=$?
    trap - EXIT INT TERM
    for pid in "$WORKER_PID" "$API_PID"; do
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
wait_for "SQL Server" sql_ready
wait_for RabbitMQ rabbitmq_ready
(
    if [[ "$MODE" == --daemon ]]; then exec 3>&-; fi
    cd src/Shop.Api
    exec dotnet bin/Debug/net10.0/Shop.Api.dll
) >.script-state/api.log 2>&1 &
API_PID=$!
wait_for "API" http_ready "http://localhost:$API_PORT/api/products"
(
    if [[ "$MODE" == --daemon ]]; then exec 3>&-; fi
    cd src/Shop.Worker
    exec dotnet bin/Debug/net10.0/Shop.Worker.dll
) >.script-state/worker.log 2>&1 &
WORKER_PID=$!
wait_for "order worker" worker_ready
http_ready "http://localhost:$API_PORT/"

echo "Shop: http://localhost:$API_PORT"
echo "Logs: $START_DIR/.script-state | The harness owns cleanup; database data is preserved."
if [[ "$MODE" == --daemon ]]; then
    kill -0 "$API_PID" "$WORKER_PID"
    printf 'ready\n' >&3
    exec 3>&-
else
    echo "Press Ctrl+C to stop."
fi
while kill -0 "$API_PID" 2>/dev/null && kill -0 "$WORKER_PID" 2>/dev/null; do
    sleep 1
done
echo "An application process exited unexpectedly. Inspect .script-state/*.log." >&2
exit 1
