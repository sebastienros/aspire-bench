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

## Measured (T2.5, 2026-11-19)

The proposal was measured in the aspire-bench telemetry suite (PLAN T2.5, FINDINGS F47): the aspirified Bingo
app with `AddRedisDistributedCache("cache")` against the same app without it, on a fault where another client blocks
the cache, n = 6 per cell in each of two rounds. With the cache traced, a slow request carries about 45 `HMGET` client
spans, and on the cheapest model the diagnosis skill on the CLI reached the cache in about 22 s instead of 38 s in both
rounds. Pass rates did not change: pooled over 12 trials per cell they were equal traced and untraced, on the CLI
(11/12) and over MCP (8/12). A stronger model passed every cell either way.

So the proposal stands for what it measurably buys, a faster route to the dependency, not for changing outcomes on its
own. One caveat for the sample: the trace of such a request (44 KB as JSON) exceeds the preview limit of at least one
agent harness, so the gain depends on trace output staying compact. Status: draft, not filed.
