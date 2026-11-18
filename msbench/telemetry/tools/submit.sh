#!/usr/bin/env bash
# Submits one cell (scenario x arm x model) to MSBench on CES staging and records the run.
#   [BENCH_AGENT=<harness>] [BENCH_TASK=<card>] tools/submit.sh <scenario> <arm> <model|oracle> [repeat] [round]
# `oracle` runs Harbor's reference solution (no model inference) to gate the remote graph.
# BENCH_AGENT picks the harness, each pinned to one package version:
#   github-copilot-cli (default)  Copilot CLI, the harness every result before T0.4 used
#   vscode                        VS Code agent mode; assets from agents/vscode (gen-tasks.mjs agent-assets)
#   claude-code                   Claude Code
# BENCH_AGENT_TIMEOUT_MULTIPLIER (optional) scales task.toml's agent timeout through Harbor, so a
# harness with fixed start-up overhead (VS Code: ~50 s launch + 186 s transport fallback, T0.4) gets
# the same working budget; it is recorded in the ledger as agent_timeout_multiplier.
# Every submission appends one JSON line per returned run ID to results/ledger.jsonl, with the
# harness, the Aspire build and skills tag the task was pinned to (and BENCH_TASK, the plan card, if set).
set -euo pipefail
suite="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="$(cd "$suite/../.." && pwd)"
scenario="$1"; arm="$2"; model="$3"; repeat="${4:-1}"; round="${5:-r1}"
data="${TELEMETRY_DATA_DIR:-$HOME/.aspire-bench/telemetry-runs}"
mkdir -p "$data/logs" "$suite/results"
export PATH="$HOME/Library/Application Support/pipx/venvs/msbench-cli/bin:$HOME/.local/bin:$PATH"
export MSBENCH_DISABLE_RUN_ANALYSIS=1
agent="${BENCH_AGENT:-github-copilot-cli}"
task_dir="msbench/telemetry/tasks/$scenario/$arm"
# The agent package (and for Copilot CLI the CLI itself) is pinned so every cell of a harness runs
# the same build.
agent_env=(); agent_assets=""
case "$agent" in
    github-copilot-cli)
        agent_package="github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627"
        export USE_COPILOT_CLI_VERSION=1.0.99-0
        agent_env=(--env USE_COPILOT_CLI_VERSION) ;;
    vscode)
        # @vscode/vscode-copilot-evaluation-agent, published 2026-11-17.
        agent_package="vscode=0.20261117.7" ;;
    claude-code)
        agent_package="claude-code=v0.33.1794879102" ;;
    *) echo "Unknown BENCH_AGENT '$agent' (github-copilot-cli, vscode, claude-code)" >&2; exit 1 ;;
esac

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
log="$data/logs/$round-$scenario-$arm-$model${BENCH_AGENT:+-$agent}-$stamp.log"
common=(--dataset "$suite/dataset.jsonl" --benchmark "aspire-telemetry-$scenario" --variant "$arm"
    --backend ces-staging --acr msbenchstaging.azurecr.io --num_retries 0 --no-wait
    --data-dir "$data" --tag suite=aspire-telemetry --tag "round=$round" --tag "arm=$arm")
if [[ "$model" == oracle ]]; then
    mode=(--config fix_validation --workers 1 --tag kind=validation-no-model)
else
    mode=(--agent "$agent_package" --model "$model" ${agent_env[@]+"${agent_env[@]}"}
        --workers 1 --repeat "$repeat" --parallel_repeats --tag kind=model --tag "agent=$agent")
    if [[ -n "${BENCH_AGENT_TIMEOUT_MULTIPLIER:-}" ]]; then
        mode+=(--harbor_agent_timeout_multiplier "$BENCH_AGENT_TIMEOUT_MULTIPLIER")
    fi
