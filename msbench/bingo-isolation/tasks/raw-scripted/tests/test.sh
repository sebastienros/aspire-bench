#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
printf '0\n' >/logs/verifier/reward.txt
node /opt/benchmark/bingo-isolation/common/isolation.mjs verify
printf '1\n' >/logs/verifier/reward.txt
