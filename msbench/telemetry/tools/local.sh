#!/usr/bin/env bash
# Local image build / container start for one cell, without Harbor or a model.
#   tools/local.sh up <raw|aspire> <skills-set|none> <fault>   build, start, wait until ready
#   tools/local.sh oracle <name>                                verify(broken) -> solve -> verify
#   tools/local.sh gate <name> <task-dir> [SOLUTION_SHAPE]       authoring scenarios (T3.2/T3.3): copies the
#                                                               task's tests/ and solution/ in, then the same
#                                                               verify(fail) -> solve -> verify(pass) sequence
# AGENTS_MD=<file in common/agents-md, without .md> adds /app/AGENTS.md as the -agents arms do (T2.10).
# APP_VARIANT=<folder in common/app-variants> builds that application variant (T2.5).
# LOCAL_SUFFIX=<word> is appended to the image tag and container name, so lanes working at the same
# time on the same cell do not remove each other's containers.
# Uses the working tree for every build context, so nothing needs to be pushed.
set -euo pipefail
suite="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
msbench="$(cd "$suite/.." && pwd)"

tag() { echo "telemetry-$1-$2-$3${AGENTS_MD:+-agents}${APP_VARIANT:+-$APP_VARIANT}${CLI_PATCH:+-$CLI_PATCH}${LOCAL_SUFFIX:+-$LOCAL_SUFFIX}:dev"; }

build() {
    local kind="$1" skills="$2" fault="$3" empty
    empty="$(mktemp -d)"
    if [[ "$fault" == adoption || "$fault" == add-dependency || "$fault" == greenfield ]]; then
        # Authoring scenarios (PLAN §7 T3.2/T3.3): their own template, stage chosen by FAULT.
        docker build -q -f "$suite/tools/templates/Dockerfile.authoring" \
            --build-context "suite=$suite/common" \
            --build-context "aspire-app=$msbench/bingo/common/aspire-app" \
            --build-context "raw-app=$msbench/bingo/common/raw-app" \
            --build-arg "APP_KIND=$kind" --build-arg "SKILLS=$skills" --build-arg "FAULT=$fault" \
            -t "$(tag "$kind" "$skills" "$fault")" "$empty" >/dev/null
    elif [[ "$fault" == heldout-* ]]; then
        # Held-out Shop application (T0.2). SQL Server has no arm64 image, so on an arm64 host
        # set LOCAL_PLATFORM=linux/amd64 (the whole cell then runs emulated).
        docker build -q -f "$suite/tools/templates/Dockerfile.heldout" ${LOCAL_PLATFORM:+--platform "$LOCAL_PLATFORM"} \
            --build-context "suite=$suite/common" \
            --build-context "heldout-app=$msbench/heldout/app" \
            --build-arg "APP_KIND=$kind" --build-arg "SKILLS=$skills" --build-arg "FAULT=$fault" ${AGENTS_MD:+--build-arg "AGENTS_MD=$AGENTS_MD"} \
            -t "$(tag "$kind" "$skills" "$fault")" "$empty" >/dev/null
    else
        docker build -q -f "$suite/tools/templates/Dockerfile" \
            --build-context "suite=$suite/common" \
            --build-context "aspire-app=$msbench/bingo/common/aspire-app" \
            --build-context "raw-app=$msbench/bingo/common/raw-app" \
            --build-arg "APP_KIND=$kind" --build-arg "SKILLS=$skills" --build-arg "FAULT=$fault" ${CLI_PATCH:+--build-arg CLI_KIND=source --build-arg "CLI_PATCH=$CLI_PATCH"} ${AGENTS_MD:+--build-arg "AGENTS_MD=$AGENTS_MD"} \
            ${APP_VARIANT:+--build-arg "APP_VARIANT=$APP_VARIANT"} \
            -t "$(tag "$kind" "$skills" "$fault")" "$empty" >/dev/null
    fi
    rmdir "$empty"
}

case "${1:-}" in
    up)
        kind="$2"; skills="$3"; fault="$4"; name="tele-$kind-$fault${APP_VARIANT:+-$APP_VARIANT}${LOCAL_SUFFIX:+-$LOCAL_SUFFIX}"
        build "$kind" "$skills" "$fault"
        docker rm -f "$name" >/dev/null 2>&1 || true
        docker run -d --name "$name" --privileged ${LOCAL_PLATFORM:+--platform "$LOCAL_PLATFORM"} "$(tag "$kind" "$skills" "$fault")" >/dev/null
        for _ in $(seq 1 480); do
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
    gate)
        name="$2"; task="$3"; shape="${4:-}"
        docker exec "$name" rm -rf /tests /solution
        docker cp "$task/tests" "$name:/tests"
        docker cp "$task/solution" "$name:/solution"
        echo "== verify before repair (must fail)"
        if docker exec "$name" bash /tests/test.sh && [[ "$(docker exec "$name" cat /logs/verifier/reward.txt)" == 1 ]]; then echo "UNEXPECTED PASS"; exit 1; fi
        echo "== reference solution ${shape:-default}"
        docker exec -e "SOLUTION_SHAPE=$shape" "$name" bash /solution/solve.sh
        echo "== verify after repair (must pass)"
        docker exec "$name" bash /tests/test.sh
        docker exec "$name" cat /logs/verifier/details.json
        [[ "$(docker exec "$name" cat /logs/verifier/reward.txt)" == 1 ]] ;;
    *) echo "Usage: local.sh up <kind> <skills> <fault> | oracle <container> | gate <container> <task-dir> [shape]" >&2; exit 2 ;;
esac
