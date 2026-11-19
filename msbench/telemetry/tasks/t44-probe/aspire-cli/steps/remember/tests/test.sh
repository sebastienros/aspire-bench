#!/usr/bin/env bash
set -uo pipefail
mkdir -p /logs/verifier
if test ! -e /app/codeword.txt; then printf '1\n'; else printf '0\n'; fi >/logs/verifier/reward.txt
