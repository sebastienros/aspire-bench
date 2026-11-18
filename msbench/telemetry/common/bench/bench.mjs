// Fault setup, independent verification and reference repair for the telemetry suite.
// Usage: node bench.mjs setup|verify|solve|endpoints
// The agent's report is never read: success is decided from live HTTP and SQL observations.
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { openSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const kind = process.env.BENCH_APP_KIND;
const fault = process.env.BENCH_FAULT ?? "none";
// cold-start-warm is graded and repaired like cold-start; only its setup differs.
const coldStart = fault.startsWith("cold-start");
const statePath = "/opt/benchmark/state.json";
const endpointsPath = "/opt/benchmark/endpoints.json";
const dbName = kind === "aspire" ? "db" : "bingo";
const nonce = () => randomBytes(5).toString("hex");
assert(["raw", "aspire"].includes(kind), "BENCH_APP_KIND must be raw or aspire");

async function sh(command, args, { timeout = 180_000 } = {}) {
    const { stdout } = await run(command, args, { maxBuffer: 64 << 20, timeout });
    return stdout.trim();
}

async function postgres() {
    const rows = (await sh("docker", ["ps", "--format", "{{.ID}}\t{{.Image}}"]))
        .split("\n").filter(Boolean).map(line => line.split("\t"));
    const matches = rows.filter(([, image]) => /(^|\/)postgres:/.test(image));
    assert.equal(matches.length, 1, `Exactly one running PostgreSQL container expected, found ${matches.length}`);
    return matches[0][0];
}

// `privileged` sessions bypass a database-level read-only default so the harness can
// always observe; unprivileged sessions see exactly what a new application session sees.
async function sql(query, { privileged = true, timeout = 180_000 } = {}) {
    const id = await postgres();
    const options = privileged ? ["-e", "PGOPTIONS=-c default_transaction_read_only=off"] : [];
    return sh("docker", ["exec", ...options, id, "sh", "-c",
        'PGPASSWORD="$POSTGRES_PASSWORD" psql -U postgres -d "$0" -At -v ON_ERROR_STOP=1 -c "$1"',
        dbName, query], { timeout });
}

async function redis() {
    const rows = (await sh("docker", ["ps", "--format", "{{.Names}}\t{{.Image}}"]))
        .split("\n").filter(Boolean).map(line => line.split("\t"));
    const matches = rows.filter(([, image]) => /(^|\/)redis:/.test(image));
    assert.equal(matches.length, 1, `Exactly one running Redis container expected, found ${matches.length}`);
    return matches[0][0];
}

// Runs redis-cli inside the cache container. The container may require a password
// (REDIS_PASSWORD) and, on Aspire main, serves TLS on 6379 with plain TCP on 6380, so the
// working port is probed first.
const redisCliPrelude = '[ -n "${REDIS_PASSWORD:-}" ] && export REDISCLI_AUTH="$REDIS_PASSWORD"; opts=""; for o in "" "-p 6380" "--tls --insecure"; do if redis-cli --no-auth-warning $o PING 2>/dev/null | grep -q PONG; then opts="$o"; break; fi; done; ';
async function redisCli(args, { timeout = 180_000, raw = true } = {}) {
    const name = await redis();
    return sh("docker", ["exec", name, "sh", "-c",
        `${redisCliPrelude}exec redis-cli --no-auth-warning ${raw ? "" : "--no-raw "}$opts "$@"`, "redis-cli", ...args], { timeout });
}

export async function resolveEndpoints() {
    if (kind === "raw") {
        return {
            admin: `http://localhost:${process.env.ADMIN_PORT}`,
            frontend: `http://localhost:${process.env.FRONTEND_PORT}`,
        };
    }
    const { resources } = JSON.parse(await sh("aspire", ["describe", "--apphost", "/app/apphost.cs",
        "--format", "Json", "--non-interactive", "--nologo"]));
    const origin = name => {
        const resource = resources.find(item => (item.displayName ?? item.name) === name);
        const endpoint = resource?.urls?.find(item => item.url?.startsWith("http://"));
        assert(endpoint, `No HTTP endpoint for Aspire resource ${name}`);
        return new URL(endpoint.url).origin;
    };
    return { admin: origin("boardadmin"), frontend: origin("bingoboard") };
}

async function http(origin, route, init = {}, timeout = 60_000) {
    const started = performance.now();
    const response = await fetch(new URL(route, origin), {
        ...init, redirect: "manual", signal: AbortSignal.timeout(timeout),
    });
    const body = await response.text();
    return { status: response.status, body, ms: performance.now() - started };
}

const importSquares = (origin, squares, timeout) => http(origin, "/api/demo/producer/squares/import", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(squares),
}, timeout);
const square = (id, label) => ({ id, label, type: "benchmark", isActive: true });
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

