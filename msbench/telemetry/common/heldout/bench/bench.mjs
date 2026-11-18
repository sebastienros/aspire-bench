// Fault setup, independent verification and reference repair for the held-out Shop application
// (PLAN card T0.2). Usage: node bench.mjs setup|verify|solve|endpoints
// The agent's report is never read: success is decided from live HTTP, SQL and broker observations.
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { openSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const kind = process.env.BENCH_APP_KIND;
const fault = (await readFile("/opt/benchmark/fault", "utf8")).trim();
const statePath = "/opt/benchmark/state.json";
const endpointsPath = "/opt/benchmark/endpoints.json";
const reconcileScript = "/usr/local/lib/shop-ops/stock-reconcile.sh";
const rawLogs = ["/app/.script-state/api.log", "/app/.script-state/worker.log"];
const dbName = "shopdb";
const legacyOrders = 20_000;
const nonce = () => randomBytes(4).toString("hex");
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
assert(["raw", "aspire"].includes(kind), "BENCH_APP_KIND must be raw or aspire");

async function sh(command, args, { timeout = 180_000 } = {}) {
    try {
        const { stdout } = await run(command, args, { maxBuffer: 64 << 20, timeout });
        return stdout.trim();
    } catch (error) {
        const detail = `${(error.stdout || "").trim()} ${(error.stderr || error.message || "").trim()}`;
        throw new Error(`${command} ${args.slice(0, 2).join(" ")} failed: ${detail}`.slice(0, 2000));
    }
}

async function container(pattern, label) {
    const rows = (await sh("docker", ["ps", "--format", "{{.Names}}\t{{.Image}}"]))
        .split("\n").filter(Boolean).map(line => line.split("\t"));
    const matches = rows.filter(([, image]) => pattern.test(image));
    assert.equal(matches.length, 1, `Exactly one running ${label} container expected, found ${matches.length}`);
    return matches[0][0];
}
const sqlServer = () => container(/(^|\/)mssql\/server:/, "SQL Server");
const rabbitmq = () => container(/(^|\/)rabbitmq:/, "RabbitMQ");

// sqlcmd inside the SQL Server container as sa, with QUOTED_IDENTIFIER on (-I), no headers
// and trimmed columns (-W). Every query returns at most one short column per row.
const sqlcmd = 'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" exec /opt/mssql-tools18/bin/sqlcmd -C -I -S localhost -U sa -d "$0" -b -h -1 -W -Q "$1"';
async function sql(query, { timeout = 180_000 } = {}) {
    const id = await sqlServer();
    const out = await sh("docker", ["exec", id, "sh", "-c", sqlcmd, dbName, `SET NOCOUNT ON; ${query}`], { timeout });
    return out.split("\n").map(line => line.trim()).filter(Boolean).join("\n");
}
const sqlNumber = async query => Number(await sql(query));

export async function resolveEndpoints() {
    if (kind === "raw") return { api: `http://localhost:${process.env.API_PORT}` };
    const { resources } = JSON.parse(await sh("aspire", ["describe", "--apphost", "/app/apphost.cs",
        "--format", "Json", "--non-interactive", "--nologo"]));
    const resource = resources.find(item => (item.displayName ?? item.name) === "api");
    const endpoint = resource?.urls?.find(item => item.url?.startsWith("http://"));
    assert(endpoint, "No HTTP endpoint for Aspire resource api");
    return { api: new URL(endpoint.url).origin };
}

async function http(origin, route, init = {}, timeout = 60_000) {
    const started = performance.now();
    const response = await fetch(new URL(route, origin), { ...init, redirect: "manual", signal: AbortSignal.timeout(timeout) });
    const body = await response.text();
    return { status: response.status, body, ms: performance.now() - started };
}
const post = body => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

async function placeOrder(api, customer, productId = 1, quantity = 1) {
    const result = await http(api, "/api/orders", post({ customer, productId, quantity }));
    assert.equal(result.status, 201, `Placing an order: HTTP ${result.status} ${result.body.slice(0, 200)}`);
    return JSON.parse(result.body).number;
}
const orderStatus = number => sql(`SELECT Status FROM Orders WHERE Number = '${number}';`);
async function waitForStatus(number, expected, timeoutMs) {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
        if (await orderStatus(number) === expected) return performance.now() - started;
        await sleep(200);
    }
    return null;
}

