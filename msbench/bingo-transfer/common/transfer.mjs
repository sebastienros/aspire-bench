import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import {
    containers, eventsSince, matchesProxyConnection, processes, redis, redisExecArgs, request, sql,
} from "../../bingo-diagnostics/common/diagnostics.mjs";
import { hashes } from "../../bingo-diagnostics/common/hashes.mjs";
import { endpoints, verifyHttp } from "../../bingo-diagnostics/common/http.mjs";
import { command } from "../../bingo-diagnostics/common/process.mjs";
import { snapshot, verifyContainers, verifyRedisWrites } from "../../bingo-diagnostics/common/policy.mjs";
import {
    denyWrites, digest, normalizeAcl, restoreWrites, verifyAclRecovery,
    verifyCredentials, verifyInjectedAcl, verifyTransferEvents,
} from "./acl.mjs";

export { containers, redis, sql, request, denyWrites, restoreWrites };
export const stateFile = "/opt/benchmark/transfer-state.json";
const nonce = () => randomBytes(12).toString("hex");
const post = value => ({
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value),
});

export function redisJsonExecArgs(row, args) {
    return redisExecArgs(row, ["-3", ...args]).map(arg => arg === "--raw" ? "--json"
        : arg.replace('redis-cli --raw "$@"', 'redis-cli --json "$@"'));
}

export async function redisJson(row, args) {
    return JSON.parse((await command("docker", redisJsonExecArgs(row, args), { timeout: 15_000 })).stdout);
}

async function acl(row) {
    return normalizeAcl(await redisJson(row, ["ACL", "LIST"]));
}

async function serverConfiguration(row) {
    const config = await redisJson(row, ["CONFIG", "GET", "requirepass", "port", "tls-port",
        "tls-auth-clients", "aclfile", "appendonly", "save"]);
    assert(config && typeof config === "object" && !Array.isArray(config), "Redis CONFIG GET object required");
    return config;
}

export async function security(row) {
    return { acl: await acl(row), config: digest(JSON.stringify(await serverConfiguration(row))) };
}

async function databaseState(row) {
    return JSON.parse(await sql(row, `SELECT json_build_object(
        'squares', (SELECT coalesce(json_agg(s ORDER BY s."Id"), '[]') FROM "BingoSquares" s),
        'users', (SELECT coalesce(json_agg(u ORDER BY u."Id"), '[]') FROM "AspNetUsers" u),
        'history', (SELECT json_agg(m ORDER BY m."MigrationId") FROM "__EFMigrationsHistory" m),
        'identity', json_build_object(
            'database', (SELECT oid FROM pg_database WHERE datname=current_database()),
            'squares', '"BingoSquares"'::regclass::oid,
            'users', '"AspNetUsers"'::regclass::oid,
            'history', '"__EFMigrationsHistory"'::regclass::oid))`));
}

export function runtimeSnapshot(row) {
    return { ...snapshot(row), configuration: digest(JSON.stringify(row.Config)) };
}

function owned(rows, role) {
    const run = process.env.BENCH_RUN_ID;
    assert.equal(run, "cedar83", "X01 requires the new static held-out namespace");
    const matches = process.env.BENCH_APP_KIND === "compose"
        ? rows.filter(row => row.Config.Labels?.["com.docker.compose.project"] === run
            && row.Config.Labels?.["com.docker.compose.service"] === role)
        : rows.filter(row => row.Name === `/${run}-${role}`);
    assert.equal(matches.length, 1, `Exactly one owned ${role} required`);
    assert(matches[0].State.Running && !matches[0].State.Paused, "Healthy dependency required before ACL injection");
    return matches[0];
}

async function backendConnection(backend, target, database) {
    const environment = Object.fromEntries((await readFile(`/proc/${backend.pid}/environ`, "utf8"))
        .split("\0").filter(Boolean).map(entry => {
            const split = entry.indexOf("=");
            return [entry.slice(0, split), entry.slice(split + 1)];
        }));
    const cache = environment.ConnectionStrings__cache;
    const db = environment.ConnectionStrings__db;
    assert(cache && db, "Actual running backend connections required");
    if (process.env.BENCH_APP_KIND === "aspire") {
        const { resources } = JSON.parse((await command("aspire", ["describe",
            "--apphost", "/app/apphost.cs", "--format", "Json", "--non-interactive", "--nologo"])).stdout);
        for (const [row, connection, kind] of [[target, cache, "cache"], [database, db, "database"]]) {
            const found = resources.filter(resource => resource.name === row.Name.slice(1));
            assert.equal(found.length, 1, "Exact Docker identity must identify one actual Aspire resource");
            assert(matchesProxyConnection(connection, kind, found[0]), "Actual backend proxy must address the owned dependency");
        }
    } else {
        const ports = row => Object.values(row.NetworkSettings.Ports).flat().filter(Boolean)
            .map(binding => binding.HostPort);
        assert(ports(target).some(port => new RegExp(`(?:localhost|127\\.0\\.0\\.1|\\[::1\\]):${port}(?:,|$)`).test(cache)),
            "Actual backend cache endpoint must address the owned dependency");
        assert(ports(database).some(port => new RegExp(`Port=${port}(?:;|$)`, "i").test(db)),
            "Actual backend database endpoint must address the owned dependency");
    }
    return cache;
}

