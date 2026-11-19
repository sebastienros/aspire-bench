#!/usr/bin/env bash
set -uo pipefail
mkdir -p /logs/verifier
printf '0\n' >/logs/verifier/reward.txt
if node "$(dirname "$0")/verify.mjs"; then printf '1\n' >/logs/verifier/reward.txt; fi
