#!/usr/bin/env bash
# Waits for the given rounds to finish in the cloud, then rebuilds every result file.
#   tools/await-rounds.sh r3 r4 r5
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
for round in "$@"; do
    WAIT_SECONDS="${WAIT_SECONDS:-14000}" python3 tools/wait.py --round "$round" --quiet
done
python3 tools/collect.py 2>&1 | tail -3
python3 tools/stats.py >/dev/null
echo "results rebuilt"
