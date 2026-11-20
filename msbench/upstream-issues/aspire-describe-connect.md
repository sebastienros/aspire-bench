---
repo: microsoft/aspire
title: "aspire describe: a `connect` entry per resource with the command that reaches it with its own client"
finding: F38, F50
labels: []
status: draft
issue:
---

## Summary

An agent (or a person) confirming a diagnosis at a dependency needs the container, the credential variables, the
port that speaks the plain protocol and the client tool. `aspire describe --format Json` gives the container ID and
the variable names, but whether the vendor's documented client works inside the container depends on the
integration: an audit of 15 hosting integrations at a recent daily found the generic recipe works for 6
(PostgreSQL, MySQL, RabbitMQ, Keycloak, Valkey, Seq) and fails for 9 for five different reasons (TLS on the default
port for Redis, fixed on `main` by PR 22350 after the audit, and MongoDB, the `SSL_CERT_DIR` list breaking SQL Server's ODBC client, no client in the image for
NATS, Azurite, Qdrant and Garnet, Kafka's renamed client and unreachable advertised listener, HTTPS on the Cosmos
emulator's documented HTTP port). Every skill that tells an agent how to reach a dependency carries a line per
integration to work around this.

## Proposal

Add to each resource in `aspire describe --format Json` (and the MCP resource listing) a `connect` object:

```json
"connect": {
  "command": "docker exec <container> sh -c 'REDISCLI_AUTH=\"$REDIS_PASSWORD\" exec redis-cli -p <plain-port> \"$@\"' sh",
  "runs": "container",
  "tool": "redis-cli",
  "append": "<command>, for example INFO",
  "note": "optional"
}
```

`command` ends where the client's own arguments go (the integration fills in literals such as the plain port, which for Redis
moved from 6380 to 6379 in PR 22350); credentials stay in the container (only variable names are
printed); `runs` is `host` when the image has no client (the command then uses the published port). Each hosting
integration should declare its own entry (it knows its ports, TLS setup and credential variables), rather than the
CLI matching image names. The container shell execution that #22168 (open) proposes to graduate to stable is the host-side mechanism a
`runs: container` entry can build on.

## Evidence

aspire-bench telemetry suite, PLAN T4.1 (audit matrix, FINDINGS F38–F46) and T2.6 (FINDINGS F50): a CLI-side
prototype of this block, with the diagnosis skill's dependency step reduced to "run `connect.command` with the
tool's arguments", matched the hand-written per-integration step on the cheapest model (6/6 and 6/6 passes, 0.90×
and 0.89× the time on a slow-SQL and a blocked-cache fault). Use the container name or a 12-character ID: one agent
mis-copied the 64-character ID. A Redis-only version of the same field (`connect` as a string hint) was measured
separately (T2.4).