async function preserved(state, rows) {
    const target = rows.find(row => row.Id === state.target);
    const database = rows.find(row => row.Id === state.database);
    const neighbor = rows.find(row => row.Id === state.neighbor);
    assert.equal(await redis(target, ["GET", state.cacheKey]), state.cacheValue, "Pre-fault Redis sentinel changed");
    assert.equal(await redis(target, ["HGET", `global_square_${state.square}`, "data"]), "True", "Prior call state changed");
    assert.equal(await redis(neighbor, ["GET", state.neighborKey]), state.neighborValue, "Neighbor data changed");
    const current = await databaseState(database);
    for (const original of state.databaseState.squares) {
        assert.deepEqual(current.squares.find(row => row.Id === original.Id), original, "Existing database square changed");
    }
    for (const key of ["users", "history", "identity"]) {
        assert.deepEqual(current[key], state.databaseState[key], `Existing database ${key} changed`);
    }
}

async function securityPreserved(state, rows) {
    for (const [id, original] of [[state.target, state.targetSecurity], [state.neighbor, state.neighborSecurity]]) {
        const current = await security(rows.find(row => row.Id === id));
        verifyAclRecovery(original.acl, current.acl);
        assert.equal(current.config, original.config, "Original Redis authentication/TLS/persistence configuration changed");
    }
}

async function functional(urls, state, rows) {
    const target = rows.find(row => row.Id === state.target);
    const neighbor = rows.find(row => row.Id === state.neighbor);
    for (const row of [target, neighbor]) {
        await verifyRedisWrites(args => redis(row, args), `transfer-${nonce()}`, nonce());
    }
    await verifyHttp(urls);
    const id = `transfer-${nonce()}`;
    const label = `Live held-out probe ${nonce()}`;
    await request(urls.admin, "/api/demo/producer/squares/import",
        post([{ id, label, type: "transfer", isActive: true }]));
    const stored = JSON.parse(await sql(rows.find(row => row.Id === state.database),
        `SELECT row_to_json(s) FROM "BingoSquares" s WHERE "Id"='${id}';`));
    assert.equal(stored.Label, label, "Fresh import must reach the actual owned PostgreSQL database");
    for (const [value, expected] of [[true, "True"], [false, "False"]]) {
        const called = await (await request(urls.admin, `/api/demo/producer/squares/${id}/state/${value}`,
            { method: "POST" })).json();
        assert.equal(called.label, label);
        assert.equal(called.isChecked, value);
        assert.equal(await redis(target, ["HGET", `global_square_${id}`, "data"]), expected, "Fresh call/clear must persist in exact Redis");
        assert.equal(await redis(neighbor, ["EXISTS", `global_square_${id}`]), "0", "Fresh writes reached the wrong neighbor");
        const status = await (await request(urls.admin, "/api/demo/producer/status")).json();
        assert.equal(status.calledSquares.includes(id), value);
        assert(status.calledSquares.includes(state.square), "Preexisting call must stay visible");
    }
    await request(urls.admin, "/api/demo/producer/squares/import", post([]), 400);
    await request(urls.admin, `/api/demo/producer/squares/missing-${nonce()}/state/true`, { method: "POST" }, 404);
}

export async function verify() {
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    assert.equal(state.fault, "redis-acl-write-denial-v1", "Protected X01 fault provenance required");
    const text = await readFile("/app/benchmark-endpoints.json", "utf8");
    assert.equal(digest(text), state.endpoints, "Endpoint metadata changed");
    assert.deepEqual(await hashes("/app"), state.inputs, "Source or configuration changed");
    assert.deepEqual(await processes(), state.processes, "Application processes restarted or reconfigured");
    const rows = await containers();
    verifyContainers(state.containers, rows.map(runtimeSnapshot));
    verifyTransferEvents(await eventsSince(state.eventsSince), state.target);
    await preserved(state, rows);
    await securityPreserved(state, rows);
    await functional(endpoints(JSON.parse(text)), state, rows);
    await preserved(state, rows);
    await securityPreserved(state, rows);
    verifyContainers(state.containers, (await containers()).map(runtimeSnapshot));
    verifyTransferEvents(await eventsSince(state.eventsSince), state.target);
    console.log("Verified X01: actual HTTP/SQL/Redis effects, exact original ACL/credentials/TLS/data and in-place target recovery.");
}

