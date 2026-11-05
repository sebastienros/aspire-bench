import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { copyWorkspaceEntry, instanceEnvironment, instances } from "./common/bootstrap.mjs";
import { owned } from "./common/isolation.mjs";

const root = new URL("./", import.meta.url);
const read = file => readFile(new URL(file, root), "utf8");

test("two full instances have separate roots, namespaces and all fixed raw ports", () => {
    assert.deepEqual(instances.map(instance => instance.root), ["/app", "/neighbor-app"]);
    assert.deepEqual(instances.map(instance => instance.run), ["willow29", "willow92"]);
    assert.equal(new Set(instances.flatMap(instance =>
        [instance.postgres, instance.redis, instance.admin, instance.frontend])).size, 8);
    for (const instance of instances) {
        const env = instanceEnvironment(instance, { BENCH_APP_KIND: "compose", RETAIN: "value" });
        assert.equal(env.RETAIN, "value");
        assert.equal(env.BENCH_RUN_ID, instance.run);
        assert.equal(env.COMPOSE_PROJECT_NAME, instance.run);
        assert.equal(env.ADMIN_PORT, String(instance.admin));
        assert.equal(env.REDIS_PORT, String(instance.redis));
    }
});

test("sibling source copy reuses builds/dependencies but never live AppHost or raw session state", () => {
    for (const file of ["/app", "/app/apphost.cs", "/app/src/BingoBoard.Admin/bin/Debug/net10.0/BingoBoard.Admin.dll",
        "/app/src/bingo-board/node_modules/vite/bin/vite.js"]) assert(copyWorkspaceEntry(file), file);
    for (const file of ["/app/.aspire", "/app/.aspire/state.json", "/app/.script-state",
        "/app/.script-state/admin.log", "/app/.git/config", "/app/benchmark-endpoints.json"]) {
        assert(!copyWorkspaceEntry(file), file);
    }
});

test("identical logical names cannot select the other app's container or a substring match", () => {
    const row = run => ({ Id: run, Name: `/${run}-spindle`, State: { Running: true, Paused: false },
        Config: { Labels: { "com.docker.compose.project": run, "com.docker.compose.service": "spindle" } } });
    const rows = instances.map(instance => row(instance.run));
    for (const kind of ["compose", "aspire"]) {
        assert.equal(owned(rows, "willow29", "spindle", kind).Id, "willow29");
        assert.equal(owned(rows, "willow92", "spindle", kind).Id, "willow92");
        assert.throws(() => owned([rows[1]], "willow29", "spindle", kind));
        assert.throws(() => owned([...rows, row("willow29")], "willow29", "spindle", kind));
    }
    assert.throws(() => owned(rows, "willow", "spindle", "aspire"));
    assert.throws(() => owned(rows, "willow29", "spindle", "unknown"));
});

test("paired tasks keep neutral target-specific symptoms, same external grade and original skill treatment", async () => {
    for (const file of ["instruction.md", "solution/solve.sh", "solution/negative.mjs", "tests/test.sh"]) {
        assert.equal(await read(`tasks/aspire/${file}`), await read(`tasks/raw-scripted/${file}`), file);
    }
    const prompt = await read("tasks/aspire/instruction.md");
    assert.match(prompt, /Two separate Bingo application instances/);
    assert.match(prompt, /Repair only the \/app instance/);
    assert.doesNotMatch(prompt, /Redis|ACL|SETUSER|spindle|willow|aspire (?:start|logs|describe)/);
    assert.equal(await read("tasks/aspire/task.toml"), (await read("tasks/raw-scripted/task.toml"))
        .replace('variant = "raw-scripted"', 'variant = "aspire"')
        .replace('network_mode = "public"\n', 'network_mode = "public"\nskills_dir = "/opt/aspire-skills"\n'));
    for (const arm of ["aspire", "raw-scripted"]) {
        const compose = await read(`tasks/${arm}/environment/docker-compose.yaml`);
        assert.doesNotMatch(compose, /\.\.\//);
        assert.match(compose, /#d3694ec111609a79073dcba35bc1f1b1c9517d8f:/);
        const dockerfile = await read(`tasks/${arm}/environment/Dockerfile`);
        assert.match(dockerfile, /ADD isolation-common\.tar \/opt\/benchmark\//);
        assert.doesNotMatch(dockerfile, /COPY .*solution/);
    }
    assert.match(await read("tasks/aspire/environment/docker-compose.yaml"),
        /#1fcca7e91c89716f0e4a8bf7324da13a39f70c66:/);
});

test("portable environment archives match readable sources and exclude hidden oracle solutions", async () => {
    execFileSync("python3", [fileURLToPath(new URL("package.py", root)), "--check"]);
    const expected = [
        "bingo-isolation/common/bootstrap.mjs", "bingo-isolation/common/entrypoint.sh",
        "bingo-isolation/common/isolation.mjs", "bingo-isolation/common/processes.mjs",
        "bingo-transfer/common/acl.mjs", "bingo-transfer/common/transfer.mjs",
    ];
    for (const arm of ["aspire", "raw-scripted"]) {
        const archive = fileURLToPath(new URL(`tasks/${arm}/environment/isolation-common.tar`, root));
        assert.deepEqual(execFileSync("tar", ["-tf", archive], { encoding: "utf8" }).trim().split("\n"), expected);
        for (const member of expected) {
            assert.equal(execFileSync("tar", ["-xOf", archive, member], { encoding: "utf8" }),
                await readFile(new URL(`../${member}`, root), "utf8"));
        }
    }
});

test("live setup requires four processes/origins/dependencies and fresh full-neighbor functionality during target failure", async () => {
    const source = await read("common/isolation.mjs");
    for (const proof of ["rows.length, 4", "new Set(pids).size, 4", "state.instances.length, 2",
        "state.instances.flatMap(instance => Object.values(instance.urls))", "connectionOwnership",
        "matchesProxyConnection", "verifyCredentials", "verifyInjectedAcl",
        'method: "POST" }, 500', "functional(state.instances[1], state.instances[0], rows)",
        "neighborFreshFunctionalRoundtrip: true"]) assert(source.includes(proof), proof);
    assert.doesNotMatch(source, /redis-only|docker.*pause|CLIENT.*PAUSE|faultExpiresAt/);
});

test("grade probes actual SQL/Redis/status flows for both apps, preserves both process/security/data identities and rejects cross-app leaks", async () => {
    const source = await read("common/isolation.mjs");
    for (const proof of ["functional(state.instances[0], state.instances[1], rows)",
        "functional(state.instances[1], state.instances[0], rows)", "row_to_json(s)", "otherDatabase",
        "otherCache", "otherStatus.calledSquares.includes(id)", "verifyRedisWrites", "verifyHttp",
        "instance.security.acl", "instance.security.config", "instance.processes", "instance.inputs",
        "instance.endpoints", "instance.data.squares", '["users", "history", "identity"]',
        "verifyTransferEvents", "verifyContainers", "post([]), 400", 'method: "POST" }, 404']) {
        assert(source.includes(proof), proof);
    }
    assert.doesNotMatch(source, /readFile\([^)]*report|catch\s*\{\s*return/);
    const negative = await read("tasks/aspire/solution/negative.mjs");
    for (const proof of ["wrong real application repair", "healthy wrong-application endpoint substitution",
        "other application's existing SQL data changed", "other application's existing call state changed",
        "wrong-app action hidden by restoring final ACL", "assert.rejects(verify"]) {
        assert(negative.includes(proof), proof);
    }
});