fi
# Read before submitting, so a run is never submitted without its ledger line.
# The toolchain pins as the remote build sees them: the task's Dockerfile at the dataset's task
# commit, and the skills provenance at the suite commit that task's compose file names.
task_sha="$(jq -er --arg p "msbench/telemetry/tasks/$scenario/$arm" 'select(.task_path == $p) | .task_repo_commit' "$suite/dataset.jsonl")"
dockerfile="$(git -C "$repo" show "$task_sha:$task_dir/environment/Dockerfile")"
suite_sha="$(git -C "$repo" show "$task_sha:$task_dir/environment/docker-compose.yaml" | grep -oE 'aspire-bench\.git#[0-9a-f]{40}:msbench/telemetry/common' | head -1 | cut -d'#' -f2 | cut -d: -f1)"
aspire_build="$(sed -nE 's/^ARG ASPIRE_VERSION=(.*)/\1/p' <<<"$dockerfile")+$(sed -nE 's/^ARG ASPIRE_COMMIT=(.*)/\1/p' <<<"$dockerfile")"
skills_sha="$(git -C "$repo" show "$suite_sha:msbench/telemetry/common/skills/PROVENANCE.md" | grep -m1 -oE '^\| `current` \| `microsoft/aspire-skills` @ `[0-9a-f]{40}` \(v[0-9.]+' | sed -E 's/.*@ `([0-9a-f]{40})` \((v[0-9.]+)/\2 \1/')"
# VS Code does not read task.toml's MCP servers; it gets the same server from the assets folder that
# matches the task (see vscodeOverrides in gen-tasks.mjs).
if [[ "$agent" == vscode && "$model" != oracle ]]; then
    if git -C "$repo" show "$task_sha:$task_dir/task.toml" | grep -q '^\[\[environment.mcp_servers\]\]'; then
        agent_assets="$suite/agents/vscode/mcp"
    else
        agent_assets="$suite/agents/vscode/base"
    fi
    mode+=(--agent_assets "$agent_assets")
fi
[[ "$aspire_build" =~ ^[0-9][^+]*\+[0-9a-f]{40}$ && "$skills_sha" =~ ^v[0-9.]+\ [0-9a-f]{40}$ ]] || { echo "Cannot read pins for $task_dir at $task_sha" >&2; exit 1; }
cd "$repo"
msbench-cli run "${common[@]}" "${mode[@]}" >"$log" 2>&1 || { tail -30 "$log" >&2; exit 1; }
dataset_sha="$(shasum -a 256 "$suite/dataset.jsonl" | cut -d' ' -f1)"
assets_sha="$([[ -n "$agent_assets" ]] && shasum -a 256 "$agent_assets/user-overrides.yaml" | cut -d' ' -f1 || true)"
# An oracle gate runs no harness.
if [[ "$model" == oracle ]]; then agent=""; agent_package=""; fi
grep -oE 'run[-_ ]?(id|ID)[^0-9]{0,12}[0-9]{16}|run-analysis/[0-9]{16}' "$log" | grep -oE '[0-9]{16}' | sort -u |
while read -r run_id; do
    jq -nc --arg run_id "$run_id" --arg scenario "$scenario" --arg arm "$arm" --arg model "$model" --arg round "$round" \
        --arg submitted_at "$stamp" --arg dataset_sha256 "$dataset_sha" --arg log "$log" --arg task_sha "$task_sha" \
        --arg aspire_build "$aspire_build" --arg skills_sha "$skills_sha" --arg task "${BENCH_TASK:-}" \
        --arg agent "$agent" --arg timeout_mult "${BENCH_AGENT_TIMEOUT_MULTIPLIER:-}" --arg agent_package "$agent_package" --arg assets "${agent_assets#"$suite/"}" --arg assets_sha "$assets_sha" \
        '{run_id: $run_id, scenario: $scenario, arm: $arm, model: $model, round: $round, submitted_at: $submitted_at,
          dataset_sha256: $dataset_sha256, log: $log, task_repo_commit: $task_sha, aspire_build: $aspire_build,
          skills_sha: $skills_sha}
         + (if $agent == "" then {} else {agent: $agent} end)
         + (if $agent_package == "" then {} else {agent_package: $agent_package} end)
         + (if $assets == "" then {} else {agent_assets: $assets, agent_assets_sha256: $assets_sha} end)
         + (if $task == "" then {} else {task: $task} end)
         + (if $timeout_mult == "" or $agent == "" then {} else {agent_timeout_multiplier: ($timeout_mult|tonumber)} end)' | tee -a "$suite/results/ledger.jsonl"
done
