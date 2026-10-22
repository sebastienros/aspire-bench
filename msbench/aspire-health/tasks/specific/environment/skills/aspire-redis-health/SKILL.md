---
name: aspire-redis-health
description: Verify the already-running Bingo Redis service is ready and healthy with an authenticated TLS PING and record the observed Redis assessment. Use for Redis readiness or cache health after startup, not provisioning, database checks, service HTTP checks, or changing cache contents.
---

# Observe existing Redis health

Work in `/app`. Aspire's logical Redis resource is `cache`, but this
AppHost fixes its owned Docker container name to `$BENCH_RUN_ID-redis`.
Select exactly that running container. Use its existing password and Aspire
CA certificate without disabling TLS verification or writing cache data:

```bash
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
```

Do not print credentials. If a check fails, report the actual failure,
inspect existing logs if needed, and use bounded retries for transient
readiness. Do not emit a successful assessment unless PING returns PONG.
Do not start, restart, recreate, or modify resources, source, guidance, or
prior benchmark JSON files. Preserve supplied environment values; the
harness owns cleanup.
