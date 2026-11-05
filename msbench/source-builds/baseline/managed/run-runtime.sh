#!/usr/bin/env bash
set -euo pipefail

readonly workspace=/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-upgraded-couscous
readonly evidence=/Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline
readonly output="$evidence/managed/output"
check_space() {
  local available
  available="$(df -k "$workspace" | awk 'NR==2 { print $4 }')"
  printf '%s available_host_KiB=%s stage=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$available" "$1" \
    | tee -a "$output/logs/host-space.log"
  if (( available < 10485760 )); then
    printf 'Stopping: host free space below 10 GiB.\n' >&2
    exit 1
  fi
}
mkdir -p "$evidence/managed/runtime-context" "$evidence/managed/runtime-nuget" "$output/lifecycle"
check_space before-runtime-image
docker build --platform linux/amd64 --progress plain --tag aspire-agentic-managed-bingo:d698a4f9 \
  --file "$evidence/managed/Dockerfile.runtime" "$evidence/managed/runtime-context" \
  > "$output/logs/runtime-image.log" 2>&1 || {
    result=$?
    tail -70 "$output/logs/runtime-image.log"
    exit "$result"
  }
docker image inspect aspire-agentic-managed-bingo:d698a4f9 > "$output/logs/runtime-image-inspect.json"
check_space after-runtime-image
docker run --rm --privileged --platform linux/amd64 --name aspire-managed-bingo-81fbe89f \
  --mount type=bind,source="$output",target=/baseline,readonly \
  --mount type=bind,source="$output/lifecycle",target=/logs \
  --mount type=bind,source="$evidence/managed/runtime-nuget",target=/root/.nuget/packages \
  --mount type=bind,source="$evidence",target=/evidence,readonly \
  aspire-agentic-managed-bingo:d698a4f9 \
  > "$output/logs/runtime-console.log" 2>&1 || {
    result=$?
    tail -80 "$output/logs/runtime-console.log"
    exit "$result"
  }
check_space after-runtime
docker ps -a --filter name=aspire-managed-bingo-81fbe89f \
  --format '{{.ID}} {{.Names}} {{.Status}}' > "$output/logs/outer-container-cleanup.txt"
test ! -s "$output/logs/outer-container-cleanup.txt"
