import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashes } from "../bingo/tasks/aspire/tests/hashes.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const task = path.join(root, "tasks/aspire");
const read = file => readFile(path.join(task, file), "utf8");

test("adoption starts from real unchanged raw Bingo and does not expose an AppHost solution", async () => {
    assert.deepEqual(await hashes(path.join(task, "environment/app")),
        await hashes(path.join(root, "../bingo/tasks/raw-scripted/environment/app")));
    const dockerfile = await read("environment/Dockerfile");
    assert.match(dockerfile, /COPY --from=raw-app/);
    assert.match(dockerfile, /COPY --from=aspire-skills/);
    assert.doesNotMatch(dockerfile, /COPY .*solution|COPY .*apphost\.cs/);
    const setup = await read("environment/adoption.mjs");
    assert.match(setup, /assert\.rejects\(readFile\("\/app\/apphost\.cs"\)/);
    assert.match(setup, /unchanged\(before, await hashes/);
    assert.match(setup, /await verifyHttp\(urls\)/);
    assert.match(setup, /AspNetUsers/);
    assert.match(setup, /redisPingArgs/);
    assert.doesNotMatch(setup, /healthReport|ready.*true/);
});

test("adoption includes no-op/source-mutation rejection and a functional reference", async () => {
    const oracle = await read("solution/solve.sh");
    assert.match(oracle, /no-adoption\.log/);
    assert.match(oracle, /mutated-adoption\.log/);
    const apphost = await read("solution/apphost.cs");
    assert.match(apphost, /13\.6\.0/);
    assert.match(apphost, /WithReference\(db\)\.WithReference\(cache\)/);
    assert.match(apphost, /WaitForCompletion\(migrations\)/);
    assert.match(apphost, /BINGO_ADMIN_URL/);
    assert.doesNotMatch(apphost, /Password=|localhost:[0-9]/i);
    const prompt = await read("instruction.md");
    assert.match(prompt, /No written assessment or endpoint report is required/);
    assert.match(await read("task.toml"), /timeout_sec = 900/);
});

test("generator adoption treatment changes only the selected skill content", async () => {
    const generated = path.join(root, "tasks/generated-skills");
    for (const directory of ["environment/app", "solution", "tests"]) {
        assert.deepEqual(await hashes(path.join(generated, directory)),
            await hashes(path.join(task, directory)));
    }
    for (const file of ["instruction.md", "environment/Dockerfile", "environment/adoption.mjs",
        "environment/entrypoint.sh", "environment/input-hashes.json"]) {
        assert.equal(await readFile(path.join(generated, file), "utf8"), await read(file));
    }
    assert.equal(await readFile(path.join(generated, "task.toml"), "utf8"),
        (await read("task.toml")).replace('variant = "aspire"', 'variant = "generated-skills"'));
    assert.match(await readFile(path.join(generated, "environment/docker-compose.yaml"), "utf8"),
        /aspire-skills: https:\/\/github\.com\/sebastienros\/aspire-bench\.git#[a-f0-9]{40}:msbench\/bingo-diagnostics\/generated-skills/);
    for (const directory of [task, generated]) {
        assert.doesNotMatch(await readFile(path.join(directory, "environment/docker-compose.yaml"), "utf8"), /:\s+\.\.\//);
    }
});
