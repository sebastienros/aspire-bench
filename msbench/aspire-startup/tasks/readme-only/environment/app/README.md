# Bingo startup

The installed Aspire CLI orchestrates this application's PostgreSQL, Redis,
migrations, admin backend (`boardadmin`) and frontend (`bingoboard`).
Run the following sequence from `/app`; it starts once, waits for the two
application resources, and records their HTTP origins.

```bash
launch_started_ms=$(date +%s%3N)
aspire start --apphost /app/apphost.cs --launch-profile http \
  --non-interactive --isolated --format Json --nologo
launch_returned_ms=$(date +%s%3N)
aspire wait boardadmin --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo
aspire wait bingoboard --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo
ready_ms=$(date +%s%3N)
aspire describe --apphost /app/apphost.cs --format Json --non-interactive --nologo \
  > /tmp/bingo-resources.json
node --input-type=module <<'JS'
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const { resources } = JSON.parse(readFileSync("/tmp/bingo-resources.json", "utf8"));
const origin = displayName => {
    const resource = resources.find(item => item.displayName === displayName);
    const url = resource?.urls?.find(item => item.url?.startsWith("http://"))?.url;
    assert(url, `Missing HTTP endpoint for ${displayName}`);
    return new URL(url).origin;
};
writeFileSync("benchmark-endpoints.json",
    JSON.stringify({ admin: origin("boardadmin"), frontend: origin("bingoboard") }));
JS
endpoints_written_ms=$(date +%s%3N)
printf '{"launch_started_ms":%s,"launch_returned_ms":%s,"ready_ms":%s,"endpoints_written_ms":%s}\n' \
  "$launch_started_ms" "$launch_returned_ms" "$ready_ms" "$endpoints_written_ms" \
  > benchmark-startup-timings.json
```

Run the sequence in one Bash invocation with `set -euo pipefail` so timestamp
variables persist and command failures stop execution. Record the timestamps
as shown; do not estimate them. They measure command boundaries, not internal
Aspire phases or first HTTP readiness.

Resource `name` values may have isolation suffixes. Match `displayName`
instead; endpoint URLs are in `urls[].url`, not `endpoints[]`.

Do not change source files or supplied guidance. Preserve `BENCH_RUN_ID`,
`COMPOSE_PROJECT_NAME`, and the supplied password. Leave the application running;
the harness owns cleanup. This task does not ask for separate dependency,
database, Redis, telemetry, or deployment assessments.
