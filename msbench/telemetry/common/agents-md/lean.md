# Agent instructions

This is an Aspire application. Its AppHost is `/app/apphost.cs`.

## Run it
- Start: `aspire start --apphost /app/apphost.cs --non-interactive --isolated`, then
  `aspire wait <resource>` for each resource you need.
- `aspire describe` lists every resource with its state, health and endpoint URLs.
- `aspire logs <resource>` prints that resource's console output.

## When it is slow
Start with `aspire otel traces -n 15 --search "duration:>500"` (milliseconds; lower the
threshold if nothing comes back), before reading code or timing requests by hand.

## Skills
- `aspire-diagnose`: find why a running app is slow, failing or stuck, from its telemetry.
- `aspire-orchestration`: start, stop, restart or wait for resources; port conflicts, file-lock build errors.
- `aspire-monitoring`: telemetry export, the standalone dashboard, browser telemetry.
- `aspireify`: wire resources into an AppHost.
- `aspire-init`: add Aspire to a repository.
- `aspire-deployment`: deploy or publish the app.
- `aspire-terminals`: Aspire terminals.
- `aspire-project-v2-migration`: move project resources to the v2 APIs.
