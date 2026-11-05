# Bingo production deployment

This workspace already contains its complete production deployment model,
production Dockerfiles and a repeatable non-interactive deployment command:

```bash
bash deployment/deploy.sh
```

No application or orchestration wiring is missing. The command uses the
supplied deployment model and writes runtime artifacts to `deployment/`.
It can be repeated to bring up the same two services.

The environment owns the running PostgreSQL and Redis dependencies, external
network `p01-net` and volume `p01-data`. Existing database rows and Redis state
must survive. The supplied `deployment-inputs.env` provides connection and
authentication parameters; do not replace or print credentials.

The deployment uses Compose project `p01-deploy` with exactly two services,
`boardadmin` and `bingoboard`. Admin is available at
`http://127.0.0.1:18080`, and the production frontend at
`http://127.0.0.1:18081`. The frontend routes the version API and SignalR hub to
admin. Admin login and its database catalog must work, and player boards must
persist in Redis. The developer producer API is unavailable in Production.

The supplied deployment models, original business sources, package inputs,
Dockerfiles, credentials and this documentation are immutable. Only runtime
artifacts under `deployment/` may change. The application services must run
published .NET DLLs and nginx/static Vue output without source bind mounts;
do not substitute Vite, AppHost or development processes.

No cloud infrastructure or registry push is needed. Leave the deployed
application and existing dependencies running; the harness owns cleanup.
