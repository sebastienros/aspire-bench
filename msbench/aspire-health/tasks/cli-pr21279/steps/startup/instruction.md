Start the application using its normal startup workflow, including its dependencies.
Wait until the admin and frontend HTTP endpoints respond. Leave the application running.
Dependency readiness and health will be assessed in later steps; do not perform those assessments here.
Save its admin and frontend URLs in benchmark-endpoints.json in the workspace root:
{"admin":"http://localhost:PORT","frontend":"http://localhost:PORT"}.

Work in /app. Preserve the supplied BENCH_RUN_ID and COMPOSE_PROJECT_NAME.
The Docker daemon and all application ports are private to this task. Do not modify application sources or supplied guidance.
