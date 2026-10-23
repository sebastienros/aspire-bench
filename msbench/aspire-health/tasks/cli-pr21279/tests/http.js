import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
export function endpoints(value) {
    assert(value && typeof value === "object" && !Array.isArray(value), "Endpoint object required");
    const record = value;
    assert.deepEqual(Object.keys(record).sort(), ["admin", "frontend"]);
    for (const name of ["admin", "frontend"]) {
        assert.equal(typeof record[name], "string");
        const url = new URL(record[name]);
        assert(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Endpoints must use loopback HTTP");
        assert(url.port && !url.username && !url.password && url.pathname === "/"
            && !url.search && !url.hash, "Only an HTTP origin is accepted");
    }
    assert.notEqual(record.admin, record.frontend, "Distinct application endpoints required");
    return { admin: record.admin, frontend: record.frontend };
}
async function response(origin, route, init) {
    const res = await fetch(new URL(route, origin), { ...init, redirect: "manual",
        signal: AbortSignal.timeout(10_000) });
    assert.equal(res.status, 200, `${route}: HTTP ${res.status}`);
    return res;
}
export async function verifyHttp(urls, checks = []) {
    const login = await (await response(urls.admin, "/login")).text();
    assert(/password/i.test(login) && /<html|<!doctype/i.test(login), "Real admin login page required");
    const frontend = await (await response(urls.frontend, "/")).text();
    assert(frontend.includes('id="app"') && frontend.includes("script"), "Real player frontend required");
    const adminVersion = await (await response(urls.admin, "/api/version-info")).json();
    const frontendVersion = await (await response(urls.frontend, "/api/version-info")).json();
    assert(adminVersion.dotNetVersion && frontendVersion.dotNetVersion === adminVersion.dotNetVersion, "Frontend API proxy must reach backend");
    const negotiation = await (await response(urls.frontend, "/bingohub/negotiate?negotiateVersion=1", { method: "POST" })).json();
    assert(negotiation.connectionToken && negotiation.availableTransports?.length, "Frontend SignalR proxy negotiation required");
    checks.push("admin/player HTTP; frontend API/SignalR proxies");
    const square = `bench-${randomBytes(6).toString("hex")}`;
    const imported = await (await response(urls.admin, "/api/demo/producer/squares/import", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify([{ id: square, label: "Benchmark probe", type: "bench", isActive: true }]),
    })).json();
    assert(imported, "Square import must succeed");
    const called = await (await response(urls.admin, `/api/demo/producer/squares/${square}/state/true`, { method: "POST" })).json();
    assert.equal(called.isChecked, true);
    const status = await (await response(urls.admin, "/api/demo/producer/status")).json();
    assert(status.calledSquares.includes(square), "Imported square state must round-trip via Redis");
    const cleared = await (await response(urls.admin, `/api/demo/producer/squares/${square}/state/false`, { method: "POST" })).json();
    assert.equal(cleared.isChecked, false);
    checks.push("database square import and Redis-backed call/status/clear workflow");
}