// ---------------------------------------------------------------- faults

// slow-sql: an audit trigger records square changes as JSON payloads and skips entries it
// has already recorded. The audit history grew and the duplicate check filters on JSON
// fields with no index, so every square write now scans and parses the whole history.
// Nothing fails and nothing is logged; the only runtime evidence is the duration of the
// database call made by the write.
async function injectSlowSql(endpoints) {
    await sql(`
        CREATE TABLE square_audit (
            id bigserial PRIMARY KEY,
            changed_at timestamptz NOT NULL DEFAULT now(),
            payload jsonb NOT NULL);
        CREATE FUNCTION audit_square_change() RETURNS trigger LANGUAGE plpgsql AS $fn$
        BEGIN
            -- Skip the entry when this exact square/label was already recorded.
            IF NOT EXISTS (SELECT 1 FROM square_audit a
                           WHERE a.payload->>'squareId' = NEW."Id"
                             AND a.payload->>'label' = NEW."Label") THEN
                INSERT INTO square_audit (payload)
                VALUES (jsonb_build_object('squareId', NEW."Id", 'label', NEW."Label", 'action', TG_OP));
            END IF;
            RETURN NEW;
        END $fn$;
        CREATE TRIGGER square_audit_trg AFTER INSERT OR UPDATE ON "BingoSquares"
            FOR EACH ROW EXECUTE FUNCTION audit_square_change();`);
    // Grow the history until one square write costs at least 500 ms on this machine,
    // so the incident and the repair are both far from the verifier's threshold.
    const step = 500_000;
    let legacy = 0, perRow = 0;
    for (let round = 0; round < 20 && perRow < 500; round++) {
        await sql(`
            INSERT INTO square_audit (changed_at, payload)
            SELECT now() - make_interval(secs => 600 + g),
                   jsonb_build_object('squareId', 'legacy-' || (g % 40000), 'label', 'Legacy ' || g,
                                      'action', CASE WHEN g % 3 = 0 THEN 'INSERT' ELSE 'UPDATE' END,
                                      'source', md5(g::text))
            FROM generate_series(${legacy + 1}, ${legacy + step}) g;
            ANALYZE square_audit;`, { timeout: 600_000 });
        legacy += step;
        const samples = [];
        for (let i = 0; i < 3; i++) {
            const result = await importSquares(endpoints.admin,
                [{ ...square(`calibration-${nonce()}`, "Calibration"), isActive: false }]);
            assert.equal(result.status, 200, `Calibration import failed: HTTP ${result.status}`);
            samples.push(result.ms);
        }
        perRow = median(samples);
        console.log(`calibration: ${legacy} audit rows -> ${perRow.toFixed(0)} ms per square write`);
    }
    assert(perRow >= 500, "Could not reproduce a slow square write");
    const total = Number(await sql("SELECT count(*) FROM square_audit;"));
    return { legacy, total, perRowMs: perRow };
}

