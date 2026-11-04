# Bingo: isolated local publishing

The original .NET 10 admin and Vue player are here, with identical business source
in both task variants. The environment is already prepared; no app is deployed.
Read `deployment-inputs.env` and source it before deploying.

The environment owns `p01-db` (PostgreSQL 18.3), `p01-cache` (Redis 8.6),
`p01-data`, and the `p01-net` network. Join that network as **external**.
Do not recreate, restart, rename, delete, or change configuration of these supplied
resources. Their database has the original 40 squares, an extra active square,
and an inactive square. Redis also contains existing data. Preserve them.

`Dockerfile.dotnet` builds the original admin or migration project using the
`PROJECT` build argument (for example `BingoBoard.Admin`); it runs the published
DLL as an unprivileged user in Production. The existing frontend
`src/bingo-board/Dockerfile.nginx` builds Vue then serves static files with nginx.
Its `BINGO_ADMIN_URL` runtime setting must point to the deployed admin container.
The supplied nginx template routes version-info and SignalR, including WebSockets.
Vite's development proxy is NOT production routing.

Useful primitives (use only your own deployment project):

```bash
source /app/deployment-inputs.env
docker build -f Dockerfile.dotnet --build-arg PROJECT=BingoBoard.Admin -t p01-admin .
docker compose -p p01-deploy -f deployment/docker-compose.yaml config
docker ps
curl -fsS http://127.0.0.1:18080/api/version-info
```

The real application is served on admin `http://127.0.0.1:18080` and player
`http://127.0.0.1:18081`. Login uses username `admin` and the supplied admin password.
`/api/demo/producer/*` and OpenAPI/Swagger are Development-only and must NOT
be enabled in this deployment. The existing SignalR hub `/bingohub` and
`GetAllAvailableSquares`/`RequestBingoSet` methods are available in Production.

Only add/edit `deployment/` and, in the Aspire task, `apphost.cs`.
Do not edit business code, lockfiles, Dockerfiles, toolchain, credentials, guidance,
or the supplied resources. Build outputs are allowed. No cloud accounts,
registries, AppHost runtime containers, bind-mounted source, Vite, `npm run dev`,
`vite preview`, `dotnet run`, or `dotnet watch` may be deployment services.
An AppHost may run transiently to publish/build; it is not the deployed app.
