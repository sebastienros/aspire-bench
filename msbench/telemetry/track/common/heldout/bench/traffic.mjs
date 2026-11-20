// Live customer and carrier traffic for the Shop application. It runs before and during the
// agent so that the incident is continuously exercised, exactly as real users would. Failures
// are tolerated: this process only generates load and never repairs anything.
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
const post = body => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

for (let cycle = 0; ; cycle++) {
    let endpoints;
    try {
        endpoints = JSON.parse(await readFile("/opt/benchmark/endpoints.json", "utf8"));
    } catch {
        await sleep(2_000);
        continue;
    }
    const customer = state.customers[cycle % state.customers.length];
    const order = state.live[cycle % state.live.length];
    // Shoppers browse the storefront; with a shopper pool each request comes from a different one.
    const catalogue = state.shoppers
        ? `/api/products?customer=shopper-${Math.floor(Math.random() * state.shoppers)}`
        : "/api/products";
    const results = [
        await call(endpoints.api, catalogue),
        await call(endpoints.api, `/api/orders?customer=${encodeURIComponent(customer)}`),
        await call(endpoints.api, `/api/orders/${encodeURIComponent(order)}`),
    ];
    if (cycle % 2 === 0) {
        results.push(await call(endpoints.api, "/api/orders",
            post({ customer, productId: 1 + (cycle % 6), quantity: 1 + (cycle % 3) })));
    }
    if (cycle % 3 === 0) {
        results.push(await call(endpoints.api, "/api/carrier/events",
            post({ carrier: "NorthPost", orderNumber: order, status: "in transit", location: `Hub ${cycle % 40}`, scan: tag() })));
    }
    console.log(`${new Date().toISOString()} ${results.join(" ")}`);
    await sleep(1_500);
}
