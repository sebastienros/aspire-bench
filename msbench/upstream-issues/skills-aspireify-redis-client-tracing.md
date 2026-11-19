---
repo: microsoft/aspire-skills
title: "aspireify: switch Microsoft.Extensions.Caching.StackExchangeRedis to the Aspire client integration so cache calls are traced"
finding: F23, F47
labels: []
status: draft
issue:
---

## Summary

The aspirified Bingo app (from the aspireify workshop's observe step) registers its
cache with `AddStackExchangeRedisCache` from `Microsoft.Extensions.Caching.StackExchangeRedis`
and a connection string, not with `Aspire.StackExchange.Redis.DistributedCaching`. It
therefore has PostgreSQL client spans but no Redis spans. On a fault where the cache is
blocked by another client, the trace shows a 5 to 12 s request with one short database
span and nothing else: the cache is implicated by elimination, not named. Agents that
did not already know to look at the dependency patched the application instead.

## Proposal

When `aspireify` finds `Microsoft.Extensions.Caching.StackExchangeRedis` (or
`Microsoft.AspNetCore.SignalR.StackExchangeRedis`) in a project, propose the Aspire
client integration (`AddRedisDistributedCache("cache")` /
`AddRedisClient`) so the connection is traced and health-checked, and say why in the
proposal text. The same applies to the workshop sample that this app came from.

## Evidence

`slow-redis` scenario in the aspire-bench telemetry suite (finding F23). With a skill
that tells the agent where to look it still fixed 5 of 6 on the cheapest model; a trace
that names the cache span would remove the need for that hint.

## Measured (T2.5, 2026-11-19): ship only with a skill change

The proposal was measured in the aspire-bench telemetry suite (PLAN T2.5, FINDINGS F47): the aspirified Bingo
app with `AddRedisDistributedCache("cache")` against the same app without it, same round, `slow-redis`, n = 6.
With the cache traced, a slow request carries about 45 `HMGET` client spans. On the cheapest model the lean
skill on the CLI got better (6/6 against 5/6, Redis reached in 22 s against 39 s), but the same skill over MCP got
worse (3/6 against 6/6), and so did a raw app instrumented with the OpenTelemetry SDK and no Aspire (0/6 against
3/6): those agents read "many near-identical child spans" as an N+1 in the caller and batched the cache reads
instead of looking at the cache. A stronger model passed every cell either way.

So the proposal stands, with a condition: the diagnosis skill's span table should say that many near-identical
client spans to one dependency, each slow, mean the dependency is slow, before this lands in the template or the
`aspireify` guidance. Status: draft, not filed.
