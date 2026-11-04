import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { readFile, readdir, readlink, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { hashes } from "./hashes.mjs";
import { endpoints, verifyHttp } from "./http.mjs";
import { command } from "./process.mjs";
import { redisPingArgs } from "./redis.mjs";
import {
    pauseDurationMs, snapshot, verifyContainers, verifyEvents, verifyFaultWindow, verifyRedisWrites,
} from "./policy.mjs";

export const stateFile = "/opt/benchmark/diagnostics-state.json";
const digest = text => createHash("sha256").update(text).digest("hex");
const nonce = () => randomBytes(10).toString("hex");
const post = value => ({
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
});

export async function request(origin, route, init, status = 200) {
    const response = await fetch(new URL(route, origin), {
        ...init, redirect: "manual", signal: AbortSignal.timeout(45_000),
    });
    assert.equal(response.status, status, `${route}: HTTP ${response.status}`);
    return response;
}

export async function containers() {
    const ids = (await command("docker", ["ps", "-aq"])).stdout.trim().split(/\s+/).filter(Boolean);
    assert(ids.length, "Private daemon must contain running dependencies");
    return JSON.parse((await command("docker", ["inspect", ...ids])).stdout);
}

export async function redis(row, args, timeout = 15_000) {
    return (await command("docker", ["exec", row.Id, "redis-cli", "--raw",
        ...redisPingArgs(row.Config), ...args], { timeout })).stdout.trim();
}

export async function sql(row, query) {
    return (await command("docker", ["exec", row.Id, "psql", "-U", "postgres", "-d", "bingo",
        "-At", "-v", "ON_ERROR_STOP=1", "-c", query], { timeout: 15_000 })).stdout.trim();
}

async function databaseRows(row) {
    return JSON.parse(await sql(row,
        'SELECT coalesce(json_agg(s ORDER BY s."Id"), \'[]\') FROM "BingoSquares" s;'));
}

export async function processes() {
    const rows = [];
    for (const pid of (await readdir("/proc")).filter(name => /^\d+$/.test(name))) {
        let args, cwd, stat, env;
        try {
            args = (await readFile(`/proc/${pid}/cmdline`, "utf8")).split("\0").filter(Boolean);
            cwd = await readlink(`/proc/${pid}/cwd`);
            if (!cwd.startsWith("/app/")) continue;
            const backend = args.some(arg => /(?:^|\/)BingoBoard\.Admin(?:\.dll)?$/.test(arg));
            const frontend = cwd.startsWith("/app/src/bingo-board")
                && args.some(arg => /(?:\/vite(?:\.js)?|\/vite\/bin\/vite\.js)$/.test(arg));
            if (!backend && !frontend) continue;
            stat = await readFile(`/proc/${pid}/stat`, "utf8");
            env = await readFile(`/proc/${pid}/environ`, "utf8");
            rows.push({
                role: backend ? "backend" : "frontend", pid,
                startedAt: stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19],
                environment: digest(env), args,
            });
        } catch (error) {
            if (["ENOENT", "ESRCH"].includes(error.code)) continue;
            throw error;
        }
    }
    for (const role of ["backend", "frontend"]) {
        assert.equal(rows.filter(row => row.role === role).length, 1, `Exactly one real ${role} process required`);
    }
    return rows.sort((a, b) => a.role.localeCompare(b.role));
}

function owned(rows, role) {
    const run = process.env.BENCH_RUN_ID;
    assert(run && /^[a-z0-9-]+$/.test(run), "Run namespace required");
    const matches = process.env.BENCH_APP_KIND === "compose"
        ? rows.filter(row => row.Config.Labels?.["com.docker.compose.project"] === run
            && row.Config.Labels?.["com.docker.compose.service"] === role)
        : rows.filter(row => row.Name === `/${run}-${role}`);
    assert.equal(matches.length, 1, `Exactly one owned ${role} required`);
    assert(matches[0].State.Running && !matches[0].State.Paused, "Healthy initial dependency required");
    return matches[0];
}

async function verifyConnectionOwnership(backend, target, database) {
    const environment = Object.fromEntries((await readFile(`/proc/${backend.pid}/environ`, "utf8"))
        .split("\0").filter(Boolean).map(entry => {
            const split = entry.indexOf("=");
            return [entry.slice(0, split), entry.slice(split + 1)];
        }));
    const cache = environment.ConnectionStrings__cache;
    const db = environment.ConnectionStrings__db;
    assert(cache && db, "Actual backend connection configuration required");
    const ports = row => Object.values(row.NetworkSettings.Ports).flat().filter(Boolean)
        .map(binding => binding.HostPort);
    assert(ports(target).some(port => new RegExp(`(?:localhost|127\\.0\\.0\\.1|\\[::1\\]):${port}(?:,|$)`).test(cache)),
        "Fault target must match the running backend cache endpoint");
    assert(ports(database).some(port => new RegExp(`Port=${port}(?:;|$)`, "i").test(db)),
        "Database must match the running backend connection");
}

