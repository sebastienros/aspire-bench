import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { hashes } from "./hashes.js";
import { endpoints, verifyHttp } from "./http.js";
import { command } from "./process.js";

const stateFile = "/opt/benchmark/evolution-state.json";
const root = "/api/demo/producer";
const nonce = () => randomBytes(12).toString("hex");
const digest = value => createHash("sha256").update(value).digest("hex");
const literal = value => `'${value.replaceAll("'", "''")}'`;
export const json = (value, method = "POST") => ({
    method, headers: { "content-type": "application/json" }, body: JSON.stringify(value),
});

export async function request(origin, route, init, status = 200) {
    const response = await fetch(new URL(route, origin), {
        ...init, redirect: "manual", signal: AbortSignal.timeout(10_000),
    });
    assert.equal(response.status, status, `${route}: HTTP ${response.status}`);
    return response;
}

export function ownedContainers(rows, kind = process.env.BENCH_APP_KIND, run = process.env.BENCH_RUN_ID) {
    assert(["compose", "aspire"].includes(kind), "Known application orchestration required");
    assert(run && /^[a-z0-9-]+$/.test(run), "Run namespace required");
    return ["postgres", "redis"].map(role => {
        const matches = kind === "compose"
            ? rows.filter(row => row.Config.Labels?.["com.docker.compose.project"] === run
                && row.Config.Labels?.["com.docker.compose.service"] === role)
            : rows.filter(row => row.Name === `/${run}-${role}`);
        assert.equal(matches.length, 1, `Exactly one owned ${role} required`);
        assert(matches[0].State.Running && !matches[0].State.Paused, "Running unpaused dependency required");
        return { role, row: matches[0] };
    });
}

async function containerRows() {
    const run = process.env.BENCH_RUN_ID;
    assert(run, "BENCH_RUN_ID required");
    const filters = process.env.BENCH_APP_KIND === "compose"
        ? ["--filter", `label=com.docker.compose.project=${run}`]
        : ["--filter", `name=^/${run}-(postgres|redis)$`];
    const ids = (await command("docker", ["ps", "-q", ...filters], { timeout: 15_000 })).stdout.trim().split(/\s+/).filter(Boolean);
    assert.equal(ids.length, 2, "Exactly two owned dependency containers required");
    return ownedContainers(JSON.parse((await command("docker", ["inspect", ...ids], { timeout: 15_000 })).stdout));
}

export async function dependencies() {
    return (await containerRows()).map(({ role, row }) => ({
        role, id: row.Id, image: row.Config.Image, startedAt: row.State.StartedAt,
        restarts: row.RestartCount,
    })).sort((a, b) => a.id.localeCompare(b.id));
}

export function sqlExecArgs(row, statement, kind = process.env.BENCH_APP_KIND) {
    assert(["compose", "aspire"].includes(kind), "Known application orchestration required");
    return ["exec", row.Id, "sh", "-c", 'PGPASSWORD="$POSTGRES_PASSWORD" psql "$@"',
        "psql", "-U", "postgres", "-d", kind === "aspire" ? "db" : "bingo",
        "-At", "-v", "ON_ERROR_STOP=1", "-c", statement];
}

export async function sql(statement) {
    const { row } = (await containerRows()).find(item => item.role === "postgres");
    return (await command("docker", sqlExecArgs(row, statement), { timeout: 15_000 })).stdout.trim();
}

