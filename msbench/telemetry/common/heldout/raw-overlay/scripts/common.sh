#!/usr/bin/env bash

START_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME="${CONTAINER_RUNTIME:-docker}"

require_command() {
    command -v "$1" >/dev/null 2>&1 || {
        echo "Required command not found: $1" >&2
        return 1
    }
}

compose() {
    "$RUNTIME" compose --project-directory "$START_DIR" -f "$START_DIR/compose.yaml" "$@"
}

sql_ready() {
    compose exec -T -e SQLCMDPASSWORD="$SQL_PASSWORD" sqlserver \
        /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -b -Q "SELECT 1" >/dev/null 2>&1
}

rabbitmq_ready() {
    compose exec -T rabbitmq rabbitmq-diagnostics -q check_port_connectivity >/dev/null 2>&1
}

http_ready() {
    curl --fail --silent --show-error --max-time 5 "$1" >/dev/null
}

worker_ready() {
    grep -q "Consuming orders" "$START_DIR/.script-state/worker.log" 2>/dev/null
}

wait_for() {
    local label="$1"
    shift
    local attempt
    for ((attempt = 0; attempt < 120; attempt++)); do
        if "$@" >/dev/null 2>&1; then
            return 0
        fi
        if [[ -n "${API_PID:-}" ]] && ! kill -0 "$API_PID" 2>/dev/null; then
            echo "API exited. See $START_DIR/.script-state/api.log." >&2
            return 1
        fi
        if [[ -n "${WORKER_PID:-}" ]] && ! kill -0 "$WORKER_PID" 2>/dev/null; then
            echo "Worker exited. See $START_DIR/.script-state/worker.log." >&2
            return 1
        fi
        sleep 1
    done
    echo "Timed out waiting for $label." >&2
    return 1
}
