#!/usr/bin/env bash
# Submits one cell (scenario x arm x model) to MSBench on CES staging and records the run.
#   tools/submit.sh <scenario> <arm> <model|oracle> [repeat] [round]
# `oracle` runs Harbor's reference solution (no model inference) to gate the remote graph.
# Every submission appends one JSON line per returned run ID to results/ledger.jsonl.
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
        --workers "$repeat" --repeat "$repeat" --parallel_repeats --tag kind=model)
fi
cd "$repo"
msbench-cli run "${common[@]}" "${mode[@]}" >"$log" 2>&1 || { tail -30 "$log" >&2; exit 1; }
dataset_sha="$(shasum -a 256 "$suite/dataset.jsonl" | cut -d' ' -f1)"
grep -oE 'run[-_ ]?(id|ID)[^0-9]{0,12}[0-9]{16}|run-analysis/[0-9]{16}' "$log" | grep -oE '[0-9]{16}' | sort -u |
while read -r run_id; do
    printf '{"run_id":"%s","scenario":"%s","arm":"%s","model":"%s","round":"%s","submitted_at":"%s","dataset_sha256":"%s","log":"%s"}\n' \
        "$run_id" "$scenario" "$arm" "$model" "$round" "$stamp" "$dataset_sha" "$log" | tee -a "$suite/results/ledger.jsonl"
done
