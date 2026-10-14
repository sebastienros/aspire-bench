Start the application and verify that all its services are up and working.
Investigate and fix any startup problems. Leave the application running.
Save its admin and frontend URLs in benchmark-endpoints.json in the workspace root:
{"admin":"http://localhost:PORT","frontend":"http://localhost:PORT"}.

Work in /app. Preserve the supplied BENCH_RUN_ID and COMPOSE_PROJECT_NAME.
The Docker daemon and all application ports are private to this task. Do not modify application sources or supplied guidance.