// ------------------------------------------------------------------ inventory lock

// The worker holds the lock for a few milliseconds per order; the stalled reconciliation holds it
// indefinitely. Returns sp_getapplock's result: >= 0 granted, < 0 timed out.
const tryInventoryLock = timeoutMs => sqlNumber(`
    BEGIN TRANSACTION; DECLARE @r int;
    EXEC @r = sp_getapplock @Resource = N'inventory', @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = ${timeoutMs};
    SELECT @r; ROLLBACK;`);

// ------------------------------------------------------------------ data invariants

const ordersFingerprint = maxId => sql(`
    SELECT CONCAT(COUNT_BIG(*), ':', CHECKSUM_AGG(CHECKSUM(Id, Number, Customer, ProductId, Quantity))) FROM Orders WHERE Id <= ${maxId};`);
// Stock plus everything confirmed is constant: an order confirmed without allocating stock, or
// allocated twice, breaks it.
const inventoryTotals = () => sql(`
    SELECT CONCAT(p.Id, ':', p.Stock + ISNULL((SELECT SUM(o.Quantity) FROM Orders o WHERE o.ProductId = p.Id AND o.Status = 'Confirmed'), 0))
    FROM Products p ORDER BY p.Id;`);
const queueDepth = async () => {
    const out = await sh("docker", ["exec", await rabbitmq(), "rabbitmqctl", "-q", "list_queues", "name", "messages"]);
    const row = out.split("\n").map(line => line.trim().split(/\s+/)).find(([name]) => name === "orders");
    return row ? Number(row[1]) : 0;
};

// ------------------------------------------------------------------ application logs

