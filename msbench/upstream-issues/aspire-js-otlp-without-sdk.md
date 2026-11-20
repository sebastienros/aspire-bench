---
repo: microsoft/aspire
title: "JavaScript resources get OTLP settings but export nothing until the app adds an SDK, and nothing says so"
finding: F58
labels: []
status: draft
issue:
---

## Summary

`AddViteApp` and the other JavaScript hosting methods call `WithOtlpExporter()`, so a Node process started by the
AppHost receives `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME` and the rest. A Node app without an
OpenTelemetry SDK ignores all of it. The resource then shows no trace, no span and no structured log in the
dashboard, `aspire otel traces` or the MCP server. The dashboard's resource overview cards say "This resource hasn't
sent telemetry" (since #21412), which is also what a resource that has not been called yet shows; nothing in
`aspire describe`, the MCP resource listing or the aspireify main path says that this resource cannot send any.
#17683 reports the same situation for `addBunApp`, with a misleading `aspire otel` message on top.

In an aspirified sample application (a Vite dev-server frontend proxying API calls to an ASP.NET admin), no trace
row came from the frontend in any of 2,338 benchmark trials that listed traces. As a result, the hop where a frontend
calls its backend, and where a swallowed failure would show as an error client span under a 200 server span, is
invisible. Adding `@opentelemetry/auto-instrumentations-node` and starting Vite with
`--require @opentelemetry/auto-instrumentations-node/register` was enough. With it, Aspire's environment exported
the server and client spans unchanged.

## Proposal

One or more of:

1. `aspire describe` and the MCP resource listing mark a resource that has never sent telemetry while the AppHost
   configured OTLP for it ("no telemetry received"), and the dashboard card distinguishes "OTLP configured, nothing
   received" from an idle resource, so an agent or a person does not read an empty trace list as "nothing happened".
2. The aspireify guidance (aspire-skills) puts the Node SDK step on its main path when it wires a JavaScript
   resource: the package and the `--require`/`--import` registration, or `NODE_OPTIONS` on the resource. Since
   microsoft/aspire-skills#148 the step exists in `references/opentelemetry.md`, listed as optional wiring.
3. The JavaScript hosting docs for `AddViteApp`/`AddNodeApp` state that the OTLP variables are only consumed by an SDK
   in the app, with the minimal registration.

## Measured

- Aspire daily 17.1.0-preview.1.26567.3 (30326eb8): `src/Aspire.Hosting.JavaScript/JavaScriptHostingExtensions.cs`
  calls `WithOtlpExporter()` for the Vite and Node app resources.
- Telemetry suite trajectories (Copilot CLI, gpt-6-luna and gpt-6.1-terra, two Aspire dailies): 2,338 trials ran
  `aspire otel traces`; 0 listed a frontend (`bingoboard:`) trace.
- With the auto-instrumentation registered in the Vite process (app variant `aspire-frontend-traced` in the suite),
  the frontend's `GET /api/version-info` server span and its outgoing client span to the admin appear in
  `aspire otel traces` (PLAN T4.2).
