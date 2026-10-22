---
name: aspire-postgres-health
description: Verify the already-running Bingo PostgreSQL database is ready and healthy, including migrated and seeded application data, and record the observed database assessment. Use for database readiness or PostgreSQL health after startup, not provisioning, migrations authoring, service HTTP checks, or Redis checks.
---

# Observe existing PostgreSQL health

Work in `/app`. The existing Aspire AppHost fixes the owned container name
to `$BENCH_RUN_ID-postgres` and uses database `db`. Select that exact running
container; do not guess isolation-suffixed resource names or start another
database. Verify connectivity and application data without writing to it:

```bash
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
```

Use credentials only inside the selected container; do not print them.
`pg_isready` alone does not prove migrations or seed data exist. If a check
fails, report the actual failure, inspect existing logs if needed, and use
bounded retries for transient readiness. Do not emit a successful assessment
unless both checks pass. Do not run migrations, start, restart, recreate,
or modify resources, source, guidance, or prior benchmark JSON files.
Preserve supplied environment values; the harness owns cleanup.
