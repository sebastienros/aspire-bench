#!/usr/bin/env bash
set -euo pipefail
node /solution/negative.mjs
# Only the external reference solution can use protected setup identity.
target="$(node -p "require('/opt/benchmark/diagnostics-state.json').target")"
docker unpause "$target"
node /opt/benchmark/diagnostics.mjs verify
