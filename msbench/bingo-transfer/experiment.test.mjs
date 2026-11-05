import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
    defaultAcl, denyWrites, digest, normalizeAcl, restoreWrites,
    verifyAclRecovery, verifyCredentials, verifyInjectedAcl, verifyTransferEvents,
} from "./common/acl.mjs";
import { redisJsonExecArgs, runtimeSnapshot } from "./common/transfer.mjs";
import { verifyContainers, verifyRedisWrites } from "../bingo-diagnostics/common/policy.mjs";

const root = new URL("./", import.meta.url);
const read = file => readFile(new URL(file, root), "utf8");
const rawAcl = ["user default on nopass ~* &* +@all"];
const authAcl = [`user default on #${digest("test-only-password")} ~* &* +@all`];
const deniedAcl = rawAcl.map(line => `${line} -@write`);
const event = (Action, id = "target") => ({ Action, Actor: { ID: id } });

test("X01 injects only a persistent write-category denial, preserving every original ACL property", () => {
    assert.deepEqual(denyWrites, ["ACL", "SETUSER", "default", "-@write"]);
    assert.deepEqual(restoreWrites, ["ACL", "SETUSER", "default", "+@write"]);
    verifyInjectedAcl(rawAcl, deniedAcl);
    verifyInjectedAcl(authAcl, authAcl.map(line => `${line} -@write`));
    const other = "user observer on nopass ~* &* +@read";
    verifyInjectedAcl([...rawAcl, other], [...deniedAcl, other]);
    for (const after of [
        rawAcl, ["user default off nopass ~* &* +@all -@write"],
        ["user default on nopass ~other* &* +@all -@write"],
        ["user default on nopass ~* &* -@all"],
        [...deniedAcl, "user unexpected on nopass ~* &* +@all"],
    ]) assert.throws(() => verifyInjectedAcl(rawAcl, after));
    assert.throws(() => verifyInjectedAcl(authAcl, deniedAcl), /credentials/);
    assert.throws(() => defaultAcl([]));
    assert.throws(() => normalizeAcl("not Redis output"));
});

test("native ACL/config probes preserve TLS and the existing password without argument disclosure", () => {
    const row = { Id: "owned", Config: {
        Env: ["REDIS_PASSWORD=test-only-password"], Cmd: ["--tls-port", "6380"],
    } };
    const args = redisJsonExecArgs(row, ["ACL", "LIST"]);
    assert(args.includes('REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli --json "$@"'));
    assert(args.includes("--tls") && args.includes("--cacert"));
    assert(args.includes("-3"), "CONFIG GET must use RESP3 map shape");
    assert(!args.join(" ").includes("test-only-password"));
    assert.deepEqual(redisJsonExecArgs({ Id: "raw", Config: { Env: [] } }, ["ACL", "LIST"]),
        ["exec", "raw", "redis-cli", "--json", "-3", "ACL", "LIST"]);
});

test("original raw nopass and Aspire authenticated/TLS states are verified, not normalized to one baseline", () => {
    verifyCredentials(rawAcl, "localhost:6379", { "tls-port": "0" }, []);
    verifyCredentials(authAcl, "localhost:6380,password=test-only-password,ssl=true",
        { "tls-port": "6380" }, ["REDIS_PASSWORD=test-only-password"]);
    for (const [acl, connection, config, env] of [
        [rawAcl, "localhost:6380,password=test-only-password,ssl=true", { "tls-port": "6380" }, ["REDIS_PASSWORD=test-only-password"]],
        [authAcl, "localhost:6379", { "tls-port": "0" }, []],
        [authAcl, "localhost:6380,password=wrong,ssl=true", { "tls-port": "6380" }, ["REDIS_PASSWORD=wrong"]],
        [authAcl, "localhost:6380,password=test-only-password", { "tls-port": "6380" }, ["REDIS_PASSWORD=test-only-password"]],
        [authAcl, "localhost:6380,password=test-only-password,ssl=true,user=other", { "tls-port": "6380" }, ["REDIS_PASSWORD=test-only-password"]],
    ]) assert.throws(() => verifyCredentials(acl, connection, config, env));
});