export function redisExecArgs(row, args) {
    const authenticated = row.Config.Env?.some(entry =>
        entry.startsWith("REDIS_PASSWORD=") && entry.length > "REDIS_PASSWORD=".length);
    const client = authenticated
        ? ["sh", "-c", 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli --raw "$@"', "redis-cli"]
        : ["redis-cli", "--raw"];
    const launch = [...row.Config.Entrypoint ?? [], ...row.Config.Cmd ?? []].join(" ");
    const tls = /(?:^|\s)--tls-port(?:\s|=)/.test(launch)
        ? ["--tls", "--cacert", "/usr/lib/ssl/aspire/cert.pem"] : [];
    return ["exec", row.Id, ...client, ...tls, ...args];
}

export async function redis(...args) {
    const { row } = (await containerRows()).find(item => item.role === "redis");
    return (await command("docker", redisExecArgs(row, args), { timeout: 15_000 })).stdout.trim();
}

async function rows() {
    return JSON.parse(await sql(`SELECT COALESCE(json_agg(s ORDER BY "Id"), '[]') FROM
        (SELECT "Id", "Label", "Type", "IsActive", "DisplayOrder", "CreatedAt", "UpdatedAt"
         FROM "BingoSquares") s`));
}

async function users() {
    return JSON.parse(await sql(`SELECT json_agg(u ORDER BY "Id") FROM "AspNetUsers" u`));
}

async function history() {
    return JSON.parse(await sql(`SELECT json_agg(m ORDER BY "MigrationId") FROM "__EFMigrationsHistory" m`));
}

async function identity() {
    return JSON.parse(await sql(`SELECT json_build_object(
        'database', (SELECT oid FROM pg_database WHERE datname=current_database()),
        'squares', '"BingoSquares"'::regclass::oid,
        'users', '"AspNetUsers"'::regclass::oid,
        'history', '"__EFMigrationsHistory"'::regclass::oid)`));
}

export function protectedPath(file) {
    return file === "README.md" || file.startsWith("scripts/")
        || file.startsWith(".github/") || file.startsWith(".agents/")
        || file === "global.json" || file === "Directory.Packages.props"
        || /Migrations\/20260206183116_InitialCreate/.test(file);
}

export async function protectedHashes() {
    return Object.fromEntries(Object.entries(await hashes("/app")).filter(([file]) => protectedPath(file)));
}

async function verifyPreservation(state, urlsText, urls) {
    assert.equal(digest(urlsText), state.endpoints, "Endpoint file changed");
    assert.deepEqual(await protectedHashes(), state.inputs, "Protected guidance or original migration changed");
    assert.deepEqual(await dependencies(), state.dependencies, "Dependencies restarted or replaced");
    assert.deepEqual(await identity(), state.identity, "Database or original tables were rebuilt");
    assert.deepEqual(await users(), state.users, "Existing user identities or contents changed");
    const currentRows = new Map((await rows()).map(row => [row.Id, row]));
    for (const before of state.rows) {
        assert.deepEqual(currentRows.get(before.Id), before, `Existing square changed or lost: ${before.Id}`);
    }
    const currentHistory = await history();
    for (const before of state.history) {
        assert(currentHistory.some(row => JSON.stringify(row) === JSON.stringify(before)),
            "Original migration history changed");
    }
    assert.equal(await redis("GET", state.cacheKey), state.cacheValue, "Unrelated Redis state lost");
    const status = await (await request(urls.admin, `${root}/status`)).json();
    assert(status.calledSquares.includes(state.sentinel), "Preexisting called-state lost");
}

async function catalog(origin, type) {
    return (await request(origin, `${root}/catalog${type === undefined ? "" : `?type=${encodeURIComponent(type)}`}`)).json();
}

export function checkCatalog(actual, expected) {
    assert(Array.isArray(actual), "Catalog must be an array");
    assert.deepEqual(actual, expected, "Catalog must reflect live PostgreSQL/Redis, filtering and ordering");
}

export async function verifyFeature(urls) {
    const prefix = `feature-${nonce()}`;
    const kind = `kind-${nonce()}`;
    const items = [
        { id: `${prefix}-z`, label: `Label '${nonce()}`, type: kind, isActive: true },
        { id: `${prefix}-a`, label: `Label ${nonce()}`, type: kind, isActive: true },
        { id: `${prefix}-hidden`, label: `Hidden ${nonce()}`, type: kind, isActive: false },
        { id: `${prefix}-other`, label: `Other ${nonce()}`, type: `other-${nonce()}`, isActive: true },
        { id: `${prefix}-null`, label: `Null ${nonce()}`, type: null, isActive: true },
    ];
    await request(urls.admin, `${root}/squares/import`, json(items));
    const expected = () => items.filter(item => item.isActive && item.type === kind)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(({ id, label, type }) => ({ id, label, type, isChecked: id === items[0].id }));
    await request(urls.admin, `${root}/squares/${items[0].id}/state/true`, { method: "POST" });
    assert.equal(await redis("HGET", `global_square_${items[0].id}`, "data"), "True",
        "Call must persist in actual Redis");
    assert.equal(await sql(`SELECT "Label" FROM "BingoSquares" WHERE "Id"=${literal(items[0].id)}`),
        items[0].label, "Import must persist in actual PostgreSQL");
    for (const origin of [urls.frontend, urls.admin]) {
        checkCatalog(await catalog(origin, kind), expected());
        checkCatalog(await catalog(origin, `missing-${nonce()}`), []);
    }
    const unfiltered = (await rows()).filter(row => row.IsActive).sort((a, b) => a.Id.localeCompare(b.Id));
    const called = (await (await request(urls.admin, `${root}/status`)).json()).calledSquares;
    checkCatalog(await catalog(urls.frontend), unfiltered.map(row => ({
        id: row.Id, label: row.Label, type: row.Type, isChecked: called.includes(row.Id),
    })));
    items[0].label = `Changed ${nonce()}`;
    await request(urls.admin, `${root}/squares/import`, json([items[0]]));
    await request(urls.admin, `${root}/squares/${items[0].id}/state/false`, { method: "POST" });
    const after = expected().map(item => ({ ...item, isChecked: false }));
    for (const origin of [urls.frontend, urls.admin]) checkCatalog(await catalog(origin, kind), after);
    assert.equal(await redis("HGET", `global_square_${items[0].id}`, "data"), "False");
    await request(urls.frontend, `${root}/squares/import`, json([]), 400);
    await request(urls.frontend, `${root}/squares/missing-${nonce()}/state/true`, { method: "POST" }, 404);
    console.log("Catalog proof:", JSON.stringify({
        freshIds: items.map(item => item.id), filter: kind, filteredActiveCount: after.length,
        refreshedLabel: items[0].label, unfilteredActiveCount: unfiltered.length,
        directRedisAfterClear: await redis("HGET", `global_square_${items[0].id}`, "data"),
        unknownFilter: [], emptyImportStatus: 400, unknownCallStatus: 404,
    }));
}

const descriptionRoute = id => `${root}/squares/${id}/description`;

export function checkDescription(actual, id, description) {
    assert.deepEqual(actual, { id, description }, "Description response must reflect the persisted value");
}

export async function verifyMigration(urls, state) {
    const columns = JSON.parse(await sql(`SELECT json_agg(c) FROM
        (SELECT data_type, character_maximum_length, is_nullable, column_default
         FROM information_schema.columns WHERE table_name='BingoSquares' AND column_name='Description') c`));
    assert.equal(columns?.length, 1, "Real Description column required");
    assert.equal(columns[0].data_type, "character varying");
    assert.equal(columns[0].character_maximum_length, 280);
    assert.equal(columns[0].is_nullable, "NO");
    assert.match(columns[0].column_default, /''/, "Legacy/new SQL inserts need an empty default");
    assert((await history()).length > state.history.length, "A new applied EF migration required");
    const legacyDescriptions = new Map(JSON.parse(await sql(
        'SELECT json_agg(s) FROM (SELECT "Id", "Description" FROM "BingoSquares") s'))
        .map(row => [row.Id, row.Description]));
    for (const row of state.rows) {
        assert.equal(legacyDescriptions.get(row.Id), "", `Legacy description must backfill to empty: ${row.Id}`);
    }
    for (const id of [state.sentinel, state.inactive]) {
        assert.equal(await sql(`SELECT "Description" FROM "BingoSquares" WHERE "Id"=${literal(id)}`), "",
            "Legacy records must backfill to empty");
        checkDescription(await (await request(urls.frontend, descriptionRoute(id))).json(), id, "");
    }
    const id = `description-${nonce()}`;
    await request(urls.admin, `${root}/squares/import`, json([
        { id, label: `New ${nonce()}`, type: "migration", isActive: true },
    ]));
    checkDescription(await (await request(urls.frontend, descriptionRoute(id))).json(), id, "");
    const sqlId = `sql-${nonce()}`;
    await sql(`INSERT INTO "BingoSquares" ("Id","Label","IsActive","DisplayOrder")
        VALUES (${literal(sqlId)},'SQL default probe',true,7000)`);
    checkDescription(await (await request(urls.frontend, descriptionRoute(sqlId))).json(), sqlId, "");
    const values = [`Notes '${nonce()}\nsecond line`, ` \t${nonce()}\n `, "x".repeat(280), ""];
    for (const description of values) {
        checkDescription(await (await request(urls.frontend, descriptionRoute(id),
            json({ description }, "PUT"))).json(), id, description);
        assert.equal(await sql(`SELECT row_to_json(s) FROM
            (SELECT "Description" AS description FROM "BingoSquares" WHERE "Id"=${literal(id)}) s`),
        JSON.stringify({ description }), "PUT must reach actual PostgreSQL");
        for (const origin of [urls.admin, urls.frontend]) {
            checkDescription(await (await request(origin, descriptionRoute(id))).json(), id, description);
        }
    }
    const persisted = `Durable ${nonce()}`;
    await request(urls.frontend, descriptionRoute(id), json({ description: persisted }, "PUT"));
    for (const invalid of [{ description: null }, {}, { description: "x".repeat(281) }]) {
        await request(urls.frontend, descriptionRoute(id), json(invalid, "PUT"), 400);
        checkDescription(await (await request(urls.admin, descriptionRoute(id))).json(), id, persisted);
    }
    await request(urls.frontend, descriptionRoute(`missing-${nonce()}`), undefined, 404);
    await request(urls.frontend, descriptionRoute(`missing-${nonce()}`), json({ description: "ok" }, "PUT"), 404);
    // A SQL-origin update after HTTP writes rejects process-local or stale response caches.
    const external = `SQL ${nonce()}`;
    await sql(`UPDATE "BingoSquares" SET "Description"=${literal(external)} WHERE "Id"=${literal(id)}`);
    checkDescription(await (await request(urls.frontend, descriptionRoute(id))).json(), id, external);
    // Finally exercise a legacy inactive row without changing its original columns.
    await request(urls.frontend, descriptionRoute(state.inactive), json({ description: persisted }, "PUT"));
    assert.equal(await sql(`SELECT "Description" FROM "BingoSquares" WHERE "Id"=${literal(state.inactive)}`), persisted);
    await request(urls.frontend, descriptionRoute(state.inactive), json({ description: "" }, "PUT"));
    console.log("Migration proof:", JSON.stringify({
        column: columns[0], backfilledOriginalSquares: state.rows.length,
        freshId: id, sqlDefaultId: sqlId, exactTextLengths: values.map(value => value.length),
        invalidInputsRejected: 3, unknownGetAndPutStatus: 404, sqlOriginRead: external,
    }));
}

async function main() {
    const urlsText = await readFile("/app/benchmark-endpoints.json", "utf8");
    const urls = endpoints(JSON.parse(urlsText));
    if (process.argv[2] === "setup") {
        await verifyHttp(urls);
        const sentinel = `keep-${nonce()}`;
        const inactive = `inactive-${nonce()}`;
        await request(urls.admin, `${root}/squares/import`, json([
            { id: sentinel, label: `Preserved '${nonce()}`, type: "evolution", isActive: true },
            { id: inactive, label: `Inactive ${nonce()}`, type: null, isActive: false },
        ]));
        await request(urls.admin, `${root}/squares/${sentinel}/state/true`, { method: "POST" });
        const missing = process.env.BENCH_SCENARIO === "f01" ? `${root}/catalog` : descriptionRoute(sentinel);
        const baseline = await fetch(new URL(missing, urls.admin));
        assert.notEqual(baseline.status, 200, "Baseline already implements the requested capability");
        const cacheKey = `evolution-preserve-${nonce()}`;
        const cacheValue = nonce();
        assert.equal(await redis("SET", cacheKey, cacheValue), "OK", "Authenticated Redis sentinel write required");
        const dependencySnapshot = await dependencies();
        console.log("Owned dependency images:", JSON.stringify(dependencySnapshot.map(({ role, image }) => ({ role, image }))));
        await writeFile(stateFile, JSON.stringify({
            sentinel, inactive, cacheKey, cacheValue,
            inputs: await protectedHashes(), endpoints: digest(urlsText),
            dependencies: dependencySnapshot, identity: await identity(),
            rows: await rows(), users: await users(), history: await history(),
        }));
        console.log("Warm baseline ready: live apps, seeded PostgreSQL/Redis and protected inputs.");
        return;
    }
    assert.equal(process.argv[2], "verify");
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    await verifyPreservation(state, urlsText, urls);
    await verifyHttp(urls);
    if (process.env.BENCH_SCENARIO === "f01") await verifyFeature(urls);
    else {
        assert.equal(process.env.BENCH_SCENARIO, "m01");
        await verifyMigration(urls, state);
    }
    await verifyPreservation(state, urlsText, urls);
    console.log("Preservation proof:", JSON.stringify({
        originalSquareCount: state.rows.length, originalUserCount: state.users.length,
        originalDatabaseIdentity: state.identity, currentDatabaseIdentity: await identity(),
        originalMigrationIds: state.history.map(row => row.MigrationId),
        currentMigrationIds: (await history()).map(row => row.MigrationId),
        sentinel: state.rows.find(row => row.Id === state.sentinel),
        dependencyImages: state.dependencies.map(({ role, image }) => ({ role, image })),
    }));
    console.log(`Verified ${process.env.BENCH_SCENARIO}: fresh functional contracts, negative inputs,
real SQL/Redis, legacy rows/users/history, live frontend/version/SignalR and dependency identity.`);
}

if (process.argv[1]?.endsWith("/evolution.mjs")) {
    main().catch(error => { console.error(error); process.exitCode = 1; });
}
