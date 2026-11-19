---
repo: dotnet/aspire
title: "Run mode: a port already in use makes DCP skip the endpoint's proxy with an INFO line, and `aspire describe` still advertises it"
finding: F55
labels: []
status: draft
issue:
---

## Summary

On `main` (observed on the daily `17.1.0-preview.1.26567.3+30326eb8`, file-based C# AppHost, Linux), when a
project resource's configured port is already held by another process, `aspire start` (without `--isolated`)
succeeds and DCP cannot bind the endpoint's proxy. The only trace is one INFO line in the AppHost log:

```
[INFO] [AppHost] Could not use the same port for all addresses associated with requested service address,
service will be reachable only using specific IP address {"Service": "/boardadmin", "AttemptedCommonPort": 5039,
"RequestedServiceAddress": "localhost"}
```

`aspire describe` (table and `--format Json`) still lists the resource at `http://localhost:5039`, which is the
other process. Health checks go to that address too: if the other process answers 200 the resource reads
**Running / Healthy** while its URL serves something else; if it answers 404 the resource reads Unhealthy, and
resources that `WaitFor` it stay Waiting, with nothing pointing at the port.

## Repro

1. Any AppHost with a project resource whose launch profile has `applicationUrl: http://localhost:5039`.
2. `node -e 'for (const h of ["127.0.0.1","::1"]) require("http").createServer((q,r)=>r.end("other")).listen(5039,h)' &`
3. `aspire start --apphost apphost.cs --non-interactive` → "AppHost started successfully".
4. `aspire describe --format Json` → the resource's URL is `http://localhost:5039`; `curl` it → `other`.

`aspire start --isolated` randomizes every port, including the launch profile's and an endpoint pinned in the
AppHost (`WithEndpoint("http", e => e.Port = 15173)` came up on another port), so the isolated path never meets
the conflict.

## Proposal

- Treat a proxy that cannot bind its requested port as a resource error (state or health "port in use by pid N"),
  logged at warning or error level.
- Do not advertise an endpoint URL that the proxy did not bind, in `describe`, the dashboard and MCP
  `list_resources`.

## Evidence

Agent benchmark (aspire-bench `msbench/telemetry`, PLAN §7 T3.1 `port-conflict`): see the finding for the
measured behaviour and what agents did when they met it.
