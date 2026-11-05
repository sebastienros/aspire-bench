import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, lstatSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = "/app";
const statePath = "/opt/benchmark/state.json";
const run = (command, args, options = {}) => execFileSync(command, args, {
    encoding: "utf8", timeout: 120_000, maxBuffer: 8 * 1024 * 1024, ...options,
}).trim();
const docker = (...args) => run("docker", args);
const sql = query => docker("exec", "p01-db", "psql", "-U", "postgres", "-d", "bingo", "-Atc", query);
const redis = (...args) => docker("exec", "p01-cache", "redis-cli", "--raw", ...args);
const sha = data => createHash("sha256").update(data).digest("hex");
const inspect = name => JSON.parse(docker("inspect", name))[0];
const ignored = new Set(["bin", "obj", "node_modules", "dist", ".aspire", ".script-state", ".git"]);
function inputs(directory = root, result = {}) {
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        const key = relative(root, path);
        if (ignored.has(entry) || key === "deployment"
            || (process.env.BENCH_APP_KIND === "aspire" && key === "apphost.cs"
                && process.env.BENCH_PRECONFIGURED !== "true")) continue;
        const stat = lstatSync(path);
        assert(!stat.isSymbolicLink(), `Input symlink not permitted: ${key}`);
        if (stat.isDirectory()) inputs(path, result);
        else result[key] = sha(readFileSync(path));
    }
    return result;
}
const catalog = () => JSON.parse(sql(`SELECT json_agg(t) FROM
    (SELECT "Id","Label","Type","IsActive","DisplayOrder" FROM "BingoSquares" ORDER BY "Id") t`));
