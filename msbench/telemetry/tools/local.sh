#!/usr/bin/env bash
# Local image build / container start for one cell, without Harbor or a model.
#   tools/local.sh up <raw|aspire> <skills-set|none> <fault>   build, start, wait until ready
#   tools/local.sh oracle <name>                                verify(broken) -> solve -> verify
# Uses the working tree for every build context, so nothing needs to be pushed.
set -euo pipefail
suite="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
msbench="$(cd "$suite/.." && pwd)"

build() {
    local kind="$1" skills="$2" fault="$3" empty
    empty="$(mktemp -d)"
    docker build -q -f "$suite/tools/templates/Dockerfile" \
        --build-context "suite=$suite/common" \
        --build-context "aspire-app=$msbench/bingo/common/aspire-app" \
        --build-context "raw-app=$msbench/bingo/common/raw-app" \
        --build-arg "APP_KIND=$kind" --build-arg "SKILLS=$skills" --build-arg "FAULT=$fault" ${CLI_PATCH:+--build-arg CLI_KIND=source --build-arg "CLI_PATCH=$CLI_PATCH"} \
        -t "telemetry-$kind-$skills-$fault:dev" "$empty" >/dev/null
    rmdir "$empty"
}

case "${1:-}" in
    up)
        kind="$2"; skills="$3"; fault="$4"; name="tele-$kind-$fault"
        build "$kind" "$skills" "$fault"
        docker rm -f "$name" >/dev/null 2>&1 || true
        docker run -d --name "$name" --privileged "telemetry-$kind-$skills-$fault:dev" >/dev/null
        for _ in $(seq 1 240); do
            if docker exec "$name" test -f /opt/benchmark/ready 2>/dev/null; then echo "READY $name"; exit 0; fi
            if [[ "$(docker inspect -f '{{.State.Running}}' "$name")" != true ]]; then
                docker logs "$name" 2>&1 | tail -40; echo "EXITED $name"; exit 1
            fi
            sleep 5
        done
        echo "TIMEOUT $name"; exit 1 ;;
    oracle)
        name="$2"
        echo "== verify before repair (must fail)"
        if docker exec "$name" node /opt/benchmark/bench.mjs verify; then echo "UNEXPECTED PASS"; exit 1; fi
        # verify stops live traffic; restart it so the repair runs under the same conditions.
        docker exec -d "$name" sh -c 'node /opt/benchmark/traffic.mjs >>/logs/environment/traffic.log 2>&1'
        echo "== reference repair"
        docker exec "$name" node /opt/benchmark/bench.mjs solve
        echo "== verify after repair (must pass)"
        docker exec "$name" node /opt/benchmark/bench.mjs verify ;;
    *) echo "Usage: local.sh up <kind> <skills> <fault> | oracle <container>" >&2; exit 2 ;;
esac
