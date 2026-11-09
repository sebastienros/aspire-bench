---
name: aspire-diagnose
description: >-
  Find the root cause when a RUNNING Aspire app is slow, failing, erroring, unhealthy, or
  misbehaving, using the telemetry Aspire has already collected (traces, spans, structured
  logs, console logs, resource health). USE FOR: "the app is slow or sluggish", "requests
  fail", "500 errors", timeouts, intermittent errors, "find the root cause", "which service
  or dependency is responsible", "why is this resource unhealthy", latency regressions.
  Start here BEFORE reading source code or probing endpoints by hand. DO NOT USE FOR:
  starting or stopping the app (aspire-orchestration), AppHost edits (aspireify),
  deployment (aspire-deployment).
license: MIT
---

# Diagnose a running Aspire app

Aspire already recorded what real requests did, including calls that logs never mention
(SQL statements, HTTP calls, their durations and failures). Read that first: it is faster
than reproducing the problem by hand or reading the code. Every command below is read-only
and bounded. Add `--apphost <path>` only when more than one AppHost is running.

## 1. Locate the symptom (pick by symptom, one command each)

```bash
aspire describe                                      # every resource: state, health, endpoints
aspire otel traces -n 15 --search "duration:>500"    # slow requests (milliseconds), newest last
aspire otel traces -n 15 --has-error                 # failed requests
aspire otel logs -n 20 --severity Error              # errors and exceptions from all resources
```

- Slow, nothing fails: use the `duration` filter. Lower the threshold if it returns nothing.
- Failing: use `--has-error` and the error logs. The log message usually carries the
  exception and, for database errors, the SQLSTATE/code.
- Resource not `Running`/`Healthy`: `aspire logs <resource> -n 50` for its console output.

Group what comes back by operation name. One operation that is consistently slow or
failing while the others are fine is the lead.

## 2. Explain one representative trace

```bash
aspire otel traces -t <trace-id> --format Json
```

Use JSON here, not the table: only JSON carries each span's `durationMs`, its `source` and
`destination`, and attributes such as `db.query.text`, `http.route`, `url.full`,
`http.response.status_code` and `exception.message`. Find the span that owns the time or
the error:

| What the spans show | Meaning |
|---|---|
| One child span takes almost the whole duration | That dependency call is the cause. Note its statement/URL and destination. |
| Many near-identical child spans | N+1 or a chatty loop in the caller. |
| Time not covered by any child span | The caller's own code: CPU, lock, or an uninstrumented call. |
| Error on a client span but the request returned 200 | A swallowed failure or silent fallback. |

Logs for the same request: `aspire otel logs --trace-id <trace-id>`.

## 3. Confirm at the dependency

The trace names the resource and the operation. Investigate there with the dependency's
own tool, running it inside the resource's container so no credentials or ports are needed:

```bash
aspire describe <resource> --format Json   # properties."container.id", urls, healthReports
docker exec <container.id> sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U postgres -d <database> -c "<sql>"'
docker exec <container.id> sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli <command>'
```

For a slow SQL statement run it under `EXPLAIN (ANALYZE, BUFFERS)` in a transaction you
roll back, and check triggers, indexes, and locks on the table (`\d+ "<table>"`,
`pg_stat_activity`, `pg_locks`). A slow write with a fast read usually means a trigger,
a constraint, or a lock rather than the statement itself. For a failing statement, the
error code tells you whether it is permissions, read-only state, schema, or connectivity;
check server and database settings (`pg_db_role_setting`, `SHOW <setting>`).

## 4. Fix the cause, then verify with telemetry

Fix the root cause where it lives. Do not hide it with timeouts, retries, or by disabling
the feature that is slow, and do not delete data to make it fast. A setting changed on a
database applies to new sessions only: restart the consuming resource with
`aspire resource <resource> restart` (or end its sessions) so pooled connections pick it up.

Then confirm on fresh traffic, using the same filter that showed the problem:

```bash
aspire otel traces -n 5 --search "name:<operation fragment>"
```

New traces for that operation should be fast and error-free.
