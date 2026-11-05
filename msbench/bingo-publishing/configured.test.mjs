import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const read = file => readFile(new URL(file, import.meta.url), "utf8");
const variants = ["raw-configured", "aspire-configured"];

test("preconfigured comparison has byte-identical outcome-only prompts and matching support", async () => {
    const prompt = await read("tasks/raw-configured/instruction.md");
    assert.equal(prompt, await read("tasks/aspire-configured/instruction.md"));
    assert.doesNotMatch(prompt, /AddDocker|WithDashboard|WithImageTag|ConfigureComposeFile|aspire |docker compose|traces/);
    assert.match(prompt, /Preserve the supplied application and deployment configuration/);
    assert.match(await read("common/configured-README.md"), /bash deployment\/deploy\.sh/);
    assert.equal(await read("tasks/raw-configured/solution/solve.sh"),
        await read("tasks/aspire-configured/solution/solve.sh"));
    assert.equal(await read("tasks/raw-configured/tests/test.sh"),
        await read("tasks/aspire-configured/tests/test.sh"));
});

test("Aspire starts with the complete previously verified deployment graph instead of a stub", async () => {
    const model = await read("common/configured-apphost.cs");
    const oracle = await read("tasks/aspire/solution/solve.sh");
    assert.equal(model, oracle.split("cat >apphost.cs <<'CS'\n")[1].split("\nCS\n")[0] + "\n");
    assert.match(model, /AddDockerComposeEnvironment\("compose"\)/);
    assert.match(model, /\.WithDashboard\(false\)/);
    assert.match(model, /AddDockerfile\("boardadmin"/);
    assert.match(model, /AddDockerfile\("bingoboard"/);
    assert.equal((model.match(/\.WithImageTag\("local"\)/g) ?? []).length, 2);
    assert.match(model, /External = true/);
    const deploy = await read("common/configured-deploy.sh");
    assert.match(deploy, /\.env\.Production/);
    assert.doesNotMatch(deploy, /cat >|sed |perl |apply_patch/);
    const raw = await read("common/configured-compose.yaml");
    for (const name of ["boardadmin", "bingoboard"]) {
        assert.match(raw, new RegExp(`image: ${name}:local`));
    }
    assert.match(raw, /external: true/);
    assert.match(raw, /127\.0\.0\.1:18080:8080/);
    assert.match(raw, /127\.0\.0\.1:18081:8080/);
});

test("configured task images install complete models and deployment command before snapshotting", async () => {
    for (const variant of variants) {
        const image = await read(`tasks/${variant}/environment/Dockerfile`);
        const task = await read(`tasks/${variant}/task.toml`);
        assert.match(image, /BENCH_PRECONFIGURED=true/);
        assert.match(image, /configured-deploy\.sh \/app\/deployment\/deploy\.sh/);
        assert.match(image, /configured-README\.md \/app\/README\.md/);
        assert.doesNotMatch(image, /COPY .*solution|RUN .*prepare-compose|RUN .*deploy\.sh/);
        assert.match(task, /timeout_sec = 900/);
        assert.match(task, /timeout_sec = 300/);
        assert.match(task, /cpus = 4/);
        assert.match(task, /memory_mb = 8192/);
        assert.match(task, /test -f \/opt\/benchmark\/ready/);
        const compose = await read(`tasks/${variant}/environment/docker-compose.yaml`);
        assert.match(compose, /#8255977f24d4bf0ff272ed72b3205f81d66d7367:msbench\/bingo-publishing\/common/);
        assert.match(compose, /#baacba3e17181491c9a4d419db7d0e6763c3d363:msbench\/bingo\/common\/raw-app/);
        assert.doesNotMatch(compose, /\.\.\//);
    }
    assert.match(await read("tasks/aspire-configured/environment/Dockerfile"),
        /configured-apphost\.cs \/app\/apphost\.cs/);
    assert.match(await read("tasks/raw-configured/environment/Dockerfile"),
        /configured-compose\.yaml \/app\/compose\.production\.yaml/);
});

test("legacy AppHost editability is retained while new models must survive runtime verification unchanged", async () => {
    const grade = await read("common/grade.mjs");
    assert.match(grade, /key === "apphost\.cs"\s*&& process\.env\.BENCH_PRECONFIGURED !== "true"/);
    assert.match(grade, /assert\.deepEqual\(inputs\(\), state\.inputs/);
    for (const variant of variants) {
        const solution = await read(`tasks/${variant}/solution/solve.sh`);
        assert.match(solution, /Rejected editing the supplied deployment model/);
        assert.match(solution, /Immutable owned inputs changed/);
        assert.equal((solution.match(/sha256sum "\$model"/g) ?? []).length, 3);
        assert.doesNotMatch(solution, /cat >apphost|cat >deployment\/docker-compose/);
    }
});

test("native local receipts prove full deployment and unchanged supplied models without a model sample", async () => {
    const evidence = JSON.parse(await read("configured-evidence.json"));
    assert.deepEqual(evidence.model_runs, []);
    assert.equal(evidence.remote_model_submission_eligible, false);
    assert.equal(evidence.method, "native-harbor-oracle-force-build");
    assert.equal(evidence.owned_containers_removed, true);
    assert.deepEqual(evidence.runs.map(row => row.variant), variants);
    const digest = bytes => createHash("sha256").update(bytes).digest("hex");
    assert.equal(digest(await readFile(new URL("tasks/raw-configured/instruction.md", import.meta.url))),
        evidence.prompt_sha256);
    for (const [index, row] of evidence.runs.entries()) {
        assert.equal(row.reward, 1);
        assert.equal(row.exception, null);
        assert.equal(row.model_unchanged, true);
        assert.equal(row.original_model_sha256, row.retained_model_sha256);
        const file = index === 0 ? "configured-compose.yaml" : "configured-apphost.cs";
        assert.equal(digest(await readFile(new URL(`common/${file}`, import.meta.url))), row.original_model_sha256);
        assert.equal(row.negative_cases_rejected.length, index === 0 ? 6 : 8);
        assert(row.negative_cases_rejected.includes("editing the supplied deployment model"));
        assert(row.oracle_seconds > 0 && row.oracle_seconds <= evidence.declared_limits.agent_seconds);
        for (const field of ["result_sha256", "oracle_sha256", "verifier_sha256", "checks_sha256"]) {
            assert.match(row[field], /^[a-f0-9]{64}$/);
        }
    }
});
