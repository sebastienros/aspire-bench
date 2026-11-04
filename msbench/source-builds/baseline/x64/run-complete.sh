#!/usr/bin/env bash
set -euo pipefail

readonly workspace=/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-upgraded-couscous
readonly evidence=/Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline
readonly volume=aspire-agentic-baseline-x64-source-81fbe89f
readonly image=mcr.microsoft.com/dotnet/sdk@sha256:db7d1f28c0805ea69fe43f73e54cffd2a0689a0c637a6078328e27c5aab2314a
cd "$workspace"
test "$(git rev-parse HEAD)" = d698a4f9cb800649791da2b3d81c5850330072c1
test -z "$(git status --porcelain=v1)"
mkdir -p artifacts/agentic-baseline-x64/logs
docker volume create "$volume"
docker run --rm -i --platform linux/arm64 --name aspire-baseline-x64-source-extract-81fbe89f \
  --mount type=volume,source="$volume",target=/src \
  sha256:e2438fd800a09d2d761aefe4edd30675c8f1db8958e4423c0844cc9a0240e60f \
  tar -xf - -C /src \
  < "$evidence/source-d698a4f9cb800649791da2b3d81c5850330072c1.tar"
docker run --rm --platform linux/amd64 --name aspire-baseline-x64-build-81fbe89f \
  --mount type=volume,source="$volume",target=/src \
  --mount type=bind,source="$workspace/artifacts/agentic-baseline/nuget",target=/cache \
  --mount type=bind,source="$workspace/artifacts/agentic-baseline-x64",target=/out \
  --mount type=bind,source="$evidence",target=/evidence,readonly \
  --workdir /src "$image" \
  bash /evidence/x64/build-complete.sh \
  2>&1 | tee "$workspace/artifacts/agentic-baseline-x64/logs/complete-build-attempt2.log"
