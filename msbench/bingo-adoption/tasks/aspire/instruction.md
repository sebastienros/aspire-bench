Work in /app. This is the existing raw Bingo application; it has no AppHost yet
and is not running. Add Aspire orchestration and start the complete app.

Use the installed Aspire CLI/release family 13.6.0 and .NET 10. Preserve the
existing application, frontend, migrations, data-access code, scripts, and guidance.
You may add orchestration/configuration files; do not rewrite business code.
The app must still provide the real admin login, player frontend, version API,
SignalR, and database/Redis behavior. Migrations and seed data must run.

Use resource names boardadmin and bingoboard for the admin and player, and
connection-string names db and cache required by the existing code. Name the
dependency containers ${BENCH_RUN_ID}-postgres and ${BENCH_RUN_ID}-redis so the
harness can scope ownership. Preserve the supplied run ID, Compose project name,
and password. Use allocated ports and references rather than fixed application
ports or hardcoded credentials.

Launch through Aspire, not the existing raw launcher or standalone app processes.
Verify real running behavior. Leave the app running. The harness owns cleanup.
No written assessment or endpoint report is required; the grader discovers
endpoints from Aspire.
