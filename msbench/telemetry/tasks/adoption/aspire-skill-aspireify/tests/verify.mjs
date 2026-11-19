// Verifier for the authoring scenarios (PLAN §7, T3.2 adoption / add-dependency, T3.3 greenfield).
// Shipped in the task's tests/ folder, never in the image. Every check is recorded separately in
// /logs/verifier/details.json; the reward is the conjunction of the scenario's reward checks
// (REWARD below, fixed before any trial). The agent's report is never read.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, readlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const scenario = process.env.BENCH_FAULT;
const aspire = "/usr/local/aspire/aspire";
const original = "/opt/benchmark/authoring-original";
const statePath = "/opt/benchmark/authoring-state.json";

const REWARD = {
    adoption: ["aspire", "dependencies", "oneBackend", "seeded", "functional", "sourcePreserved"],
    "add-dependency": ["aspire", "redisResource", "referenced", "usesRedis", "functional", "dataPreserved"],
    greenfield: ["aspire", "api", "postgres", "referenced", "answers"],
};
assert(REWARD[scenario], `Unknown authoring scenario ${scenario}`);

async function sh(command, args, { timeout = 120_000, accept = false } = {}) {
    try {
        const { stdout } = await run(command, args, { maxBuffer: 64 << 20, timeout });
        return stdout.trim();
    } catch (error) {
        if (accept) return null;
        throw new Error(`${command} ${args.join(" ")} failed: ${(error.stderr || error.message).toString().slice(0, 800)}`);
    }
}

// curl, so that a redirect to the project's HTTPS endpoint (untrusted development certificate) is followed
// the way a browser user would follow it.
async function http(origin, route, init = {}, timeout = 30_000) {
    const args = ["-sk", "-L", "--max-time", String(Math.ceil(timeout / 1000)), "-X", init.method ?? "GET", "-w", "\n%{http_code}"];
    for (const [name, value] of Object.entries(init.headers ?? {})) args.push("-H", `${name}: ${value}`);
    if (init.body !== undefined) args.push("--data-binary", init.body);
    else if ((init.method ?? "GET") === "POST") args.push("--data-binary", "");
    args.push(new URL(route, origin).href);
    const out = await sh("curl", args, { timeout: timeout + 5_000, accept: true }) ?? "\n0";
    const at = out.lastIndexOf("\n");
    return { status: Number(out.slice(at + 1)), body: out.slice(0, at) };
}

async function containers() {
    const out = await sh("docker", ["ps", "--format", "{{.ID}}\t{{.Image}}\t{{.Names}}"]);
    return out.split("\n").filter(Boolean).map(line => { const [id, image, name] = line.split("\t"); return { id, image, name }; });
}
const byImage = (list, re) => list.filter(c => re.test(c.image));
const POSTGRES = /(^|\/)postgres(:|$)/, REDIS = /(^|\/)redis(:|$)/;

async function appHosts() {
    const out = await sh(aspire, ["ps", "--format", "Json", "--non-interactive", "--nologo"], { accept: true });
    if (!out) return [];
    try { return JSON.parse(out).filter(item => item.status === "running"); } catch { return []; }
}

async function describe(appHostPath) {
    const out = await sh(aspire, ["describe", "--apphost", appHostPath, "--format", "Json", "--non-interactive", "--nologo"]);
    return JSON.parse(out).resources;
}

const display = r => r.displayName ?? r.name;
const httpOrigin = r => {
    const url = (r?.urls ?? []).map(u => u.url).find(u => u?.startsWith("http://")) ?? (r?.urls ?? []).map(u => u.url).find(u => u?.startsWith("https://"));
    return url ? new URL(url).origin : null;
};
const live = r => r?.state === "Running" && r?.healthStatus !== "Unhealthy";

