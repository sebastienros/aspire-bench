#!/usr/bin/env bash
set -euo pipefail
cd /app
: "${BENCH_RUN_ID:?BENCH_RUN_ID is required}"
id="$(docker ps -q --filter "name=^/$BENCH_RUN_ID-redis$")"
[[ -n "$id" && "$id" != *$'\n'* ]]
reply="$(docker exec "$id" sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli "$@" ping' \
    redis-cli --tls --cacert /usr/lib/ssl/aspire/cert.pem)"
[[ "$reply" == PONG ]]
printf '{"ready":true,"healthy":true,"evidence":"Authenticated Redis PING returned PONG."}\n' \
    > benchmark-redis-health.json
