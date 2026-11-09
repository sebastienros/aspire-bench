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
    else assert.equal(fault, "none", `Unknown fault ${fault}`);
    await writeFile(statePath, JSON.stringify(state), { mode: 0o600 });

    await mkdir("/logs/environment", { recursive: true });
    const log = openSync("/logs/environment/traffic.log", "a");
    spawn(process.execPath, ["/opt/benchmark/traffic.mjs"], {
        detached: true, stdio: ["ignore", log, log],
    }).unref();
    // Let live traffic exercise the incident so runtime evidence exists before the agent starts.
    await sleep(30_000);
    console.log(`setup complete: ${JSON.stringify(state.audit ?? {})}`);
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

async function verify() {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    const details = { fault: state.fault, kind: state.kind, passed: false };
    try {
        await stopTraffic();
        const endpoints = await resolveEndpoints();
        await verifyCommon(state, endpoints, details);
        if (state.fault === "slow-sql") await verifySlowSql(state, endpoints, details);
        else if (state.fault === "read-only") await verifyReadOnly(state, endpoints, details);
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
    }
}

const commands = { setup, verify, solve, endpoints: async () => console.log(JSON.stringify(await resolveEndpoints())) };
const command = commands[process.argv[2]];
assert(command, "Usage: node bench.mjs setup|verify|solve|endpoints");
await command();