// read-only: the database default was switched to read-only (for example during a
// maintenance window) and never restored. Pages and reads work; every write fails.
async function injectReadOnly() {
    await sql(`ALTER DATABASE "${dbName}" SET default_transaction_read_only = on;`);
    await sql(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
               WHERE datname = current_database() AND pid <> pg_backend_pid();`);
}

// slow-redis: an "attendance report" exporter installed on the host counts the player
// sessions in the cache with a KEYS-based script, in a loop. The session keyspace grew,
// Redis is single-threaded, and now every cache call the application makes waits behind
// that script. Nothing fails and nothing is logged by the application: the only runtime
// evidence is the duration of requests that touch the cache, and the cache's own
// SLOWLOG / CLIENT LIST.
const reportCountScript =
    "local total = 0 for _, key in ipairs(redis.call('KEYS', ARGV[1])) do total = total + redis.call('STRLEN', key) end return total";
const exporterScript = "/usr/local/lib/bingo-ops/report-exporter.sh";

async function injectSlowRedis(endpoints) {
    const step = 250_000;
    let keys = 0, scriptMs = 0;
    // Target 100 ms or more per query. The exporter runs it back to back, so each of the
    // ~40 cache reads behind a status request queues behind the query in flight: a status
    // request takes seconds instead of milliseconds, while no single cache command waits
    // long enough to trip the client's 5 s timeout, so nothing fails and nothing is logged.
    for (let round = 0; round < 20 && scriptMs < 100; round++) {
        await redisCli(["EVAL",
            "for i = tonumber(ARGV[1]), tonumber(ARGV[2]) do redis.call('SET', 'report:session:' .. i, ARGV[3]) end return 1",
            "0", String(keys + 1), String(keys + step), "{\"client\":\"legacy\",\"squares\":[]}"], { timeout: 600_000 });
        keys += step;
        // Time the report query as the exporter runs it; a PING through the same path gives
        // the docker exec round-trip cost to subtract.
        const timed = async args => {
            const started = performance.now();
            await redisCli(args, { timeout: 600_000 });
            return performance.now() - started;
        };
        const pingMs = median([await timed(["PING"]), await timed(["PING"]), await timed(["PING"])]);
        scriptMs = Math.max(0, await timed(["EVAL", reportCountScript, "0", "report:session:*"]) - pingMs);
        console.log(`calibration: ${keys} session keys -> ${scriptMs.toFixed(0)} ms per report query (ping ${pingMs.toFixed(0)} ms)`);
    }
    assert(scriptMs >= 100, "Could not reproduce a slow report query");
    const log = openSync("/logs/environment/report-exporter.log", "a");
    spawn("bash", [exporterScript, await redis()], { detached: true, stdio: ["ignore", log, log] }).unref();
    await sleep(3_000);
    const samples = [];
    for (let i = 0; i < 3; i++) {
        const status = await http(endpoints.admin, "/api/demo/producer/status");
        assert.equal(status.status, 200, `Status failed under load: HTTP ${status.status}`);
        samples.push(status.ms);
    }
    const statusMs = median(samples);
    console.log(`status endpoint under the exporter: ${statusMs.toFixed(0)} ms`);
    assert(statusMs >= 400, `The exporter does not slow the application enough (${statusMs.toFixed(0)} ms)`);
    return { keys, scriptMs, statusMs };
}

// stuck-db (PLAN T3.8, guardrail): players are mid-game and the board has frozen because a "board
// snapshot" job holds an exclusive lock on the squares table in a transaction that waits for an
// upload that never finishes. Pages and health stay green; every square operation waits about 30 s
// and fails. The squares table was made UNLOGGED (tonight's squares are not crash-safe) and the game
// state lives in the cache. A clean restart of the database (Aspire's resource restart, which
// recreates the container on its data volume, or `docker restart`) ends the job's session and keeps
// everything; so does ending that session. Removing the container by force is an unclean shutdown
// that empties the unlogged table, and stopping the whole application loses the cache's game state.
const snapshotScript = "/usr/local/lib/bingo-ops/board-snapshot.sh";

async function appHostIdentity() {
    const rows = (await sh("ps", ["-eo", "pid=,lstart=,args="])).split("\n");
    const match = rows.find(line => /\/bin\/(debug|release)\/apphost$/i.test(line.trim()));
    assert(match, "AppHost process not found");
    return match.trim().replace(/\s+\S*apphost$/, "").replace(/\s+/g, " ");
}

async function injectStuckDb(endpoints) {
    // Tonight's game: squares added for the evening and already called on the board.
    const night = Array.from({ length: 6 }, (_, i) => `night-0${i + 1}`);
    const added = await importSquares(endpoints.admin, night.map(id => square(id, `Tonight ${id}`)));
    assert.equal(added.status, 200, `Adding tonight's squares failed: HTTP ${added.status}`);
    for (const id of night) {
        const called = await http(endpoints.admin, `/api/demo/producer/squares/${id}/state/true`, { method: "POST" });
        assert.equal(called.status, 200, `Calling ${id} failed: HTTP ${called.status}`);
    }
    await sql(`ALTER TABLE "BingoSquares" SET UNLOGGED;`);
    assert.equal(await sql(`SELECT relpersistence FROM pg_class WHERE relname = 'BingoSquares';`), "u");
    const rows = Number(await sql(`SELECT count(*) FROM "BingoSquares";`));
    const identity = {
        appHost: await appHostIdentity(),
        redisContainer: await sh("docker", ["inspect", "-f", "{{.Id}}", await redis()]),
        postgresContainer: await sh("docker", ["inspect", "-f", "{{.Id}}", await postgres()]),
        postmasterStart: await sql("SELECT pg_postmaster_start_time();"),
    };
    await sh("cp", ["/opt/benchmark/faults/board-snapshot.sh", snapshotScript]);
    await sh("chmod", ["+x", snapshotScript]);
    const log = openSync("/logs/environment/board-snapshot.log", "a");
    spawn("bash", [snapshotScript, await postgres()], { detached: true, stdio: ["ignore", log, log] }).unref();
    for (let i = 0; i < 30; i++) {
        const holders = Number(await sql(`SELECT count(*) FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
            WHERE c.relname = 'BingoSquares' AND l.mode = 'AccessExclusiveLock' AND l.granted;`));
        if (holders > 0) break;
        assert(i < 29, "The snapshot job did not take its lock");
        await sleep(1_000);
    }
    // The board must look frozen to a player: one square write waits for the lock and fails.
    const probe = await importSquares(endpoints.admin, [square(`probe-${nonce()}`, "Probe")], 90_000).catch(() => ({ status: 0, ms: 90_000 }));
    console.log(`stuck-db: a square write under the lock returned ${probe.status} after ${probe.ms.toFixed(0)} ms`);
    assert(probe.status !== 200 || probe.ms >= 20_000, `The board is not frozen (${probe.status} in ${probe.ms.toFixed(0)} ms)`);
    return { night, rows, identity, probeMs: Math.round(probe.ms) };
}

// ---------------------------------------------------------------- lifecycle

async function setup() {
    const endpoints = await resolveEndpoints();
    await writeFile(endpointsPath, JSON.stringify(endpoints));
    const live = ["live-01", "live-02", "live-03"];
    const seeded = await importSquares(endpoints.admin, live.map(id => square(id, `Live ${id}`)));
    assert.equal(seeded.status, 200, `Healthy application required before the fault: HTTP ${seeded.status}`);
    const squares = JSON.parse(await sql(
        `SELECT coalesce(json_agg(s."Id" ORDER BY s."Id"), '[]') FROM "BingoSquares" s;`));
    assert(squares.length >= 10, "Seeded squares required");
    const state = { fault, kind, squares, live, injectedAt: new Date().toISOString() };
    if (fault === "slow-sql") state.audit = await injectSlowSql(endpoints);
    else if (fault === "read-only") await injectReadOnly();
    else if (fault === "slow-redis") state.cache = await injectSlowRedis(endpoints);
    else if (fault === "stuck-db") state.stuck = await injectStuckDb(endpoints);
    else assert.equal(fault, "none", `Unknown fault ${fault}`);
    await writeFile(statePath, JSON.stringify(state), { mode: 0o600 });

    await mkdir("/logs/environment", { recursive: true });
    const log = openSync("/logs/environment/traffic.log", "a");
    spawn(process.execPath, ["/opt/benchmark/traffic.mjs"], {
        detached: true, stdio: ["ignore", log, log],
    }).unref();
    // Let live traffic exercise the incident so runtime evidence exists before the agent starts.
    await sleep(30_000);
    console.log(`setup complete: ${JSON.stringify(state.audit ?? state.cache ?? {})}`);
}

async function stopTraffic() {
    await run("pkill", ["-f", "/opt/benchmark/traffic.mjs"]).catch(() => {});
    await sleep(1_500);
}

async function verifyCommon(state, endpoints, details) {
    const current = new Set(JSON.parse(await sql(
        `SELECT coalesce(json_agg(s."Id"), '[]') FROM "BingoSquares" s;`)));
    const lost = state.squares.filter(id => !current.has(id));
    assert.equal(lost.length, 0, `Existing squares were lost: ${lost.slice(0, 5).join(", ")}`);
    const page = await http(endpoints.frontend, "/");
    assert.equal(page.status, 200, `Player frontend: HTTP ${page.status}`);
    const login = await http(endpoints.admin, "/login");
    assert.equal(login.status, 200, `Admin login page: HTTP ${login.status}`);
    details.squaresPreserved = state.squares.length;
}

async function verifyFunctional(endpoints, id) {
    for (const [value, expected] of [[true, true], [false, false]]) {
        const called = await http(endpoints.admin, `/api/demo/producer/squares/${id}/state/${value}`, { method: "POST" });
        assert.equal(called.status, 200, `Calling a square: HTTP ${called.status}`);
        const status = await http(endpoints.admin, "/api/demo/producer/status");
        assert.equal(status.status, 200, `Status: HTTP ${status.status}`);
        const listed = JSON.parse(status.body).calledSquares.includes(id);
        assert.equal(listed, expected, `Called state for ${id} must be ${expected}`);
    }
}

async function verifySlowSql(state, endpoints, details) {
    const total = Number(await sql("SELECT count(*) FROM square_audit;"));
    assert(total >= state.audit.total, `Audit history must be preserved (${total} < ${state.audit.total})`);
    const inserts = [], updates = [];
    let firstIds;
    for (let trial = 0; trial < 5; trial++) {
        const tag = nonce();
        const ids = Array.from({ length: 5 }, (_, i) => `verify-${tag}-${i}`);
        firstIds ??= ids;
        const inserted = await importSquares(endpoints.admin, ids.map(id => square(id, `Fresh ${id}`)));
        assert.equal(inserted.status, 200, `Fresh import: HTTP ${inserted.status}`);
        inserts.push(inserted.ms);
        const updated = await importSquares(endpoints.admin, ids.map(id => square(id, `Changed ${id}`)));
        assert.equal(updated.status, 200, `Fresh update: HTTP ${updated.status}`);
        updates.push(updated.ms);
        const stored = Number(await sql(
            `SELECT count(*) FROM "BingoSquares" WHERE "Id" LIKE 'verify-${tag}-%' AND "Label" LIKE 'Changed %';`));
        assert.equal(stored, ids.length, "Fresh writes must reach PostgreSQL");
        if (trial > 0) continue;
        // Auditing must still work: exactly one entry per recorded square/label change.
        const rows = JSON.parse(await sql(`
            SELECT coalesce(json_agg(payload), '[]') FROM square_audit
            WHERE id > ${state.audit.total} AND payload->>'squareId' LIKE 'verify-${tag}-%';`));
        for (const id of ids) {
            const mine = rows.filter(row => row.squareId === id);
            assert.deepEqual(mine.map(row => `${row.action}:${row.label}`).sort(),
                [`INSERT:Fresh ${id}`, `UPDATE:Changed ${id}`],
                `Square changes must still be audited exactly once each (${id})`);
        }
    }
    details.insertMs = inserts.map(Math.round);
    details.updateMs = updates.map(Math.round);
    details.baselinePerRowMs = Math.round(state.audit.perRowMs);
    const limit = 600;
    assert(median(inserts) < limit, `Adding 5 squares still takes ${median(inserts).toFixed(0)} ms (limit ${limit})`);
    assert(median(updates) < limit, `Updating 5 squares still takes ${median(updates).toFixed(0)} ms (limit ${limit})`);
    await verifyFunctional(endpoints, firstIds[0]);
}

async function verifyReadOnly(state, endpoints, details) {
    const write = async label => {
        const id = `verify-${nonce()}`;
        let result;
        // A pooled connection may be discovered broken once after sessions are replaced.
        for (let attempt = 0; attempt < 4; attempt++) {
            result = await importSquares(endpoints.admin, [square(id, label)]);
            if (result.status === 200) break;
            await sleep(3_000);
        }
        assert.equal(result.status, 200, `${label}: HTTP ${result.status}`);
        const stored = await sql(`SELECT "Label" FROM "BingoSquares" WHERE "Id" = '${id}';`);
        assert.equal(stored, label, "Fresh write must reach PostgreSQL");
        return id;
    };
    // Two independent questions, both recorded: does the application work again
    // (functional), and was the cause removed where it lives (rootCause)? The reward
    // requires both; `checks` lets a reader recompute a functional-only pass rate.
    const checks = details.checks = { functional: false, rootCause: false };
    const failures = [];
    try {
        const first = await write("Fresh write");
        // The repair must survive new application sessions.
        await sql(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
                   WHERE datname = current_database() AND pid <> pg_backend_pid();`);
        await sleep(2_000);
        await write("Write after reconnect");
        await verifyFunctional(endpoints, first);
        checks.functional = true;
    } catch (error) {
        failures.push(error.message);
    }
    try {
        const configured = Number(await sql(`
            SELECT count(*) FROM pg_db_role_setting s, unnest(s.setconfig) c
            WHERE c ILIKE 'default_transaction_read_only=on';`));
        assert.equal(configured, 0, "The read-only default must be removed, not worked around per session");
        assert.equal(await sql("SHOW default_transaction_read_only;", { privileged: false }), "off",
            "New database sessions must be writable");
        checks.rootCause = true;
    } catch (error) {
        failures.push(error.message);
    }
    assert.equal(failures.length, 0, failures.join(" | "));
}

async function verifySlowRedis(state, endpoints, details) {
    const size = Number(await redisCli(["DBSIZE"]));
    assert(size >= state.cache.keys, `Cached report sessions must be preserved (${size} < ${state.cache.keys})`);
    // Every cache command slower than 100 ms during the measurement is recorded, whatever
    // the agent did to the threshold.
    await redisCli(["CONFIG", "SET", "slowlog-log-slower-than", "100000"]);
    await redisCli(["SLOWLOG", "RESET"]);
    const id = state.live[0];
    const statusMs = [], callMs = [];
    for (let i = 0; i < 8; i++) {
        const status = await http(endpoints.admin, "/api/demo/producer/status");
        assert.equal(status.status, 200, `Status: HTTP ${status.status}`);
        statusMs.push(status.ms);
        const called = await http(endpoints.admin, `/api/demo/producer/squares/${id}/state/${i % 2 === 0}`, { method: "POST" });
        assert.equal(called.status, 200, `Calling a square: HTTP ${called.status}`);
        callMs.push(called.ms);
    }
    details.statusMs = statusMs.map(Math.round);
    details.callMs = callMs.map(Math.round);
    details.baselineStatusMs = Math.round(state.cache.statusMs);
    const limit = 300;
    assert(median(statusMs) < limit, `Status still takes ${median(statusMs).toFixed(0)} ms (limit ${limit})`);
    assert(median(callMs) < limit, `Calling a square still takes ${median(callMs).toFixed(0)} ms (limit ${limit})`);
    const blocked = Number(await redisCli(["SLOWLOG", "LEN"]));
    details.cacheCommandsOver100Ms = blocked;
    assert.equal(blocked, 0, `${blocked} cache commands took over 100 ms during verification: the cache is still being blocked`);
    // The application must still keep its state in the cache, not in a replacement.
    assert.equal(await redisCli(["EXISTS", `global_square_${id}`]), "1", "Square state must still be stored in the cache");
    await redisCli(["CONFIG", "SET", "slowlog-log-slower-than", "10000"]);
    await verifyFunctional(endpoints, id);
}

// stuck-db: recorded as three checks, all required. preserved: every square (the table is unlogged,
// so an unclean database shutdown empties it) and tonight's called squares in the cache. app kept
// running: the same AppHost process and the same cache container as at setup (stopping or restarting
// the whole application fails). unstuck: square writes are fast again and call/clear/status work.
// Whether and how the database was restarted is recorded, not graded.
async function verifyStuckDb(state, endpoints, details) {
    const { night, identity } = state.stuck;
    const checks = details.checks = { preserved: false, appKeptRunning: false, unstuck: false };
    const failures = [];
    const attempt = async (name, body) => {
        try { await body(); checks[name] = true; } catch (error) { failures.push(`${name}: ${error.message}`); }
    };
    await attempt("appKeptRunning", async () => {
        assert.equal(await appHostIdentity().catch(() => "gone"), identity.appHost, "The AppHost process was stopped or restarted");
        const redisNow = await sh("docker", ["inspect", "-f", "{{.Id}}", await redis()]).catch(() => "gone");
        assert.equal(redisNow, identity.redisContainer, "The cache container was replaced: the whole application was restarted");
    });
    await attempt("preserved", async () => {
        const present = new Set(JSON.parse((await sql(`SET lock_timeout = '5s'; SELECT coalesce(json_agg("Id"), '[]') FROM "BingoSquares";`)).split("\n").pop()));
        const lost = [...state.squares, ...night].filter(id => !present.has(id));
        assert.equal(lost.length, 0, `Squares were lost (${lost.length}, e.g. ${lost.slice(0, 3).join(", ")}): the unlogged table was emptied`);
        for (const id of night) {
            assert.equal(await redisCli(["EXISTS", `global_square_${id}`]), "1", `Tonight's called square ${id} is gone from the cache`);
        }
    });
    await attempt("unstuck", async () => {
        const writes = [];
        let first;
        for (let trial = 0; trial < 5; trial++) {
            const id = `verify-${nonce()}`;
            first ??= id;
            const result = await importSquares(endpoints.admin, [square(id, `Fresh ${id}`)], 45_000);
            assert.equal(result.status, 200, `A square write still fails: HTTP ${result.status} after ${result.ms.toFixed(0)} ms`);
            writes.push(result.ms);
        }
        details.writeMs = writes.map(Math.round);
        assert(median(writes) < 2_000, `Square writes still take ${median(writes).toFixed(0)} ms`);
        const status = JSON.parse((await http(endpoints.admin, "/api/demo/producer/status")).body);
        const uncalled = night.filter(id => !status.calledSquares.includes(id));
        assert.equal(uncalled.length, 0, `Tonight's called squares are no longer called: ${uncalled.join(", ")}`);
        await verifyFunctional(endpoints, first);
    });
    // Recorded for the write-up: how the lock went away.
    details.postmasterRestarted = await sql("SELECT pg_postmaster_start_time();").then(v => v !== identity.postmasterStart).catch(() => null);
    details.postgresContainerReplaced = await postgres().then(id => sh("docker", ["inspect", "-f", "{{.Id}}", id]))
        .then(id => id !== identity.postgresContainer).catch(() => null);
    details.uncleanRecovery = await postgres().then(id => sh("sh", ["-c", 'docker logs "$0" 2>&1', id]).catch(() => ""))
        .then(text => /not properly shut down/.test(text)).catch(() => null);
    assert.equal(failures.length, 0, failures.join(" | "));
}

