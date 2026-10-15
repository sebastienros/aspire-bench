The application was started in the previous step and remains running.
Wait for and verify that its services are running and healthy.
Observe the existing application; do not start, restart, or recreate services separately.
Save your assessment in benchmark-services-health.json in the workspace root:
{"running":true,"healthy":true,"evidence":"observed check and result"}.
Use booleans reflecting the actual state and describe the checks you performed.
Do not change benchmark-endpoints.json.

Work in /app. Preserve the supplied BENCH_RUN_ID and COMPOSE_PROJECT_NAME.
The Docker daemon and all application ports are private to this task. Do not modify application sources or supplied guidance.