async function preserved(state, rows) {
    const target = rows.find(row => row.Id === state.target);
    const database = rows.find(row => row.Id === state.database);
    const decoy = rows.find(row => row.Id === state.decoy);
    assert.equal(await redis(target, ["GET", state.cacheKey]), state.cacheValue,
        "Pre-fault Redis sentinel lost or changed");
    assert.equal(await redis(target, ["HGET", `global_square_${state.square}`, "data"]), "True",
        "Pre-fault called-square state lost");
    assert.equal(await redis(decoy, ["GET", state.decoyKey]), state.decoyValue,
        "Neighboring workload data changed");
    const current = await databaseRows(database);
    for (const original of state.databaseRows) {
        assert.deepEqual(current.find(row => row.Id === original.Id), original,
            `Pre-fault database record lost or changed: ${original.Id}`);
    }
}

async function functional(urls, state, rows) {
    const target = rows.find(row => row.Id === state.target);
    const decoy = rows.find(row => row.Id === state.decoy);
    for (const row of [target, decoy]) {
        await verifyRedisWrites(args => redis(row, args, 8_000), `fresh-${nonce()}`, nonce());
    }
    await verifyHttp(urls);
    const id = `diagnostic-${nonce()}`;
    const label = `Fresh functional probe ${nonce()}`;
    await request(urls.admin, "/api/demo/producer/squares/import",
        post([{ id, label, type: "diagnostics", isActive: true }]));
    const database = rows.find(row => row.Id === state.database);
    const stored = JSON.parse(await sql(database,
        `SELECT row_to_json(s) FROM "BingoSquares" s WHERE "Id" = '${id}';`));
    assert.equal(stored.Label, label, "Fresh HTTP import must reach owned PostgreSQL");
    for (const [value, expected] of [[true, "True"], [false, "False"]]) {
        const called = await (await request(urls.admin,
            `/api/demo/producer/squares/${id}/state/${value}`, { method: "POST" })).json();
        assert.equal(called.label, label);
        assert.equal(called.isChecked, value);
        assert.equal(await redis(target, ["HGET", `global_square_${id}`, "data"]), expected,
            "Call/clear must reach the exact owned Redis, not an in-memory substitute");
        assert.equal(await redis(decoy, ["EXISTS", `global_square_${id}`]), "0",
            "Fresh operation leaked to the neighboring workload");
        const status = await (await request(urls.admin, "/api/demo/producer/status")).json();
        assert.equal(status.calledSquares.includes(id), value, "Actual status must reflect fresh state");
        assert(status.calledSquares.includes(state.square), "Prior call must remain visible");
    }
    await request(urls.admin, "/api/demo/producer/squares/import", post([]), 400);
    await request(urls.admin, `/api/demo/producer/squares/missing-${nonce()}/state/true`,
        { method: "POST" }, 404);
}

export async function eventsSince(since) {
    const result = await command("docker", ["events", "--since", since,
        "--until", new Date().toISOString(), "--filter", "type=container", "--format", "{{json .}}"]);
    return result.stdout.trim().split("\n").filter(Boolean).map(JSON.parse);
}

export async function verify() {
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    verifyFaultWindow(state.faultExpiresAt);
    const text = await readFile("/app/benchmark-endpoints.json", "utf8");
    assert.equal(digest(text), state.endpoints, "Endpoint metadata changed");
    assert.deepEqual(await hashes("/app"), state.inputs, "Source or configuration changed");
    assert.deepEqual(await processes(), state.processes, "Application process restarted or reconfigured");
    const rows = await containers();
    verifyContainers(state.containers, rows.map(snapshot));
    verifyEvents(await eventsSince(state.eventsSince), state.target);
    await preserved(state, rows);
    await functional(endpoints(JSON.parse(text)), state, rows);
    await preserved(state, rows);
    verifyContainers(state.containers, (await containers()).map(snapshot));
    verifyEvents(await eventsSince(state.eventsSince), state.target);
    verifyFaultWindow(state.faultExpiresAt);
    console.log("Verified fresh PostgreSQL/Redis call/clear/status, prior data and exact-target in-place recovery.");
}