// Redis inside its container: password, TLS port or plain port, as bench.mjs does it.
const redisPrelude = '[ -n "${REDIS_PASSWORD:-}" ] && export REDISCLI_AUTH="$REDIS_PASSWORD"; opts=""; for o in "" "-p 6380" "--tls --insecure"; do if redis-cli --no-auth-warning $o PING 2>/dev/null | grep -q PONG; then opts="$o"; break; fi; done; ';
const redisCli = (id, args) => sh("docker", ["exec", id, "sh", "-c", `${redisPrelude}exec redis-cli --no-auth-warning $opts "$@"`, "redis-cli", ...args]);
const psql = (id, db, query) => sh("docker", ["exec", "-e", "PGOPTIONS=-c default_transaction_read_only=off", id, "sh", "-c",
    'PGPASSWORD="$POSTGRES_PASSWORD" psql -U postgres -d "$0" -At -v ON_ERROR_STOP=1 -c "$1"', db, query]);

function connectionField(connection, field) {
    const fields = Object.fromEntries(connection.split(";").filter(Boolean).map(part => {
        const at = part.indexOf("=");
        return [part.slice(0, at).trim().toLowerCase(), part.slice(at + 1).trim()];
    }));
    return fields[field];
}

// Processes whose command line names the admin backend (dotnet run child or the built binary).
async function adminBackends() {
    const found = [];
    for (const pid of (await readdir("/proc")).filter(name => /^\d+$/.test(name))) {
        try {
            const args = (await readFile(`/proc/${pid}/cmdline`, "utf8")).split("\0").filter(Boolean);
            const cwd = await readlink(`/proc/${pid}/cwd`);
            if (cwd.startsWith("/app") && args.some(arg => /(?:^|\/)BingoBoard\.Admin(?:\.dll)?$/.test(arg))) {
                const env = Object.fromEntries((await readFile(`/proc/${pid}/environ`, "utf8")).split("\0").filter(Boolean)
                    .map(entry => [entry.slice(0, entry.indexOf("=")), entry.slice(entry.indexOf("=") + 1)]));
                found.push({ pid, env });
            }
        } catch { /* process ended */ }
    }
    return found;
}

// Existing files may only gain lines: every original line still present, in order.
const SKIP_DIRS = new Set(["node_modules", "bin", "obj", ".git", ".github", ".aspire", ".script-state"]);
const EXEMPT = new Set(["NuGet.config", "nuget.config", "src/bingo-board/package-lock.json"]);
async function walk(root, dir = root, out = []) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(item.name)) continue;
        const file = path.join(dir, item.name);
        if (item.isDirectory()) await walk(root, file, out);
        else if (item.isFile()) out.push(path.relative(root, file));
    }
    return out;
}
const lines = text => text.replace(/^﻿/, "").split(/\r?\n/).map(line => line.trimEnd());
function additive(before, after) {
    const next = lines(after);
    let at = 0;
    for (const line of lines(before)) {
        while (at < next.length && next[at] !== line) at++;
        if (at === next.length) return false;
        at++;
    }
    return true;
}
async function sourceChanges() {
    const changed = [], edited = [];
    for (const file of await walk(original)) {
        if (EXEMPT.has(file)) continue;
        const target = path.join("/app", file);
        if (!existsSync(target)) { changed.push(`${file} (removed)`); continue; }
        const [before, after] = [await readFile(path.join(original, file)), await readFile(target)];
        if (before.equals(after)) continue;
        if (additive(before.toString("utf8"), after.toString("utf8"))) edited.push(file);
        else changed.push(file);
    }
    return { changed, additions: edited };
}

