#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
MODEL=""
PAIRS=1
TIMEOUT=15m
VARIANTS=raw,aspire
APP=bingo
SCENARIO=health-checks
OUTPUT=""
PAID=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --allow-paid) PAID=1; shift ;;
        --model|--pairs|--timeout|--variants|--app|--scenario|--output)
            if [[ $# -lt 2 ]]; then echo "Missing value for $1" >&2; exit 2; fi
            case "$1" in
                --model) MODEL="$2" ;;
                --pairs) PAIRS="$2" ;;
                --timeout) TIMEOUT="$2" ;;
                --variants) VARIANTS="$2" ;;
                --app) APP="$2" ;;
                --scenario) SCENARIO="$2" ;;
                --output) OUTPUT="$2" ;;
            esac
            shift 2 ;;
        *) echo "Unknown option: $1" >&2; exit 2 ;;
    esac
done
[[ "$PAID" == 1 ]] || { echo "Pass --allow-paid explicitly to spend model credits" >&2; exit 2; }
[[ -n "$MODEL" ]] || { echo "Choose --model explicitly" >&2; exit 2; }
[[ -n "${COPILOT_GITHUB_TOKEN:-}${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]] || {
    echo "Export COPILOT_GITHUB_TOKEN, GH_TOKEN or GITHUB_TOKEN" >&2; exit 2;
}
[[ "$PAIRS" =~ ^[1-9][0-9]*$ ]] || { echo "--pairs must be a positive integer" >&2; exit 2; }
[[ "$TIMEOUT" =~ ^([1-9][0-9]*)(ms|s|m|h)$ ]] || { echo "Invalid --timeout duration" >&2; exit 2; }
amount="${BASH_REMATCH[1]}"
case "${BASH_REMATCH[2]}" in
    ms) SECONDS_LIMIT=$((amount / 1000 + 1)) ;;
    s) SECONDS_LIMIT=$amount ;;
    m) SECONDS_LIMIT=$((amount * 60)) ;;
    h) SECONDS_LIMIT=$((amount * 3600)) ;;
esac
# Reserve time for the five-minute program grader and SDK shutdown.
SECONDS_LIMIT=$((SECONDS_LIMIT + 540))
npm run build --silent
node "$ROOT/dist/cli.js" validate
COMMON=(--app "$APP" --scenario "$SCENARIO" --model "$MODEL" --timeout "$TIMEOUT")
INIT=("${COMMON[@]}" --variants "$VARIANTS" --pairs "$PAIRS")
if [[ -n "$OUTPUT" ]]; then INIT+=(--output "$OUTPUT"); fi
selection="$(node "$ROOT/dist/cli.js" selection --app "$APP" --scenario "$SCENARIO" --variants "$VARIANTS")"
names=()
while IFS= read -r name; do names+=("$name"); done <<<"$selection"
OUTPUT="$(node "$ROOT/dist/cli.js" initialize "${INIT[@]}")"
echo "Results: $OUTPUT"
status=0
trial=""
total=$((PAIRS * ${#names[@]}))
completed=0
failed=0
progress() {
    printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$OUTPUT/progress.log"
}
progress "Evaluation started: $total trials; scenario=$SCENARIO; model=$MODEL"
finish() {
    local interrupted=$?
    trap - EXIT INT TERM
    if [[ -n "$trial" ]]; then
        kill -TERM "$trial" 2>/dev/null || true
        wait "$trial" 2>/dev/null || true
    fi
    progress "Evaluation ended: $completed/$total finished; $failed failed; $(($total - completed)) unfinished"
    if ! bash "$ROOT/scripts/report.sh" "$OUTPUT"; then status=1; fi
    if [[ "$interrupted" -ne 0 ]]; then exit "$interrupted"; fi
    exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
for ((pair=1; pair<=PAIRS; pair++)); do
    for ((index=0; index<${#names[@]}; index++)); do
        offset=$index
        if ((pair % 2 == 0)); then offset=$((${#names[@]} - 1 - index)); fi
        variant="${names[$offset]}"
        directory="$OUTPUT/$pair-$variant"
        progress "Starting $pair/$PAIRS $variant ($completed/$total finished)"
        runtime="$(bash "$ROOT/scripts/setup.sh" "${COMMON[@]}" --variants "$variant" \
            --repetition "$pair" --output "$directory")"
        progress "Running $pair/$PAIRS $variant; log=$directory/vally.log"
        bash "$ROOT/scripts/trial.sh" "$runtime" "$directory" "$SECONDS_LIMIT" &
        trial=$!
        trial_status=0
        if wait "$trial"; then
            completed=$((completed + 1))
            progress "Finished $pair/$PAIRS $variant: passed ($completed/$total finished)"
        else
            trial_status=$?
            completed=$((completed + 1))
            failed=$((failed + 1))
            progress "Finished $pair/$PAIRS $variant: failed (exit=$trial_status; $completed/$total finished)"
            status=1
            cat "$directory/vally.log" >&2
        fi
        trial=""
        if [[ -f "$directory/cleanup-exit-code" ]] && [[ "$(cat "$directory/cleanup-exit-code")" != 0 ]]; then
            exit 1
        fi
    done
done
