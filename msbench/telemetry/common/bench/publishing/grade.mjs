// Preconfigured publishing (PLAN T3.4): snapshot, independent grader and reference deployment.
// Ported from msbench/bingo-publishing/common/grade.mjs (the P01 preconfigured pair, gated natively and
// on CES) to the telemetry suite's images and names. Differences: the supplied deployment command
// (deployment/deploy.sh) is gone, so the agent finds the route itself (F24); new files may appear
// anywhere (generated artifacts land where the tool puts them), but no supplied file may change; both
// production images must have been built after setup; containers are found by Compose service label,
// whatever project name the route chose.
//   node grade.mjs setup | verify | solve
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, lstatSync, mkdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = "/app";
const statePath = "/opt/benchmark/state.json";
const kind = process.env.BENCH_APP_KIND;
const run = (command, args, options = {}) => execFileSync(command, args, {
    encoding: "utf8", timeout: 120_000, maxBuffer: 64 * 1024 * 1024, ...options,
}).trim();
const docker = (...args) => run("docker", args);
const sql = query => docker("exec", "bingo-db", "psql", "-U", "postgres", "-d", "bingo", "-Atc", query);
const redis = (...args) => docker("exec", "bingo-cache", "redis-cli", "--raw", ...args);
const sha = data => createHash("sha256").update(data).digest("hex");
const inspect = name => JSON.parse(docker("inspect", name))[0];
const ignored = new Set(["bin", "obj", "node_modules", "dist", ".aspire", ".script-state", ".git"]);

// Every supplied file (sources, deployment model, Dockerfiles, inputs, documentation) by hash.
function inputs(directory = root, result = {}) {
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (ignored.has(entry)) continue;
        const stat = lstatSync(path);
        if (stat.isSymbolicLink()) continue;
        if (stat.isDirectory()) inputs(path, result);
        else result[relative(root, path)] = sha(readFileSync(path));
    }
    return result;
}
const catalog = () => JSON.parse(sql(`SELECT json_agg(t) FROM
    (SELECT "Id","Label","Type","IsActive","DisplayOrder" FROM "BingoSquares" ORDER BY "Id") t`));
function dependency(name) {
    const item = inspect(name);
    return { id: item.Id, startedAt: item.State.StartedAt, restarts: item.RestartCount,
        config: item.Config, mounts: item.Mounts, networks: item.NetworkSettings.Networks };
}
function ownedInfrastructure() {
    const network = JSON.parse(docker("network", "inspect", "bingo-net"))[0];
    const volume = JSON.parse(docker("volume", "inspect", "bingo-data"))[0];
    return {
        network: { id: network.Id, name: network.Name, created: network.Created, driver: network.Driver,
            internal: network.Internal, ipam: network.IPAM, options: network.Options, labels: network.Labels },
        volume: { name: volume.Name, created: volume.CreatedAt, driver: volume.Driver,
            options: volume.Options, labels: volume.Labels, scope: volume.Scope },
    };
}
async function response(origin, path, status = 200, init = {}) {
    const res = await fetch(new URL(path, origin), { ...init, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    assert.equal(res.status, status, `${path}: HTTP ${res.status}, expected ${status}`);
    return res;
}
async function connect(origin) {
    const negotiation = await (await response(origin, "/bingohub/negotiate?negotiateVersion=1", 200, { method: "POST" })).json();
    assert(negotiation.connectionToken && negotiation.availableTransports.length, "Real SignalR negotiation required");
    const url = new URL("/bingohub", origin);
    url.protocol = "ws:";
    url.searchParams.set("id", negotiation.connectionToken);
    const socket = new WebSocket(url);
    const messages = [];
    let pending = "";
    socket.addEventListener("message", event => {
        pending += event.data;
        const frames = pending.split("\x1e");
        pending = frames.pop();
        for (const frame of frames) if (frame) messages.push(JSON.parse(frame));
    });
    const wait = async predicate => {
        const deadline = Date.now() + 10_000;
        while (Date.now() < deadline) {
            const index = messages.findIndex(predicate);
            if (index >= 0) return messages.splice(index, 1)[0];
            assert(socket.readyState !== WebSocket.CLOSED, "SignalR socket closed");
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error(`SignalR response timed out: ${JSON.stringify(messages)}`);
    };
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("WebSocket open timed out")), 10_000);
        socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
        socket.addEventListener("error", event => { clearTimeout(timer); reject(event); }, { once: true });
    });
    socket.send('{"protocol":"json","version":1}\x1e');
    await wait(message => !("type" in message));
    let invocation = 0;
    return {
        socket,
        async call(target, args, event) {
            const invocationId = String(++invocation);
            socket.send(JSON.stringify({ type: 1, invocationId, target, arguments: args }) + "\x1e");
            const completion = await wait(message => message.type === 3 && message.invocationId === invocationId);
            if (!event) return completion;
            assert(!completion.error, completion.error);
            const result = await wait(message => message.type === 1 && message.target === event);
            return result.arguments[0];
        },
    };
}

