#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
RUNTIME="$1"
OUTPUT="$2"
LIMIT="$3"
child=""
watchdog=""
finish() {
    local status=$?
    trap - EXIT INT TERM
    if [[ -n "$child" ]] && kill -0 "$child" 2>/dev/null; then
        kill -TERM "$child" 2>/dev/null || true
        sleep 2
        kill -KILL "$child" 2>/dev/null || true
        wait "$child" 2>/dev/null || true
    fi
    if [[ -n "$watchdog" ]]; then
        kill -TERM "$watchdog" 2>/dev/null || true
        wait "$watchdog" 2>/dev/null || true
    fi
    if ! bash "$ROOT/scripts/cleanup.sh" "$RUNTIME" >"$OUTPUT/cleanup.log" 2>&1; then
        cat "$OUTPUT/cleanup.log" >&2
        printf '1\n' >"$OUTPUT/cleanup-exit-code"
        status=1
    else
        printf '0\n' >"$OUTPUT/cleanup-exit-code"
    fi
    if ! node "$ROOT/dist/cli.js" retain "$RUNTIME" --output "$OUTPUT"; then
        status=1
    fi
    printf '%s\n' "$status" >"$OUTPUT/exit-code"
    exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# The program grader inherits host context; the executor passes only run.env
# to the agent. Credentials stay in memory, never in environment.sh or YAML.
env -i PATH="$PATH" GH_TOKEN="${GH_TOKEN:-}" GITHUB_TOKEN="${GITHUB_TOKEN:-}" \
    COPILOT_GITHUB_TOKEN="${COPILOT_GITHUB_TOKEN:-}" \
    bash -c 'source "$1/environment.sh"; models=(); workspace=(--workspace "$1/workspaces")
        if [[ -n "${ASPIRE_BENCH_MODELS:-}" ]]; then models=(--model "$ASPIRE_BENCH_MODELS"); fi
        if [[ -n "${ASPIRE_BENCH_MODEL_CONTEXTS:-}" ]]; then
            mkdir -p "$1/workspaces"
            export TMPDIR="$1/workspaces"
            workspace=()
        fi
        exec node "$ASPIRE_BENCH_ROOT/node_modules/@microsoft/vally-cli/dist/index.js" eval \
        -e "$2/eval.yaml" --work-dir "$1/app" "${workspace[@]}" \
        --output-dir "$2" --workers 1 --max-retries 0 --require-pass \
        --executor-plugin "$ASPIRE_BENCH_ROOT/dist/plugin.js" --shutdown-timeout 3m "${models[@]}"' \
    bash "$RUNTIME" "$OUTPUT" >"$OUTPUT/vally.log" 2>&1 &
child=$!
(
    sleeper=""
    trap 'if [[ -n "$sleeper" ]]; then kill -TERM "$sleeper" 2>/dev/null || true; wait "$sleeper" 2>/dev/null || true; fi; exit' TERM INT
    sleep "$LIMIT" & sleeper=$!
    wait "$sleeper"
    printf 'Vally exceeded the trial lifecycle deadline\n' >"$OUTPUT/timeout.txt"
    kill -TERM "$child" 2>/dev/null || true
    sleep 2 & sleeper=$!
    wait "$sleeper"
    kill -KILL "$child" 2>/dev/null || true
) &
watchdog=$!
wait "$child"
child=""
if [[ -f "$OUTPUT/timeout.txt" ]]; then exit 124; fi
