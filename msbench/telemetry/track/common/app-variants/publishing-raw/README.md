# Bingo production deployment

This workspace already contains its complete production deployment model in
`compose.yaml`: a Docker Compose project with the admin backend (`boardadmin`,
built from `Dockerfile.dotnet`) and the static player frontend (`bingoboard`,
built from `src/bingo-board/Dockerfile.nginx`). No application or orchestration
wiring is missing. Requires Docker with Compose.

The environment owns the running PostgreSQL (`bingo-db`) and Redis (`bingo-cache`)
dependencies, the external Docker network `bingo-net` and the volume `bingo-data`.
Existing database rows and Redis state must survive. The supplied
`deployment-inputs.env` provides the connection and authentication parameters;
do not replace or print credentials.

The production deployment has exactly two services, `boardadmin` and
`bingoboard`. Admin is available at `http://127.0.0.1:18080` and the production
frontend at `http://127.0.0.1:18081`. The frontend routes the version API
(`/api/version-info`) and the SignalR hub (`/bingohub`) to admin. Admin login
(username `admin`) and its database catalog must work, and player boards must
persist in Redis. The developer producer API is unavailable in Production.

The deployment model, the business sources, the Dockerfiles, the credentials and
this documentation are not to be changed. The application services must run
published .NET DLLs and nginx serving the built Vue output, without source bind
mounts; do not substitute Vite, AppHost or development processes.

No cloud infrastructure or registry push is needed. Leave the deployed
application and the existing dependencies running; the harness owns cleanup.
