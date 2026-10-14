# Bingo application

Requires .NET 10 SDK, Node 24, Docker Compose, Bash, and curl.
The environment supplies `COMPOSE_PROJECT_NAME`, `POSTGRES_PORT`, `REDIS_PORT`,
`ADMIN_PORT`, `FRONTEND_PORT`, and a disposable `Authentication__AdminPassword`.

Run `CONTAINER_RUNTIME=docker bash scripts/start.sh` and wait for it to return.
It builds the solution, installs frontend dependencies, starts PostgreSQL/Redis,
runs the migration/seed worker, and starts the admin backend and player frontend.
It returns successfully only after all readiness checks pass. A detached
supervisor keeps the services running after the launching terminal or agent
exits, until the harness cleans up this run. Startup failures return nonzero and
stop any partially started services. Do not launch the command as an attached
long-running background tool.

For interactive terminal use, `bash scripts/start.sh --foreground` keeps the
supervisor attached and stops the services on Ctrl+C instead.

Admin: `http://localhost:$ADMIN_PORT` (username `admin`).
Player: `http://localhost:$FRONTEND_PORT`.
Run `CONTAINER_RUNTIME=docker bash scripts/check.sh` to check the services.
Logs are in `.script-state/` (`startup.log`, `admin.log`, and `frontend.log`).

The player proxies `/api/version-info` and `/bingohub` to the admin backend.
The development API `/api/demo/producer` exposes square import, state updates,
and status. The database stores users and square definitions; Redis stores
player state and supports the SignalR backplane.

The harness owns cleanup. Never reuse another run's containers, ports, or data.