async function setup() {
    assert.equal(process.env.BENCH_FAULT_SEED, "47", "This static held-out topology is seed 47");
    const urlsText = await readFile("/app/benchmark-endpoints.json", "utf8");
    const urls = endpoints(JSON.parse(urlsText));
    await verifyHttp(urls);
    const initial = await containers();
    assert.equal(initial.length, 2, "Dedicated daemon must initially contain exactly two dependencies");
    const target = owned(initial, "spindle");
    const database = owned(initial, "folio");
    const processRows = await processes();
    await verifyConnectionOwnership(processRows.find(row => row.role === "backend"), target, database);
    const decoyId = (await command("docker", ["run", "-d", "--name", "amber74-spindle",
        "--label", "com.docker.compose.project=amber74",
        "--label", "com.docker.compose.service=spindle", "redis:8.6",
        "redis-server", "--maxmemory", "16mb", "--maxmemory-policy", "noeviction"])).stdout.trim();
    const decoy = (await containers()).find(row => row.Id === decoyId);
    assert(decoy, "Distinct neighboring Redis required");
    for (let attempt = 0; ; attempt++) {
        const probe = await command("docker", ["exec", decoy.Id, "redis-cli", "PING"], { accept: [0, 1] });
        if (probe.code === 0 && probe.stdout.trim() === "PONG") break;
        assert(attempt < 20, "Neighboring Redis readiness timed out");
        await sleep(250);
    }
    const square = `preserved-${nonce()}`;
    await request(urls.admin, "/api/demo/producer/squares/import",
        post([{ id: square, label: "Preserved before incident", type: "diagnostics", isActive: true }]));
    await request(urls.admin, `/api/demo/producer/squares/${square}/state/true`, { method: "POST" });
    const state = {
        seed: 47, target: target.Id, database: database.Id, decoy: decoyId, square,
        cacheKey: `preserved-${nonce()}`, cacheValue: nonce(),
        decoyKey: `neighbor-${nonce()}`, decoyValue: nonce(),
        endpoints: digest(urlsText), inputs: await hashes("/app"), processes: processRows,
        databaseRows: await databaseRows(database),
    };
    assert.equal(await redis(target, ["SET", state.cacheKey, state.cacheValue]), "OK");
    assert.equal(await redis(decoy, ["SET", state.decoyKey, state.decoyValue]), "OK");
    await preserved(state, await containers());
    state.pauseDurationMs = pauseDurationMs;
    state.faultExpiresAt = Date.now() + pauseDurationMs;
    assert.equal(await redis(target, ["CLIENT", "PAUSE", String(pauseDurationMs), "WRITE"]), "OK");
    assert.equal(await redis(target, ["PING"]), "PONG", "PING must remain green during the write incident");
    assert.equal(await redis(target, ["GET", state.cacheKey]), state.cacheValue,
        "Read path must remain available during the write incident");
    const started = Date.now();
    const failure = await request(urls.admin,
        `/api/demo/producer/squares/${square}/state/true`, { method: "POST" }, 500);
    const body = await failure.text();
    assert(body.includes("The square could not be updated"), "Real failed call required, not a fixture log");
    const frontend = await request(urls.frontend, "/");
    assert((await frontend.text()).includes('id="app"'), "Player must remain available during incident");
    await request(urls.admin, "/login");
    await request(urls.frontend, "/api/version-info");
    state.containers = (await containers()).map(snapshot);
    assert(state.containers.every(row => row.running && !row.paused),
        "Protocol fault must not pause or stop any Docker container");
    assert.deepEqual(await processes(), processRows, "Fault must not kill or restart application processes");
    await sleep(1100);
    state.eventsSince = new Date().toISOString();
    verifyFaultWindow(state.faultExpiresAt);
    await writeFile(stateFile, JSON.stringify(state, null, 2));
    await writeFile("/logs/environment/incident-evidence.json", JSON.stringify({
        seed: state.seed, target: target.Name, targetId: target.Id,
        decoy: decoy.Name, decoyId, backend: processRows.find(row => row.role === "backend"),
        actualCallStatus: failure.status, actualCallBody: body, failedCallMs: Date.now() - started,
        frontendStatus: frontend.status, frontendVersionStatus: 200, adminLoginStatus: 200,
        readiness: "Real HTTP 500 with player/login/version and Redis PING/GET still serving",
        topology: state.containers, fault: "Redis CLIENT PAUSE WRITE on connection-verified owned endpoint",
        pauseDurationMs, faultExpiresAt: state.faultExpiresAt, pingDuringIncident: "PONG",
    }, null, 2));
    console.log("Live incident confirmed: HTTP 500 calling a square; player/login/version still return 200.");
}

if (process.argv[1]?.endsWith("/diagnostics.mjs")) {
    const action = process.argv[2];
    assert(["setup", "verify"].includes(action), "Expected setup or verify");
    (action === "setup" ? setup() : verify()).catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}
