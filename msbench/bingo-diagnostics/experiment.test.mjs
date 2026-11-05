import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { databaseName, matchesProxyConnection, redisExecArgs, sqlExecArgs } from "./common/diagnostics.mjs";
import {
    pauseDurationMs, snapshot, verifyContainers, verifyEvents, verifyFaultWindow, verifyRedisWrites,
} from "./common/policy.mjs";

const root = new URL("./", import.meta.url);
const read = file => readFile(new URL(file, root), "utf8");
const target = { id: "owned", name: "/amber47-spindle", paused: false, running: true,
    startedAt: "original", restarts: 0 };
const neighbor = { id: "neighbor", name: "/amber74-spindle", paused: false, running: true,
    startedAt: "original", restarts: 0 };
const event = (Action, id = target.id) => ({ Action, Actor: { ID: id } });

test("Aspire ownership uses actual proxy URLs rather than unrelated Docker published ports", () => {
    const resource = { urls: [{ url: "tcp://localhost:42000" }, { url: "rediss://localhost:42001" }] };
    assert(matchesProxyConnection("localhost:42001,password=not-printed,ssl=True", "cache", resource));
    assert(matchesProxyConnection("127.0.0.1:42000", "cache", resource));
    assert(!matchesProxyConnection("localhost:43000", "cache", resource));
    assert(!matchesProxyConnection("other-host:42001", "cache", resource));
    assert(matchesProxyConnection("Host=localhost;Port=42000;Database=db;Password=not-printed", "database", resource));
    assert(!matchesProxyConnection("Host=localhost;Port=43000", "database", resource));
    assert.equal(databaseName("compose"), "bingo");
    assert.equal(databaseName("aspire"), "db");
    assert.throws(() => databaseName("unknown"));
});

test("Redis probes preserve TLS and authenticate without embedding or printing a password", () => {
    const config = { Env: ["REDIS_PASSWORD=not-printed"], Cmd: ["--tls-port", "6380"] };
    const args = redisExecArgs({ Id: "owned", Config: config }, ["CLIENT", "UNPAUSE"]);
    assert(args.includes('REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli --raw "$@"'));
    assert(args.includes("--tls"));
    assert(!args.join(" ").includes("not-printed"));
    assert.deepEqual(redisExecArgs({ Id: "raw", Config: { Env: [] } }, ["PING"]),
        ["exec", "raw", "redis-cli", "--raw", "PING"]);
});

test("SQL probes use container-owned credentials and the orchestration's actual database", () => {
    const args = sqlExecArgs({ Id: "owned" }, "SELECT 1", "aspire");
    assert(args.includes('PGPASSWORD="$POSTGRES_PASSWORD" psql "$@"'));
    assert.equal(args[args.indexOf("-d") + 1], "db");
    assert.equal(args.at(-1), "SELECT 1");
    const raw = sqlExecArgs({ Id: "raw" }, "SELECT 1", "compose");
    assert.equal(raw[raw.indexOf("-d") + 1], "bingo");
});

test("protocol recovery preserves all container identities without relying on Docker paused state", () => {
    verifyContainers([target, neighbor], [target, neighbor]);
    for (const [label, rows] of [
        ["replacement", [{ ...target, id: "replacement" }, neighbor]],
        ["restart", [{ ...target, startedAt: "new" }, neighbor]],
        ["broad reset", [{ ...target, restarts: 1 }, neighbor]],
        ["Docker pause", [{ ...target, paused: true }, neighbor]],
        ["wrong target", [target, { ...neighbor, paused: true }]],
        ["additional instance", [target, neighbor, { ...neighbor, id: "extra" }]],
    ]) assert.throws(() => verifyContainers([target, neighbor], rows), undefined, label);
});

test("Docker events reject transient wrong-target changes and broad lifecycle shortcuts", () => {
    verifyEvents([], target.id);
    verifyEvents([event("exec_create: redis-cli PING"),
        event("exec_create: redis-cli --tls CLIENT UNPAUSE"), event("exec_die")], target.id);
    for (const rows of [
        [event("exec_create: redis-cli CLIENT UNPAUSE", neighbor.id)],
        [event("exec_create: redis-cli CLIENT PAUSE 60000 WRITE", neighbor.id),
            event("exec_create: redis-cli CLIENT UNPAUSE", neighbor.id)],
        ...["restart", "stop", "kill", "destroy", "create", "start", "die", "pause", "unpause"]
            .map(action => [event(action)]),
    ]) assert.throws(() => verifyEvents(rows, target.id));
});

test("healthy PING/read paths do not satisfy the fresh functional Redis write contract", async () => {
    const calls = [];
    await verifyRedisWrites(async args => {
        calls.push(args);
        return { SET: "OK", GET: "nonce-value", DEL: "1" }[args[0]];
    }, "nonce-key", "nonce-value");
    assert.deepEqual(calls, [
        ["SET", "nonce-key", "nonce-value", "PX", "30000"],
        ["GET", "nonce-key"], ["DEL", "nonce-key"],
    ]);
    await assert.rejects(() => verifyRedisWrites(async args => {
        if (args[0] === "SET") throw new Error("Write blocked despite PONG and working reads");
        return "PONG";
    }, "nonce-key", "nonce-value"), /Write blocked/);
    for (const replies of [
        { SET: "PONG", GET: "nonce-value", DEL: "1" },
        { SET: "OK", GET: "stale-value", DEL: "1" },
        { SET: "OK", GET: "nonce-value", DEL: "0" },
    ]) await assert.rejects(() => verifyRedisWrites(async args => replies[args[0]], "nonce-key", "nonce-value"));
});

