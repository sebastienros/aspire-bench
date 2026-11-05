#!/usr/bin/env bash
p01_diagnostics_module="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/diagnostics.mjs"
p01_private_log_dir=/opt/benchmark/private-logs
p01_environment_log_dir=/logs/environment
p01_phase=initialization

p01_step() {
    p01_phase=$1
    printf '[P01 setup] phase=%s\n' "$p01_phase" >&3
    printf '[P01 setup] phase=%s\n' "$p01_phase" >>"$p01_environment_log_dir/progress.log"
}

p01_report_failure() {
    local status=$1 line=$2 source=$3
    trap - ERR
    printf '[P01 setup failed] phase=%s status=%s source=%s line=%s\n' \
        "$p01_phase" "$status" "${source##*/}" "$line" >&3
    node "$p01_diagnostics_module" "$p01_phase" "$status" "$line" "$source" \
        "$p01_private_log_dir" "$p01_environment_log_dir" >&3 2>&3 || {
        printf '[P01 setup] Diagnostic reporter failed; raw private logs were not printed.\n' >&3
    }
    exit "$status"
}

trap 'p01_report_failure "$?" "$LINENO" "${BASH_SOURCE[0]}"' ERR
