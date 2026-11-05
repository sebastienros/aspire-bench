#!/usr/bin/env bash
set -Eeuo pipefail
exec 3>&2
source /opt/benchmark/diagnostics.sh
mkdir -p "$p01_environment_log_dir" "$p01_private_log_dir"
chmod 700 "$p01_private_log_dir"
p01_step dns-discovery
dns_output=$(node /opt/benchmark/dns.mjs)
mapfile -t dns_servers <<<"$dns_output"
dns_options=()
for server in "${dns_servers[@]}"; do dns_options+=(--dns "$server"); done
p01_step docker-startup
dockerd --host=unix:///var/run/docker.sock --storage-driver=vfs "${dns_options[@]}" \
    >"$p01_private_log_dir/docker.log" 2>&1 &
daemon_pid=$!
p01_step docker-readiness
for attempt in {1..90}; do
    kill -0 "$daemon_pid"
    if docker info >/dev/null 2>&1; then break; fi
    sleep 1
done
docker info >"$p01_private_log_dir/docker-info.log" 2>&1
p01_step application-setup
bash /opt/benchmark/setup.sh >"$p01_private_log_dir/setup.log" 2>&1
p01_step ready-marker
touch /opt/benchmark/ready
p01_step ready
exec "$@"
