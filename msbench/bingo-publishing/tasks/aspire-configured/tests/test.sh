#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
echo 0 >/logs/verifier/reward.txt
node /opt/benchmark/grade.mjs verify
echo 1 >/logs/verifier/reward.txt