const square = id => ({ id, label: `Verifier ${id}`, type: "benchmark", isActive: true });
async function bingoFunctional(urls, details) {
    const login = await http(urls.admin, "/login");
    assert.equal(login.status, 200, `Admin login page: HTTP ${login.status}`);
    assert(/password/i.test(login.body), "Admin login page must be the real login form");
    const page = await http(urls.frontend, "/");
    assert.equal(page.status, 200, `Player frontend: HTTP ${page.status}`);
    assert(page.body.includes('id="app"'), "Player frontend must be the real Vue page");
    const proxied = await http(urls.frontend, "/api/version-info");
    assert.equal(proxied.status, 200, `Player proxy to the admin backend: HTTP ${proxied.status}`);
    const hub = await http(urls.frontend, "/bingohub/negotiate?negotiateVersion=1", { method: "POST" });
    assert.equal(hub.status, 200, `Player SignalR proxy: HTTP ${hub.status}`);
    const id = `verify-${randomBytes(5).toString("hex")}`;
    const imported = await http(urls.admin, "/api/demo/producer/squares/import", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify([square(id)]),
    }, 60_000);
    assert.equal(imported.status, 200, `Square import: HTTP ${imported.status}`);
    for (const [value, expected] of [[true, true], [false, false]]) {
        const called = await http(urls.admin, `/api/demo/producer/squares/${id}/state/${value}`, { method: "POST" });
        assert.equal(called.status, 200, `Calling a square: HTTP ${called.status}`);
        const status = await http(urls.admin, "/api/demo/producer/status");
        assert.equal(status.status, 200, `Status: HTTP ${status.status}`);
        assert.equal(JSON.parse(status.body).calledSquares.includes(id), expected, `Called state of ${id} must be ${expected}`);
    }
    details.probeSquare = id;
    return id;
}

async function bingoAspire(details) {
    const hosts = await appHosts();
    details.appHosts = hosts.map(h => ({ path: h.appHostPath, sdkVersion: h.sdkVersion }));
    assert(hosts.length >= 1, "No running AppHost (aspire ps)");
    for (const host of hosts) {
        const resources = await describe(host.appHostPath);
        const admin = resources.find(r => display(r) === "boardadmin");
        const player = resources.find(r => display(r) === "bingoboard");
        if (!admin && !player) continue;
        assert(live(admin), `boardadmin must be running under Aspire (state ${admin?.state}, health ${admin?.healthStatus})`);
        assert(live(player), `bingoboard must be running under Aspire (state ${player?.state}, health ${player?.healthStatus})`);
        const urls = { admin: httpOrigin(admin), frontend: httpOrigin(player) };
        assert(urls.admin && urls.frontend, "boardadmin and bingoboard need HTTP endpoints");
        details.appHost = host.appHostPath;
        details.sdkVersion = host.sdkVersion;
        details.endpoints = urls;
        return { host, resources, admin, urls };
    }
    throw new Error("No running AppHost has boardadmin and bingoboard resources");
}

async function adoption(checks, details) {
    let app;
    await check(checks, details, "aspire", async () => { app = await bingoAspire(details); });
    await check(checks, details, "dependencies", async () => {
        const list = await containers();
        assert.equal(byImage(list, POSTGRES).length, 1, `Exactly one running PostgreSQL container expected, found ${byImage(list, POSTGRES).length}`);
        assert.equal(byImage(list, REDIS).length, 1, `Exactly one running Redis container expected, found ${byImage(list, REDIS).length}`);
        const kinds = (app?.resources ?? []).filter(r => r.resourceType === "Container" && live(r)).length;
        assert(kinds >= 2, "PostgreSQL and Redis must be AppHost resources");
    });
    let backend;
    await check(checks, details, "oneBackend", async () => {
        const found = await adminBackends();
        details.adminBackends = found.length;
        assert.equal(found.length, 1, `Exactly one admin backend process expected, found ${found.length}`);
        backend = found[0];
        assert(backend.env.ConnectionStrings__db && backend.env.ConnectionStrings__cache, "The admin backend needs its db and cache connection strings");
    });
    await check(checks, details, "seeded", async () => {
        assert(backend, "No admin backend");
        const db = connectionField(backend.env.ConnectionStrings__db, "database");
        assert(db && /^[A-Za-z0-9_-]+$/.test(db), "Database name required in ConnectionStrings__db");
        const pg = byImage(await containers(), POSTGRES)[0];
        const seeded = await psql(pg.id, db, `SELECT EXISTS (SELECT 1 FROM "AspNetUsers" WHERE "UserName" = 'admin') AND EXISTS (SELECT 1 FROM "BingoSquares");`);
        assert.equal(seeded, "t", "Migrations and seed data must have run");
        details.database = db;
    });
    await check(checks, details, "functional", async () => {
        assert(app, "No Aspire endpoints");
        const id = await bingoFunctional(app.urls, details);
        const pg = byImage(await containers(), POSTGRES)[0];
        assert.equal(await psql(pg.id, details.database ?? "db", `SELECT "Label" FROM "BingoSquares" WHERE "Id" = '${id}';`), `Verifier ${id}`,
            "An imported square must reach PostgreSQL");
    });
    await check(checks, details, "sourcePreserved", async () => {
        const { changed, additions } = await sourceChanges();
        details.additions = additions;
        details.changed = changed;
        assert.equal(changed.length, 0, `Existing lines changed or removed: ${changed.slice(0, 8).join(", ")}`);
    });
}