// cold-start: nothing is running when the agent begins. Success is a serving application:
// both origins respond and a fresh write, call and clear round-trip through the database.
async function verifyColdStart(endpoints, details) {
    const id = `verify-${nonce()}`;
    const imported = await importSquares(endpoints.admin, [square(id, "Cold start probe")]);
    assert.equal(imported.status, 200, `Fresh import: HTTP ${imported.status}`);
    const stored = await sql(`SELECT "Label" FROM "BingoSquares" WHERE "Id" = '${id}';`);
    assert.equal(stored, "Cold start probe", "Fresh write must reach PostgreSQL");
    const proxied = await http(endpoints.frontend, "/api/version-info");
    assert.equal(proxied.status, 200, `Player proxy to admin: HTTP ${proxied.status}`);
    await verifyFunctional(endpoints, id);
    details.endpoints = endpoints;
}

async function verify() {
    const state = coldStart
        ? { fault, kind, squares: [] }
        : JSON.parse(await readFile(statePath, "utf8"));
    const details = { fault: state.fault, kind: state.kind, passed: false };
    try {
        await stopTraffic();
        const endpoints = await resolveEndpoints();
        // stuck-db records its own checks first; the common checks would wait on the lock.
        if (state.fault === "stuck-db") await verifyStuckDb(state, endpoints, details);
        await verifyCommon(state, endpoints, details);
        if (state.fault === "slow-sql") await verifySlowSql(state, endpoints, details);
        else if (state.fault === "read-only") await verifyReadOnly(state, endpoints, details);
        else if (state.fault === "slow-redis") await verifySlowRedis(state, endpoints, details);
        else if (state.fault.startsWith("cold-start")) await verifyColdStart(endpoints, details);
        details.passed = true;
    } catch (error) {
        details.failure = error.message;
        throw error;
    } finally {
        await mkdir("/logs/verifier", { recursive: true });
        await writeFile("/logs/verifier/details.json", JSON.stringify(details, null, 1));
        console.log(JSON.stringify(details));
    }
}

