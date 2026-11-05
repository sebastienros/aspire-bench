#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
printf '0\n' >/logs/verifier/reward.txt
node /opt/benchmark/bingo-transfer/common/transfer.mjs verify
printf '1\n' >/logs/verifier/reward.txt
