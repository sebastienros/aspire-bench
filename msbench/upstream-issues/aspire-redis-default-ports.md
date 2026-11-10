---
repo: dotnet/aspire
title: "AddRedis: plain port on 6380 breaks the generic `redis-cli` command inside the container"
finding: F22
labels: []
status: draft
issue:
---

## Summary

On `main` (observed on `17.1.0-preview.1.26559.1`), `AddRedis` in run mode starts the
container with `--tls-port 6379 --port 6380` and a generated certificate. `redis-cli`
defaults to 6379, so the command every operator and agent reaches for first fails:

```
$ docker exec <redis> redis-cli PING
Error: Connection reset by peer   # or: I/O error
```

and the container log shows `SSL routines::wrong version number`.

Aspire's own `WithRepl()` handles this correctly (it picks the secondary port when TLS
is enabled, and the `Aspire.Hosting.Redis` README says so). The problem is that nothing
an operator sees at the point of failure explains it: not the error, not
`aspire describe`, not the MCP resource description. In an agent benchmark on a
cache-side incident, agents that hit this spent a diagnosis cycle on the tool instead of
the fault.

## Proposal

Swap the defaults so the plain port stays on 6379 (the primary endpoint) and TLS moves
to 6380. The generic command then works, clients that ask for TLS still get it, and
`WithRepl()` keeps working since it resolves the endpoint by name.

## Fallback

If the ports must stay as they are, surface a hint where people look:

- the Redis resource's `aspire describe` output and the MCP resource description, noting
  that 6379 is TLS and 6380 is plain inside the container;
- the `aspire-terminals` skill reference row for `redis-cli`.

## Evidence

Measured in the `slow-redis` scenario of the aspire-bench telemetry suite; see
finding F22 in that repository's `msbench/FINDINGS.md`.
