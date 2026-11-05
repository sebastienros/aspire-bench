#!/usr/bin/env bash
set -Eeuo pipefail
exec 3>&2
source /opt/benchmark/diagnostics.sh
mkdir -p "$p01_environment_log_dir" "$p01_private_log_dir"
chmod 700 "$p01_private_log_dir"
p01_step dns-discovery
node /opt/benchmark/dns.mjs >"$p01_environment_log_dir/dns-plan.json" 2>"$p01_private_log_dir/dns-plan.log"
printf '[P01 DNS plan] ' >&3
cat "$p01_environment_log_dir/dns-plan.json" >&3
dns_output=$(node -e 'const p=require(process.argv[1]);console.log(p.servers.join("\n"))' "$p01_environment_log_dir/dns-plan.json")
mapfile -t dns_servers <<<"$dns_output"
dns_options=()
for server in "${dns_servers[@]}"; do dns_options+=(--dns "$server"); done
relay_gateway=$(node -e 'const p=require(process.argv[1]);if(p.mode==="loopback-relay")console.log(p.bridge.gateway)' "$p01_environment_log_dir/dns-plan.json")
if [[ -n "$relay_gateway" ]]; then
    relay_bip=$(node -e 'console.log(require(process.argv[1]).bridge.bip)' "$p01_environment_log_dir/dns-plan.json")
    relay_pool=$(node -e 'console.log(require(process.argv[1]).bridge.pool)' "$p01_environment_log_dir/dns-plan.json")
    dns_options+=(--bip "$relay_bip" --default-address-pool "base=$relay_pool,size=24")
fi
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
if [[ -n "$relay_gateway" ]]; then
    p01_step dns-relay-startup
    node /opt/benchmark/dns-relay.mjs "$p01_environment_log_dir/dns-plan.json" \
        "$p01_environment_log_dir/dns-relay-ready.json" >"$p01_environment_log_dir/dns-relay.log" 2>&1 &
    relay_pid=$!
    for attempt in {1..30}; do
        kill -0 "$relay_pid"
        if [[ -f "$p01_environment_log_dir/dns-relay-ready.json" ]]; then break; fi
        sleep 1
    done
    test -f "$p01_environment_log_dir/dns-relay-ready.json"
fi
p01_step application-setup
bash /opt/benchmark/setup.sh >"$p01_private_log_dir/setup.log" 2>&1
p01_step ready-marker
touch /opt/benchmark/ready
p01_step ready
exec "$@"
