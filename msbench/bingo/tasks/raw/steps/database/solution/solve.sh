#!/usr/bin/env bash
set -euo pipefail
cd /app
case "$BENCH_APP_KIND" in
    compose)
        id="$(docker ps -q --filter "label=com.docker.compose.project=$BENCH_RUN_ID" \
            --filter label=com.docker.compose.service=postgres)"
        database=bingo
        ;;
    aspire)
        id="$(docker ps -q --filter "name=^/$BENCH_RUN_ID-postgres$")"
        database=db
        ;;
    *) echo "Unknown BENCH_APP_KIND" >&2; exit 1 ;;
esac
docker exec "$id" pg_isready -U postgres
seeded="$(docker exec "$id" sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql "$@"' psql \
    -U postgres -d "$database" -At -v ON_ERROR_STOP=1 -c \
    'SELECT EXISTS (SELECT 1 FROM "AspNetUsers" WHERE "UserName" = '\''admin'\'') AND EXISTS (SELECT 1 FROM "BingoSquares");')"
[[ "$seeded" == t ]]
printf '{"ready":true,"healthy":true,"evidence":"pg_isready accepted connections; admin and BingoSquares seed query returned true."}\n' \
    >benchmark-database-health.json
