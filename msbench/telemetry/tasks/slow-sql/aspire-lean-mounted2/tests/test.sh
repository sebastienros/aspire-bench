#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
printf '0\n' >/logs/verifier/reward.txt
# PLAN T4.6 (gate-t46b): what the agent's skill folders hold at run time, digests prefixed so the
# artifact secret scan keeps them, and one digest of the whole listing.
for d in /app/.github/skills /opt/agent-skills; do (cd "$d" && find . -type f | LC_ALL=C sort | xargs sha256sum | sed "s|^|sha256:|; s|  \./|  $d/|"); done >/logs/verifier/skills.sha256.tmp || true
cat /logs/verifier/skills.sha256.tmp >/logs/verifier/skills.sha256
printf 'listing sha256:%s\n' "$(sha256sum </logs/verifier/skills.sha256.tmp | cut -d' ' -f1)" >>/logs/verifier/skills.sha256
rm -f /logs/verifier/skills.sha256.tmp
node /opt/benchmark/bench.mjs verify
printf '1\n' >/logs/verifier/reward.txt
