# Bingo: manual local setup

This folder is a self-contained application, with no lifecycle management
scripts. Use Bash on macOS/Linux, .NET 10, Node 24+, npm, curl, lsof and Docker
with Compose v2 and a running daemon. `compose.yaml` provisions **only**
PostgreSQL 18.3 and Redis 8.6; it does not build, migrate or start application
processes. All commands below start from this folder's root.

## Configure

For harness evaluations, `COMPOSE_PROJECT_NAME`, `BENCH_RUN_ID`, four distinct
free ports (`POSTGRES_PORT`, `REDIS_PORT`, `ADMIN_PORT`, `FRONTEND_PORT`) and
`Authentication__AdminPassword` are already supplied. Preserve them. Outside
the harness, choose a unique Compose project, four unused ports and an admin
password before proceeding. Do not reuse another application's resources.
The database credentials below are local disposable development credentials.

Run this configuration in every new shell used for build/migrations/servers:

```bash
: "${COMPOSE_PROJECT_NAME:?Choose a unique Compose project}"
: "${POSTGRES_PORT:?Choose a free PostgreSQL port}"
: "${REDIS_PORT:?Choose a free Redis port}"
: "${ADMIN_PORT:?Choose a free admin port}"
: "${FRONTEND_PORT:?Choose a free frontend port}"
: "${Authentication__AdminPassword:?Choose an admin password}"
export ConnectionStrings__db="Host=localhost;Port=$POSTGRES_PORT;Database=bingo;Username=postgres;Password=postgres"
export ConnectionStrings__cache="localhost:$REDIS_PORT"
export ASPNETCORE_ENVIRONMENT=Development DOTNET_ENVIRONMENT=Development
export ASPNETCORE_URLS="http://localhost:$ADMIN_PORT"
export BINGO_ADMIN_URL="http://localhost:$ADMIN_PORT"
```

## Build and install

```bash
dotnet build AspireifyBingo.slnx --nologo
(cd src/bingo-board && npm ci)
```

## Provision dependencies

```bash
docker compose -f compose.yaml up -d
```

Wait for readiness, failing rather than continuing if dependencies are unavailable:

```bash
ready=0
for attempt in {1..60}; do
    if docker compose -f compose.yaml exec -T postgres pg_isready -U postgres -d bingo &&
       [ "$(docker compose -f compose.yaml exec -T redis redis-cli ping)" = PONG ]; then
        ready=1
        break
    fi
    sleep 1
done
[ "$ready" = 1 ]
```

PostgreSQL uses this project's `bingo-postgres-data` volume. Redis has no
persistent volume and no password. Ports bind only to IPv4 loopback.

## Migrate and seed

Run the worker once, **before** starting the backend, and require exit code zero.
It applies EF migrations, creates/updates user `admin` using the configured
password, seeds Bingo squares and exits. Its working directory must be the
project directory.

```bash
(cd src/BingoBoard.MigrationService && dotnet bin/Debug/net10.0/BingoBoard.MigrationService.dll)
docker compose -f compose.yaml exec -T postgres psql -U postgres -d bingo -At -v ON_ERROR_STOP=1 -c \
    'SELECT EXISTS (SELECT 1 FROM "AspNetUsers" WHERE "UserName" = '\''admin'\'') AND EXISTS (SELECT 1 FROM "BingoSquares");'
```

The query must print `t`. A migration failure is not readiness.

## Start servers

The backend and Vite must survive after the launching command returns.
Do not leave an attached async agent shell waiting on a persistent foreground
server: that can prevent the agent session from becoming idle. Use the
following independent launches with stdin disconnected and stdout/stderr
redirected. These are ordinary individual process commands, not a management
wrapper. Keep their PIDs and working directories for targeted stopping.

```bash
mkdir -p .manual-state
nohup bash -c 'cd src/BingoBoard.Admin && exec dotnet bin/Debug/net10.0/BingoBoard.Admin.dll' \
    </dev/null >.manual-state/admin.log 2>&1 &
echo "$!" >.manual-state/admin.pid
nohup bash -c 'cd src/bingo-board && exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort' \
    </dev/null >.manual-state/frontend.log 2>&1 &
echo "$!" >.manual-state/frontend.pid
```

For SDK/agent execution, let this short shell command finish; do not put the
server itself in a still-attached background tool session. `nohup` protects
these processes from shell hangup, and the explicit redirects prevent them
from keeping the tool's output pipe open. Check logs if a process exits.

## Verify and record endpoints

```bash
ready=0
for attempt in {1..60}; do
    if ! kill -0 "$(cat .manual-state/admin.pid)" 2>/dev/null ||
       ! kill -0 "$(cat .manual-state/frontend.pid)" 2>/dev/null; then
        cat .manual-state/admin.log .manual-state/frontend.log >&2
        break
    fi
    if curl --fail --silent --max-time 2 "http://localhost:$ADMIN_PORT/login" >/dev/null &&
       curl --fail --silent --max-time 2 "http://127.0.0.1:$FRONTEND_PORT/" >/dev/null &&
       curl --fail --silent --max-time 2 "http://127.0.0.1:$FRONTEND_PORT/api/version-info" >/dev/null; then
        ready=1
        break
    fi
    sleep 1
done
[ "$ready" = 1 ]
curl --fail --silent "http://localhost:$ADMIN_PORT/api/version-info"
curl --fail --silent -X POST "http://127.0.0.1:$FRONTEND_PORT/bingohub/negotiate?negotiateVersion=1"
printf '{"admin":"http://localhost:%s","frontend":"http://127.0.0.1:%s"}\n' \
    "$ADMIN_PORT" "$FRONTEND_PORT" >benchmark-endpoints.json
```

Admin login is `/login` (user `admin`); the player frontend is `/`.
Version JSON must contain `dotNetVersion`; SignalR negotiation must contain
`connectionToken` and nonempty `availableTransports`. The frontend proxies
version API and SignalR to `BINGO_ADMIN_URL`. The backend developer API supports
square import, call/status/clear, with data stored in PostgreSQL and Redis.
The harness independently checks those real operations, unchanged sources,
container/process ownership and dependency state. Endpoint JSON is exactly the
two loopback HTTP origins shown, not paths or a success assertion.

**During evaluation, leave the stack running** after verification; host grading
and cleanup happen after the agent completes. No extra PID registration or
hidden application metadata is required: the host observes process working
directories and the unique Compose project independently.

## Stop only this stack

Outside evaluation, stop your two servers after verifying each saved PID still
belongs to the expected project directory (PIDs may have been recycled).
Never use `killall`, name-based killing, Docker prune or another project's name.

```bash
for service in admin frontend; do
    pid="$(cat ".manual-state/$service.pid")"
    case "$service" in
        admin) expected="$PWD/src/BingoBoard.Admin" ;;
        frontend) expected="$PWD/src/bingo-board" ;;
    esac
    actual="$(lsof -a -p "$pid" -d cwd -Fn | sed -n 's/^n//p')"
    if [ "$actual" != "$(cd "$expected" && pwd -P)" ]; then
        echo "Refusing to stop unverified PID $pid" >&2
        exit 1
    fi
    kill -TERM "$pid"
done
docker compose -f compose.yaml stop
```

Compose `stop` preserves your PostgreSQL data. Only if you explicitly want to
delete **this project's** disposable data, use
`docker compose -f compose.yaml down --volumes` with the same
`COMPOSE_PROJECT_NAME`. Do not modify the sources to configure or stop the app.
