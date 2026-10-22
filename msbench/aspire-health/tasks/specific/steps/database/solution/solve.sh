#!/usr/bin/env bash
set -euo pipefail
cd /app
: "${BENCH_RUN_ID:?BENCH_RUN_ID is required}"
id="$(docker ps -q --filter "name=^/$BENCH_RUN_ID-postgres$")"
[[ -n "$id" && "$id" != *$'\n'* ]]
docker exec "$id" pg_isready -U postgres
seeded="$(docker exec "$id" sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql "$@"' psql \
    -U postgres -d db -At -v ON_ERROR_STOP=1 -c \
    'SELECT EXISTS (SELECT 1 FROM "AspNetUsers" WHERE "UserName" = '\''admin'\'') AND EXISTS (SELECT 1 FROM "BingoSquares");')"
[[ "$seeded" == t ]]
printf '{"ready":true,"healthy":true,"evidence":"pg_isready accepted connections; admin and BingoSquares seed query returned true."}\n' \
    > benchmark-database-health.json
