#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "${1:-}" == eval ]]; then
    shift
    exec bash "$ROOT/scripts/run.sh" "$@"
fi
cd "$ROOT"
npm run build --silent
exec node "$ROOT/dist/cli.js" "$@"
