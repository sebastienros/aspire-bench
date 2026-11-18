#!/usr/bin/env bash
# Submits one cell (scenario x arm x model) to MSBench on CES staging and records the run.
#   tools/submit.sh <scenario> <arm> <model|oracle> [repeat] [round]
# `oracle` runs Harbor's reference solution (no model inference) to gate the remote graph.
# Every submission appends one JSON line per returned run ID to results/ledger.jsonl, with the
# Aspire build and skills tag the task was pinned to (and BENCH_TASK, the plan card, if set).
set -euo pipefail
suite="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="$(cd "$suite/../.." && pwd)"
scenario="$1"; arm="$2"; model="$3"; repeat="${4:-1}"; round="${5:-r1}"
data="${TELEMETRY_DATA_DIR:-$HOME/.aspire-bench/telemetry-runs}"
mkdir -p "$data/logs" "$suite/results"
export PATH="$HOME/Library/Application Support/pipx/venvs/msbench-cli/bin:$HOME/.local/bin:$PATH"
export MSBENCH_DISABLE_RUN_ANALYSIS=1
# The agent package and Copilot CLI are pinned so every cell runs the same harness.
agent_package="github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627"
export USE_COPILOT_CLI_VERSION=1.0.99-0

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
log="$data/logs/$round-$scenario-$arm-$model-$stamp.log"
common=(--dataset "$suite/dataset.jsonl" --benchmark "aspire-telemetry-$scenario" --variant "$arm"
    --backend ces-staging --acr msbenchstaging.azurecr.io --num_retries 0 --no-wait
    --data-dir "$data" --tag suite=aspire-telemetry --tag "round=$round" --tag "arm=$arm")
if [[ "$model" == oracle ]]; then
    mode=(--config fix_validation --workers 1 --tag kind=validation-no-model)
else
    mode=(--agent "$agent_package" --model "$model" --env USE_COPILOT_CLI_VERSION
        --workers 1 --repeat "$repeat" --parallel_repeats --tag kind=model)
fi
# Read before submitting, so a run is never submitted without its ledger line.
# The toolchain pins as the remote build sees them: the task's Dockerfile at the dataset's task
# commit, and the skills provenance at the suite commit that task's compose file names.
task_sha="$(jq -er --arg p "msbench/telemetry/tasks/$scenario/$arm" 'select(.task_path == $p) | .task_repo_commit' "$suite/dataset.jsonl")"
task_dir="msbench/telemetry/tasks/$scenario/$arm"
dockerfile="$(git -C "$repo" show "$task_sha:$task_dir/environment/Dockerfile")"
suite_sha="$(git -C "$repo" show "$task_sha:$task_dir/environment/docker-compose.yaml" | grep -oE 'aspire-bench\.git#[0-9a-f]{40}:msbench/telemetry/common' | head -1 | cut -d'#' -f2 | cut -d: -f1)"
aspire_build="$(sed -nE 's/^ARG ASPIRE_VERSION=(.*)/\1/p' <<<"$dockerfile")+$(sed -nE 's/^ARG ASPIRE_COMMIT=(.*)/\1/p' <<<"$dockerfile")"
skills_sha="$(git -C "$repo" show "$suite_sha:msbench/telemetry/common/skills/PROVENANCE.md" | grep -m1 -oE '^\| `current` \| `microsoft/aspire-skills` @ `[0-9a-f]{40}` \(v[0-9.]+' | sed -E 's/.*@ `([0-9a-f]{40})` \((v[0-9.]+)/\2 \1/')"
[[ "$aspire_build" =~ ^[0-9][^+]*\+[0-9a-f]{40}$ && "$skills_sha" =~ ^v[0-9.]+\ [0-9a-f]{40}$ ]] || { echo "Cannot read pins for $task_dir at $task_sha" >&2; exit 1; }
cd "$repo"
msbench-cli run "${common[@]}" "${mode[@]}" >"$log" 2>&1 || { tail -30 "$log" >&2; exit 1; }
dataset_sha="$(shasum -a 256 "$suite/dataset.jsonl" | cut -d' ' -f1)"
grep -oE 'run[-_ ]?(id|ID)[^0-9]{0,12}[0-9]{16}|run-analysis/[0-9]{16}' "$log" | grep -oE '[0-9]{16}' | sort -u |
while read -r run_id; do
    jq -nc --arg run_id "$run_id" --arg scenario "$scenario" --arg arm "$arm" --arg model "$model" --arg round "$round" \
        --arg submitted_at "$stamp" --arg dataset_sha256 "$dataset_sha" --arg log "$log" --arg task_sha "$task_sha" \
        --arg aspire_build "$aspire_build" --arg skills_sha "$skills_sha" --arg task "${BENCH_TASK:-}" \
        '{run_id: $run_id, scenario: $scenario, arm: $arm, model: $model, round: $round, submitted_at: $submitted_at,
          dataset_sha256: $dataset_sha256, log: $log, task_repo_commit: $task_sha, aspire_build: $aspire_build,
          skills_sha: $skills_sha} + (if $task == "" then {} else {task: $task} end)' | tee -a "$suite/results/ledger.jsonl"
done
