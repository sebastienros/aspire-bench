The application and its dependencies were started earlier and remain running.
Wait for and verify that the existing Redis service is ready and healthy.
Observe the existing application; do not start, restart, or recreate Redis separately.
Save your assessment in benchmark-redis-health.json in the workspace root:
{"ready":true,"healthy":true,"evidence":"observed check and result"}.
Use booleans reflecting the actual state and describe the checks you performed.
Do not change previously saved benchmark JSON files.

Work in /app. Preserve the supplied BENCH_RUN_ID and COMPOSE_PROJECT_NAME.
The Docker daemon and all application ports are private to this task. Do not modify application sources or supplied guidance.
