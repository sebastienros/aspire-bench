import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { command } from "./process.js";
import { containers, ownedProcesses, type Container } from "./ownership.js";
import { hashes, unchanged, type Run } from "./workspace.js";

export interface Endpoints { admin: string; frontend: string }
export interface Proof { passed: boolean; checks: string[]; error?: string; verificationMs: number }

export function endpoints(value: unknown): Endpoints {
  assert(value && typeof value === "object" && !Array.isArray(value), "Endpoint object required");
  const record = value as Record<string, unknown>;
  assert.deepEqual(Object.keys(record).sort(), ["admin", "frontend"]);
  for (const name of ["admin", "frontend"]) {
    assert.equal(typeof record[name], "string");
    const url = new URL(record[name] as string);
    assert(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
      "Endpoints must use loopback HTTP");
    assert(url.port && !url.username && !url.password && url.pathname === "/"
      && !url.search && !url.hash, "Only an HTTP origin is accepted");
  }
  assert.notEqual(record.admin, record.frontend, "Distinct application endpoints required");
  return { admin: record.admin as string, frontend: record.frontend as string };
}

async function response(origin: string, route: string, init?: RequestInit) {
  const res = await fetch(new URL(route, origin), { ...init, redirect: "manual",
    signal: AbortSignal.timeout(10_000) });
  assert.equal(res.status, 200, `${route}: HTTP ${res.status}`);
  return res;
}

function dependency(owned: Container[], type: "postgres" | "redis") {
  const matches = owned.filter(item => item.Name.endsWith(`-${type}`)
    || item.Config.Labels?.["com.docker.compose.service"] === type);
  assert.equal(matches.length, 1, `Exactly one owned ${type} container required`);
  return matches[0];
}

export function verifyInputs(run: Run, current: Record<string, string>) {
  const repairs = run.repairFiles ?? {};
  const protectedInputs = Object.fromEntries(Object.entries(run.baselineHashes)
    .filter(([file]) => !(file in repairs)));
  assert(unchanged(protectedInputs, current), "Application source or guidance outside startup repair was modified");
  for (const file of Object.keys(repairs)) {
    assert(["compose.yaml", "apphost.cs"].includes(file), "Invalid startup repair target");
    assert(current[file] && current[file] !== run.baselineHashes[file],
      `Injected startup failure must be repaired in ${file}`);
  }
}

export async function verify(run: Run, urls: Endpoints): Promise<Proof> {
  const start = performance.now();
  const checks: string[] = [];
  try {
    verifyInputs(run, await hashes(run.workDir));
    checks.push(Object.keys(run.repairFiles ?? {}).length
      ? "startup configuration repaired; other application inputs and guidance unchanged"
      : "unchanged application and guidance");
    const owned = await containers(run);
    const db = dependency(owned, "postgres");
    const redis = dependency(owned, "redis");
    await command("docker", ["exec", db.Id, "pg_isready", "-U", "postgres"]);
    const seeded = await command("docker", ["exec", db.Id, "sh", "-c",
      'PGPASSWORD="$POSTGRES_PASSWORD" psql "$@"', "psql", "-U", "postgres",
      "-d", run.config.kind === "compose" ? "bingo" : "db", "-At", "-v", "ON_ERROR_STOP=1", "-c",
      `SELECT EXISTS (SELECT 1 FROM "AspNetUsers" WHERE "UserName" = 'admin') AND EXISTS (SELECT 1 FROM "BingoSquares");`]);
    assert.equal(seeded.stdout.trim(), "t", "Migrations and seed data must exist");
    assert.equal((await command("docker", ["exec", redis.Id, "sh", "-c",
      'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping'])).stdout.trim(), "PONG");
    checks.push("PostgreSQL ready, migrated and seeded; Redis PING");
    const ownedPids = await ownedProcesses(run);
    for (const url of [urls.admin, urls.frontend]) {
      const listeners = (await command("lsof", ["-nP", `-iTCP:${new URL(url).port}`,
        "-sTCP:LISTEN", "-Fp"], { accept: [0, 1] })).stdout.split("\n")
        .filter(line => line.startsWith("p")).map(line => Number(line.slice(1)));
      assert(listeners.length && listeners.every(pid => ownedPids.includes(pid)),
        "Submitted endpoint must belong to a newly created run-owned process");
    }
    checks.push("endpoint listeners belong to this run");
    await verifyHttp(urls, checks);
    return { passed: true, checks, verificationMs: performance.now() - start };
  } catch (error) {
    return { passed: false, checks, error: error instanceof Error ? error.message : String(error),
      verificationMs: performance.now() - start };
  }
}

export async function verifyHttp(urls: Endpoints, checks: string[] = []) {
  const login = await (await response(urls.admin, "/login")).text();
  assert(/password/i.test(login) && /<html|<!doctype/i.test(login), "Real admin login page required");
  const frontend = await (await response(urls.frontend, "/")).text();
  assert(frontend.includes('id="app"') && frontend.includes("script"), "Real player frontend required");
  const adminVersion = await (await response(urls.admin, "/api/version-info")).json();
  const frontendVersion = await (await response(urls.frontend, "/api/version-info")).json();
  assert(adminVersion.dotNetVersion && frontendVersion.dotNetVersion === adminVersion.dotNetVersion,
    "Frontend API proxy must reach backend");
  const negotiation = await (await response(urls.frontend,
    "/bingohub/negotiate?negotiateVersion=1", { method: "POST" })).json();
  assert(negotiation.connectionToken && negotiation.availableTransports?.length,
    "Frontend SignalR proxy negotiation required");
  checks.push("admin/player HTTP; frontend API/SignalR proxies");
  const square = `bench-${randomBytes(6).toString("hex")}`;
  const imported = await (await response(urls.admin, "/api/demo/producer/squares/import", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify([{ id: square, label: "Benchmark probe", type: "bench", isActive: true }]),
  })).json();
  assert(imported, "Square import must succeed");
  const called = await (await response(urls.admin,
    `/api/demo/producer/squares/${square}/state/true`, { method: "POST" })).json();
  assert.equal(called.isChecked, true);
  const status = await (await response(urls.admin, "/api/demo/producer/status")).json();
  assert(status.calledSquares.includes(square), "Imported square state must round-trip via Redis");
  const cleared = await (await response(urls.admin,
    `/api/demo/producer/squares/${square}/state/false`, { method: "POST" })).json();
  assert.equal(cleared.isChecked, false);
  checks.push("database square import and Redis-backed call/status/clear workflow");
}

export async function submittedEndpoints(run: Run) {
  return endpoints(JSON.parse(await readFile(path.join(run.workDir, "benchmark-endpoints.json"), "utf8")));
}
