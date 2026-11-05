import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashes } from "../bingo/tasks/aspire/tests/hashes.js";
import { preservesPackageConfiguration, databaseFromConnectionString, isApplicationBackend } from "./tasks/aspire/environment/package-contract.mjs";

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
    assert.match(setup, /unchanged\(protectedHashes, await hashes/);
    assert.match(setup, /preservesPackageConfiguration/);
    assert.match(setup, /databaseFromConnectionString/);
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
    for (const file of ["instruction.md", "environment/Dockerfile", "environment/adoption.mjs", "environment/package-contract.mjs",
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

test("adoption permits only compatible additive package metadata, not dependency or business changes", () => {
    const before = '<Project><ItemGroup><PackageVersion Include="Existing" Version="10.0.12" /></ItemGroup></Project>';
    const added = before.replace("</ItemGroup>", '<PackageVersion Include="Aspire.Hosting.Redis" Version="13.6.0" /></ItemGroup>');
    assert(preservesPackageConfiguration(before, added));
    assert(!preservesPackageConfiguration(before, added.replace("13.6.0", "17.0.0")));
    assert(!preservesPackageConfiguration(before, added.replace("10.0.12", "10.0.13")));
    assert(!preservesPackageConfiguration(before, added.replace("Existing", "Deleted")));
    assert(!preservesPackageConfiguration(before, added.replace("Aspire.Hosting.Redis", "Unrequested.Dependency")));
    const originalAspire = added;
    assert(!preservesPackageConfiguration(originalAspire, before), "Original Aspire dependencies must not be deleted");
    assert.equal(databaseFromConnectionString("Host=localhost;Port=5432;Database=bingo;Password=not-printed"), "bingo");
    assert.equal(databaseFromConnectionString("Host=localhost;Database=db"), "db");
    assert.throws(() => databaseFromConnectionString("Host=localhost;Password=not-printed"));
    assert(isApplicationBackend(["dotnet", "/app/src/BingoBoard.Admin/bin/Debug/net10.0/BingoBoard.Admin.dll"], "/app/src/BingoBoard.Admin"));
    assert(isApplicationBackend(["/app/src/BingoBoard.Admin/bin/Debug/net10.0/BingoBoard.Admin"], "/app/src/BingoBoard.Admin"));
    assert(!isApplicationBackend(["dcp", "http-proxy"], "/app/src/BingoBoard.Admin"));
    assert(!isApplicationBackend(["dotnet", "BingoBoard.Admin.dll"], "/neighbor-app/src/BingoBoard.Admin"));
});

test("adoption corrected outcomes preserve native zero scores and exact saved source without model reruns", async () => {
    const report = JSON.parse(await readFile(path.join(root, "evidence/a01-regrade-v2-report.json"), "utf8"));
    assert.equal(report.new_model_runs, 0);
    assert.equal(report.results.length, 2);
    for (const result of report.results) {
        assert.equal(result.original_native_cloud_reward, 0);
        assert.equal(result.reward, 1);
        assert.equal(result.exception, null);
        assert.equal(result.reference_AppHost_used, false);
        assert.equal(result.model_AppHost_or_credentials_modified, false);
        const patch = await readFile(path.join(root, `evidence/model-patches/${result.arm}.patch`));
        assert.equal(createHash("sha256").update(patch).digest("hex"), result.patch_sha256);
        for (const [file, expected] of Object.entries(result.native_evidence)) {
            assert.equal(createHash("sha256").update(await readFile(path.join(root, "evidence", file))).digest("hex"), expected);
        }
        for (const file of ["environment/adoption.mjs", "environment/package-contract.mjs"]) {
            assert.equal(createHash("sha256").update(await read(file)).digest("hex"), result.build_input_hashes[file]);
        }
    }
});
