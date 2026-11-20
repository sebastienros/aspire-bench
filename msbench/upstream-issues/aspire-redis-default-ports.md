---
repo: microsoft/aspire
title: "AddRedis: plain port on 6380 breaks the generic `redis-cli` command inside the container"
finding: F22
labels: []
status: superseded
issue: https://github.com/microsoft/aspire/pull/22350
---

> **Superseded, not filed.** microsoft/aspire PR 22350 ("Use conventional Redis TLS and non-TLS target ports", merged
> 2026-11-20, commit `f6af8fce`) does what the primary proposal asks: with TLS enabled the primary endpoint now targets
> container port 6380 and the secondary non-TLS endpoint 6379. Endpoint names, host ports and connection strings are
> unchanged. The first daily after `26569.1` carries it. Kept as the record of the measurement; see F22 for what in this
> repository assumes the old layout.

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

## What the fallback hint did when measured

A CLI patch (built from source at `30326eb8`) added the hint to the Redis row of `aspire describe` and as
a `connect` string in `aspire describe --format Json`: "Port 6379 is TLS inside the container; a bare
redis-cli fails there. Plain TCP is on 6380: docker exec <container.id> sh -c
'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -p 6380 <command>'", derived from the container's arguments.
Coding agents with no Aspire skills, 6 trials per cell, against the unpatched build in the same round:

- gpt-6.1-terra reached its first working `redis-cli` reply sooner (median 15.5 s against 21.6 s), not
  significantly (p = 0.49); both arms fixed the fault in 6/6.
- gpt-6-luna fixed it in no trial on either arm, although 3 of 6 hinted trials got a working Redis reply
  against 1 of 6 without the hint.
- With the shipped Aspire skills, where the trap fires most (the first `redis-cli` failed in 5 of 12 luna
  and 2 of 6 terra trials), agents read `aspire describe --format Json`. At about 24 KB that output comes back
  to the model as an 886-character preview of a spilled file, which agents then filter with `jq`/`grep`, so the
  JSON hint never reached the screen; they saw the table's copy in 1–2 of 6 trials, and nothing improved.

A hint in `describe` helps only where it lands on screen: the table row did, the JSON field did not. That
argues for the primary proposal (swap the ports, so the generic command works wherever the agent learned
it), which was not measured; for the fallback, the hint has to be in the table, near the top of a short JSON
output, or in the error path, and in the `aspire-terminals` reference row for `redis-cli`. A generic `connect` block in `describe --format
Json` that a skill points to did work in a separate measurement (aspire-bench F50).

## Evidence

Measured in the `slow-redis` scenario of the aspire-bench telemetry suite (PLAN card T2.4, round `t23`);
see findings F22 and F50 in that repository's `msbench/FINDINGS.md`. The patch is
`msbench/telemetry/common/aspire-patches/cli-redis-connect-hint.patch`.
