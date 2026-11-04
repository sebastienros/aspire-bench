import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashes } from "../bingo/tasks/aspire/tests/hashes.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = file => readFile(path.join(root, file), "utf8");

test("iteration dataset is immutable and pilot does not imply accessible models or repeat runs", async () => {
    const rows = (await read("dataset.jsonl")).trim().split("\n").map(JSON.parse);
    assert.deepEqual(rows.map(row => row.benchmark_variant), ["raw-scripted", "aspire"]);
    assert.equal(new Set(rows.map(row => row.task_repo_commit)).size, 1);
    for (const row of rows) {
        assert.match(row.task_repo_commit, /^[a-f0-9]{40}$/);
        assert.equal(row.task_path, `msbench/bingo-iteration/tasks/${row.benchmark_variant}`);
        assert.equal(row.task_repo, "https://github.com/sebastienros/aspire-bench");
        assert.equal(row.variant_of_benchmark, "bingo-player-api-routing");
        assert.equal(row.task_style, "harbor-native");
        assert.equal(row.run_platform, "linux_container");
    }
    const ledger = JSON.parse(await read("pilot-ledger.json"));
    assert.equal(ledger.task_commit, rows[0].task_repo_commit);
    assert.equal(ledger.automatic_repeats, false);
    assert.equal(ledger.max_original_model_attempts, 2);
    if (ledger.status === "blocked-model-discovery") {
        assert.equal(ledger.model_access_verified, false);
        assert.deepEqual(ledger.model_runs, []);
    }
    if (ledger.status === "completed") {
        const results = JSON.parse(await read(ledger.results));
        assert.equal(ledger.model_access_verified, true);
        assert.equal(ledger.model_runs.length, 2);
        assert.equal(new Set(ledger.model_runs.map(run => run.run_id)).size, 2);
        assert.equal(results.sample_size_per_arm, 1);
        for (const run of ledger.model_runs) {
            assert.equal(run.actual_model_verified, true);
            assert.equal(run.model, ledger.requested_model);
            assert(results.results.some(result => result.run_id === run.run_id && result.reward === run.reward));
        }
    }
});

test("iteration arms match user outcomes, grader, solution and budgets", async () => {
    for (const file of ["instruction.md", "environment/iteration.mjs",
        "environment/entrypoint.sh", "solution/solve.sh"]) {
        assert.equal(await read(`tasks/aspire/${file}`), await read(`tasks/raw-scripted/${file}`));
    }
    assert.deepEqual(await hashes(path.join(root, "tasks/aspire/tests")),
        await hashes(path.join(root, "tasks/raw-scripted/tests")));
    assert.equal(await read("tasks/aspire/task.toml"),
        (await read("tasks/raw-scripted/task.toml")).replace('variant = "raw-scripted"', 'variant = "aspire"'));
    for (const arm of ["aspire", "raw-scripted"]) {
        const prompt = await read(`tasks/${arm}/instruction.md`);
        assert.match(prompt, /already running/);
        assert.match(prompt, /No JSON report is required/);
        const task = await read(`tasks/${arm}/task.toml`);
        assert.match(task, /test -f \/opt\/benchmark\/ready/);
        assert.doesNotMatch(task, /\[\[steps\]\]/);
        const dockerfile = await read(`tasks/${arm}/environment/Dockerfile`);
        assert.match(dockerfile, /COPY bootstrap.sh iteration.mjs \/opt\/benchmark\//);
        assert.match(dockerfile, /COPY --from=iteration-tests/);
        assert.doesNotMatch(dockerfile, /COPY .*solution/);
    }
});

test("iteration preserves source contexts, lifecycle recipes and installed guidance", async () => {
    for (const [arm, original] of [
        ["raw-scripted", "../bingo/tasks/raw-scripted"],
        ["aspire", "../aspire-health/tasks/general"],
    ]) {
        const base = path.join(root, original);
        assert.equal(await read(`tasks/${arm}/environment/bootstrap.sh`),
            await readFile(path.join(base, "steps/startup/solution/solve.sh"), "utf8"));
        for (const dir of ["environment/app", "environment/skills"]) {
            assert.deepEqual(await hashes(path.join(root, `tasks/${arm}/${dir}`)),
                await hashes(path.join(base, dir)));
        }
        assert.equal(await read(`tasks/${arm}/environment/input-hashes.json`),
            await readFile(path.join(base, "environment/input-hashes.json"), "utf8"));
        const compose = await read(`tasks/${arm}/environment/docker-compose.yaml`);
        assert.match(compose, /#baacba3e17181491c9a4d419db7d0e6763c3d363:/);
        assert.doesNotMatch(compose, /volumes:|ports:/);
    }
});

test("grader uses runtime nonces, cross-origin state and preservation, not agent reporting", async () => {
    const verifier = await read("tasks/aspire/environment/iteration.mjs");
    for (const required of ["randomBytes(8)", "urls.frontend", "urls.admin",
        "400", "404", "backendProcess", "dependencies", "state.sentinel",
        "state.inputs", "state.endpoints", "state.backend", "state.dependencies"]) {
        assert(verifier.includes(required), required);
    }
    assert.doesNotMatch(verifier, /readFile\([^)]*report|healthy.*true/);
    const oracle = await read("tasks/aspire/solution/solve.sh");
    for (const scenario of ["unchanged routing", "out-of-scope change", "invalid endpoints", "lost preexisting state"]) {
        assert(oracle.includes(`expect_failure "${scenario}"`));
    }
});
