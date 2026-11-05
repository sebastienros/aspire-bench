#!/usr/bin/env bash
set -euo pipefail

mkdir -p /logs /app
cp -a /baseline/bingo-overlay/. /app/
cd /app
daemon_pid=""
started=0
stopped=0
cleanup() {
  result=$?
  trap - EXIT
  set +e
  if (( started == 1 && stopped == 0 )); then
    timeout 90 aspire stop --apphost /app/apphost.cs --non-interactive --nologo \
      > /logs/failure-cleanup-stop.stdout 2> /logs/failure-cleanup-stop.stderr
    printf '%s\n' "$?" > /logs/failure-cleanup-stop.exit
  fi
  if [[ -d /app/.aspire ]]; then
    cp -a /app/.aspire /logs/app-aspire
  fi
  docker ps -a --no-trunc > /logs/private-docker-final.txt 2>&1
  if [[ -n "$daemon_pid" ]]; then
    kill "$daemon_pid"
    wait "$daemon_pid"
  fi
  printf '%s\n' "$result" > /logs/lifecycle.exit
  exit "$result"
}
trap cleanup EXIT

date -u '+%Y-%m-%dT%H:%M:%SZ' > /logs/started-at.txt
uname -sm > /logs/runtime-platform.txt
dotnet --info > /logs/runtime-dotnet-info.txt
node --version > /logs/node-version.txt
aspire --version > /logs/cli-version.txt
test "$(cat /logs/cli-version.txt)" = 17.0.0-baseline.gd698a4f9cb80
timeout 120 aspire setup --install-path /opt/aspire-baseline --non-interactive --nologo \
  > /logs/setup.stdout 2> /logs/setup.stderr
export ASPIRE_LAYOUT_PATH=/opt/aspire-baseline
test -L /opt/aspire-baseline/bundle
for component in managed/aspire-managed dashboard/Aspire.Dashboard \
  dashboard/wwwroot/_framework/blazor.web.js dashboard/libe_sqlite3.so \
  terminalhost/Aspire.TerminalHost terminalhost/libhex1binterop.so \
  apphost-server/aspire-apphost-server apphost-server/ats-contract.json dcp/dcp; do
  test -s "/opt/aspire-baseline/bundle/$component"
done
readlink /opt/aspire-baseline/bundle > /logs/extracted-layout-link.txt

dockerd --host=unix:///var/run/docker.sock --storage-driver=vfs > /logs/private-dockerd.log 2>&1 &
daemon_pid=$!
ready=0
for attempt in {1..60}; do
  kill -0 "$daemon_pid"
  if docker info > /logs/private-docker-info.txt 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
test "$ready" = 1
test -z "$(docker ps -q)"

started=1
timeout 900 aspire start --apphost /app/apphost.cs --launch-profile http \
  --non-interactive --isolated --format Json --nologo \
  > /logs/start.stdout 2> /logs/start.stderr
timeout 660 aspire wait boardadmin --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo \
  > /logs/wait-boardadmin.stdout 2> /logs/wait-boardadmin.stderr
timeout 660 aspire wait bingoboard --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo \
  > /logs/wait-bingoboard.stdout 2> /logs/wait-bingoboard.stderr
aspire describe --apphost /app/apphost.cs --format Json --non-interactive --nologo \
  > /logs/describe.json 2> /logs/describe.stderr
node --input-type=module > /logs/endpoints.json <<'JS'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { resources } = JSON.parse(readFileSync("/logs/describe.json", "utf8"));
for (const name of ["cache", "postgres", "db", "migrations", "boardadmin", "bingoboard"]) {
  assert(resources.some(resource => resource.displayName === name), `Missing resource ${name}`);
}
const url = name => {
  const resource = resources.find(item => item.displayName === name);
  const endpoint = resource?.urls?.find(item => item.url?.startsWith("http://"));
  assert(endpoint, `Missing HTTP endpoint for ${name}`);
  return new URL(endpoint.url).origin;
};
const migration = resources.find(resource => resource.displayName === "migrations");
assert.equal(migration.exitCode, 0);
console.log(JSON.stringify({ admin: url("boardadmin"), frontend: url("bingoboard") }));
JS
admin_url="$(jq -er .admin /logs/endpoints.json)"
frontend_url="$(jq -er .frontend /logs/endpoints.json)"
curl --fail --silent --show-error --max-time 30 "$admin_url/health" > /logs/admin-health.txt
curl --fail --silent --show-error --max-time 30 "$frontend_url/" > /logs/frontend.html
docker ps --no-trunc > /logs/private-docker-running.txt
timeout 90 aspire stop --apphost /app/apphost.cs --non-interactive --nologo \
  > /logs/stop.stdout 2> /logs/stop.stderr
stopped=1
aspire ps --format json --non-interactive --nologo > /logs/ps-after-stop.json 2> /logs/ps-after-stop.stderr
jq -e 'length == 0' /logs/ps-after-stop.json
for attempt in {1..30}; do
  if [[ -z "$(docker ps -q)" ]]; then
    break
  fi
  sleep 1
done
test -z "$(docker ps -q)"
date -u '+%Y-%m-%dT%H:%M:%SZ' > /logs/finished-at.txt
printf 'Bingo private lifecycle passed.\n'
