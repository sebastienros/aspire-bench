#!/usr/bin/env bash
set -euo pipefail
cd /app
tls=()
case "$BENCH_APP_KIND" in
    compose)
        id="$(docker ps -q --filter "label=com.docker.compose.project=$BENCH_RUN_ID" \
            --filter label=com.docker.compose.service=redis)"
        ;;
    aspire)
        id="$(docker ps -q --filter "name=^/$BENCH_RUN_ID-redis$")"
        tls=(--tls --cacert /usr/lib/ssl/aspire/cert.pem)
        ;;
    *) echo "Unknown BENCH_APP_KIND" >&2; exit 1 ;;
esac
reply="$(docker exec "$id" sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli "$@" ping' redis-cli "${tls[@]}")"
[[ "$reply" == PONG ]]
printf '{"ready":true,"healthy":true,"evidence":"Authenticated Redis PING returned PONG."}\n' \
    >benchmark-redis-health.json