async function addDependency(checks, details) {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    let app, redisResource;
    await check(checks, details, "aspire", async () => { app = await bingoAspire(details); });
    await check(checks, details, "redisResource", async () => {
        const list = byImage(await containers(), REDIS);
        assert.equal(list.length, 1, `Exactly one running Redis container expected, found ${list.length}`);
        const names = new Set([list[0].name]);
        redisResource = (app?.resources ?? []).find(r => r.resourceType === "Container" && (names.has(r.name) || /redis/i.test(`${r.name} ${display(r)}`)));
        assert(redisResource, "Redis must be an AppHost resource");
        assert.equal(redisResource.state, "Running", `Redis resource state ${redisResource.state}`);
        assert.equal(redisResource.healthStatus, "Healthy", `Redis resource health ${redisResource.healthStatus}`);
        details.redisResource = display(redisResource);
    });
    await check(checks, details, "referenced", async () => {
        assert(app && redisResource, "No admin or Redis resource");
        const refs = (app.admin.relationships ?? []).filter(r => r.type === "Reference").map(r => r.resourceName);
        assert(refs.includes(redisResource.name) || refs.includes(display(redisResource)), `boardadmin must reference the Redis resource (references: ${refs.join(", ")})`);
        const env = Object.keys(app.admin.environment ?? {});
        assert(env.some(key => key === `ConnectionStrings__${display(redisResource)}`), "boardadmin must receive the Redis connection string");
    });
    let probe;
    await check(checks, details, "functional", async () => {
        assert(app, "No Aspire endpoints");
        probe = `dep-${randomBytes(5).toString("hex")}`;
        const imported = await http(app.urls.admin, "/api/demo/producer/squares/import", {
            method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify([square(probe)]),
        }, 60_000);
        assert.equal(imported.status, 200, `Square import: HTTP ${imported.status}`);
        await bingoFunctional(app.urls, details);
        const called = await http(app.urls.admin, `/api/demo/producer/squares/${probe}/state/true`, { method: "POST" });
        assert.equal(called.status, 200, `Calling the probe square: HTTP ${called.status}`);
    });
    await check(checks, details, "usesRedis", async () => {
        assert(probe, "No probe square was called");
        const [redis] = byImage(await containers(), REDIS);
        assert(redis, "No Redis container");
        const keys = await redisCli(redis.id, ["--scan", "--pattern", `*global_square_${probe}*`]);
        assert(keys.split("\n").filter(Boolean).length >= 1, "Calling a square must write the admin backend's cache entry to Redis");
    });
    await check(checks, details, "dataPreserved", async () => {
        const pg = byImage(await containers(), POSTGRES);
        assert.equal(pg.length, 1, `Exactly one running PostgreSQL container expected, found ${pg.length}`);
        const current = new Set(JSON.parse(await psql(pg[0].id, "db", `SELECT coalesce(json_agg(s."Id"), '[]') FROM "BingoSquares" s;`)));
        const lost = state.squares.filter(id => !current.has(id));
        assert.equal(lost.length, 0, `Existing squares were lost: ${lost.slice(0, 5).join(", ")}`);
        details.squaresPreserved = state.squares.length;
    });
}

