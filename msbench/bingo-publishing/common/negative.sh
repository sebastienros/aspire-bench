#!/usr/bin/env bash
set -euo pipefail
cd /app
expect_failure() {
    local label=$1 pattern=$2
    shift 2
    if node /opt/benchmark/grade.mjs verify "$@" >/tmp/p01-negative.log 2>&1; then
        echo "Grader incorrectly accepted $label" >&2
        exit 1
    fi
    grep -Eq "$pattern" /tmp/p01-negative.log || { cat /tmp/p01-negative.log >&2; exit 1; }
    echo "Rejected $label"
}
cp README.md /tmp/p01-readme
printf '\nUnrelated modification\n' >>README.md
expect_failure "immutable input edit" "Immutable owned inputs changed" --runtime-only
cp /tmp/p01-readme README.md
docker exec p01-cache redis-cli SET p01-existing destroyed
expect_failure "lost prior Redis state" "Existing Redis data must survive" --runtime-only
node --input-type=module <<'JS'
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const state = JSON.parse(readFileSync("/opt/benchmark/state.json", "utf8"));
execFileSync("docker", ["exec", "p01-cache", "redis-cli", "SET", "p01-existing", state.redis]);
JS
if [[ "$BENCH_APP_KIND" == aspire ]]; then
    cp deployment/docker-compose.yaml /tmp/p01-compose
    printf '\n# ejected by hand\n' >>deployment/docker-compose.yaml
    expect_failure "ejected fake YAML" "Ejected/fake YAML rejected"
    cp /tmp/p01-compose deployment/docker-compose.yaml
fi
frontend=$(docker ps -q --filter label=com.docker.compose.project=p01-deploy --filter label=com.docker.compose.service=bingoboard)
docker stop "$frontend"
expect_failure "nonrunning deployment" "Deployment container must be running" --runtime-only
docker start "$frontend"
docker build --target build -f src/bingo-board/Dockerfile.nginx -t p01-vite:test src/bingo-board
docker stop "$frontend"
docker rm "$frontend"
docker run -d --name p01-vite-rejected --network p01-net \
    --label com.docker.compose.project=p01-deploy \
    --label com.docker.compose.service=bingoboard \
    -e BINGO_ADMIN_URL=http://boardadmin:8080 \
    --entrypoint npm p01-vite:test run dev -- --host 0.0.0.0 --port 8080
for attempt in {1..30}; do
    if docker exec p01-vite-rejected node --input-type=module -e \
        'const r=await fetch("http://127.0.0.1:8080");if(!(await r.text()).includes("/@vite/client"))process.exit(1)'; then break; fi
    sleep 1
done
docker exec p01-vite-rejected node --input-type=module -e \
    'const r=await fetch("http://127.0.0.1:8080");if(!(await r.text()).includes("/@vite/client"))process.exit(1)'
expect_failure "live Vite development server" "Development/AppHost services are forbidden" --runtime-only
docker stop p01-vite-rejected
docker rm p01-vite-rejected
bash deployment/deploy.sh
for attempt in {1..30}; do
    if curl -fsS http://127.0.0.1:18081/api/version-info >/dev/null; then break; fi
    sleep 1
done
node /opt/benchmark/grade.mjs verify