export async function setup() {
    assert.equal(process.env.BENCH_FAULT_SEED, "83", "Static X01 held-out name instance required");
    const text = await readFile("/app/benchmark-endpoints.json", "utf8");
    const urls = endpoints(JSON.parse(text));
    await verifyHttp(urls);
    const initial = await containers();
    assert.equal(initial.length, 2, "Private daemon must initially contain exactly the two Bingo dependencies");
    const target = owned(initial, "quill");
    const database = owned(initial, "ledger");
    const processRows = await processes();
    const connection = await backendConnection(processRows.find(row => row.role === "backend"), target, database);
    const targetSecurity = await security(target);
    verifyCredentials(targetSecurity.acl, connection, await serverConfiguration(target), target.Config.Env ?? []);
    const neighborId = (await command("docker", ["run", "-d", "--name", "cedar38-quill",
        "--label", "com.docker.compose.project=cedar38", "--label", "com.docker.compose.service=quill",
        "redis:8.6", "redis-server", "--maxmemory", "16mb", "--maxmemory-policy", "noeviction"])).stdout.trim();
    const neighbor = (await containers()).find(row => row.Id === neighborId);
    assert(neighbor, "Real different-namespace neighbor required");
    for (let attempt = 0; ; attempt++) {
        const probe = await command("docker", ["exec", neighborId, "redis-cli", "PING"], { accept: [0, 1] });
        if (probe.code === 0 && probe.stdout.trim() === "PONG") break;
        assert(attempt < 20, "Neighbor readiness timed out");
        await sleep(250);
    }
    const square = `keep-${nonce()}`;
    await request(urls.admin, "/api/demo/producer/squares/import",
        post([{ id: square, label: "Preserved before transfer incident", type: "transfer", isActive: true }]));
    await request(urls.admin, `/api/demo/producer/squares/${square}/state/true`, { method: "POST" });
    const state = {
        fault: "redis-acl-write-denial-v1", seed: 83, target: target.Id, database: database.Id,
        neighbor: neighborId, square, cacheKey: `keep-${nonce()}`, cacheValue: nonce(),
        neighborKey: `neighbor-${nonce()}`, neighborValue: nonce(),
        targetSecurity, neighborSecurity: await security(neighbor),
        endpoints: digest(text), inputs: await hashes("/app"), processes: processRows,
        databaseState: await databaseState(database),
    };
    assert.equal(await redis(target, ["SET", state.cacheKey, state.cacheValue]), "OK");
    assert.equal(await redis(neighbor, ["SET", state.neighborKey, state.neighborValue]), "OK");
    await preserved(state, await containers());
    assert.equal(await redis(target, denyWrites), "OK");
    verifyInjectedAcl(targetSecurity.acl, await acl(target));
    assert.equal(await redis(target, ["PING"]), "PONG", "PING must remain healthy under ACL write denial");
    assert.equal(await redis(target, ["GET", state.cacheKey]), state.cacheValue, "Reads must remain healthy");
    const denied = await redis(target, ["SET", `denied-${nonce()}`, nonce()]);
    assert.match(denied, /NOPERM/, "Real Redis write permission denial required");
    const failure = await request(urls.admin, `/api/demo/producer/squares/${square}/state/true`, { method: "POST" }, 500);
    assert((await failure.text()).includes("The square could not be updated"), "Real app write failure required");
    await request(urls.frontend, "/");
    await request(urls.admin, "/login");
    await request(urls.frontend, "/api/version-info");
    const status = await (await request(urls.admin, "/api/demo/producer/status")).json();
    assert(status.calledSquares.includes(square), "Application read/status must remain functional during write failure");
    state.containers = (await containers()).map(runtimeSnapshot);
    assert(state.containers.every(row => row.running && !row.paused), "ACL fault must not stop/freeze containers");
    assert.deepEqual(await processes(), processRows, "Fault must not restart application processes");
    await sleep(1100);
    state.eventsSince = new Date().toISOString();
    await writeFile(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
    await writeFile("/logs/environment/incident-evidence.json", JSON.stringify({
        fault: state.fault, seed: state.seed, namespace: "cedar83", target: target.Name,
        targetId: target.Id, neighbor: neighbor.Name, neighborId, actualCallStatus: failure.status,
        redisWriteError: denied, ping: "PONG", sentinelReadPreserved: true, statusReadPreserved: true,
        playerLoginVersionHttp: 200, targetAclBeforeDigest: digest(JSON.stringify(targetSecurity.acl)),
        targetAclFaultDigest: digest(JSON.stringify(await acl(target))),
        originalSecurityConfigDigest: targetSecurity.config,
        originalCredentialsVerified: true, backendTls: Number((await serverConfiguration(target))["tls-port"]) > 0,
        containers: state.containers,
    }, null, 2));
    console.log("X01 incident reproduced: actual Redis NOPERM and app HTTP500, with PING/read/status/pages serving.");
}

if (process.argv[1]?.endsWith("/transfer.mjs")) {
    const action = process.argv[2];
    assert(["setup", "verify"].includes(action), "Expected setup or verify");
    (action === "setup" ? setup() : verify()).catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}
