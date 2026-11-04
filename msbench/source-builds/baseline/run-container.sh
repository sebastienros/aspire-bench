#!/usr/bin/env bash
set -euo pipefail

readonly workspace=/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-upgraded-couscous
readonly evidence=/Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline
readonly revision=d698a4f9cb800649791da2b3d81c5850330072c1
readonly image=sha256:e2438fd800a09d2d761aefe4edd30675c8f1db8958e4423c0844cc9a0240e60f
readonly volume=aspire-agentic-baseline-source-81fbe89f
cd "$workspace"
test "$(git rev-parse HEAD)" = "$revision"
test -z "$(git status --porcelain=v1)"

mkdir -p artifacts/agentic-baseline-linux
git archive --format=tar "$revision" > "$evidence/source-$revision.tar"
docker volume create "$volume"
docker run --rm -i --name aspire-agentic-linux-build-81fbe89f \
  --mount type=volume,source="$volume",target=/src \
  --mount type=bind,source="$workspace/artifacts/agentic-baseline/nuget",target=/cache \
  --mount type=bind,source="$workspace/artifacts/agentic-baseline-linux",target=/out \
  --mount type=bind,source="$evidence",target=/evidence,readonly \
  --workdir /src \
  --env BASELINE_OUTPUT=/out \
  --env NUGET_PACKAGES=/cache \
  "$image" bash -c 'tar -xf - -C /src && bash /evidence/build-linux.sh' \
  < "$evidence/source-$revision.tar" 2>&1 | tee "$evidence/docker-linux-volume-build.log"
