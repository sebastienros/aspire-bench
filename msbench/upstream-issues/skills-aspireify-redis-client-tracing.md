---
repo: microsoft/aspire-skills
title: "aspireify: switch Microsoft.Extensions.Caching.StackExchangeRedis to the Aspire client integration so cache calls are traced"
finding: F23
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
