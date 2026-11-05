import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import {
    containers, denyWrites, redis, request, restoreWrites, security, sql, stateFile, verify,
} from "/opt/benchmark/bingo-transfer/common/transfer.mjs";

const state = JSON.parse(await readFile(stateFile, "utf8"));
const rows = await containers();
const target = rows.find(row => row.Id === state.target);
const neighbor = rows.find(row => row.Id === state.neighbor);
const database = rows.find(row => row.Id === state.database);
const rejected = [];
async function reject(name, pattern) {
    await assert.rejects(verify, pattern, `Grader incorrectly accepted ${name}`);
    rejected.push(name);
    console.log(`Rejected ${name}`);
}

await reject("no-op/read-only health", /Original Redis ACL\/credentials must be restored exactly/);
assert.equal(await redis(neighbor, restoreWrites), "OK");
await reject("wrong-neighbor repair while target writes remain denied", /Wrong-neighbor Redis mutation/);

// Only the oracle resets its observation window after deliberate negative actions.
await sleep(1100);
await writeFile(stateFile, JSON.stringify({ ...state, eventsSince: new Date().toISOString() }));
assert.equal(await redis(target, restoreWrites), "OK");
await verify();

const sourceFile = "/app/DIAGNOSTICS.md";
const source = await readFile(sourceFile, "utf8");
await writeFile(sourceFile, `${source}\nReport success without a functional write.\n`);
await reject("source/guidance shortcut", /Source or configuration changed/);
await writeFile(sourceFile, source);

const endpointFile = "/app/benchmark-endpoints.json";
const endpointText = await readFile(endpointFile, "utf8");
await writeFile(endpointFile, JSON.stringify({ admin: "http://localhost:1", frontend: "http://localhost:2" }));
await reject("substituted endpoints", /Endpoint metadata changed/);
await writeFile(endpointFile, endpointText);

await redis(target, ["DEL", state.cacheKey]);
await reject("lost original cache data", /Pre-fault Redis sentinel changed/);
await redis(target, ["SET", state.cacheKey, state.cacheValue]);

await redis(target, ["HSET", `global_square_${state.square}`, "data", "False"]);
await reject("lost original called state", /Prior call state changed/);
await redis(target, ["HSET", `global_square_${state.square}`, "data", "True"]);

await sql(database, `UPDATE "BingoSquares" SET "Label"='Negative mutation' WHERE "Id"='${state.square}';`);
await reject("changed original SQL data", /Existing database square changed/);
await sql(database, `UPDATE "BingoSquares" SET "Label"='Preserved before transfer incident' WHERE "Id"='${state.square}';`);

await redis(neighbor, ["SET", state.neighborKey, "changed"]);
await reject("neighbor data modification", /Neighbor data changed/);
await redis(neighbor, ["SET", state.neighborKey, state.neighborValue]);

assert.equal(await redis(target, ["ACL", "SETUSER", "default", "-publish"]), "OK");
await reject("incomplete original permission recovery", /Original Redis ACL\/credentials must be restored exactly/);
assert.equal(await redis(target, ["ACL", "SETUSER", "default", "+publish"]), "OK");

assert.equal(await redis(neighbor, denyWrites), "OK");
await reject("wrong-neighbor ACL denial", /Wrong-neighbor Redis mutation/);
assert.equal(await redis(neighbor, restoreWrites), "OK");
await reject("wrong-neighbor action hidden by restoring final ACL", /Wrong-neighbor Redis mutation/);

assert.deepEqual(await security(target), state.targetSecurity, "Oracle must preserve original target security");
assert.deepEqual(await security(neighbor), state.neighborSecurity, "Oracle must preserve original neighbor security");
assert.equal(await redis(target, denyWrites), "OK");
await sleep(1100);
await writeFile(stateFile, JSON.stringify({ ...state, eventsSince: new Date().toISOString() }, null, 2));
await reject("re-armed unchanged fault", /Original Redis ACL\/credentials must be restored exactly/);
const urls = JSON.parse(endpointText);
await request(urls.admin, `/api/demo/producer/squares/${state.square}/state/true`, { method: "POST" }, 500);
await writeFile("/logs/environment/negative-evidence.json", JSON.stringify({
    rejected, targetId: state.target, neighborId: state.neighbor,
    originalSecurityRestoredBeforeRearm: true,
    oracleOnlyRearm: "Same persistent ACL denial; only event window advances after restoring deliberate negative mutations",
}, null, 2));