async function logOffsets() {
    if (kind !== "raw") return { since: new Date().toISOString() };
    const offsets = { since: new Date().toISOString() };
    for (const path of rawLogs) offsets[path] = (await stat(path).catch(() => ({ size: 0 }))).size;
    return offsets;
}
async function rawLogSince(offsets) {
    let text = "";
    for (const path of rawLogs) {
        const content = await readFile(path).catch(() => Buffer.alloc(0));
        text += content.subarray(offsets[path] ?? 0).toString("utf8");
    }
    return text;
}
// Error-level lines written by the application since the offsets were taken. Raw: the console
// logger's `fail:`/`crit:` lines and exception stack lines in the process logs. Aspire: the
// structured logs at Error or above that the resources exported.
async function errorLinesSince(offsets) {
    if (kind === "raw") {
        const text = await rawLogSince(offsets);
        return text.split("\n").filter(line => /^\s*(fail|crit):|Exception\b|^\s+at \S+\(/.test(line));
    }
    const out = await sh("aspire", ["otel", "logs", "--apphost", "/app/apphost.cs", "--severity", "Error",
        "-n", "500", "--format", "Json", "--non-interactive", "--nologo"]);
    const since = Date.parse(offsets.since);
    const entries = JSON.parse(out || "[]");
    const list = Array.isArray(entries) ? entries : entries.logs ?? entries.resourceLogs ?? entries.items ?? [];
    return list.filter(entry => {
        const at = Date.parse(entry.timestamp ?? entry.timeStamp ?? entry.time ?? "");
        return Number.isNaN(at) || at >= since;
    }).map(entry => JSON.stringify(entry).slice(0, 300));
}

// ------------------------------------------------------------------ faults

// heldout-slow-sql (log-visible): carrier tracking webhooks are stored as raw JSON and the order
// page finds an order's updates with JSON_VALUE over the whole history, which nothing indexes.
// The history grew, so every order page scans and parses every stored event. Nothing fails; EF
// Core logs each command with its duration in the API log.
async function injectSlowSql(endpoints, state) {
    const step = 1_000_000;
    let added = 0, pageMs = 0;
    for (let round = 0; round < 25 && pageMs < 500; round++) {
        await sql(`
            WITH n AS (SELECT TOP (${step}) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) + ${added} AS g
                       FROM sys.all_objects a CROSS JOIN sys.all_objects b CROSS JOIN sys.all_objects c)
            INSERT INTO CarrierEvents WITH (TABLOCK) (ReceivedAt, Payload)
            SELECT DATEADD(second, -CAST(g % 31536000 AS int) - 3600, SYSUTCDATETIME()),
                   CONCAT(N'{"carrier":"NorthPost","orderNumber":"SO-L', RIGHT(CONCAT('0000000', 1 + g % ${legacyOrders}), 7),
                          N'","status":"', CASE g % 4 WHEN 0 THEN N'picked up' WHEN 1 THEN N'in transit'
                                                      WHEN 2 THEN N'out for delivery' ELSE N'delivered' END,
                          N'","location":"Hub ', g % 97, N'"}')
            FROM n;`, { timeout: 900_000 });
        added += step;
        const samples = [];
        for (const number of state.live) {
            const page = await http(endpoints.api, `/api/orders/${number}`);
            assert.equal(page.status, 200, `Order page during calibration: HTTP ${page.status}`);
            samples.push(page.ms);
        }
        pageMs = median(samples);
        console.log(`calibration: ${added} carrier events -> ${pageMs.toFixed(0)} ms per order page`);
    }
    assert(pageMs >= 500, "Could not reproduce a slow order page");
    return { added, pageMs, events: await sqlNumber("SELECT COUNT_BIG(*) FROM CarrierEvents;") };
}

// The log-visible fault must be visible: EF Core's command line with the slow duration and the
// statement, in the raw API log.
async function assertSlowCommandLogged(offsets) {
    if (kind !== "raw") return null;
    const text = await rawLogSince(offsets);
    const slow = [...text.matchAll(/Executed DbCommand \(([\d,]+)ms\)[^\n]*\n(?:[^\n]*\n){0,2}[^\n]*FROM CarrierEvents/g)]
        .map(match => Number(match[1].replaceAll(",", ""))).filter(ms => ms >= 400);
    assert(slow.length > 0, "Fixture rejected: the slow statement is not in the raw API log");
    return slow.length;
}

// heldout-stuck-orders (log-silent): a stock reconciliation job took the inventory lock and is
// stuck waiting for its supplier feed. The worker waits for the lock, gives up after 15 s and
// retries the same message, forever. Nothing fails and nothing is logged at error level;
// orders stay Pending and the queue grows.
async function injectStuckOrders(endpoints, state) {
    const sqlId = await sqlServer();
    const log = openSync("/logs/environment/stock-reconcile.log", "a");
    spawn("bash", [reconcileScript, sqlId, dbName], { detached: true, stdio: ["ignore", log, log] }).unref();
    let held = false;
    for (let i = 0; i < 60 && !held; i++) {
        held = await sqlNumber(`
            SELECT COUNT(*) FROM sys.dm_tran_locks l JOIN sys.dm_exec_sessions s ON s.session_id = l.request_session_id
            WHERE l.resource_type = 'APPLICATION' AND l.request_status = 'GRANT' AND s.program_name = 'SQLCMD'
              AND l.request_session_id <> @@SPID;`) === 1;
        if (!held) await sleep(500);
    }
    assert(held, "The reconciliation job did not take the inventory lock");
    const probe = await placeOrder(endpoints.api, state.customers[0]);
    await sleep(20_000);
    assert.equal(await orderStatus(probe), "Pending", "An order placed under the fault must stay Pending");
    return { probe };
}

// ------------------------------------------------------------------ lifecycle

async function setup() {
    assert(["heldout-slow-sql", "heldout-stuck-orders"].includes(fault),
        fault === "heldout-cache" ? "heldout-cache is reserved (PLAN T0.2) and not implemented" : `Unknown fault ${fault}`);
    const endpoints = await resolveEndpoints();
    await writeFile(endpointsPath, JSON.stringify(endpoints));
    await mkdir("/logs/environment", { recursive: true });
    await sql(`ALTER DATABASE [${dbName}] SET RECOVERY SIMPLE;`);

    // A healthy application before the fault: live orders are confirmed by the worker.
    const customers = ["maya.r", "jonas.k", "li.wei", "sam.o"];
    const live = [];
    for (const [index, customer] of customers.entries()) {
        const number = await placeOrder(endpoints.api, customer, 1 + index, 1);
        assert.notEqual(await waitForStatus(number, "Confirmed", 30_000), null, `Healthy application required: ${number} not confirmed`);
        live.push(number);
    }
    // History: a year of confirmed orders and their carrier tracking updates.
    await sql(`
        WITH n AS (SELECT TOP (${legacyOrders}) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS g
                   FROM sys.all_objects a CROSS JOIN sys.all_objects b)
        INSERT INTO Orders (Number, Customer, ProductId, Quantity, Status, PlacedAt, ConfirmedAt)
        SELECT CONCAT('SO-L', RIGHT(CONCAT('0000000', g), 7)), CONCAT('customer-', g % 2000), 1 + g % 6, 1 + g % 3,
               'Confirmed', DATEADD(minute, -g * 25, SYSUTCDATETIME()), DATEADD(minute, -g * 25 + 1, SYSUTCDATETIME())
        FROM n;
        WITH n AS (SELECT TOP (50000) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS g
                   FROM sys.all_objects a CROSS JOIN sys.all_objects b)
        INSERT INTO CarrierEvents (ReceivedAt, Payload)
        SELECT DATEADD(minute, -g * 10, SYSUTCDATETIME()),
               CONCAT(N'{"carrier":"NorthPost","orderNumber":"SO-L', RIGHT(CONCAT('0000000', 1 + g % ${legacyOrders}), 7),
                      N'","status":"delivered","location":"Hub ', g % 97, N'"}')
        FROM n;`, { timeout: 600_000 });
    for (const number of live) {
        const page = await http(endpoints.api, `/api/carrier/events`, post({ carrier: "NorthPost", orderNumber: number, status: "picked up", location: "Hub 1" }));
        assert.equal(page.status, 202, `Carrier webhook: HTTP ${page.status}`);
    }

    const offsets = await logOffsets();
    const state = { fault, kind, customers, live, injectedAt: offsets.since, offsets };
    if (fault === "heldout-slow-sql") state.tracking = await injectSlowSql(endpoints, state);
    else state.lock = await injectStuckOrders(endpoints, state);
    state.maxOrderId = await sqlNumber("SELECT MAX(Id) FROM Orders;");
    state.orders = await ordersFingerprint(state.maxOrderId);
    state.inventory = await inventoryTotals();
    state.events = await sqlNumber("SELECT COUNT_BIG(*) FROM CarrierEvents;");
    await writeFile(statePath, JSON.stringify(state), { mode: 0o600 });

    const log = openSync("/logs/environment/traffic.log", "a");
    spawn(process.execPath, ["/opt/benchmark/traffic.mjs"], { detached: true, stdio: ["ignore", log, log] }).unref();
    // Let live traffic exercise the incident so runtime evidence exists before the agent starts.
    await sleep(30_000);

    if (fault === "heldout-slow-sql") {
        state.tracking.slowCommandsLogged = await assertSlowCommandLogged(offsets);
    } else {
        // The silent fault must be silent: no error-level line from the application during the
        // fault window, or the fixture is rejected.
        const errors = await errorLinesSince(offsets);
        assert.equal(errors.length, 0, `Fixture rejected: ${errors.length} error-level lines during the fault window: ${errors.slice(0, 3).join(" | ")}`);
        state.lock.queueDepth = await queueDepth();
        assert(state.lock.queueDepth > 0, "Fixture rejected: no orders are waiting in the queue");
        state.lock.pending = await sqlNumber("SELECT COUNT(*) FROM Orders WHERE Status = 'Pending';");
    }
    await writeFile(statePath, JSON.stringify(state), { mode: 0o600 });
    console.log(`setup complete: ${JSON.stringify(state.tracking ?? state.lock)}`);
}

async function stopTraffic() {
    await run("pkill", ["-f", "/opt/benchmark/traffic.mjs"]).catch(() => {});
    await sleep(1_500);
}

async function verifyCommon(state, endpoints, details) {
    const home = await http(endpoints.api, "/");
    assert.equal(home.status, 200, `Storefront: HTTP ${home.status}`);
    assert(home.body.includes("Trailhead Outfitters"), "Storefront page must be served");
    const products = await http(endpoints.api, "/api/products");
    assert.equal(products.status, 200, `Products: HTTP ${products.status}`);
    assert.equal(JSON.parse(products.body).length, 6, "All products must be listed");
    assert.equal(await ordersFingerprint(state.maxOrderId), state.orders, "Existing orders were lost or altered");
    details.ordersPreserved = state.orders.split(":")[0];
}

const verifyInventory = async state =>
    assert.equal(await inventoryTotals(), state.inventory, "Stock no longer matches confirmed orders (an order was confirmed without allocation, or allocated twice)");

async function verifyOrderFlows(endpoints, details) {
    const latencies = [];
    for (let i = 0; i < 5; i++) {
        const number = await placeOrder(endpoints.api, `verify-${nonce()}`, 1 + i, 1);
        const ms = await waitForStatus(number, "Confirmed", 15_000);
        assert.notEqual(ms, null, `A fresh order (${number}) was not confirmed within 15 s`);
        latencies.push(ms);
    }
    details.confirmMs = latencies.map(Math.round);
    assert(median(latencies) < 3_000, `Fresh orders take ${median(latencies).toFixed(0)} ms to be confirmed (limit 3000)`);
}

async function verifySlowSql(state, endpoints, details) {
    const events = await sqlNumber("SELECT COUNT_BIG(*) FROM CarrierEvents;");
    assert(events >= state.events, `Carrier history must be preserved (${events} < ${state.events})`);
    const timed = async numbers => {
        const ms = [];
        for (const number of numbers) {
            const page = await http(endpoints.api, `/api/orders/${number}`);
            assert.equal(page.status, 200, `Order page ${number}: HTTP ${page.status}`);
            ms.push(page.ms);
        }
        return ms;
    };
    const legacy = Array.from({ length: 5 }, (_, i) => `SO-L${String(1 + ((i * 3917) % legacyOrders)).padStart(7, "0")}`);
    const liveMs = await timed(state.live), legacyMs = await timed(legacy);
    details.liveOrderPageMs = liveMs.map(Math.round);
    details.legacyOrderPageMs = legacyMs.map(Math.round);
    details.baselineOrderPageMs = Math.round(state.tracking.pageMs);
    const limit = 300;
    assert(median(liveMs) < limit, `Order pages still take ${median(liveMs).toFixed(0)} ms (limit ${limit})`);
    assert(median(legacyMs) < limit, `Older order pages still take ${median(legacyMs).toFixed(0)} ms (limit ${limit})`);
    // The page must still show the complete, current tracking history.
    const sample = legacy[0];
    const expected = Math.min(20, await sqlNumber(`SELECT COUNT(*) FROM CarrierEvents WHERE JSON_VALUE(Payload, '$.orderNumber') = N'${sample}';`));
    const shown = JSON.parse((await http(endpoints.api, `/api/orders/${sample}`)).body).tracking.length;
    assert.equal(shown, expected, `Order ${sample} must show its latest ${expected} tracking updates, shows ${shown}`);
    const marker = `verified-${nonce()}`;
    const webhook = await http(endpoints.api, "/api/carrier/events", post({ carrier: "NorthPost", orderNumber: state.live[0], status: marker, location: "Hub 7" }));
    assert.equal(webhook.status, 202, `Carrier webhook: HTTP ${webhook.status}`);
    const fresh = JSON.parse((await http(endpoints.api, `/api/orders/${state.live[0]}`)).body);
    assert.equal(fresh.tracking[0]?.status, marker, "A new tracking update must appear on the order page at once");
    await verifyOrderFlows(endpoints, details);
    await verifyInventory(state);
}

async function verifyStuckOrders(state, endpoints, details) {
    // Recorded separately, as for read-only: is the cause gone (nothing else holds the inventory
    // lock), and does the application work again (backlog drained, fresh orders confirmed, the
    // worker still serializes allocation on the lock, stock consistent)? The reward needs both.
    const checks = details.checks = { rootCause: false, functional: false };
    const failures = [];
    try {
        for (let attempt = 0; attempt < 3; attempt++) {
            const result = await tryInventoryLock(5_000);
            assert(result >= 0, "The inventory lock is still held by another session");
            await sleep(1_000);
        }
        checks.rootCause = true;
    } catch (error) {
        failures.push(error.message);
    }
    try {
        // Every order placed before the repair must be confirmed: the backlog is customers' orders.
        const cutoff = await sqlNumber("SELECT MAX(Id) FROM Orders;");
        const started = performance.now();
        let waiting = Infinity;
        while (performance.now() - started < 150_000) {
            waiting = await sqlNumber(`SELECT COUNT(*) FROM Orders WHERE Status = 'Pending' AND Id <= ${cutoff};`);
            if (waiting === 0) break;
            await sleep(2_000);
        }
        details.backlogDrainMs = Math.round(performance.now() - started);
        assert.equal(waiting, 0, `${waiting} orders placed before the repair were never confirmed`);
        assert.equal(await queueDepth(), 0, "Order messages are still waiting in the queue");
        await verifyOrderFlows(endpoints, details);
        // Allocation must still be serialized on the inventory lock: while the verifier holds it,
        // a new order waits; once released, it is confirmed.
        const sqlId = await sqlServer();
        const holder = spawn("docker", ["exec", sqlId, "sh", "-c", sqlcmd, dbName,
            `SET NOCOUNT ON; BEGIN TRANSACTION; DECLARE @r int; EXEC @r = sp_getapplock @Resource = N'inventory', @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = 10000; WAITFOR DELAY '00:00:07'; ROLLBACK;`],
            { stdio: "ignore" });
        const released = new Promise(resolve => holder.on("exit", resolve));
        await sleep(1_500);
        const number = await placeOrder(endpoints.api, `verify-${nonce()}`);
        await sleep(3_500);
        const during = await orderStatus(number);
        await released;
        const after = await waitForStatus(number, "Confirmed", 20_000);
        details.lockRespected = { during, confirmedAfterReleaseMs: after && Math.round(after) };
        assert.equal(during, "Pending", "Orders must not be allocated while another process holds the inventory lock");
        assert.notEqual(after, null, "An order waiting for the inventory lock must be confirmed once it is released");
        await verifyInventory(state);
        checks.functional = true;
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
        // Not graded: how many error-level lines the application wrote during the trial.
        details.errorLinesSinceFault = (await errorLinesSince(state.offsets).catch(() => [null])).length;
        await verifyCommon(state, endpoints, details);
        if (state.fault === "heldout-slow-sql") await verifySlowSql(state, endpoints, details);
        else await verifyStuckOrders(state, endpoints, details);
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
    if (state.fault === "heldout-slow-sql") {
        // Index the JSON property the order page filters on; SQL Server matches the computed
        // column's expression in the existing query.
        await sql(`
            ALTER TABLE CarrierEvents ADD OrderNumber AS JSON_VALUE(Payload, '$.orderNumber');
            CREATE INDEX IX_CarrierEvents_OrderNumber ON CarrierEvents (OrderNumber, ReceivedAt DESC);`, { timeout: 900_000 });
    } else {
        // End the stalled reconciliation: its session (and the transaction holding the lock), then the job.
        const sessions = (await sql(`
            SELECT DISTINCT l.request_session_id FROM sys.dm_tran_locks l
            JOIN sys.dm_exec_sessions s ON s.session_id = l.request_session_id
            WHERE l.resource_type = 'APPLICATION' AND l.request_status = 'GRANT' AND s.program_name = 'SQLCMD'
              AND l.request_session_id <> @@SPID;`)).split("\n").filter(Boolean);
        for (const session of sessions) await sql(`KILL ${Number(session)};`);
        await run("pkill", ["-f", reconcileScript]).catch(() => {});
        await run("pkill", ["-f", "cat /var/lib/shop-ops/supplier-feed"]).catch(() => {});
        await sleep(3_000);
    }
}

const commands = { setup, verify, solve, endpoints: async () => console.log(JSON.stringify(await resolveEndpoints())) };
const command = commands[process.argv[2]];
assert(command, "Usage: node bench.mjs setup|verify|solve|endpoints");
await command();
