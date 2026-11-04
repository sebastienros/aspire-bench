#!/usr/bin/env bash
set -euo pipefail
cd /app
if node /opt/benchmark/grade.mjs verify --runtime-only >/tmp/p01-noop.log 2>&1; then
    echo "Grader incorrectly accepted no deployment" >&2
    exit 1
fi
grep -q "Exactly two published deployment services required" /tmp/p01-noop.log
echo "Rejected no-op deployment"
mkdir -p deployment
cat >deployment/docker-compose.yaml <<'YAML'
name: p01-deploy
services:
  boardadmin:
    image: p01-admin:local
    build:
      context: ..
      dockerfile: Dockerfile.dotnet
      args:
        PROJECT: BingoBoard.Admin
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      DOTNET_ENVIRONMENT: Production
      Authentication__AdminPassword: ${Parameters__admin_password:?}
      ConnectionStrings__db: ${ConnectionStrings__db:?}
      ConnectionStrings__cache: ${ConnectionStrings__cache:?}
    ports:
      - "127.0.0.1:18080:8080"
    networks: [p01-net]
  bingoboard:
    image: p01-frontend:local
    build:
      context: ../src/bingo-board
      dockerfile: Dockerfile.nginx
    environment:
      BINGO_ADMIN_URL: http://boardadmin:8080
    ports:
      - "127.0.0.1:18081:8080"
    networks: [p01-net]
networks:
  p01-net:
    external: true
YAML
cat >deployment/deploy.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
cd /app
source deployment-inputs.env
docker compose -p p01-deploy -f deployment/docker-compose.yaml up -d --build
SH
bash deployment/deploy.sh
for attempt in {1..60}; do
    if curl -fsS http://127.0.0.1:18081/api/version-info >/dev/null; then break; fi
    sleep 1
done
node /opt/benchmark/grade.mjs verify
bash /opt/benchmark/negative.sh
