Start the existing Aspire application using the concise sequence in /app/README.md.
Wait for its admin and frontend endpoints and save their HTTP origins in
/app/benchmark-endpoints.json:
{"admin":"http://localhost:PORT","frontend":"http://localhost:PORT"}.
Record the recipe's command-boundary timestamps in benchmark-startup-timings.json.
Leave the application running. Do not perform separate service, database,
Redis, telemetry, or deployment assessments.

Work in /app. Preserve BENCH_RUN_ID and COMPOSE_PROJECT_NAME.
Do not modify application sources or supplied guidance.
