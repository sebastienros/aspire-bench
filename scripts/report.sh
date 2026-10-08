#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "$ROOT/dist/cli.js" compare "$@"
echo "Native Vally dashboard export:"
exec node "$ROOT/dist/cli.js" export-vally "$@"