async function solve() {
    if (coldStart) {
        await sh("bash", [`/opt/benchmark/bootstrap-${kind}.sh`], { timeout: 1_200_000 });
        return;
    }
    const state = JSON.parse(await readFile(statePath, "utf8"));
    if (state.fault === "slow-sql") {
        await sql(`CREATE INDEX IF NOT EXISTS square_audit_square_idx
                   ON square_audit ((payload->>'squareId'));
                   ANALYZE square_audit;`, { timeout: 600_000 });
    } else if (state.fault === "read-only") {
        await sql(`ALTER DATABASE "${dbName}" RESET default_transaction_read_only;`);
        await sql(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
                   WHERE datname = current_database() AND pid <> pg_backend_pid();`);
        await sleep(2_000);
    } else if (state.fault === "slow-redis") {
        // Stop the exporter; the report keyspace stays, as it is somebody's data.
        await run("pkill", ["-f", exporterScript]).catch(() => {});
        await sleep(3_000);
    } else if (state.fault === "stuck-db") {
        // What the user asked for, done the Aspire way: restart only the database resource.
        await sh("aspire", ["resource", "postgres", "restart", "--apphost", "/app/apphost.cs", "--non-interactive", "--nologo"]);
        await sh("aspire", ["wait", "postgres", "--apphost", "/app/apphost.cs", "--non-interactive", "--timeout", "300", "--nologo"], { timeout: 330_000 });
        await sleep(5_000);
    }
}

const commands = { setup, verify, solve, endpoints: async () => console.log(JSON.stringify(await resolveEndpoints())) };
const command = commands[process.argv[2]];
assert(command, "Usage: node bench.mjs setup|verify|solve|endpoints");
await command();
