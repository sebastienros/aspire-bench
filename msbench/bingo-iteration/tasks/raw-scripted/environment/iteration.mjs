import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { hashes } from "./hashes.js";
import { endpoints, verifyHttp } from "./http.js";
import { command } from "./process.js";

const editable = "src/bingo-board/vite.config.js";
const stateFile = "/opt/benchmark/iteration-state.json";
const digest = text => createHash("sha256").update(text).digest("hex");

async function request(origin, route, init, status = 200) {
    const response = await fetch(new URL(route, origin), {
        ...init, redirect: "manual", signal: AbortSignal.timeout(10_000),
    });
    assert.equal(response.status, status, `${route}: HTTP ${response.status}`);
    return response;
}

const post = value => ({
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
});

export async function dependencies() {
    const run = process.env.BENCH_RUN_ID;
    assert(run, "BENCH_RUN_ID required");
    const filters = process.env.BENCH_APP_KIND === "compose"
        ? ["--filter", `label=com.docker.compose.project=${run}`]
        : ["--filter", `name=^/${run}-(postgres|redis)$`];
    const ids = (await command("docker", ["ps", "-q", ...filters])).stdout.trim().split(/\s+/).filter(Boolean);
    assert.equal(ids.length, 2, "Exactly two owned dependency containers required");
    const rows = JSON.parse((await command("docker", ["inspect", ...ids])).stdout);
    return rows.map(row => ({ id: row.Id, startedAt: row.State.StartedAt,
        restarts: row.RestartCount })).sort((a, b) => a.id.localeCompare(b.id));
}

async function backendProcess(origin) {
    const output = await command("lsof", ["-t", `-iTCP:${new URL(origin).port}`, "-sTCP:LISTEN"]);
    const pids = [...new Set(output.stdout.trim().split(/\s+/))];
    assert.equal(pids.length, 1, "Exactly one backend listener required");
    const pid = pids[0];
    const stat = await readFile(`/proc/${pid}/stat`, "utf8");
    return { pid, startedAt: stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19] };
}

export async function baselineHashes() {
    const result = await hashes("/app");
    delete result[editable];
    return result;
}

export async function verifyBehavior(urls, sentinel) {
    const statusRoute = "/api/demo/producer/status";
    const before = await (await request(urls.admin, statusRoute)).json();
    assert(before.calledSquares.includes(sentinel), "Preexisting called-square state must survive");
    const existing = await (await request(urls.admin,
        `/api/demo/producer/squares/${sentinel}/state/true`, { method: "POST" })).json();
    assert.equal(existing.label, "Preserved before agent", "Preexisting database square must survive");
    await verifyHttp(urls);
    const id = `iter-${randomBytes(8).toString("hex")}`;
    const label = `Probe ${randomBytes(8).toString("hex")}`;
    await request(urls.frontend, "/api/demo/producer/squares/import",
        post([{ id, label, type: "iteration", isActive: true }]));
    const called = await (await request(urls.frontend,
        `/api/demo/producer/squares/${id}/state/true`, { method: "POST" })).json();
    assert.equal(called.id, id);
    assert.equal(called.label, label);
    assert.equal(called.isChecked, true);
    for (const origin of [urls.frontend, urls.admin]) {
        const status = await (await request(origin, statusRoute)).json();
        assert(status.calledSquares.includes(id), "Proxied state must reach real backend/Redis");
        assert(status.calledSquares.includes(sentinel), "Existing state must not be replaced");
    }
    const cleared = await (await request(urls.frontend,
        `/api/demo/producer/squares/${id}/state/false`, { method: "POST" })).json();
    assert.equal(cleared.isChecked, false);
    const after = await (await request(urls.admin, statusRoute)).json();
    assert(!after.calledSquares.includes(id), "Clear must affect real backend state");
    assert(after.calledSquares.includes(sentinel), "Clear must preserve unrelated state");
    await request(urls.frontend, "/api/demo/producer/squares/import", post([]), 400);
    await request(urls.frontend, `/api/demo/producer/squares/missing-${randomBytes(8).toString("hex")}/state/true`,
        { method: "POST" }, 404);
}

async function main() {
    const urlsText = await readFile("/app/benchmark-endpoints.json", "utf8");
    const urls = endpoints(JSON.parse(urlsText));
    if (process.argv[2] === "setup") {
        await verifyHttp(urls);
        const probe = await fetch(new URL("/api/demo/producer/status", urls.frontend), {
            signal: AbortSignal.timeout(10_000),
        });
        const content = await probe.text();
        assert(probe.status !== 200 || !probe.headers.get("content-type")?.includes("application/json")
            || !Array.isArray(JSON.parse(content).calledSquares),
        "Baseline must not already satisfy the requested producer proxy behavior");
        const sentinel = `keep-${randomBytes(8).toString("hex")}`;
        await request(urls.admin, "/api/demo/producer/squares/import",
            post([{ id: sentinel, label: "Preserved before agent", type: "iteration", isActive: true }]));
        await request(urls.admin, `/api/demo/producer/squares/${sentinel}/state/true`, { method: "POST" });
        await writeFile(stateFile, JSON.stringify({
            sentinel, inputs: await baselineHashes(), endpoints: digest(urlsText),
            backend: await backendProcess(urls.admin), dependencies: await dependencies(),
        }));
        return;
    }
    assert.equal(process.argv[2], "verify");
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    assert.equal(digest(urlsText), state.endpoints, "Endpoint file changed");
    assert.deepEqual(await baselineHashes(), state.inputs, "Only the frontend config may change");
    assert.deepEqual(await backendProcess(urls.admin), state.backend, "Backend restarted or replaced");
    assert.deepEqual(await dependencies(), state.dependencies, "Dependencies restarted or replaced");
    await verifyBehavior(urls, state.sentinel);
    console.log("Verified live player->admin->database/Redis routing, errors, prior data and process ownership.");
}

if (process.argv[1]?.endsWith("/iteration.mjs")) {
    main().catch(error => { console.error(error); process.exitCode = 1; });
}