function dependency(name) {
    const item = inspect(name);
    return { id: item.Id, startedAt: item.State.StartedAt,
        restarts: item.RestartCount, config: item.Config, mounts: item.Mounts,
        networks: item.NetworkSettings.Networks };
}
function ownedInfrastructure() {
    const network = JSON.parse(docker("network", "inspect", "p01-net"))[0];
    const volume = JSON.parse(docker("volume", "inspect", "p01-data"))[0];
    return {
        network: { id: network.Id, name: network.Name, created: network.Created,
            driver: network.Driver, internal: network.Internal, ipam: network.IPAM,
            options: network.Options, labels: network.Labels },
        volume: { name: volume.Name, created: volume.CreatedAt, driver: volume.Driver,
            options: volume.Options, labels: volume.Labels, scope: volume.Scope },
    };
}
async function response(origin, path, status = 200, init = {}) {
    const res = await fetch(new URL(path, origin), {
        ...init, redirect: "manual", signal: AbortSignal.timeout(10_000),
    });
    assert.equal(res.status, status, `${path}: HTTP ${res.status}, expected ${status}`);
    return res;
}
export async function connect(origin) {
    const negotiation = await (await response(origin,
        "/bingohub/negotiate?negotiateVersion=1", 200, { method: "POST" })).json();
    assert(negotiation.connectionToken && negotiation.availableTransports.length,
        "Real SignalR negotiation required");
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
async function runtime(state) {
    assert.deepEqual(inputs(), state.inputs, "Immutable owned inputs changed");
    for (const name of ["p01-db", "p01-cache"]) {
        assert.deepEqual(dependency(name), state.dependencies[name], `Environment ownership changed: ${name}`);
    }
    assert.deepEqual(ownedInfrastructure(), state.infrastructure, "Environment-owned network or volume changed");
    assert.deepEqual(catalog(), state.catalog, "Existing seed data must survive unchanged");
    assert.equal(redis("GET", "p01-existing"), state.redis, "Existing Redis data must survive");
    const ids = docker("ps", "-aq", "--filter", "label=com.docker.compose.project=p01-deploy").split("\n").filter(Boolean);
    assert.equal(ids.length, 2, "Exactly two published deployment services required; no no-op/AppHost/dependencies");
    const containers = ids.map(inspect);
    assert.deepEqual(containers.map(item => item.Config.Labels["com.docker.compose.service"]).sort(),
        ["bingoboard", "boardadmin"]);
    for (const item of containers) {
        assert(item.State.Running, "Deployment container must be running");
        assert.equal(item.Mounts.length, 0, "Deployment must not bind-mount source or host outputs");
        assert(item.NetworkSettings.Networks["p01-net"], "Deployment must use supplied external network");
        assert(!/apphost|vite|npm|watch|dotnet run/i.test(JSON.stringify([item.Path, item.Args])),
            "Development/AppHost services are forbidden");
    }
    const adminContainer = containers.find(item => item.Config.Labels["com.docker.compose.service"] === "boardadmin");
    for (const key of ["DOTNET_ENVIRONMENT", "ASPNETCORE_ENVIRONMENT"]) {
        assert(adminContainer.Config.Env.includes(`${key}=Production`), `${key} must be Production`);
    }
    docker("exec", adminContainer.Id, "test", "-f", "/app/BingoBoard.Admin.dll");
    const frontendContainer = containers.find(item => item.Config.Labels["com.docker.compose.service"] === "bingoboard");
    assert(/nginx/.test(docker("exec", frontendContainer.Id, "cat", "/proc/1/comm")), "Static nginx serving required");
    const admin = "http://127.0.0.1:18080";
    const frontend = "http://127.0.0.1:18081";
    for (const [container, port] of [[adminContainer, "18080"], [frontendContainer, "18081"]]) {
        const bindings = container.NetworkSettings.Ports["8080/tcp"];
        assert(bindings.some(binding => binding.HostIp === "127.0.0.1" && binding.HostPort === port),
            "Deployment ports must bind loopback");
        assert(bindings.every(binding => binding.HostIp === "127.0.0.1"), "No public port binding");
    }
    const login = await (await response(admin, "/login")).text();
    assert(login.includes("password") && /<html|<!doctype/i.test(login), "Real admin login HTML required");
    const wrong = await response(admin, "/auth/login", 302, { method: "POST",
        body: new URLSearchParams({ password: `wrong-${randomBytes(8).toString("hex")}` }) });
    assert(wrong.headers.get("location").includes("error=invalid"), "Wrong password must be rejected");
    assert(!wrong.headers.get("set-cookie")?.includes(".AspNetCore.Identity.Application"),
        "Wrong login must not authenticate");
    const success = await response(admin, "/auth/login", 302, { method: "POST",
        body: new URLSearchParams({ password: "LocalAdmin1!", returnUrl: "/squares-management" }) });
    const cookie = success.headers.getSetCookie().find(value => value.startsWith(".AspNetCore.Identity.Application="));
    assert(cookie, "Correct password must issue the real Identity authentication cookie");
    assert.equal(success.headers.get("location"), "/squares-management");
    const page = await (await response(admin, "/squares-management", 200,
        { headers: { cookie: cookie.split(";")[0] } })).text();
    assert(page.includes(state.active.label), "Authenticated admin must read preserved catalog");
    const av = await (await response(admin, "/api/version-info")).json();
    const fv = await (await response(frontend, "/api/version-info")).json();
    assert(av.dotNetVersion.startsWith("10.") && av.dotNetVersion === fv.dotNetVersion,
        "Static frontend API routing must reach actual .NET10 admin");
    for (const path of ["/@vite/client", "/src/main.js"]) {
        const res = await response(frontend, path);
        assert((res.headers.get("content-type") ?? "").includes("text/html"), "No Vite development scripts");
    }
    const html = await (await response(frontend, "/")).text();
    assert(html.includes('id="app"') && !html.includes("/@vite/client"), "Built Vue index required");
    const asset = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
    assert(asset && state.assets[asset], "Frontend must reference original built Vue bundle");
    assert.equal(sha(Buffer.from(await (await response(frontend, asset)).arrayBuffer())), state.assets[asset],
        "Frontend must serve the actual original production bundle");
    for (const origin of [admin, frontend]) {
        const dev = await fetch(`${origin}/api/demo/producer/status`, { redirect: "manual" });
        assert(dev.status === 404 || ((dev.headers.get("content-type") ?? "").includes("text/html")),
            "Development-only producer API must not be exposed");
        assert(!((dev.headers.get("content-type") ?? "").includes("application/json")),
            "Development API JSON forbidden in production");
    }
    const hub = await connect(frontend);
    try {
        const squares = await hub.call("GetAllAvailableSquares", [], "AllSquaresReceived");
        const active = state.catalog.filter(item => item.IsActive);
        assert.deepEqual(squares.map(item => [item.id, item.label, item.type]).sort(),
            active.map(item => [item.Id, item.Label, item.Type]).sort(),
            "SignalR catalog must read original DB including nonce, not fallback/demo data");
        assert(!squares.some(item => item.id === state.inactive.id), "Inactive square must remain hidden");
        const clientId = `p01-verifier-${randomBytes(12).toString("hex")}`;
        const board = await hub.call("RequestBingoSet", [clientId, "Local verifier"], "BingoSetReceived");
        assert.equal(board.squares.length, 25);
        assert.equal(board.squares[12].id, "free");
        assert(board.squares.every(square => active.some(item => item.Id === square.id)), "Real DB board required");
        const cached = JSON.parse(redis("HGET", `bingo_set_${clientId}`, "data"));
        assert.equal(cached.ClientId, clientId, "Fresh player board must persist in actual Redis");
        assert.equal(cached.Squares.length, 25);
        const invalid = await hub.call("P01MethodThatDoesNotExist", [], null);
        assert(invalid.error, "Invalid SignalR method must fail");
    } finally {
        hub.socket.close();
    }
    mkdirSync("/logs/verifier", { recursive: true });
    const imagePins = {};
    for (const reference of ["postgres:18.3", "redis:8.6",
        "mcr.microsoft.com/dotnet/sdk:10.0.100-noble", "mcr.microsoft.com/dotnet/aspnet:10.0.12-noble",
        "node:24.14.0-bookworm-slim", "nginxinc/nginx-unprivileged:1.28-alpine"]) {
        const image = JSON.parse(docker("image", "inspect", reference))[0];
        imagePins[reference] = { id: image.Id, repoDigests: image.RepoDigests };
    }
    writeFileSync("/logs/verifier/checks.json", JSON.stringify({
        arm: process.env.BENCH_APP_KIND,
        aspireCliVersion: process.env.BENCH_APP_KIND === "aspire" ? run("aspire", ["--version"]) : null,
        environment: "Production",
        dotnetVersion: av.dotNetVersion,
        asset,
        assetSha256: state.assets[asset],
        inputsSha256: sha(JSON.stringify(state.inputs)),
        businessInputsSha256: sha(JSON.stringify(Object.fromEntries(
            Object.entries(state.inputs).filter(([path]) => path.startsWith("src/"))))),
        imagePins,
        catalogRows: state.catalog.length,
        activeCatalogRows: state.catalog.filter(item => item.IsActive).length,
        dependencyOwnershipPreserved: true,
        infrastructurePreserved: true,
        priorRedisStatePreserved: true,
        correctLoginAccepted: true,
        incorrectLoginRejected: true,
        signalRWebSocketCatalogAndFreshRedisBoard: true,
        unknownSignalRMethodRejected: true,
        containers: containers.map(item => ({
            service: item.Config.Labels["com.docker.compose.service"],
            id: item.Id, imageId: item.Image, ports: item.NetworkSettings.Ports,
        })),
    }, null, 2));
    console.log("PASS: production containers, static Vue, real login/version/SignalR/DB/Redis, preserved inputs and ownership");
}
if (process.argv[2] === "setup") {
    const nonce = randomBytes(10).toString("hex");
    const active = { id: `p01-active-${nonce}`, label: `Preserved square ${nonce}` };
    const inactive = { id: `p01-inactive-${nonce}` };
    sql(`INSERT INTO "BingoSquares" ("Id","Label","Type","IsActive","DisplayOrder","CreatedAt","UpdatedAt")
        VALUES ('${active.id}','${active.label}','benchmark',true,1000,now(),now()),
        ('${inactive.id}','Inactive ${nonce}','benchmark',false,1001,now(),now())`);
    redis("SET", "p01-existing", nonce);
    const assets = {};
    for (const file of readdirSync("/app/src/bingo-board/dist/assets")) {
        assets[`/assets/${file}`] = sha(readFileSync(`/app/src/bingo-board/dist/assets/${file}`));
    }
    const dependencies = Object.fromEntries(["p01-db", "p01-cache"].map(name => [name, dependency(name)]));
    writeFileSync(statePath, JSON.stringify({
        inputs: inputs(), dependencies, infrastructure: ownedInfrastructure(),
        catalog: catalog(), redis: nonce, active, inactive, assets,
    }, null, 2));
    console.log("Seeded and snapshotted owned inputs, original seed data and dependency identity");
} else if (process.argv[2] === "verify") {
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    if (process.env.BENCH_APP_KIND === "aspire" && !process.argv.includes("--runtime-only")) {
        const apphost = readFileSync("/app/apphost.cs", "utf8");
        const directives = apphost.match(/^#:.*$/gm) ?? [];
        assert(directives.includes("#:sdk Aspire.AppHost.Sdk@13.6.0"),
            "AppHost SDK must preserve the supplied 13.6 release family");
        const hostingPackages = directives.filter(line => /^#:package Aspire\.Hosting(?:\.|@)/.test(line));
        assert(hostingPackages.includes("#:package Aspire.Hosting.Docker@13.6.0")
            && hostingPackages.every(line => line.endsWith("@13.6.0")),
            "Aspire Hosting packages must preserve the supplied 13.6 release family");
        assert(apphost.includes("AddDockerComposeEnvironment"), "Aspire environment must model deployment");
        assert(apphost.includes("AddDockerfile"), "Production resources must belong to AppHost");
        const out = "/tmp/p01-republished";
        run("aspire", ["publish", "--apphost", "/app/apphost.cs", "--output-path", out, "--non-interactive"], {
            cwd: root, env: { ...process.env, DOTNET_ENVIRONMENT: "Production",
                ASPNETCORE_ENVIRONMENT: "Production", Parameters__admin_password: "LocalAdmin1!",
                ConnectionStrings__db: "Host=p01-db;Database=bingo;Username=postgres;Password=LocalDatabase1!",
                ConnectionStrings__cache: "p01-cache:6379" },
        });
        assert.equal(readFileSync("/app/deployment/docker-compose.yaml", "utf8"),
            readFileSync(`${out}/docker-compose.yaml`, "utf8"),
            "Ejected/fake YAML rejected: deployed Compose must match independent AppHost publish");
    }
    await runtime(state);
}
