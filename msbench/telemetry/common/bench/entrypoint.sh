#!/usr/bin/env bash
# Starts the private Docker daemon, the application, the fault and live traffic.
# Everything here runs before the agent; /opt/benchmark/ready gates the task.
set -euo pipefail
mkdir -p /logs/environment
dockerd --host=unix:///var/run/docker.sock --storage-driver=vfs \
    >/logs/environment/docker.log 2>&1 &
daemon_pid=$!
ready=0
for _ in {1..90}; do
    if ! kill -0 "$daemon_pid" 2>/dev/null; then cat /logs/environment/docker.log >&2; exit 1; fi
    if docker info >/dev/null 2>&1; then ready=1; break; fi
    sleep 1
done
[[ "$ready" == 1 ]] || { cat /logs/environment/docker.log >&2; exit 1; }

if [[ "${BENCH_FAULT:-}" == cold-start ]]; then
    # The agent starts the application itself. Only dependency images are warmed, as they
    # would be on a developer machine, so image pulls do not dominate either arm.
    docker pull -q postgres:18.3 >/logs/environment/application-setup.log 2>&1
    docker pull -q redis:8.6 >>/logs/environment/application-setup.log 2>&1
    touch /opt/benchmark/ready
    exec "$@"
fi
bash "/opt/benchmark/bootstrap-${BENCH_APP_KIND}.sh" >/logs/environment/application-setup.log 2>&1 || {
    cat /logs/environment/application-setup.log >&2; exit 1;
}
node /opt/benchmark/bench.mjs setup >/logs/environment/fault-setup.log 2>&1 || {
    cat /logs/environment/fault-setup.log >&2; exit 1;
}
touch /opt/benchmark/ready
exec "$@"
