# Bingo application

Requires .NET 10 SDK, Node 24, Docker Compose, Bash, and curl.
`compose.yaml` defines PostgreSQL and Redis; the migration worker, the Blazor
admin backend and the Vue/Vite player run as local processes.
The environment supplies `COMPOSE_PROJECT_NAME`, `POSTGRES_PORT`, `REDIS_PORT`,
`ADMIN_PORT`, `FRONTEND_PORT`, and a disposable `Authentication__AdminPassword`.

Start with `CONTAINER_RUNTIME=docker bash scripts/start.sh` and wait for it to
return. It builds the solution, installs frontend dependencies, starts
PostgreSQL/Redis, runs the migration/seed worker, and starts the admin backend
and player frontend under a detached supervisor.

Admin: `http://localhost:$ADMIN_PORT` (username `admin`).
Player: `http://localhost:$FRONTEND_PORT`.
Process logs are in `.script-state/` (`startup.log`, `admin.log`,
`frontend.log`); `docker compose ps` and `docker compose logs` cover the
dependencies.

The player proxies `/api/version-info` and `/bingohub` to the admin backend.
The development API `/api/demo/producer` exposes square import
(`POST /squares/import`, JSON array of id/label/type/isActive), state updates
(`POST /squares/{id}/state/{true|false}`), and `GET /status`. The database
stores users and square definitions; Redis stores player state and supports
the SignalR backplane.

The harness owns cleanup. Never reuse another run's containers, ports, or data.
