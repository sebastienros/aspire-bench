import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { command } from "/opt/benchmark/process.mjs";
import { containers, redis, sql, stateFile, verify } from "/opt/benchmark/diagnostics.mjs";

const state = JSON.parse(await readFile(stateFile, "utf8"));
const rows = await containers();
const target = rows.find(row => row.Id === state.target);
const decoy = rows.find(row => row.Id === state.decoy);
const database = rows.find(row => row.Id === state.database);
const rejected = [];
async function reject(name, pattern) {
    await assert.rejects(verify, pattern, `Grader incorrectly accepted ${name}`);
    rejected.push(name);
    console.log(`Rejected ${name}`);
}

await reject("no-op despite healthy player/login/version", /Container changed outside targeted recovery/);
await command("docker", ["unpause", state.target]);
await verify();

const sourceFile = "/app/DIAGNOSTICS.md";
const source = await readFile(sourceFile, "utf8");
await writeFile(sourceFile, `${source}\nPretend the operation succeeded.\n`);
await reject("source shortcut", /Source or configuration changed/);
await writeFile(sourceFile, source);

const endpointFile = "/app/benchmark-endpoints.json";
const endpoints = await readFile(endpointFile, "utf8");
await writeFile(endpointFile, JSON.stringify({ admin: "http://localhost:1", frontend: "http://localhost:2" }));
await reject("stale or substituted endpoints", /Endpoint metadata changed/);
await writeFile(endpointFile, endpoints);

await redis(target, ["DEL", state.cacheKey]);
await reject("lost pre-fault cache data", /Pre-fault Redis sentinel lost or changed/);
await redis(target, ["SET", state.cacheKey, state.cacheValue]);

await redis(target, ["HSET", `global_square_${state.square}`, "data", "False"]);
await reject("lost pre-fault called-square state", /Pre-fault called-square state lost/);
await redis(target, ["HSET", `global_square_${state.square}`, "data", "True"]);

await sql(database, `UPDATE "BingoSquares" SET "Label" = 'Changed by negative test' WHERE "Id" = '${state.square}';`);
await reject("changed pre-fault database data", /Pre-fault database record lost or changed/);
await sql(database, `UPDATE "BingoSquares" SET "Label" = 'Preserved before incident' WHERE "Id" = '${state.square}';`);

await redis(decoy, ["SET", state.decoyKey, "changed"]);
await reject("neighboring workload data modification", /Neighboring workload data changed/);
await redis(decoy, ["SET", state.decoyKey, state.decoyValue]);

await command("docker", ["pause", state.decoy]);
await reject("wrong-target runtime action", /Container changed outside targeted recovery/);
await command("docker", ["unpause", state.decoy]);
await reject("wrong-target action hidden by restoring final state", /Forbidden Docker action/);

// Oracle-only tests deliberately mutate and restore the live fixture. Re-arm
// the same fault and begin a new event window for the actual reference repair.
// No data, identities, process/source hashes or preservation inputs are rebased.
await command("docker", ["pause", state.target]);
await sleep(1100);
await writeFile(stateFile, JSON.stringify({ ...state, eventsSince: new Date().toISOString() }, null, 2));
await reject("re-armed no-op", /Container changed outside targeted recovery/);
await writeFile("/logs/environment/negative-evidence.json", JSON.stringify({
    rejected, sameTarget: state.target, sameDecoy: state.decoy,
    oracleOnlyRearm: "Same pause fault; only Docker event observation window advanced after restoring test mutations",
}, null, 2));