// Three checks, all required, recorded separately. preserved: no supplied file changed or vanished,
// the environment's dependencies, network, volume, catalog and Redis state are as at setup.
// production: exactly the two services, running published builds made during the trial from these
// sources (images created after setup; the served Vue bundle is the reference build of these
// sources), Production environment, loopback ports 18080/18081, no bind mounts, no development
// processes. serving: real admin login, the preserved catalog, version routing through the frontend,
// SignalR catalog and a fresh player board persisted in Redis, no development API.
async function verify(state, details) {
    const checks = details.checks = { preserved: false, production: false, serving: false };
    const failures = [];
    const attempt = async (name, body) => {
        try { await body(); checks[name] = true; } catch (error) { failures.push(`${name}: ${error.message}`); }
    };
    await attempt("preserved", async () => {
        const now = inputs();
        const changed = Object.keys(state.inputs).filter(path => now[path] !== state.inputs[path]);
        assert.equal(changed.length, 0, `Supplied files changed or removed: ${changed.slice(0, 5).join(", ")}`);
        for (const name of ["bingo-db", "bingo-cache"]) {
            assert.deepEqual(dependency(name), state.dependencies[name], `Environment-owned dependency changed: ${name}`);
        }
        assert.deepEqual(ownedInfrastructure(), state.infrastructure, "Environment-owned network or volume changed");
        assert.deepEqual(catalog(), state.catalog, "Existing catalog must survive unchanged");
        assert.equal(redis("GET", "bingo-existing"), state.redis, "Existing Redis data must survive");
    });
    let containers = [];
    await attempt("production", async () => {
        const ids = docker("ps", "-q", "--filter", "label=com.docker.compose.service").split("\n").filter(Boolean);
        const services = ids.map(inspect).filter(item => ["boardadmin", "bingoboard"].includes(item.Config.Labels["com.docker.compose.service"]));
        assert.deepEqual(services.map(item => item.Config.Labels["com.docker.compose.service"]).sort(), ["bingoboard", "boardadmin"],
            "Exactly one running boardadmin and one running bingoboard Compose service required");
        const project = services[0].Config.Labels["com.docker.compose.project"];
        assert(services.every(item => item.Config.Labels["com.docker.compose.project"] === project), "Both services must belong to one Compose project");
        const members = docker("ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`).split("\n").filter(Boolean);
        assert.equal(members.length, 2, `Compose project ${project} must hold exactly the two services (found ${members.length})`);
        containers = services;
        details.composeProject = project;
        for (const item of services) {
            assert(item.State.Running, "Deployment container must be running");
            assert.equal(item.Mounts.length, 0, "Deployment must not bind-mount source or host outputs");
            assert(item.NetworkSettings.Networks["bingo-net"], "Deployment must use the supplied external network");
            assert(!/apphost|vite|npm|watch|dotnet run/i.test(JSON.stringify([item.Path, item.Args])), "Development/AppHost processes are forbidden");
            const created = Date.parse(JSON.parse(docker("image", "inspect", item.Image))[0].Created);
            assert(created > Date.parse(state.setupAt), `Image of ${item.Config.Labels["com.docker.compose.service"]} was not built during the trial`);
        }
        const admin = services.find(item => item.Config.Labels["com.docker.compose.service"] === "boardadmin");
        for (const key of ["DOTNET_ENVIRONMENT", "ASPNETCORE_ENVIRONMENT"]) {
            assert(admin.Config.Env.includes(`${key}=Production`), `${key} must be Production`);
        }
        docker("exec", admin.Id, "test", "-f", "/app/BingoBoard.Admin.dll");
        const frontend = services.find(item => item.Config.Labels["com.docker.compose.service"] === "bingoboard");
        assert(/nginx/.test(docker("exec", frontend.Id, "cat", "/proc/1/comm")), "Static nginx serving required");
        for (const [container, port] of [[admin, "18080"], [frontend, "18081"]]) {
            const bindings = container.NetworkSettings.Ports["8080/tcp"] ?? [];
            assert(bindings.some(binding => binding.HostIp === "127.0.0.1" && binding.HostPort === port), `Port ${port} must bind loopback`);
            assert(bindings.every(binding => binding.HostIp === "127.0.0.1"), "No public port binding");
        }
    });
    await attempt("serving", async () => {
        const admin = "http://127.0.0.1:18080";
        const frontend = "http://127.0.0.1:18081";
        // A deployment that is still starting when the agent ends gets 90 s, whatever the route.
        for (let i = 0; i < 45; i++) {
            const up = await Promise.all([`${admin}/login`, `${frontend}/`].map(url =>
                fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5_000) }).then(r => r.status === 200, () => false)));
            if (up.every(Boolean)) break;
            await new Promise(resolve => setTimeout(resolve, 2_000));
        }
        const login = await (await response(admin, "/login")).text();
        assert(login.includes("password") && /<html|<!doctype/i.test(login), "Real admin login HTML required");
        const wrong = await response(admin, "/auth/login", 302, { method: "POST",
            body: new URLSearchParams({ password: `wrong-${randomBytes(8).toString("hex")}` }) });
        assert(wrong.headers.get("location").includes("error=invalid"), "Wrong password must be rejected");
        const success = await response(admin, "/auth/login", 302, { method: "POST",
            body: new URLSearchParams({ password: "LocalAdmin1!", returnUrl: "/squares-management" }) });
        const cookie = success.headers.getSetCookie().find(value => value.startsWith(".AspNetCore.Identity.Application="));
        assert(cookie, "Correct password must issue the real Identity authentication cookie");
        const page = await (await response(admin, "/squares-management", 200, { headers: { cookie: cookie.split(";")[0] } })).text();
        assert(page.includes(state.active.label), "Authenticated admin must read the preserved catalog");
        const av = await (await response(admin, "/api/version-info")).json();
        const fv = await (await response(frontend, "/api/version-info")).json();
        assert(av.dotNetVersion.startsWith("10.") && av.dotNetVersion === fv.dotNetVersion, "Frontend API routing must reach the .NET 10 admin");
        for (const path of ["/@vite/client", "/src/main.js"]) {
            const res = await response(frontend, path);
            assert((res.headers.get("content-type") ?? "").includes("text/html"), "No Vite development scripts");
        }
        const html = await (await response(frontend, "/")).text();
        assert(html.includes('id="app"') && !html.includes("/@vite/client"), "Built Vue index required");
        const asset = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
        assert(asset && state.assets[asset], "Frontend must serve the production bundle built from these sources");
        assert.equal(sha(Buffer.from(await (await response(frontend, asset)).arrayBuffer())), state.assets[asset],
            "Frontend bundle differs from the reference build of these sources");
        for (const origin of [admin, frontend]) {
            const dev = await fetch(`${origin}/api/demo/producer/status`, { redirect: "manual" });
            assert(!((dev.headers.get("content-type") ?? "").includes("application/json")), "Development API JSON forbidden in production");
        }
        const hub = await connect(frontend);
        try {
            const squares = await hub.call("GetAllAvailableSquares", [], "AllSquaresReceived");
            const active = state.catalog.filter(item => item.IsActive);
            assert.deepEqual(squares.map(item => [item.id, item.label, item.type]).sort(),
                active.map(item => [item.Id, item.Label, item.Type]).sort(), "SignalR catalog must read the original database");
            assert(!squares.some(item => item.id === state.inactive.id), "Inactive square must remain hidden");
            const clientId = `verifier-${randomBytes(12).toString("hex")}`;
            const board = await hub.call("RequestBingoSet", [clientId, "Local verifier"], "BingoSetReceived");
            assert.equal(board.squares.length, 25);
            assert.equal(board.squares[12].id, "free");
            const cached = JSON.parse(redis("HGET", `bingo_set_${clientId}`, "data"));
            assert.equal(cached.ClientId, clientId, "Fresh player board must persist in Redis");
        } finally {
            hub.socket.close();
        }
        details.dotnetVersion = av.dotNetVersion;
    });
    // Recorded, not graded: which route produced the deployment.
    details.route = {
        aspireOutput: existsSync("/app/aspire-output/docker-compose.yaml"),
        composeFiles: run("sh", ["-c", "find /app -name '*compose*.y*ml' -newer /opt/benchmark/state.json -not -path '*/node_modules/*' | head -20"]).split("\n").filter(Boolean),
    };
    details.containers = containers.map(item => ({ service: item.Config.Labels["com.docker.compose.service"], image: item.Config.Image }));
    assert.equal(failures.length, 0, failures.join(" | "));
}

