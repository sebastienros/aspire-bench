#!/usr/bin/env bash
set -euo pipefail

readonly workspace=/Users/sebastienros/.copilot/copilot-worktrees/aspire/sebros-upgraded-couscous
readonly evidence=/Users/sebastienros/.copilot/session-state/31a2bfab-2c9d-4125-985d-e85f4fa77709/files/baseline
readonly output="$evidence/managed/output"
cd "$workspace"
test "$(git rev-parse HEAD)" = d698a4f9cb800649791da2b3d81c5850330072c1
test -z "$(git status --porcelain=v1)"
mkdir -p "$output/logs" "$output/packages" "$evidence/managed/nuget"

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

stages=(
  managed dashboard terminal server layout cli
  package:Aspire.Hosting package:Aspire.Hosting.AppHost package:Aspire.AppHost.Sdk
  package:Aspire.Hosting.Redis package:Aspire.Hosting.PostgreSQL package:Aspire.Hosting.JavaScript
)
if (( $# > 0 )); then
  stages=("$@")
fi
for stage in "${stages[@]}"; do
  check_space "before:$stage"
  log_name="${stage//:/-}"
  docker run --rm --platform linux/amd64 --name aspire-managed-build-81fbe89f \
    --mount type=volume,source=aspire-agentic-baseline-x64-source-81fbe89f,target=/src \
    --mount type=bind,source="$evidence/managed/nuget",target=/cache \
    --mount type=bind,source="$output",target=/out \
    --mount type=bind,source="$evidence",target=/evidence,readonly \
    --workdir /src mcr.microsoft.com/dotnet/sdk@sha256:db7d1f28c0805ea69fe43f73e54cffd2a0689a0c637a6078328e27c5aab2314a \
    bash /evidence/managed/build-stage.sh "$stage" \
    > "$output/logs/$log_name.log" 2>&1 || {
      result=$?
      tail -70 "$output/logs/$log_name.log"
      exit "$result"
    }
  tail -8 "$output/logs/$log_name.log"
  check_space "after:$stage"
done
