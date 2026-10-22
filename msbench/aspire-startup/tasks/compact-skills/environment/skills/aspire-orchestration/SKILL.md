---
name: aspire-orchestration
description: Start the supplied Aspire application and discover its ready HTTP endpoints. Use for starting this application's AppHost, waiting for readiness, and saving startup endpoints.
---

# Aspire startup

Read `/app/README.md` and execute its startup recipe in one shell invocation
so its timing variables persist. The recipe selects `/app/apphost.cs`, starts
it detached with `aspire start`, waits for the two HTTP resources, and writes
the requested endpoint and timing JSON files.

Use the exact resource and JSON-field names from the recipe. Match
`resources[].displayName`, not isolated resource names, and read `urls[].url`.
Leave the application running. Preserve the supplied environment variables,
application sources, and guidance.

If the recipe fails, report the failing command and inspect its diagnostic
output before retrying. Do not report success until both endpoints are ready
and the requested files exist. Do not perform unrelated dependency assessments
or restart a successfully running application.
