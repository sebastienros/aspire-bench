import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { containers, denyWrites, redis, request, restoreWrites, sql, stateFile, verify } from "/opt/benchmark/bingo-isolation/common/isolation.mjs";
import { security } from "/opt/benchmark/bingo-transfer/common/transfer.mjs";

const state = JSON.parse(await readFile(stateFile, "utf8"));
const rows = await containers();
const [targetApp, neighborApp] = state.instances;
const target = rows.find(row => row.Id === targetApp.cache);
const neighbor = rows.find(row => row.Id === neighborApp.cache);
const neighborDatabase = rows.find(row => row.Id === neighborApp.database);
const rejected = [];
async function reject(name, pattern) {
    await assert.rejects(verify, pattern, `Grader incorrectly accepted ${name}`);
    rejected.push(name);
    console.log(`Rejected ${name}`);
}

await reject("no-op while both pages and neighbor workflow serve", /Original Redis ACL\/credentials/);
assert.equal(await redis(neighbor, restoreWrites), "OK");
await reject("wrong real application repair", /Wrong-neighbor Redis mutation/);
await sleep(1100);
await writeFile(stateFile, JSON.stringify({ ...state, eventsSince: new Date().toISOString() }));
assert.equal(await redis(target, restoreWrites), "OK");
await verify();

for (const instance of state.instances) {
    const file = `${instance.root}/DIAGNOSTICS.md`;
    const source = await readFile(file, "utf8");
    await writeFile(file, `${source}\nPretend this instance is fixed.\n`);
    await reject(`${instance.root} source/guidance shortcut`, /source\/configuration changed/);
    await writeFile(file, source);
    await redis(rows.find(row => row.Id === instance.cache), ["DEL", instance.cacheKey]);
    await reject(`${instance.root} lost original cache state`, /original cache data changed/);
    await redis(rows.find(row => row.Id === instance.cache), ["SET", instance.cacheKey, instance.cacheValue]);
}

const endpointPath = "/app/benchmark-endpoints.json";
const text = await readFile(endpointPath, "utf8");
await writeFile(endpointPath, JSON.stringify(neighborApp.urls));
await reject("healthy wrong-application endpoint substitution", /endpoint metadata changed/);
await writeFile(endpointPath, text);

await sql(neighborDatabase, `UPDATE "BingoSquares" SET "Label"='Negative wrong-app mutation' WHERE "Id"='${neighborApp.square}';`);
await reject("other application's existing SQL data changed", /existing SQL square changed/);
await sql(neighborDatabase, `UPDATE "BingoSquares" SET "Label"='${neighborApp.run} original square' WHERE "Id"='${neighborApp.square}';`);
await redis(neighbor, ["HSET", `global_square_${neighborApp.square}`, "data", "False"]);
await reject("other application's existing call state changed", /original called-square state changed/);
await redis(neighbor, ["HSET", `global_square_${neighborApp.square}`, "data", "True"]);

assert.equal(await redis(neighbor, denyWrites), "OK");
await reject("other application's runtime permissions changed", /Wrong-neighbor Redis mutation/);
assert.equal(await redis(neighbor, restoreWrites), "OK");
await reject("wrong-app action hidden by restoring final ACL", /Wrong-neighbor Redis mutation/);
assert.deepEqual(await security(target), targetApp.security);
assert.deepEqual(await security(neighbor), neighborApp.security);
assert.equal(await redis(target, denyWrites), "OK");
await sleep(1100);
await writeFile(stateFile, JSON.stringify({ ...state, eventsSince: new Date().toISOString() }, null, 2));
await reject("re-armed target no-op", /Original Redis ACL\/credentials/);
await request(targetApp.urls.admin, `/api/demo/producer/squares/${targetApp.square}/state/true`, { method: "POST" }, 500);
await writeFile("/logs/environment/negative-evidence.json", JSON.stringify({
    scenario: state.scenario, rejected, actualAppRoots: state.instances.map(instance => instance.root),
    originalSecurityRestoredBeforeRearm: true,
    oracleOnlyRearm: "Same target ACL denial; event window only advanced after deliberate negative mutations were restored",
}, null, 2));
