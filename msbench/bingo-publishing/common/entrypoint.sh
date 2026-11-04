#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/environment
dockerd --host=unix:///var/run/docker.sock --storage-driver=overlay2 \
    >/logs/environment/docker.log 2>&1 &
daemon_pid=$!
for attempt in {1..90}; do
    kill -0 "$daemon_pid" || { cat /logs/environment/docker.log >&2; exit 1; }
    if docker info >/dev/null 2>&1; then break; fi
    sleep 1
done
docker info >/dev/null
bash /opt/benchmark/setup.sh >/logs/environment/setup.log 2>&1 || {
    cat /logs/environment/setup.log >&2
    exit 1
}
touch /opt/benchmark/ready
exec "$@"
