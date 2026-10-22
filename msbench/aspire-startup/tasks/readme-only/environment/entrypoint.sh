#!/usr/bin/env bash
set -euo pipefail

mkdir -p /logs/environment
dockerd --host=unix:///var/run/docker.sock --storage-driver=vfs \
    >/logs/environment/docker.log 2>&1 &
daemon_pid=$!
ready=0
for attempt in {1..60}; do
    if ! kill -0 "$daemon_pid" 2>/dev/null; then
        cat /logs/environment/docker.log >&2
        exit 1
    fi
    if docker info >/dev/null 2>&1; then
        ready=1
        break
    fi
    sleep 1
done
if [[ "$ready" != 1 ]]; then
    echo "The task's private Docker daemon did not become ready." >&2
    cat /logs/environment/docker.log >&2
    exit 1
fi
exec "$@"
