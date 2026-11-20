// Live producer/player traffic. It runs before and during the agent so that the
// incident is continuously exercised, exactly as real users would. Failures are
// tolerated: this process only generates load and never repairs anything.
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";

const state = JSON.parse(await readFile("/opt/benchmark/state.json", "utf8"));
const tag = () => randomBytes(3).toString("hex");
const call = async (origin, route, init) => {
    try {
        const response = await fetch(new URL(route, origin), { ...init, signal: AbortSignal.timeout(45_000) });
        await response.arrayBuffer();
        return response.status;
    } catch {
        return 0;
    }
};

for (let cycle = 0; ; cycle++) {
    let endpoints;
    try {
        endpoints = JSON.parse(await readFile("/opt/benchmark/endpoints.json", "utf8"));
    } catch {
        await sleep(2_000);
        continue;
    }
    const pick = state.squares[cycle % state.squares.length];
    const results = [
        await call(endpoints.admin, "/api/demo/producer/status"),
        await call(endpoints.admin, `/api/demo/producer/squares/${encodeURIComponent(pick)}/state/${cycle % 2 === 0}`, { method: "POST" }),
        await call(endpoints.frontend, "/api/version-info"),
    ];
    if (cycle % 2 === 0) {
        results.push(await call(endpoints.admin, "/api/demo/producer/squares/import", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify(state.live.map(id => ({ id, label: `Live ${id} ${tag()}`, type: "benchmark", isActive: true }))),
        }));
    }
    console.log(`${new Date().toISOString()} ${results.join(" ")}`);
    await sleep(1_500);
}
