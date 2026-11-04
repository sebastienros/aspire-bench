# Bingo application

Requires .NET 10 SDK, Node 24, Docker, and Aspire CLI 13.6.
`apphost.cs` orchestrates PostgreSQL, Redis, migrations, the Blazor admin backend,
and the Vue/Vite player. ServiceDefaults enables telemetry and health checks.
The environment supplies `BENCH_RUN_ID` and `Parameters__admin_password`.

Start with:

```bash
aspire start --apphost apphost.cs --launch-profile http --non-interactive --isolated
aspire wait boardadmin --apphost apphost.cs --non-interactive --timeout 600
aspire wait bingoboard --apphost apphost.cs --non-interactive --timeout 600
aspire describe --apphost apphost.cs --format Json --non-interactive
```

Use the allocated HTTP endpoints, not fixed ports. The username is `admin` and
the password is provided through `Parameters__admin_password`.
Use only the agent skills and tools actually exposed in this session.

For an already-running application, discover its supported per-resource
operations with `aspire resource boardadmin --help --apphost /app/apphost.cs`.
Use the exposed resource stop/rebuild commands when shared project code changes;
the completed migration worker can be rebuilt/rerun before the admin resource.
Wait for the changed resource before testing its HTTP behavior. Do not restart
PostgreSQL/Redis or substitute a new AppHost. Vite reloads frontend configuration
automatically. Runtime endpoints in `benchmark-endpoints.json` stay fixed.

Harbor exposes eight skills under `/opt/aspire-skills`: `aspire`,
`aspire-deployment`, `aspire-init`, `aspire-monitoring`, `aspire-orchestration`,
`aspire-project-v2-migration`, `aspire-startup`, and `aspireify`. The seven general
skills retain their historical source pin; startup is the original local recipe.
They are also installed under `.github/skills`. MCP is deliberately disabled;
availability of a skill or CLI is not evidence that an agent uses it.

The player proxies `/api/version-info` and `/bingohub` to the admin backend.
The development API `/api/demo/producer` exposes square import, state updates,
and status. The database stores users and square definitions; Redis stores
player state and supports the SignalR backplane.

The harness owns cleanup. Never reuse another run's containers, ports, or data.