const command = process.argv[2];
if (command === "setup") {
    const nonce = randomBytes(10).toString("hex");
    const active = { id: `bench-active-${nonce}`, label: `Preserved square ${nonce}` };
    const inactive = { id: `bench-inactive-${nonce}` };
    sql(`INSERT INTO "BingoSquares" ("Id","Label","Type","IsActive","DisplayOrder","CreatedAt","UpdatedAt")
        VALUES ('${active.id}','${active.label}','benchmark',true,1000,now(),now()),
        ('${inactive.id}','Inactive ${nonce}','benchmark',false,1001,now(),now())`);
    redis("SET", "bingo-existing", nonce);
    const assets = {};
    for (const file of readdirSync("/opt/benchmark/reference-dist/assets")) {
        assets[`/assets/${file}`] = sha(readFileSync(`/opt/benchmark/reference-dist/assets/${file}`));
    }
    const dependencies = Object.fromEntries(["bingo-db", "bingo-cache"].map(name => [name, dependency(name)]));
    writeFileSync(statePath, JSON.stringify({
        fault: "publishing", kind, setupAt: new Date().toISOString(), inputs: inputs(), dependencies,
        infrastructure: ownedInfrastructure(), catalog: catalog(), redis: nonce, active, inactive, assets,
    }, null, 1), { mode: 0o600 });
    console.log(`publishing: ${Object.keys(assets).length} reference assets, ${catalog().length} catalog rows, ${Object.keys(inputs()).length} supplied files`);
} else if (command === "verify") {
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    const details = { fault: "publishing", kind, passed: false };
    try {
        await verify(state, details);
        details.passed = true;
    } catch (error) {
        details.failure = error.message;
        throw error;
    } finally {
        mkdirSync("/logs/verifier", { recursive: true });
        writeFileSync("/logs/verifier/details.json", JSON.stringify(details, null, 1));
        console.log(JSON.stringify(details));
    }
} else if (command === "solve") {
    // The reference deployment, each kind its own documented route: Compose up for the raw model,
    // `aspire deploy` (the Docker Compose environment builds, generates and starts) for the AppHost.
    const env = "set -a; . /app/deployment-inputs.env; set +a";
    const script = kind === "aspire"
        ? `${env}; aspire deploy --apphost /app/apphost.cs --non-interactive --nologo`
        : `${env}; docker compose -f /app/compose.yaml up -d --build`;
    console.log(run("bash", ["-c", `cd /app && ${script}`], { timeout: 1_500_000, stdio: ["ignore", "pipe", "inherit"] }));
} else {
    throw new Error("Usage: node grade.mjs setup|verify|solve");
}
