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

if [[ "${BENCH_FAULT:-}" == selection ]]; then
    # Selection benchmark (PLAN T3.9): a static copy of the workspace, nothing started, and a
    # Copilot CLI policy hook (system-wide, outside the workspace; repository hooks are not loaded
    # under the eval driver) that stops the agent at its first skill load or third command.
    mkdir -p /etc/github-copilot/policy.d
    install -m 0644 /opt/benchmark/selection/hooks.json /etc/github-copilot/policy.d/selection.json
    touch /opt/benchmark/ready
    exec "$@"
fi
if [[ "${BENCH_FAULT:-}" == cold-start* ]]; then
    # The agent starts the application itself. Only dependency images are warmed, as they
    # would be on a developer machine, so image pulls do not dominate either arm.
    docker pull -q postgres:18.3 >/logs/environment/application-setup.log 2>&1
    docker pull -q redis:8.6 >>/logs/environment/application-setup.log 2>&1
    if [[ "$BENCH_FAULT" == cold-start-warm ]]; then
        # Warm workspace: the AppHost already ran once with persisted ports in isolated mode
        # (Aspire #21013), then stopped; generated ports stay in /app/.aspire/state.
        {
            cd /app
            /usr/local/aspire/aspire config set portAllocation.persistInIsolatedMode true --non-interactive --nologo
            bash /opt/benchmark/bootstrap-aspire.sh
            /usr/local/aspire/aspire stop --apphost /app/apphost.cs --non-interactive --nologo
            # `aspire stop` returns before DCP has removed the containers; a start right after it
            # collides on the fixed container names (bingo-redis exits 137). A workspace stopped
            # earlier has no containers left, so wait for that state.
            for _ in {1..120}; do
                [[ -z "$(docker ps -aq --filter "name=^${BENCH_RUN_ID}-")" ]] && break
                sleep 1
            done
            docker ps -a --format '{{.Names}} {{.Status}}'
            [[ -z "$(docker ps -aq --filter "name=^${BENCH_RUN_ID}-")" ]]
            cd - >/dev/null
        } >>/logs/environment/application-setup.log 2>&1 || {
            cat /logs/environment/application-setup.log >&2; exit 1;
        }
    fi
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
