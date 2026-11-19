#!/usr/bin/env bash
set -uo pipefail
mkdir -p /logs/verifier
if test "$(tr -d '[:space:]' </app/codeword.txt | sha256sum | cut -d' ' -f1)" = 56cd46f97e8af6cb94217d52a2b10ed3cffab63d9839a2058632f4879132c724; then printf '1\n'; else printf '0\n'; fi >/logs/verifier/reward.txt
