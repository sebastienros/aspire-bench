The Bingo application in /app is already running. The player page and admin
login page load, but calling a square fails and players do not receive the
updated call state. Restore the existing call/clear and status workflow.

Use the running app and its normal tools to diagnose the problem. The origins
are recorded in benchmark-endpoints.json, and DIAGNOSTICS.md describes the
existing functional API. Verify real functional recovery, not just page loading
or a green readiness indicator. Preserve all existing squares and call state.

Repair this workspace's runtime in place. Do not change application source,
configuration, endpoint metadata or guidance; restart application processes;
reset or replace dependencies; delete data; or change neighboring workloads.
Leave the application running. The harness owns cleanup. No JSON report is required.