test("bounded fault cannot expire into a successful no-op within the grading contract", () => {
    assert(pauseDurationMs > (900 + 300) * 1000, "Pause must outlast the declared agent and verifier budgets");
    verifyFaultWindow(1000 + pauseDurationMs, 1000);
    for (const expiry of [0, NaN, undefined, "later", 1000]) {
        assert.throws(() => verifyFaultWindow(expiry, 1000), /automatic expiry must not count as repair/);
    }
});

test("snapshot includes ownership, immutable identities, ports, mounts and runtime state", () => {
    const row = { Id: "id", Name: "/name", Image: "sha", State: {
        StartedAt: "time", Running: true, Paused: false,
    }, RestartCount: 0, Config: { Labels: { owner: "target" } },
    Mounts: [{ Name: "persistent" }], HostConfig: { PortBindings: { "6379/tcp": [] } } };
    const value = snapshot(row);
    assert.equal(value.image, "sha");
    assert.equal(value.labels.owner, "target");
    assert.deepEqual(value.mounts, row.Mounts);
    assert.deepEqual(value.ports, row.HostConfig.PortBindings);
});

test("matched static Harbor tasks have neutral symptom prompts and identical grader/budgets", async () => {
    for (const file of ["instruction.md", "solution/solve.sh", "solution/negative.mjs", "tests/test.sh"]) {
        assert.equal(await read(`tasks/aspire/${file}`), await read(`tasks/raw-scripted/${file}`), file);
    }
    const prompt = await read("tasks/aspire/instruction.md");
    assert.match(prompt, /calling a square fails/);
    assert.doesNotMatch(prompt, /Redis|pause|spindle|folio|docker unpause|aspire (?:start|logs|describe)|vite\.config/);
    assert.equal(await read("tasks/aspire/task.toml"),
        (await read("tasks/raw-scripted/task.toml"))
            .replace('variant = "raw-scripted"', 'variant = "aspire"')
            .replace('network_mode = "public"\n', 'network_mode = "public"\nskills_dir = "/opt/aspire-skills"\n'));
    for (const arm of ["aspire", "raw-scripted"]) {
        const compose = await read(`tasks/${arm}/environment/docker-compose.yaml`);
        assert.match(compose, /diagnostics-common: \.\.\/\.\.\/\.\.\/common/);
        assert.match(compose, /#baacba3e17181491c9a4d419db7d0e6763c3d363:/);
        assert.doesNotMatch(compose, /vally|volumes:|ports:/i);
        const dockerfile = await read(`tasks/${arm}/environment/Dockerfile`);
        assert.match(dockerfile, /--version 13\.6\.0/);
        assert.match(dockerfile, /COPY --from=diagnostics-common \/ \/opt\/benchmark\//);
        assert.doesNotMatch(dockerfile, /COPY .*solution/);
        assert.match(await read(`tasks/${arm}/task.toml`), /test -f \/opt\/benchmark\/ready/);
    }
});

test("held-out names match real ownership and retain application connection keys", async () => {
    const apphost = await read("tasks/aspire/environment/app/apphost.cs");
    assert.match(apphost, /AddRedis\("spindle"\)/);
    assert.match(apphost, /WithReference\(cache, connectionName: "cache"\)/);
    assert.match(apphost, /AddPostgres\("folio"\)/);
    const compose = await read("tasks/raw-scripted/environment/app/compose.yaml");
    assert.match(compose, /  spindle:/);
    assert.match(compose, /  folio:/);
    const scripts = await read("tasks/raw-scripted/environment/app/scripts/common.sh");
    assert.match(scripts, /exec -T spindle redis-cli/);
    assert.match(scripts, /exec -T folio psql/);
});

test("external grader requires actual incident, fresh effects, preservation and negative contracts", async () => {
    const source = await read("common/diagnostics.mjs");
    for (const proof of [
        '["CLIENT", "PAUSE", String(pauseDurationMs), "WRITE"]', 'method: "POST" }, 500',
        "The square could not be updated", '["PING"]', "verifyRedisWrites", "verifyFaultWindow",
        "verifyConnectionOwnership", "ConnectionStrings__cache", "row_to_json(s)", "randomBytes(10)",
        '"HGET"', '"True"', '"False"', "state.databaseRows", "state.decoyKey",
        "state.inputs", "state.endpoints", "state.processes", "verifyEvents",
        "post([]), 400", "}, 404",
    ]) assert(source.includes(proof), proof);
    assert.doesNotMatch(source, /readFile\([^)]*report|catch\s*\{\s*(?:return|continue)/);
    const negatives = await read("tasks/aspire/solution/negative.mjs");
    assert.match(negatives, /assert\.rejects\(verify/);
    assert.match(negatives, /wrong-target action hidden by restoring final state/);
    assert.match(negatives, /changed pre-fault database data/);
    assert.match(negatives, /lost pre-fault called-square state/);
    for (const runnable of [source, negatives, await read("tasks/aspire/solution/solve.sh")]) {
        assert.doesNotMatch(runnable, /docker (?:pause|unpause)|\["(?:pause|unpause)",/i,
            "Nested Docker freezer commands must not remain runnable");
    }
});
