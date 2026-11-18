#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
cp /var/log/selection-hook.jsonl /logs/verifier/selection-hook.jsonl 2>/dev/null || : >/logs/verifier/selection-hook.jsonl
printf '1\n' >/logs/verifier/reward.txt
