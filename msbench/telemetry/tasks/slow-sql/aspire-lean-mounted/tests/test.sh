#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
printf '0\n' >/logs/verifier/reward.txt
# PLAN T4.6: what the agent's skill folders hold at run time.
for d in /app/.github/skills /opt/agent-skills; do (cd "$d" && find . -type f | LC_ALL=C sort | xargs sha256sum | sed "s|  \./|  $d/|"); done >/logs/verifier/skills.sha256 || true
node /opt/benchmark/bench.mjs verify
printf '1\n' >/logs/verifier/reward.txt
