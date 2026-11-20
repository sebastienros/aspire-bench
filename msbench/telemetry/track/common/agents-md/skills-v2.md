# Agent instructions

This is an Aspire application. Its AppHost is `/app/apphost.cs`.

## Run it
1. Start it: `aspire start --apphost /app/apphost.cs --non-interactive --isolated`.
2. `aspire describe` lists every resource of the running app with its state, health and endpoint
   URLs. That list names the resources to wait on.
3. `aspire wait <resource-name>` for each resource the task needs, with `<resource-name>` taken from
   that list. It returns when the resource is healthy.

`aspire logs <resource-name>` prints that resource's console output.

## When it is slow
Start with `aspire otel traces -n 15 --search "duration:>500"` (milliseconds; lower the
threshold if nothing comes back), before reading code or timing requests by hand.

## Skills
- `aspire`: entry point; detects the AppHost and picks one of the skills below.
- `aspire-orchestration`: start, stop, restart or wait for resources; port conflicts, file-lock build errors.
- `aspire-monitoring`: logs, traces, metrics and resource state of a running app.
- `aspireify`: wire resources into an AppHost.
- `aspire-init`: add Aspire to a repository.
- `aspire-deployment`: deploy or publish the app.
- `aspire-terminals`: Aspire terminals.
- `aspire-project-v2-migration`: move project resources to the v2 APIs.
