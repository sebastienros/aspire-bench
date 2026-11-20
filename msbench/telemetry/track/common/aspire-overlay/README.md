# Bingo application

Requires .NET 10 SDK, Node 24, Docker, and the Aspire CLI.
`apphost.cs` orchestrates PostgreSQL, Redis, the migration worker, the Blazor
admin backend (`boardadmin`), and the Vue/Vite player (`bingoboard`).
ServiceDefaults enables OpenTelemetry and health checks.
The environment supplies `BENCH_RUN_ID` and `Parameters__admin_password`.

Start with `aspire start --apphost apphost.cs --non-interactive --isolated`,
then `aspire wait boardadmin` and `aspire wait bingoboard`.

Endpoints are allocated dynamically; `aspire describe` lists them along with
resource state and health. The admin username is `admin`.
The Aspire CLI also exposes each resource's console logs and the
OpenTelemetry logs and traces collected from the running application.

The player proxies `/api/version-info` and `/bingohub` to the admin backend.
The development API `/api/demo/producer` exposes square import
(`POST /squares/import`, JSON array of id/label/type/isActive), state updates
(`POST /squares/{id}/state/{true|false}`), and `GET /status`. The database
stores users and square definitions; Redis stores player state and supports
the SignalR backplane.

The harness owns cleanup. Never reuse another run's containers, ports, or data.
