# Telemetry suite: standard app vs aspirified app on Aspire `main`

This suite asks one question with a controlled answer: **when a running application
misbehaves, does the data Aspire collects (traces, structured logs, resource health)
let an agent fix it faster, cheaper, or more often than the same application run the
ordinary way?** It then measures which Aspire skills and MCP tools contribute.

It is separate from the earlier 13.6 experiments in this directory. Those remain
unchanged as historical evidence; see [FINDINGS.md](../FINDINGS.md).

**Start with [REPORT.md](REPORT.md)** for the consolidated report (goals, methodology,
results, resolution paths, suggested changes, a tracking proposal and next investigations)
and [PLAN.md](PLAN.md) for the proposed next work with a benchmark attached to each task,
then [RESULTS.md](RESULTS.md) for what was found and
[SKILLS-PROPOSAL.md](SKILLS-PROPOSAL.md) for the new, updated and removed skills.
The two Aspire product patches are in [upstream/](upstream/).

## What is compared

| Arm | Application | Aspire skills | Aspire MCP |
|---|---|---|---|
| `raw` | Standard app: Compose dependencies, a start script, log files | none | no |
| `raw-check` | The same standard app with an extra `scripts/check.sh` health script (rounds 1–5 only; kept for reference, never pooled with `raw`) | none | no |
| `aspire-cli` | Aspirified app | none | no |
| `aspire-skills` | Aspirified app | `current` (shipped v0.0.6; v0.0.5 before the 2026-11-17 re-pin) | no |
| `aspire-mcp` | Aspirified app | none | yes |
| `aspire-skills-mcp` | Aspirified app | `current` | yes |
| `aspire-plus` | Aspirified app | `plus` = current + new `aspire-diagnose` | no |
| `aspire-lean` | Aspirified app | `lean` = plus, router removed, monitoring trigger narrowed | no |
| `aspire-lean-mcp` | Aspirified app | `lean` | yes |
| `aspire-lean-start` | Aspirified app | `lean` + new `aspire-start` (cold-start scenario only) | no |
| `aspire-skills-plugin` | Aspirified app | `current` content delivered as the plugin `aspire agent init` registers for Copilot CLI (marketplace pinned to the skills tag), not copied (slow-sql only) | no |
| `aspire-mcp-src`, `aspire-lean-mcp-src`, `aspire-lean-src` | Aspirified app, CLI built from source at the daily's commit (control) | none / `lean` | yes / yes / no |
| `aspire-mcp-compact`, `aspire-lean-mcp-compact` | Same, plus the MCP compact-telemetry patch | none / `lean` | yes |
| `aspire-lean-plain` | Same, plus the CLI plain-output patch | `lean` | no |
| `aspire-lean-mcp-all` | Same, plus both patches | `lean` | yes |
| `aspire-mcp-compact2`, `aspire-lean-mcp-compact2` | Same as `-compact`, plus `list_resources` one line per resource (`details` for the JSON) and `list_console_logs` `limit` (default 50) / `severity` (`mcp-compact2.patch`, cumulative over 0001; PLAN T2.1; lean arm on `slow-redis` only) | none / `lean` | yes |
| `aspire-mcp-tools8`, `aspire-lean-mcp-tools8` | Source control registering only the eight MCP tools agents call (`mcp-tools8.patch`; PLAN T2.7; lean arm on `slow-redis` only) | none / `lean` | yes |
| `aspire-lean-mcp-all-conn`, `-hint`, `-step` | Same as `aspire-lean-mcp-all`, plus (conn) a `get_resource_connection` MCP tool (`agentic-all-conn.patch`), (hint) `list_resources` text naming the CLI dependency step (`agentic-all-hint.patch`), or (step) skill set `lean-mcpstep` (aspire-diagnose step 3: leave MCP for the dependency); PLAN T2.8; `slow-redis` and `slow-sql` | `lean` / `lean` / `lean-mcpstep` | yes |
| `aspire-skills-mon` | Aspirified app | `mon` = current with only `aspire-monitoring`'s description replaced by lean's; router kept (PLAN T1.2) | no |
| `aspire-skills-norouter` | Aspirified app | `norouter` = current minus the `aspire` router, nothing added (PLAN T1.3, T3.8) | no |
| `aspire-lean-agents`, `aspire-cli-agents`, `aspire-skills-agents` | Aspirified app plus `/app/AGENTS.md` beside the AppHost ([`common/agents-md`](common/agents-md), one file per skill family; PLAN T2.10) | `lean` / none / `current` | no |
| `aspire-lean-agents-v2`, `aspire-lean-noorch-agents` | Aspirified app plus `/app/AGENTS.md` v2 (start, `describe` as the resource list, `wait <resource-name>`; `common/agents-md/*-v2.md`; PLAN T2.11) | `lean` / `lean-noorch` = lean minus `aspire-orchestration` | no |
| `aspire-cli-traced`, `aspire-lean-traced`, `aspire-lean-mcp-all-traced` | Aspirified app with the cache on `Aspire.StackExchange.Redis.DistributedCaching` (cache calls traced; [`common/app-variants/aspire-redis-traced`](common/app-variants/aspire-redis-traced), build argument `APP_VARIANT`; PLAN T2.5) | none / `lean` / `lean` (+ both CLI patches) | no / no / yes |
| `raw-otel` | Standard app with the OpenTelemetry SDK (ASP.NET Core, HttpClient, Npgsql, StackExchange.Redis) and a JSON-lines file exporter at `.script-state/traces.jsonl`, no Aspire ([`common/app-variants/raw-otel`](common/app-variants/raw-otel); PLAN T2.5) | none | no |
| `aspire-lean-connect` | Aspirified app, CLI built from source with the `describe-connect` patch (a `connect` block in `describe --format Json`; PLAN T2.6) | `lean-connect` = lean with `aspire-diagnose` step 3 reduced to the `connect` command | no |
| `aspire-lean-spanrow`, `aspire-lean-spanrow-traced`, `aspire-lean-mcp-all-spanrow`, `aspire-lean-mcp-all-spanrow-traced` | As `aspire-lean` / `-traced` / `aspire-lean-mcp-all` / `-traced` (PLAN T2.5 follow-up) | `lean-spanrow` = lean with one more row in `aspire-diagnose`'s span table (many slow client spans to one dependency → the dependency is slow) | no / no / yes / yes |
| `aspire-cli-src`, `aspire-skills-src`, `aspire-lean-noorch-agents-src` | Aspirified app, CLI built from source at the daily's commit (control); on `cold-start` a shim points the AppHost build at the daily's bundle (PLAN T2.2) | none / `current` / `lean-noorch` + `AGENTS.md` v2 | no |
| `aspire-cli-wait`, `aspire-lean-start-wait`, `aspire-lean-noorch-agents-v3` | Same, plus the blocking-start patch (`aspire start` waits for resources and prints endpoints; default under `--non-interactive`; PLAN T2.2) | none / `lean-start-wait` = lean + one-command `aspire-start` / `lean-noorch` + `AGENTS.md` v3 | no |
| `aspire-lean-tracetable` | Same, plus the trace-detail patch (statement/URL under each span of `otel traces -t`; PLAN T2.3) | `lean-tracetable` = lean with `aspire-diagnose` step 2 reading the tree | no |
| `aspire-cli-redishint`, `aspire-skills-redishint` | Same, plus the Redis connect-hint patch (`describe` table and JSON; PLAN T2.4) | none / `current` | no |
| `aspire-skill-monitoring`, `aspire-skill-migration`, `aspire-skill-deployment` | Aspirified app (`export`, `migration`, `publishing`; PLAN T3.5, T3.7, T3.4) | `skill-<short>` = that one shipped v0.0.6 skill alone (Phase 3 `skill-only`) | no |
| `aspire-skills-nomonitoring`, `aspire-skills-nomigration`, `aspire-skills-nodeployment` | Same | `no<short>` = v0.0.6 without that skill (Phase 3 `bundle-minus`) | no |
| `aspire-skill-aspireify`, `aspire-skill-init` | Authoring image ([`tools/templates/Dockerfile.authoring`](tools/templates/Dockerfile.authoring): the pinned daily's `Aspire*` packages vendored behind the CLI's install sidecar; `adoption`, `add-dependency`, `greenfield`; PLAN T3.2, T3.3) | `skill-aspireify` / `skill-init` = that shipped skill alone | no |
| `aspire-skills-noaspireify`, `aspire-skills-noinit` | Same (`noaspireify` also on `slow-sql` and `slow-redis`, the T3.2 guard) | `noaspireify` / `noinit` = v0.0.6 without it | no |
| `aspire-skill-orchestration` | Aspirified app (`restart-change`, `two-app`, `port-conflict`, `cold-start`; PLAN T3.1) | `skill-orchestration` = the shipped `aspire-orchestration` alone | no |
| `aspire-skills-noorchestration` | Same (also on `slow-sql` and `slow-redis`, the T3.1 guard) | `noorchestration` = v0.0.6 without `aspire-orchestration` | no |

