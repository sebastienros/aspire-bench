# Bingo application

Requires .NET 10 SDK, Node 24, Docker Compose, Bash, and curl.
The environment supplies `COMPOSE_PROJECT_NAME`, `POSTGRES_PORT`, `REDIS_PORT`,
`ADMIN_PORT`, `FRONTEND_PORT`, and a disposable `Authentication__AdminPassword`.

Run `CONTAINER_RUNTIME=docker bash scripts/start.sh` in a background terminal.
It builds the solution, installs frontend dependencies, starts PostgreSQL/Redis,
runs the migration/seed worker, and starts the admin backend and player frontend.
Do not close the startup terminal until the task is complete.

Admin: `http://localhost:$ADMIN_PORT` (username `admin`).
Player: `http://localhost:$FRONTEND_PORT`.
Run `CONTAINER_RUNTIME=docker bash scripts/check.sh` to check the services.
Logs are in `.script-state/`.

The player proxies `/api/version-info` and `/bingohub` to the admin backend.
The development API `/api/demo/producer` exposes square import, state updates,
and status. The database stores users and square definitions; Redis stores
player state and supports the SignalR backplane.

The harness owns cleanup. Never reuse another run's containers, ports, or data.