test("the grade rejects healthy reads, no-op and password/ACL resets despite possible HTTP availability", async () => {
    verifyAclRecovery(rawAcl, rawAcl);
    verifyAclRecovery(authAcl, authAcl);
    verifyAclRecovery(rawAcl, rawAcl.map(line => `${line} +@write`));
    verifyAclRecovery(authAcl, authAcl.map(line => `${line} +@write +publish`));
    for (const after of [deniedAcl, rawAcl, ["user default on nopass ~* &* +@read"],
        authAcl.map(line => line.replace(/#[a-f0-9]+/, `#${digest("replacement")}`))]) {
        assert.throws(() => verifyAclRecovery(authAcl, after), /Original Redis ACL/);
    }
    await assert.rejects(() => verifyRedisWrites(async () => "NOPERM write denied", "fresh", "value"));
});

test("exact-container/config preservation rejects replacement, restart, credential environment and broad lifecycle changes", () => {
    const row = { Id: "target", Name: "/cedar83-quill", Image: "sha",
        State: { StartedAt: "original", Running: true, Paused: false }, RestartCount: 0,
        Config: { Env: ["REDIS_PASSWORD=test-only-password"], Labels: { owner: "cedar83" } },
        Mounts: [], HostConfig: { PortBindings: {} } };
    const before = runtimeSnapshot(row);
    verifyContainers([before], [runtimeSnapshot(row)]);
    for (const changed of [
        { ...row, Id: "replacement" }, { ...row, RestartCount: 1 },
        { ...row, State: { ...row.State, Paused: true } },
        { ...row, Config: { ...row.Config, Env: ["REDIS_PASSWORD=replacement"] } },
    ]) assert.throws(() => verifyContainers([before], [runtimeSnapshot(changed)]));
    verifyTransferEvents([event("exec_create: redis-cli ACL SETUSER default +@write")], "target");
    for (const events of [
        [event("exec_create: redis-cli ACL SETUSER default +@write", "neighbor")],
        [event("exec_create: redis-cli ACL SETUSER default -@write", "neighbor"),
            event("exec_create: redis-cli ACL SETUSER default +@write", "neighbor")],
        [event("exec_create: redis-cli ACL SETUSER default resetpass nopass")],
        [event("exec_create: redis-cli CONFIG SET requirepass replacement")],
        ...["restart", "stop", "die", "create", "destroy", "pause", "unpause"].map(action => [event(action)]),
    ]) assert.throws(() => verifyTransferEvents(events, "target"));
});

test("two static arms have identical neutral prompts, oracle negatives, external grader and budgets", async () => {
    for (const file of ["instruction.md", "solution/solve.sh", "solution/negative.mjs", "tests/test.sh"]) {
        assert.equal(await read(`tasks/aspire/${file}`), await read(`tasks/raw-scripted/${file}`), file);
    }
    const prompt = await read("tasks/aspire/instruction.md");
    assert.match(prompt, /calling a square fails/);
    assert.doesNotMatch(prompt, /Redis|ACL|quill|ledger|cedar|aspire (?:start|logs|describe)|SETUSER/);
    assert.equal(await read("tasks/aspire/task.toml"), (await read("tasks/raw-scripted/task.toml"))
        .replace('variant = "raw-scripted"', 'variant = "aspire"')
        .replace('network_mode = "public"\n', 'network_mode = "public"\nskills_dir = "/opt/aspire-skills"\n'));
    for (const arm of ["aspire", "raw-scripted"]) {
        const compose = await read(`tasks/${arm}/environment/docker-compose.yaml`);
        assert.match(compose, /#d3694ec111609a79073dcba35bc1f1b1c9517d8f:/);
        assert.doesNotMatch(compose, /\.\.\//, "No outside-environment Bake fs.read grant");
        assert.doesNotMatch(compose, /vally|volumes:|ports:/i);
        const dockerfile = await read(`tasks/${arm}/environment/Dockerfile`);
        assert.match(dockerfile, /BENCH_RUN_ID=cedar83/);
        assert.match(dockerfile, /BENCH_FAULT_SEED=83/);
        assert.match(dockerfile, /bingo-diagnostics\/common/);
        assert.match(dockerfile, /ADD transfer-common\.tar \/opt\/benchmark\/bingo-transfer\/common\//);
        assert.doesNotMatch(dockerfile, /COPY .*solution|WITHOUT|disable.*tls/i);
    }
});

test("environment-local deterministic archives exactly match readable shared code, without oracle or unsafe paths", async () => {
    const files = ["acl.mjs", "bootstrap-aspire.sh", "entrypoint.sh", "transfer.mjs"];
    const archives = await Promise.all(["aspire", "raw-scripted"].map(arm =>
        readFile(new URL(`tasks/${arm}/environment/transfer-common.tar`, root))));
    assert.deepEqual(archives[0], archives[1], "Both image snapshots must be identical");
    for (const arm of ["aspire", "raw-scripted"]) {
        const archive = fileURLToPath(new URL(`tasks/${arm}/environment/transfer-common.tar`, root));
        const members = execFileSync("tar", ["-tf", archive], { encoding: "utf8" }).trim().split("\n");
        assert.deepEqual(members, files);
        for (const file of files) {
            assert.equal(execFileSync("tar", ["-xOf", archive, file], { encoding: "utf8" }),
                await read(`common/${file}`), `${arm}/${file}`);
        }
    }
});

test("new held-out resource names are the only AppHost change and connection keys remain cache/db", async () => {
    const apphost = await read("tasks/aspire/environment/app/apphost.cs");
    const old = await readFile(new URL("../bingo-diagnostics/tasks/aspire/environment/app/apphost.cs", root), "utf8");
    assert.equal(apphost, old.replaceAll("spindle", "quill").replaceAll("folio", "ledger")
        .replaceAll("binder", "scribe").replaceAll("usher", "steward").replaceAll("parquet", "mosaic"));
    const compose = await read("tasks/raw-scripted/environment/app/compose.yaml");
    assert.match(compose, /  quill:/);
    assert.match(compose, /  ledger:/);
    assert.match(await read("tasks/raw-scripted/environment/app/scripts/common.sh"), /source .*base-common\.sh/);
});

test("external evidence grades live behavior/data/security, not an agent report or expiring pause", async () => {
    const source = await read("common/transfer.mjs");
    for (const proof of ["verifyCredentials", "verifyInjectedAcl", "verifyAclRecovery", "securityPreserved",
        "backendConnection", "matchesProxyConnection", "ConnectionStrings__cache", "randomBytes(12)",
        "databaseState", "state.databaseState.squares", "state.processes", "state.containers",
        "verifyTransferEvents", "verifyRedisWrites", "row_to_json(s)", '"HGET"', '"True"', '"False"',
        'method: "POST" }, 500', "/NOPERM/", "post([]), 400", 'method: "POST" }, 404']) {
        assert(source.includes(proof), proof);
    }
    assert.doesNotMatch(source, /CLIENT.*PAUSE|faultExpiresAt|readFile\([^)]*report|catch\s*\{\s*return/);
    const negative = await read("tasks/aspire/solution/negative.mjs");
    assert.match(negative, /wrong-neighbor action hidden by restoring final ACL/);
    assert.match(negative, /assert\.rejects\(verify/);
    assert.match(negative, /originalSecurityRestoredBeforeRearm: true/);
});

test("F14 is reserved for this narrow new condition without a model result or generalized claim", async () => {
    const evidence = JSON.parse(await read("evidence/F14.json"));
    assert.equal(evidence.id, "F14");
    assert.equal(evidence.scenario, "X01");
    assert.equal(evidence.fault, "redis-acl-write-denial-v1");
    assert.equal(evidence.namespace, "cedar83");
    assert.deepEqual(evidence.arms, ["raw-scripted", "aspire"]);
    assert.equal(evidence.model_runs.length, 0);
    assert.equal(evidence.source.task_base, "d3694ec111609a79073dcba35bc1f1b1c9517d8f");
    assert.equal(evidence.inference.independent_app, false);
    assert.equal(evidence.inference.statistical_generalization, false);
});

test("runtime receipts require both actual gates and bind the validated payload, without claiming native Harbor or models", async () => {
    const evidence = JSON.parse(await read("evidence/local-runtime.json"));
    assert.equal(evidence.mode, "direct-docker-runtime-not-native-harbor");
    assert.equal(evidence.native_harbor_pass, false);
    assert.deepEqual(evidence.model_runs, []);
    assert.equal(evidence.records.length, 2);
    for (const record of evidence.records) {
        assert.equal(record.reward, 1);
        assert.equal(record.exception, null);
        assert.equal(record.resource_limits.nano_cpus, 4_000_000_000);
        assert.equal(record.resource_limits.memory, 8 * 1024 ** 3);
        assert.equal(record.incident.actualCallStatus, 500);
        assert.equal(record.incident.originalCredentialsVerified, true);
        assert.equal(record.incident.backendTls, record.job.includes("aspire"));
        assert.equal(record.negatives.rejected.length, 12);
        assert.equal(record.negatives.originalSecurityRestoredBeforeRearm, true);
        assert(record.verifier_output.startsWith("Verified X01:"));
    }
    for (const [file, hash] of Object.entries(evidence.validated_source_sha256)) {
        assert.equal(digest(await readFile(new URL(`../../${file}`, root))), hash, file);
    }
});
