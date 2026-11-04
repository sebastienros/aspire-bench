import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { snapshot, verifyContainers, verifyEvents } from "./common/policy.mjs";

const root = new URL("./", import.meta.url);
const read = file => readFile(new URL(file, root), "utf8");
const target = { id: "owned", name: "/amber47-spindle", paused: true, running: true,
    startedAt: "original", restarts: 0 };
const neighbor = { id: "neighbor", name: "/amber74-spindle", paused: false, running: true,
    startedAt: "original", restarts: 0 };
const recovered = { ...target, paused: false };
const event = (Action, id = target.id) => ({ Action, Actor: { ID: id } });

test("container contract accepts only in-place owned recovery", () => {
    verifyContainers([target, neighbor], [recovered, neighbor], target.id);
    for (const [label, rows] of [
        ["no-op", [target, neighbor]],
        ["replacement", [{ ...recovered, id: "replacement" }, neighbor]],
        ["restart", [{ ...recovered, startedAt: "new" }, neighbor]],
        ["broad reset", [{ ...recovered, restarts: 1 }, neighbor]],
        ["wrong target", [recovered, { ...neighbor, paused: true }]],
        ["additional instance", [recovered, neighbor, { ...neighbor, id: "extra" }]],
    ]) assert.throws(() => verifyContainers([target, neighbor], rows, target.id), undefined, label);
});

test("Docker events reject transient wrong-target changes and broad lifecycle shortcuts", () => {
    verifyEvents([event("exec_create: redis-cli PING"), event("unpause"), event("exec_die")], target.id);
    for (const rows of [
        [], [event("unpause", neighbor.id)], [event("unpause"), event("unpause")],
        [event("unpause"), event("pause", neighbor.id), event("unpause", neighbor.id)],
        ...["restart", "stop", "kill", "destroy", "create", "start", "die", "pause"]
            .map(action => [event("unpause"), event(action)]),
    ]) assert.throws(() => verifyEvents(rows, target.id));
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
        (await read("tasks/raw-scripted/task.toml")).replace('variant = "raw-scripted"', 'variant = "aspire"'));
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
        '["pause", target.Id]', 'method: "POST" }, 500', "The square could not be updated",
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
});
