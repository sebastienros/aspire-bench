#!/usr/bin/env bash
# PLAN T4.1: run audit rows inside the suite's app-aspire image (pin CLI, private dockerd).
#   audit/integration/run.sh build            build the image stage (tag telemetry-audit-base:p2int)
#   audit/integration/run.sh up               start the audit container
#   audit/integration/run.sh row <row>...     score rows one at a time
#   audit/integration/run.sh matrix           write evidence/integration-audit/<date>/matrix.md
#   audit/integration/run.sh down             remove the container and its docker volume
# EVIDENCE_DATE (default: today, UTC) names the evidence folder.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
suite="$(cd "$here/../.." && pwd)"
msbench="$(cd "$suite/.." && pwd)"
evidence="$suite/evidence/integration-audit/${EVIDENCE_DATE:-$(date -u +%F)}"
name=p2int-audit
image=telemetry-audit-base:p2int
case "${1:-}" in
    build)
        empty="$(mktemp -d)"
        docker build -q -f "$suite/tools/templates/Dockerfile" --target app-aspire \
            --build-context "suite=$suite/common" \
            --build-context "aspire-app=$msbench/bingo/common/aspire-app" \
            --build-context "raw-app=$msbench/bingo/common/raw-app" -t "$image" "$empty"
        rmdir "$empty" ;;
    up)
        mkdir -p "$evidence"
        docker rm -f "$name" >/dev/null 2>&1 || true
        docker volume create "$name-docker" >/dev/null
        docker run -d --name "$name" --privileged -v "$name-docker:/var/lib/docker" \
            -v "$here:/audit:ro" -v "$evidence:/out" --entrypoint bash "$image" \
            -c 'dockerd --host=unix:///var/run/docker.sock --storage-driver=overlay2 >/var/log/dockerd.log 2>&1 & sleep infinity' >/dev/null
        for _ in $(seq 1 60); do docker exec "$name" docker info >/dev/null 2>&1 && break; sleep 1; done
        docker exec "$name" sh -c '/usr/local/aspire/aspire --version; docker version --format "{{.Server.Version}} {{.Server.Arch}}"' | tee "$evidence/environment.txt"
        uname -m >>"$evidence/environment.txt" ;;
    row)
        shift
        for row in "$@"; do
            platform="$(node -e "const r=require('$here/rows.json').rows.find(r=>r.row==='$row'); console.log(r&&r.platform||'')")"
            echo "== $row ${platform:+(DOCKER_DEFAULT_PLATFORM=$platform)}"
            docker exec ${platform:+-e DOCKER_DEFAULT_PLATFORM=$platform} "$name" node /audit/audit.mjs row "$row" >"$evidence/$row.log" 2>&1 || echo "row $row exited $?"
            tail -3 "$evidence/$row.log"
        done ;;
    matrix) docker exec "$name" node /audit/audit.mjs matrix ;;
    down) docker rm -f "$name"; docker volume rm "$name-docker" ;;
    *) echo "Usage: run.sh build|up|row <row>...|matrix|down" >&2; exit 2 ;;
esac