async function greenfield(checks, details) {
    let api, resources;
    await check(checks, details, "aspire", async () => {
        const hosts = await appHosts();
        details.appHosts = hosts.map(h => ({ path: h.appHostPath, sdkVersion: h.sdkVersion }));
        assert(hosts.length >= 1, "No running AppHost (aspire ps)");
        for (const host of hosts) {
            const list = await describe(host.appHostPath);
            if (!list.some(r => display(r) === "api")) continue;
            resources = list;
            details.appHost = host.appHostPath;
            details.sdkVersion = host.sdkVersion;
            details.appHostUnderApp = host.appHostPath.startsWith("/app/");
            return;
        }
        throw new Error("No running AppHost has a resource named api");
    });
    await check(checks, details, "api", async () => {
        api = resources?.find(r => display(r) === "api");
        assert(live(api), `api must be running (state ${api?.state}, health ${api?.healthStatus})`);
        assert(httpOrigin(api), "api needs an HTTP endpoint");
        details.apiType = api.resourceType;
        details.apiEndpoint = httpOrigin(api);
    });
    await check(checks, details, "postgres", async () => {
        const pg = byImage(await containers(), POSTGRES);
        assert.equal(pg.length, 1, `Exactly one running PostgreSQL container expected, found ${pg.length}`);
        const db = resources?.find(r => display(r) === "db");
        assert(db, "No resource named db");
        assert.equal(db.state, "Running", `db state ${db.state}`);
        assert.equal(db.healthStatus, "Healthy", `db health ${db.healthStatus}`);
        const server = resources.find(r => r.resourceType === "Container" && live(r) && r.healthStatus === "Healthy"
            && (db.resourceType === "Container" ? r === db : true) && /postgres/i.test(JSON.stringify(r.properties ?? {}) + r.name + display(r)));
        assert(server, "A healthy PostgreSQL container resource is required");
        details.dbType = db.resourceType;
    });
    await check(checks, details, "referenced", async () => {
        assert(api, "No api resource");
        assert(Object.keys(api.environment ?? {}).includes("ConnectionStrings__db"), "api must receive the db connection string");
    });
    await check(checks, details, "answers", async () => {
        const origin = httpOrigin(api);
        assert(origin, "No api endpoint");
        // Any HTTP answer from the API's own endpoint below 500 counts (a minimal API without a root route answers 404).
        const out = await sh("curl", ["-sk", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "20", `${origin}/`], { accept: true });
        details.apiStatus = Number(out);
        assert(out && Number(out) > 0 && Number(out) < 500, `api must answer on its endpoint (HTTP ${out})`);
    });
}

async function check(checks, details, name, body) {
    try { await body(); checks[name] = true; }
    catch (error) { checks[name] = false; details.failures[name] = error.message; }
}

const checks = {};
const details = { scenario, failures: {}, checks };
try {
    if (scenario === "adoption") await adoption(checks, details);
    else if (scenario === "add-dependency") await addDependency(checks, details);
    else await greenfield(checks, details);
} catch (error) {
    details.failures.verifier = error.message;
}
details.reward = REWARD[scenario].every(name => checks[name] === true);
details.pinned = typeof details.sdkVersion === "string" ? details.sdkVersion === "17.1.0-preview.1.26567.3" : null;
await mkdir("/logs/verifier", { recursive: true });
await writeFile("/logs/verifier/details.json", JSON.stringify(details, null, 1));
console.log(JSON.stringify(details));
process.exit(details.reward ? 0 : 1);
