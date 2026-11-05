#!/usr/bin/env bash
set -euo pipefail
cd /app
mkdir -p /logs/agent
printf '%s  %s\n' \
    cc9b133e173eb2ded3de1110f0afd5fb936e64c87b05d7d6346a7050029d6b59 \
    /solution/original-model-source.patch | sha256sum --check
printf '%s  %s\n' \
    ebb446a8a10de9208b5fc70931f30138f6a04c69c7dd69c36a1d7d047f4bebe0 \
    /solution/replay-model-source.patch | sha256sum --check
git apply --check /solution/replay-model-source.patch
git apply /solution/replay-model-source.patch
sha256sum src/BingoBoard.Admin/Endpoints/ProducerEndpoints.cs \
    src/BingoBoard.Admin/Services/BingoService.cs \
    src/BingoBoard.Admin/Services/IBingoService.cs \
    src/bingo-board/vite.config.js
bash /solution/reload.sh

if node /opt/benchmark/grader-v1/evolution.mjs verify > /logs/agent/f01-grader-v1.txt 2>&1; then
    echo "Expected the original grader to reject this catalog-only player proxy." >&2
    exit 1
fi
grep -q '/api/demo/producer/squares/import: HTTP 404' /logs/agent/f01-grader-v1.txt
echo "Reproduced original grader-invalid frontend write requirement."
node /opt/benchmark/evolution.mjs verify
echo "Regraded the exact saved agent patch; no reference implementation or model rerun."