`raw` versus any Aspire arm is the product comparison. The Aspire arms share one
application, one AppHost and one toolchain, so differences between them isolate
skills and MCP. Skill sets are defined in
[`common/skills`](common/skills/PROVENANCE.md) and assembled by
[`compose.sh`](common/skills/compose.sh).

Both applications run the same Bingo business code (`msbench/bingo/common`, commit
`baacba3`). The standard app ships with its start script and README only; a
`scripts/check.sh` health script that rounds 1 to 5 had left in place was removed before
round 7 because an ordinary application does not come with one, and the `raw` baseline
was re-run without it. The aspirified variant adds an AppHost, ServiceDefaults, and PostgreSQL
client tracing (`Npgsql.OpenTelemetry`); the standard variant has no tracing, which
is the ordinary state of a non-Aspire app. A win for Aspire here therefore combines
instrumentation and tooling. Separating the two needs an instrumented raw arm and is
not done yet.

## Toolchain

Aspire CLI, AppHost SDK and Hosting packages are the official daily build of
`microsoft/aspire` `main`: **`17.1.0-preview.1.26567.3+30326eb876d6897b1feadc8bc800f78e466b1b52`**
(built 2026-11-17, three commits behind `main` HEAD `27c59c34` at the time; source builds use
.NET SDK `11.0.100` from that commit's `global.json`), with `microsoft/aspire-skills`
**v0.0.6** (`e529b608`) as the shipped skill set. This is pin `2026-11-17` (Task T0.1 in
[PLAN.md](PLAN.md)).

[REPORT.md](REPORT.md) measured the previous pin, `2026-11-09`:
`17.1.0-preview.1.26559.1+4954c76a62bd091e0edbb02854c0dc2be06e64f5` (built 2026-11-09) with
aspire-skills v0.0.5 (`1117facb`). Every result file keeps the two pins in separate sections and
never pools them; `tools/collect.py` derives a trial's pin from the `aspire_build` that
`tools/submit.sh` records in the ledger (entries without it are the first pin).

The CLI archive is pinned by versioned URL and SHA-256 in the
[Dockerfile](tools/templates/Dockerfile); packages come from the public `dotnet9`
daily feed. `aspire --version` is recorded in every image at `/etc/aspire-version`.

## Scenarios

Each scenario starts both applications healthy, injects one runtime fault, and keeps
**live traffic** running before and during the agent, so evidence of the incident
exists the way it would for a real application. Prompts are identical across arms,
describe only the user-visible symptom, and name no endpoint, tool or component.

| Scenario | Fault | Where the evidence is |
|---|---|---|
| `slow-sql` | An audit trigger's duplicate check filters an unindexed JSON history that has grown to millions of rows. Square writes take seconds. Nothing fails. | Duration of one database call. Aspire: a trace span with the SQL text. Standard app: EF Core's command-duration lines in `admin.log`. |
| `read-only` | The database default was left read-only. Pages and reads work; every write fails. Health stays green. | An exception with SQLSTATE 25006. Aspire: structured log + failed trace. Standard app: `admin.log`. |
| `slow-redis` | A host-side "attendance report" exporter counts cache sessions with a `KEYS`-based script in a loop; the session keyspace grew, so single-threaded Redis spends most of its time on it and every cache call the admin makes waits. Nothing fails. Same prompt as `slow-sql`. | Duration of requests that touch the cache. Aspire: slow server spans whose database child spans are short. Standard app: **nothing**; request logging is off at the default `Microsoft.AspNetCore: Warning` level and the Redis client logs no durations. Both arms must then read the cache's `SLOWLOG` / `CLIENT LIST`. |

**Held-out application (PLAN card T0.2).** A second application with a different stack, built so
that `aspire-diagnose` is scored on an app and faults it was not written against: **Shop**, a
minimal API that also serves a static storefront, SQL Server 2022, RabbitMQ 4.3, and an order
worker that allocates stock under a SQL Server application lock (`sp_getapplock`). Business code is
in [`msbench/heldout/app`](../heldout/app); the packagings are
[`common/heldout/raw-overlay`](common/heldout/raw-overlay) (Compose, start script, README, process
logs in `.script-state/`) and [`common/heldout/aspire-overlay`](common/heldout/aspire-overlay)
(AppHost, ServiceDefaults, and `servicedefaults.patch`, the only change to the business code: the
same `Aspire:UseServiceDefaults` gate as Bingo). The aspirified app gets the client tracing Aspire's
SQL Server and RabbitMQ client integrations enable (`AddSqlClientInstrumentation`, the RabbitMQ.Client
publisher and subscriber sources); the raw app has none. Its harness is
[`common/heldout/bench`](common/heldout/bench/bench.mjs) and image
[`Dockerfile.heldout`](tools/templates/Dockerfile.heldout), which must carry the same pins as the main
template (`gen-tasks.mjs` checks). Arms: `raw`, `aspire-cli`, `aspire-skills-mcp`, `aspire-lean`.
Results: round `t02` in [PLAN.md, T0.2 results](PLAN.md#t02-results); the revised skill's in-sample re-run (`t02-insample`) and the gate round on the reserved fault (`t02-heldout3`, gate open) in [held-out-3 results](PLAN.md#t02-heldout3-results).

| Scenario | Fault | Where the evidence is |
|---|---|---|
| `heldout-slow-sql` (log-visible) | Carrier tracking webhooks are stored as raw JSON; the order page finds an order's updates with `JSON_VALUE` over the whole history, which nothing indexes. The history grew; every order page takes seconds. Nothing fails. | Aspire: a SQL span with the statement and its duration. Standard app: EF Core's `Executed DbCommand (NNNN ms)` line with the statement in `api.log` (setup asserts it is there). |
| `heldout-stuck-orders` (log-silent) | A host-side stock reconciliation job (`/usr/local/lib/shop-ops/stock-reconcile.sh`) took the inventory lock in an open transaction and is stalled waiting for its supplier feed. The worker waits 15 s for the lock, gives up silently (Debug log only) and retries the same message forever; orders stay `Pending`, the queue grows. | Aspire: 15 s SQL spans on `sp_getapplock` in the worker. Standard app: **nothing**; setup rejects the fixture if the raw app writes a single error-level line in the fault window. Both arms can see the wait and its holder in SQL Server (`sys.dm_exec_requests`, `sys.dm_tran_locks`) and the queue depth in RabbitMQ. |

A third held-out fault, `heldout-cache`, was reserved and run only after `aspire-diagnose` was revised
following the first two (the user ruled the `t02` tie "not ahead"), so the ship gate is judged on a fault the revision never
saw. It ships as a code regression applied to its own image only
([`common/heldout/faults/heldout-cache.patch`](common/heldout/faults/heldout-cache.patch)); every other
held-out cell runs the unchanged app.

| Scenario | Fault | Where the evidence is |
|---|---|---|
| `heldout-cache` (log-visible) | The catalogue shows each product's units sold and shoppers over the last seven days and member prices for loyalty members, and its in-memory cache is keyed per shopper. Live traffic comes from 50,000 shoppers, so almost every page view ranks the week's orders again (`SUM` and `COUNT(DISTINCT Customer)` over the order history). Setup grows the week's orders until a new shopper's catalogue costs at least 700 ms after a checkpoint, then measures again under live traffic and rejects the fixture below 500 ms. Nothing fails. | Aspire: a SQL span with the ranking statement on every `GET /api/products`. Standard app: EF Core's `Executed DbCommand (NNN ms)` line with the statement in `api.log` (setup asserts it is there). Neither shows the cache; the key is in the source. |

**Multi-step probe (PLAN T4.4).** `t44-probe` (`aspire-cli` only) is a two-step Harbor task on the `slow-sql` image:
step 1 gives a code word, step 2 asks for it with no tool call, so it passes only if the runner carries the
conversation (`BENCH_RESUME_TRAJECTORY=1`). Its runs are in `results/multistep-ledger.jsonl`, outside every table.
Result: the runner refuses step 2 on its own lock ([T4.4 results](PLAN.md#t44-results)).

A third scenario, `cold-start`, has no fault: nothing is running and the agent must
bring the application up. It measures the new `aspire-start` skill. `cold-start-warm`
(aspirified app only) has the same prompt, but setup has already started and stopped the
AppHost once with `portAllocation.persistInIsolatedMode` set, so the agent's
`aspire start --isolated` reuses persisted ports (Aspire #21013).

`stuck-db` (PLAN T3.8, the router's guardrail job) asks the agent to restart "the database container" that
"looks stuck" without losing anything. A host job (`/usr/local/lib/bingo-ops/board-snapshot.sh`) holds an
exclusive lock on the squares table in an idle transaction, so every square write hangs; the squares table is
`UNLOGGED` (an unclean database shutdown empties it) and the game state lives in the cache, which has no volume
(restarting the cache or the AppHost loses it). Arms: `aspire-skills`, `aspire-skills-norouter`, `aspire-lean`.

**Phase 3 ops scenarios (PLAN T3.4, T3.5, T3.7).** `export` (aspirified app): a 45 s read-only database incident
under live traffic, recovered before the agent starts; the prompt asks for the traces and logs of the last 10 minutes
as files in `/app/bug-report/` without changing or restarting the app. `migration` (aspirified app plus a third .NET
project, `scoreboard`, from [`common/app-variants/migration`](common/app-variants/migration)): the running AppHost
declares three projects with `AddProject`; the prompt asks to assess and migrate them to the Project v2 APIs, with the
approval pre-granted; the image vendors the pinned daily's Aspire packages (the authoring lane's `vendor.sh` and the
CLI's `packages` sidecar), and setup warms the NuGet cache with `Aspire.Hosting.Dotnet` at the pin. `publishing` (port of the
P01 preconfigured pair, [`common/app-variants/publishing-raw`](common/app-variants/publishing-raw) and
[`publishing-aspire`](common/app-variants/publishing-aspire)): a complete production model (`compose.yaml`, or an
AppHost with a Docker Compose environment) and production Dockerfiles, no deployment script; environment-owned
PostgreSQL and Redis on an external network; the prompt asks to publish and run the production build locally on
18080/18081. Its private Docker daemon gets P01's DNS plan (a relay on its bridge on CES, whose resolver is loopback).
No `raw` arm for `export` and `migration`.

**Phase 3 orchestration scenarios (PLAN T3.1)**, each with a `raw` arm. `restart-change`: the app runs with
tonight's squares called; the prompt asks for a `calledCount` field in the admin status endpoint, live now, keeping
the player site, database and cache running; graded on the field and on process (pid + start time) and container
(id + start time) identity. `two-app`: a second copy of the app runs from `/neighbor-app` (containers `neighbor-*`,
raw ports 54321/63791/18081/15174) for another event; the target's admin process is stopped with SIGSTOP; the
neighbor must keep every process, container and row. `port-conflict`: nothing runs, and another team's board preview
(`/usr/local/lib/bingo-ops/board-preview.mjs`) holds the admin's port (5039 on Aspire, 18080 on raw); the app must
serve and the preview must survive. Only this scenario's README gives a plain `aspire start` (no `--isolated`), so
the start can meet the preview.

**Phase 3 authoring scenarios (PLAN T3.2, T3.3).** One image template,
[`Dockerfile.authoring`](tools/templates/Dockerfile.authoring) (stage by fault), vendors every `Aspire*` package
of the pinned daily into `/usr/local/aspire/packages` and points the CLI at it with its install sidecar
([`common/authoring/vendor.sh`](common/authoring/vendor.sh)). `aspire new`, `init` and `add` therefore resolve the
pin from disk; without it, `aspire new` floated to a newer daily (FINDINGS F54). Every human-readable CLI command
then prints an "emulating identity" notice on stderr, in every arm.
- `adoption`: the raw Bingo app with its launcher, no AppHost, nothing running; the prompt asks for an AppHost that
  runs the whole app under Aspire (`boardadmin`, `bingoboard`), existing lines unchanged.
- `add-dependency`: the aspirified app without Redis
  ([`common/authoring/add-dependency`](common/authoring/add-dependency): the admin uses an in-memory distributed
  cache), running at start; the prompt asks for Redis in the AppHost and the admin's cache moved to it.
- `greenfield`: `/app` with only an empty `.github` folder in every arm (`aspire new --output` refuses a non-empty
  folder, and the skill arms' skills live there); the prompt asks for an app with an ASP.NET Core API (`api`) using
  PostgreSQL (`db`), started.

The approval the skills ask for is pre-granted in the prompts. There is no `raw` arm. The verifier and the reference
solutions travel in each task's `tests/` and `solution/` ([`tools/authoring`](tools/authoring)), not in the image.

**Selection benchmark (PLAN T3.9).** `sel-*` tasks are not trials: a static copy of the aspirified workspace,
nothing running, and a Copilot CLI policy hook ([`common/bench/selection`](common/bench/selection), installed in
`/etc/github-copilot/policy.d/` because repository hooks are not loaded under the eval driver) that ends the run at
the first skill load or the fourth command. One prompt per task, from
[`tools/selection-prompts.mjs`](tools/selection-prompts.mjs) (48 skill prompts, the suite's diagnosis and
cold-start prompts, 12 distractors). Submissions go to `results/selection-ledger.jsonl` (`BENCH_LEDGER`), never
the trial ledger, and [`tools/selection.py`](tools/selection.py) writes `results/selection.md`.

`slow-sql` and `slow-redis` self-calibrate: they grow the audit history or the session
keyspace until one square write, or one report query, costs at least 500 ms on the
machine at hand, so the incident and its repair are both far from the verifier's limits.

## Grading

[`bench.mjs verify`](common/bench/bench.mjs) decides success from live HTTP and SQL
only. It never reads an agent report.

- `slow-sql`: five fresh 5-square imports and updates must each have a median under
  600 ms; every change must still be audited exactly once; the audit history and all
  original squares must be intact; call/clear/status must work.
- `read-only`: a fresh write must succeed and reach PostgreSQL; the read-only default
  must be gone at the database level; a second write must succeed after the verifier
  replaces every application session; original squares intact; call/clear/status work.

- `slow-redis`: eight status reads and eight square calls must each have a median under
  300 ms, no cache command may take over 100 ms during that window (`SLOWLOG`, at a
  threshold the verifier sets itself), the session keyspace must be intact, square state
  must still be stored in the cache, and call/clear/status must work.
- `cold-start`: both origins respond and a fresh write, call and clear round-trip
  through PostgreSQL.
- `export`: four checks, all required: the setup AppHost process still runs; something was written under
  `/app/bug-report`; a trace-data file (zip expanded; OTLP, `aspire otel` JSON or tables) carries one of the
  incident's error trace IDs recorded at setup; a log-data file carries the incident's error message.
- `migration`: four checks, all required: no `AddProject` call left and the three projects run as Project v2
  resources (`resource.launchConfigurationType` `project-with-external-build.v1`); every baseline resource back in its
  baseline state and health; the same endpoint names and schemes; squares kept, a fresh write/call/clear, and the
  scoreboard answering through service discovery.
- `adoption`: six checks, all required:
  - a running AppHost (`aspire ps`) with `boardadmin` and `bingoboard` live;
  - exactly one PostgreSQL and one Redis container, both AppHost resources;
  - one admin backend process with its `db` and `cache` connection strings;
  - migrations and seed data present;
  - login, the player page and its API and SignalR proxies, a fresh import reaching PostgreSQL, call/clear/status;
  - every file of the handed-over tree keeps its original lines in order (`NuGet.config`, `package-lock.json`
    exempt).
- `add-dependency`: six checks, all required:
  - `boardadmin` and `bingoboard` live;
  - exactly one Redis container, an AppHost resource, Running and Healthy;
  - `boardadmin` references it and gets its connection string;
  - calling a fresh square writes the admin's `global_square_<id>` entry into that Redis;
  - the functional checks;
  - every square present at setup still in PostgreSQL.
- `greenfield`: five checks, all required:
  - a running AppHost with a resource `api`, live with an HTTP(S) endpoint;
  - one PostgreSQL container and a resource `db` Running and Healthy;
  - `api` gets `ConnectionStrings__db`;
  - the API answers below HTTP 500.
- Every authoring verifier records the AppHost's Aspire version from `aspire ps` (`pinned`).
- `publishing` ([`common/bench/publishing/grade.mjs`](common/bench/publishing/grade.mjs), ported from P01): three
  checks, all required: no supplied file changed and the environment's dependencies, network, volume and data as at
  setup; exactly the two Compose services, images built during the trial, Production, loopback-only ports, no bind
  mounts or development processes; real login, the preserved catalog, version routing, the served Vue bundle equal to
  a reference build of these sources, SignalR and a fresh Redis board.
- `stuck-db`: recorded as three checks, all required. App kept running: the same AppHost process and the
  same cache container. Preserved: every square and every called square still present in PostgreSQL and the
  cache. Unstuck: five fresh imports with a median under 2 s and call/clear/status work. `aspire resource postgres
  restart` (it recreates the container on its volume after a clean shutdown), `docker restart` and ending the
  job's session pass; in the local gate `docker rm -f` + `aspire resource postgres start` (an unclean shutdown
  that empties the table) and `aspire stop` + start failed. Restarting the cache or the AppHost fails
  `appKeptRunning` by construction (not run locally).
- `heldout-slow-sql`: five live and five year-old order pages must each have a median under
  300 ms; the carrier history and every existing order must be intact; an order page must still
  show its latest 20 updates and a webhook posted by the verifier at once (no stale cache); fresh
  orders are confirmed (median under 3 s) and stock still matches confirmed orders.
- `heldout-stuck-orders`: recorded as two checks, both required. Root cause: the verifier can take
  the inventory lock (three times, 5 s timeout). Application: every order placed before the repair
  is confirmed and the queue is empty (the backlog is customers' orders, so purging it fails), fresh
  orders are confirmed (median under 3 s), an order placed while the verifier holds the lock stays
  `Pending` until it is released (removing the lock from the worker fails), and stock still matches
  confirmed orders (confirming orders by hand in SQL fails). Ending the job's SQL session (`KILL`),
  stopping the job, or closing its supplier feed so it commits (the route most terra agents took) passes; a SQL Server restart also released the lock and passed in a local check
  (run without live traffic during the restart). Purging the queue and confirming orders in SQL were
  each run once locally and fail.

- `heldout-cache`: recorded as three checks, all required. Fast: twelve shoppers new to the cache
  (six members, six not) each open the catalogue, with a median under 150 ms. Root cause: those twelve
  page views read `Orders` at most twice in total (`sys.dm_db_index_usage_stats`), so the week's
  ranking is shared and not computed again per shopper. Functional: units sold and shoppers per product
  match SQL, members see member prices and others do not, members and every existing order are kept,
  fresh orders are confirmed and stock matches. Each of these was run locally and failed as intended:
  a covering index alone (523 → 422 ms, still read per shopper), and a 600 s cache lifetime with a
  restart. The reference repair caches the ranking under one key and checks membership per request.

Dropping the trigger, truncating the audit history, flushing or restarting the cache
(the session keys are gone), swapping the cache for memory, or a per-session workaround
all fail. For `read-only` the verifier records "application works" and "root cause
removed" separately, so both pass rates can be reported. Each cell was validated locally with `verify` (must fail) → reference repair →
`verify` (must pass) before any model ran; see [results](results/).

## Custom Aspire builds

Product changes are measured without publishing binaries. When a task sets
`CLI_KIND=source`, the image clones `microsoft/aspire` at the daily build's commit,
optionally applies a patch from [`common/aspire-patches`](common/aspire-patches), and
publishes the CLI. That CLI goes on `PATH` for the agent, the MCP server and the
harness; `aspire --version` reports for example
`17.1.0-agentic.mcpcompacttelemetry+4954c76a…`. The official daily still starts the
AppHost because it carries the bundle. A patched arm is only ever compared with the
`*-src` control built the same way, since both are managed builds rather than NativeAOT.

## Reproduce

```bash
# Local, no model: build one cell, start it, and run the fail/repair/pass gate
bash tools/local.sh up aspire lean slow-sql
bash tools/local.sh oracle tele-aspire-slow-sql

# Cloud: remote no-model gate, then model trials (3 repeats)
bash tools/submit.sh slow-sql raw oracle
bash tools/submit.sh slow-sql aspire-lean gpt-6-luna 3 r1

# Name the plan card and the harness (default github-copilot-cli; also vscode, claude-code)
BENCH_TASK=T1.9 BENCH_AGENT=vscode bash tools/submit.sh slow-sql aspire-lean gpt-6-luna 3 t19

# Fetch artifacts and rebuild results/trials.jsonl, summary.md and comparison.md
python3 tools/collect.py
python3 tools/stats.py

# The series: one row per cell (harness, scenario, model, arm) per run, as ratios to raw
python3 tools/series.py   # results/series.jsonl and results/series.md
```

**Harnesses.** `BENCH_AGENT` picks the MSBench special agent, each pinned in `submit.sh`:
`github-copilot-cli` (package `github-copilot-cli-pkg-main-20261014-215627`, Copilot CLI `1.0.99-0`;
every result before T0.4), `vscode` (VS Code agent mode, `@vscode/vscode-copilot-evaluation-agent`
`0.20261117.7`) and `claude-code` (`v0.33.1794879102`). The ledger records `agent` and
`agent_package`; entries without them ran Copilot CLI. Every results file keeps harnesses in separate
cells. Skills reach Copilot CLI and VS Code the same way (copied into `/app/.github/skills`). The MCP
server reaches Copilot CLI from `task.toml` through Harbor. **Claude Code gets neither**, and runs Claude
models only (it calls `/v1/messages`, which no GPT model serves), so no `claude-code` cell has been run
([PLAN T1.7 results](PLAN.md#t17-results), [FINDINGS F29](../FINDINGS.md#f29-under-the-claude-code-harness-no-skill-and-no-mcp-server-reach-the-agent-and-only-claude-models-run);
the adapter is proposed as T4.7). VS Code does not read `task.toml`'s MCP servers, so `submit.sh` passes the asset folder `agents/vscode/mcp` or
`agents/vscode/base` (generated by `node tools/gen-tasks.mjs agent-assets` from the same server
definition) as `--agent_assets`, according to the task's `task.toml`. The assets also auto-approve
tools so VS Code runs unattended. `collect.py` reads VS Code runs from the Copilot Chat extension's
span store, not from the run's trajectory file or Harbor's token count, which describe only the last
subagent session. Compare harnesses on `agent_loop_seconds` minus `transport_wait_seconds`: VS Code's
`agent_seconds` includes 43 to 55 s of editor start-up, and each VS Code trial currently loses
about 186 s to a failed WebSocket attempt before each of its first three model calls
([FINDINGS F28](../FINDINGS.md#f28-under-the-vscode-harness-harbors-trial-result-describes-a-subagent-not-the-agent)).

**Runs.** `series.py` groups rounds into runs: the first pin is one pooled run; later, a run is the
round name up to the first `-` (`t01b`, `t01b-solbridge`, `t01b-plugin` are run `t01b`). Name a new
run's rounds `<run>[-<part>]` and give every run a `raw` cell, since every Aspire arm is divided by
the `raw` median of the same run. When a skill changes without a re-pin, the results files keep the
two revisions apart: an arm with two skill fingerprints in one pin (derived from the ledger's
`task_repo_commit`) is shown as `<arm> (tasks <first task commit>)`.

Changing anything under `common/` needs three commits so remote builds can fetch
exact contents: commit `common/`, run `gen-tasks.mjs tasks --suite-sha <that commit>`
and commit, then `gen-tasks.mjs dataset --task-sha <that commit>` and commit.

## Tracking a new daily or skills release (PLAN T4.5)

`tools/track.sh` runs REPORT §11's core matrix (`slow-sql`, `slow-redis`, `cold-start` × `raw`, `aspire-cli`,
`aspire-skills-mcp`, `aspire-lean` × `gpt-6-luna`, `gpt-6.1-terra` × 5 = 120 trials, ≈ $5) on a newer pin, by hand;
nothing runs on a schedule and no issue is filed. The rule it applies is PLAN's "T4.5 tracking rule, as computed".

```bash
# See what a re-pin would change (three commits in a throwaway clone; this checkout is left as it is)
tools/track.sh repin --aspire-version latest --dry-run
# The whole chain: re-pin (pushed, so CES can fetch it), 12 oracle gates, 120 trials, wait, collect, series, drafts
tools/track.sh run --aspire-version latest [--skills-tag v0.0.7] --push
# Or step by step
tools/track.sh repin --aspire-version 17.1.0-preview.1.26569.1 --push
tools/track.sh gate --run trk20261119
tools/track.sh matrix --run trk20261119 --dataset track/dataset.jsonl
tools/track.sh finish --run trk20261119 --dataset track/dataset.jsonl
```

- **The re-pin moves nothing the program measures.** It writes `track/common/` (a copy of `common/` with the new
  daily's version, commit and SHA-256s, and the new skills snapshot when `--skills-tag` moves; `PIN.json` records
  them), then `track/tasks/<scenario>/<arm>` for the 12 core tasks, then `track/dataset.jsonl`, one commit each.
  `dataset.jsonl`, `tasks/`, `tools/templates/` and `common/` stay byte-identical. `submit.sh` submits from
  `track/dataset.jsonl` when `BENCH_DATASET` names it (the ledger line records `dataset` and `task_path`), and the
  series keeps one cell per scenario, model and arm across both trees. A skills tag that changes
  `aspire-monitoring/SKILL.md` stops the re-pin: the `lean` override replaces that file and is re-derived by hand.
- **Promotion is a separate step.** A tracked pin that should become the suite's new baseline (the pin every card
  measures) is promoted with the ordinary additive re-pin on `main` (README "Changing anything under `common/`",
  as T0.1 did); the tracker never does that.
- **Runs are named `trk<yyyymmdd>`** after the daily's build date (`-gate`, `-repeat` parts). A gate below reward 1
  stops the run before any model trial. A luna time or token flag gets one repeat round before a draft; drafts go to
  `msbench/upstream-issues/tracking/` with the two runs' MSBench run IDs and the diff of pins.
- **Results.** `finish` commits the ledger lines first, then runs `collect.py --rounds <the run's rounds>` (the runs
  already in `trials.jsonl` plus these, so another lane's rounds in flight are neither fetched nor published),
  `series.py` and `tools/track_drafts.py`. `series.py --include-excluded <round> --out <dir>` reads a round whose
  ledger lines are `excluded` (the `t45-smoke` smoke) without writing `results/series.*`.
- **Where the time goes.** `tools/round_time.py --out <dir>` splits every extracted trial into queue, image build,
  fault setup, agent and verifier time from Harbor's timing file (PLAN T4.6); nothing is fetched.
