import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { instances } from "./bootstrap.mjs";
import { processesFor } from "./processes.mjs";
import {
    containers, eventsSince, matchesProxyConnection, redis, request, sql,
} from "../../bingo-diagnostics/common/diagnostics.mjs";
import { hashes } from "../../bingo-diagnostics/common/hashes.mjs";
import { endpoints, verifyHttp } from "../../bingo-diagnostics/common/http.mjs";
import { command } from "../../bingo-diagnostics/common/process.mjs";
import { verifyContainers, verifyRedisWrites } from "../../bingo-diagnostics/common/policy.mjs";
import { redisJson, runtimeSnapshot, security } from "../../bingo-transfer/common/transfer.mjs";
import {
    denyWrites, digest, restoreWrites, verifyAclRecovery, verifyCredentials, verifyInjectedAcl, verifyTransferEvents,
} from "../../bingo-transfer/common/acl.mjs";

export { containers, redis, request, sql, denyWrites, restoreWrites };
export const stateFile = "/opt/benchmark/isolation-state.json";
const nonce = () => randomBytes(12).toString("hex");
const post = value => ({
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value),
});

export function owned(rows, run, role, kind = process.env.BENCH_APP_KIND) {
    assert(instances.some(instance => instance.run === run), "Known instance namespace required");
    assert(["compose", "aspire"].includes(kind), "Known orchestration required");
    const matches = kind === "compose"
        ? rows.filter(row => row.Config.Labels?.["com.docker.compose.project"] === run
            && row.Config.Labels?.["com.docker.compose.service"] === role)
        : rows.filter(row => row.Name === `/${run}-${role}`);
    assert.equal(matches.length, 1, `Exactly one actual ${run}/${role} dependency required`);
    assert(matches[0].State.Running && !matches[0].State.Paused, "Dependency must stay running/unpaused");
    return matches[0];
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

async function connectionOwnership(instance, backend, cache, database) {
    const env = Object.fromEntries((await readFile(`/proc/${backend.pid}/environ`, "utf8"))
        .split("\0").filter(Boolean).map(entry => {
            const split = entry.indexOf("=");
            return [entry.slice(0, split), entry.slice(split + 1)];
        }));
    const cacheConnection = env.ConnectionStrings__cache;
    const dbConnection = env.ConnectionStrings__db;
    assert(cacheConnection && dbConnection, "Actual per-instance backend connections required");
    if (process.env.BENCH_APP_KIND === "aspire") {
        const { resources } = JSON.parse((await command("aspire", ["describe",
            "--apphost", `${instance.root}/apphost.cs`, "--format", "Json", "--non-interactive", "--nologo"],
        { cwd: instance.root })).stdout);
        for (const [row, connection, kind] of [[cache, cacheConnection, "cache"], [database, dbConnection, "database"]]) {
            const found = resources.filter(resource => resource.name === row.Name.slice(1));
            assert.equal(found.length, 1, "Exact container identity must map to this AppHost resource");
            assert(matchesProxyConnection(connection, kind, found[0]),
                "Each real backend must address its own dependency proxy, not the other instance");
        }
    } else {
        const ports = row => Object.values(row.NetworkSettings.Ports).flat().filter(Boolean)
            .map(binding => binding.HostPort);
        assert(ports(cache).some(port => new RegExp(`(?:localhost|127\\.0\\.0\\.1|\\[::1\\]):${port}(?:,|$)`).test(cacheConnection)),
            "Each backend cache connection must match its own published endpoint");
        assert(ports(database).some(port => new RegExp(`Port=${port}(?:;|$)`, "i").test(dbConnection)),
            "Each backend database connection must match its own published endpoint");
    }
    const config = await redisJson(cache, ["CONFIG", "GET", "tls-port"]);
    verifyCredentials((await security(cache)).acl, cacheConnection, config, cache.Config.Env ?? []);
}

async function inspectInstance(instance, rows) {
    const text = await readFile(`${instance.root}/benchmark-endpoints.json`, "utf8");
    const urls = endpoints(JSON.parse(text));
    await verifyHttp(urls);
    const cache = owned(rows, instance.run, "spindle");
    const database = owned(rows, instance.run, "folio");
    const processRows = await processesFor(instance.root);
    await connectionOwnership(instance, processRows.find(row => row.role === "backend"), cache, database);
    return { ...instance, cache: cache.Id, database: database.Id, urls,
        endpoints: digest(text), processes: processRows, inputs: await hashes(instance.root) };
}

async function preservation(instance, rows) {
    assert.equal(digest(await readFile(`${instance.root}/benchmark-endpoints.json`, "utf8")),
        instance.endpoints, `${instance.root}: endpoint metadata changed`);
    assert.deepEqual(await hashes(instance.root), instance.inputs, `${instance.root}: source/configuration changed`);
    assert.deepEqual(await processesFor(instance.root), instance.processes,
        `${instance.root}: application process restarted or reconfigured`);
    const cache = rows.find(row => row.Id === instance.cache);
    const currentSecurity = await security(cache);
    verifyAclRecovery(instance.security.acl, currentSecurity.acl);
    assert.equal(currentSecurity.config, instance.security.config, `${instance.root}: original security config changed`);
    assert.equal(await redis(cache, ["GET", instance.cacheKey]), instance.cacheValue, `${instance.root}: original cache data changed`);
    assert.equal(await redis(cache, ["HGET", `global_square_${instance.square}`, "data"]), "True",
        `${instance.root}: original called-square state changed`);
    const current = await databaseState(rows.find(row => row.Id === instance.database));
    for (const original of instance.data.squares) {
        assert.deepEqual(current.squares.find(row => row.Id === original.Id), original,
            `${instance.root}: existing SQL square changed`);
    }
    for (const field of ["users", "history", "identity"]) {
        assert.deepEqual(current[field], instance.data[field], `${instance.root}: existing database ${field} changed`);
    }
}

async function functional(instance, other, rows) {
    const cache = rows.find(row => row.Id === instance.cache);
    const otherCache = rows.find(row => row.Id === other.cache);
    const database = rows.find(row => row.Id === instance.database);
    const otherDatabase = rows.find(row => row.Id === other.database);
    await verifyRedisWrites(args => redis(cache, args), `isolation-${nonce()}`, nonce());
    await verifyHttp(instance.urls);
    const id = `isolation-${nonce()}`;
    const label = `${instance.run} fresh SQL/Redis effect ${nonce()}`;
    await request(instance.urls.admin, "/api/demo/producer/squares/import",
        post([{ id, label, type: "isolation", isActive: true }]));
    const stored = JSON.parse(await sql(database,
        `SELECT row_to_json(s) FROM "BingoSquares" s WHERE "Id"='${id}';`));
    assert.equal(stored.Label, label, "Fresh HTTP import must reach this instance's actual PostgreSQL");
    assert.equal(await sql(otherDatabase, `SELECT count(*) FROM "BingoSquares" WHERE "Id"='${id}';`), "0",
        "Fresh HTTP import leaked into the other real application's PostgreSQL");
    for (const [value, expected] of [[true, "True"], [false, "False"]]) {
        const called = await (await request(instance.urls.admin,
            `/api/demo/producer/squares/${id}/state/${value}`, { method: "POST" })).json();
        assert.equal(called.label, label);
        assert.equal(called.isChecked, value);
        assert.equal(await redis(cache, ["HGET", `global_square_${id}`, "data"]), expected,
            "Fresh call/clear must persist in this instance's exact Redis");
        assert.equal(await redis(otherCache, ["EXISTS", `global_square_${id}`]), "0",
            "Fresh call/clear leaked into the other real application's Redis");
        const status = await (await request(instance.urls.admin, "/api/demo/producer/status")).json();
        const otherStatus = await (await request(other.urls.admin, "/api/demo/producer/status")).json();
        assert.equal(status.calledSquares.includes(id), value);
        assert(!otherStatus.calledSquares.includes(id), "Other application's status received this call");
        assert(status.calledSquares.includes(instance.square), "Original instance call must remain visible");
    }
    await request(instance.urls.admin, "/api/demo/producer/squares/import", post([]), 400);
    await request(instance.urls.admin, `/api/demo/producer/squares/missing-${nonce()}/state/true`, { method: "POST" }, 404);
}

export async function verify() {
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    assert.equal(state.scenario, "s01-two-real-apps-v1", "Two-app fixture provenance required");
    assert.equal(state.instances.length, 2, "Two actual applications required, not a Redis-only decoy");
    const rows = await containers();
    verifyContainers(state.containers, rows.map(runtimeSnapshot));
    verifyTransferEvents(await eventsSince(state.eventsSince), state.instances[0].cache);
    for (const instance of state.instances) await preservation(instance, rows);
    await functional(state.instances[0], state.instances[1], rows);
    await functional(state.instances[1], state.instances[0], rows);
    for (const instance of state.instances) await preservation(instance, rows);
    verifyContainers(state.containers, (await containers()).map(runtimeSnapshot));
    verifyTransferEvents(await eventsSince(state.eventsSince), state.instances[0].cache);
    console.log("Verified S01: two live Bingo admin/player + SQL/Redis workflows, exact-target repair and both app identities/data/security preserved.");
}

async function setup() {
    const rows = await containers();
    assert.equal(rows.length, 4, "Two complete Bingo apps require four real dependency containers");
    const state = { scenario: "s01-two-real-apps-v1", instances: [] };
    for (const config of instances) {
        const instance = await inspectInstance(config, rows);
        const cache = rows.find(row => row.Id === instance.cache);
        instance.square = `keep-${nonce()}`;
        instance.cacheKey = `keep-${nonce()}`;
        instance.cacheValue = nonce();
        await request(instance.urls.admin, "/api/demo/producer/squares/import",
            post([{ id: instance.square, label: `${instance.run} original square`, type: "isolation", isActive: true }]));
        await request(instance.urls.admin, `/api/demo/producer/squares/${instance.square}/state/true`, { method: "POST" });
        assert.equal(await redis(cache, ["SET", instance.cacheKey, instance.cacheValue]), "OK");
        instance.security = await security(cache);
        instance.data = await databaseState(rows.find(row => row.Id === instance.database));
        state.instances.push(instance);
    }
    const pids = state.instances.flatMap(instance => instance.processes.map(row => row.pid));
    assert.equal(new Set(pids).size, 4, "Four distinct real application processes required");
    assert.equal(new Set(state.instances.flatMap(instance => Object.values(instance.urls))).size, 4,
        "Four distinct real HTTP origins required");
    for (const instance of state.instances) await preservation(instance, rows);
    const target = rows.find(row => row.Id === state.instances[0].cache);
    assert.equal(await redis(target, denyWrites), "OK");
    verifyInjectedAcl(state.instances[0].security.acl, (await security(target)).acl);
    assert.equal(await redis(target, ["PING"]), "PONG");
    assert.equal(await redis(target, ["GET", state.instances[0].cacheKey]), state.instances[0].cacheValue);
    const failed = await request(state.instances[0].urls.admin,
        `/api/demo/producer/squares/${state.instances[0].square}/state/true`, { method: "POST" }, 500);
    assert((await failed.text()).includes("The square could not be updated"), "Actual target HTTP write failure required");
    await functional(state.instances[1], state.instances[0], rows);
    state.containers = (await containers()).map(runtimeSnapshot);
    await sleep(1100);
    state.eventsSince = new Date().toISOString();
    await writeFile(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
    await writeFile("/logs/environment/incident-evidence.json", JSON.stringify({
        scenario: state.scenario, targetCallStatus: 500, neighborFreshFunctionalRoundtrip: true,
        actualApplications: state.instances.map(instance => ({
            root: instance.root, namespace: instance.run, urls: instance.urls,
            cache: instance.cache, database: instance.database, processes: instance.processes,
            originalSecurityDigest: digest(JSON.stringify(instance.security)),
        })),
        dependencyContainers: state.containers,
    }, null, 2));
    console.log("S01 incident proven: target app HTTP500; second real app's fresh SQL/Redis/HTTP call/clear works.");
}

if (process.argv[1]?.endsWith("/isolation.mjs")) {
    const action = process.argv[2];
    assert(["setup", "verify"].includes(action), "Expected setup or verify");
    (action === "setup" ? setup() : verify()).catch(error => { console.error(error); process.exitCode = 1; });
}
