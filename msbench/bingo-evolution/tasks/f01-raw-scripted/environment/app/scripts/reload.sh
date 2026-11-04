#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
cd "$START_DIR"
for tool in dotnet lsof node; do require_command "$tool"; done

if pid="$(lsof -t -iTCP:"$ADMIN_PORT" -sTCP:LISTEN)"; then
    [[ "$pid" =~ ^[0-9]+$ ]] || { echo "Expected exactly one admin listener" >&2; exit 1; }
    [[ "$(readlink "/proc/$pid/cwd")" == "$START_DIR/src/BingoBoard.Admin" ]] || {
        echo "Admin listener is not owned by this application" >&2; exit 1;
    }
else
    status=$?
    [[ "$status" == 1 && -f .script-state/reloading ]] || {
        echo "No admin listener or recoverable reload found (lsof exit $status)" >&2; exit 1;
    }
fi
touch .script-state/reloading
finish_reload() {
    local status=$?
    if [[ "$status" == 0 ]]; then
        rm -f .script-state/reloading
    else
        echo "Reload failed; dependencies remain running. Fix the error and rerun scripts/reload.sh." >&2
    fi
}
trap finish_reload EXIT
if [[ -n "$pid" ]]; then kill "$pid"; fi
for attempt in {1..30}; do
    if ! lsof -t -iTCP:"$ADMIN_PORT" -sTCP:LISTEN >/dev/null; then break; fi
    sleep 1
done
dotnet build AspireifyBingo.slnx --nologo
export ConnectionStrings__db="Host=localhost;Port=$POSTGRES_PORT;Database=bingo;Username=postgres;Password=postgres"
export ConnectionStrings__cache="localhost:$REDIS_PORT"
export ASPNETCORE_URLS="http://localhost:$ADMIN_PORT"
(
    cd src/BingoBoard.MigrationService
    dotnet bin/Debug/net10.0/BingoBoard.MigrationService.dll
)
node scripts/reload-admin.mjs
wait_for "rebuilt admin" version_ready "http://localhost:$ADMIN_PORT"
