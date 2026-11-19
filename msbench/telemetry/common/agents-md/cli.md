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
