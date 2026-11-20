#!/usr/bin/env bash
# Authoring scenarios (PLAN §7 T3.2, T3.3): starts the private Docker daemon, warms the dependency
# images as a developer machine would have them, and prepares the scenario. Nothing here grades.
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
{
    # The pinned integrations' default tags (Aspire.Hosting.PostgreSQL / .Redis at 30326eb8).
    docker pull -q postgres:18.3
    docker pull -q redis:8.6
    if [[ "$BENCH_FAULT" == add-dependency ]]; then
        /usr/local/aspire/aspire start --apphost /app/apphost.cs --non-interactive --isolated --nologo
        /usr/local/aspire/aspire wait boardadmin --apphost /app/apphost.cs --non-interactive --timeout 900 --nologo
        /usr/local/aspire/aspire wait bingoboard --apphost /app/apphost.cs --non-interactive --timeout 900 --nologo
    fi
    node /opt/benchmark/setup.mjs
} >/logs/environment/application-setup.log 2>&1 || { cat /logs/environment/application-setup.log >&2; exit 1; }
touch /opt/benchmark/ready
exec "$@"
