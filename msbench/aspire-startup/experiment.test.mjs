import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { hashes } from "./tasks/none/tests/hashes.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const treatments = ["none", "skills", "mcp", "skills-mcp"];

test("startup dataset pins four treatments to one published task commit", async () => {
    const rows = (await readFile(path.join(root, "dataset.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
    assert.deepEqual(rows.map(row => row.benchmark_variant), treatments);
    assert.equal(new Set(rows.map(row => row.task_repo_commit)).size, 1);
    for (const row of rows) {
        assert.match(row.task_repo_commit, /^[a-f0-9]{40}$/);
        assert.equal(row.instance_id, "bingo-startup");
        assert.equal(row.variant_of_benchmark, "aspire-startup");
        assert.equal(row.task_repo, "https://github.com/sebastienros/aspire-bench");
        assert.equal(row.task_path, `msbench/aspire-startup/tasks/${row.benchmark_variant}`);
    }
});

test("startup cells share prompts, recipe and verifier but isolate skill/MCP assets", async () => {
    const first = path.join(root, "tasks/none");
    const app = await hashes(path.join(root, "../bingo/common/aspire-app"));
    const skills = await hashes(path.join(root, "../bingo/tasks/aspire/environment/skills"));
    for (const treatment of treatments) {
        const task = path.join(root, "tasks", treatment);
        const config = await readFile(path.join(task, "task.toml"), "utf8");
        const dockerfile = await readFile(path.join(task, "environment/Dockerfile"), "utf8");
        const compose = await readFile(path.join(task, "environment/docker-compose.yaml"), "utf8");
        assert.equal((config.match(/\[\[steps\]\]/g) ?? []).length, 1);
        assert.equal(config.includes("skills_dir"), treatment.includes("skills"));
        assert.equal(config.includes("[[environment.mcp_servers]]"), treatment.includes("mcp"));
        assert.equal(dockerfile.includes("RUN rm /app/.github/mcp.json"), !treatment.includes("mcp"));
        assert.equal(dockerfile.includes("COPY --from=aspire-skills / /app/.github/skills/"),
            treatment.includes("skills"));
        assert.equal(compose.includes("aspire-skills:"), treatment.includes("skills"));
        assert(dockerfile.includes(`ENV BENCH_STARTUP_TREATMENT=${treatment}`));
        for (const file of ["steps/startup/instruction.md", "steps/startup/solution/solve.sh",
            "environment/app/README.md", "tests/startup-verify.js", "tests/hashes.js",
            "tests/http.js", "tests/process.js"]) {
            assert.equal(await readFile(path.join(task, file), "utf8"),
                await readFile(path.join(first, file), "utf8"), file);
        }
        const expected = { ...app, ...await hashes(path.join(task, "environment/app")) };
        if (!treatment.includes("mcp"))
            delete expected[".github/mcp.json"];
        if (treatment.includes("skills"))
            for (const [file, digest] of Object.entries(skills))
                expected[`.github/skills/${file}`] = digest;
        assert.deepEqual(JSON.parse(await readFile(path.join(task, "environment/input-hashes.json"), "utf8")),
            expected);
        assert.match(compose, /git#[a-f0-9]{40}:msbench\/bingo\/common\/aspire-app/);
        const readme = await readFile(path.join(task, "environment/app/README.md"), "utf8");
        assert.match(readme, /item\.displayName === displayName/);
        assert.match(readme, /resource\?\.urls\?\.find/);
    }
});

test("startup endpoint contract rejects invalid or nonlocal URLs", async () => {
    const { endpoints } = await import("./tasks/none/tests/http.js");
    const valid = { admin: "http://localhost:18080", frontend: "http://localhost:15173" };
    assert.deepEqual(endpoints(valid), valid);
    for (const value of [null, {}, { ...valid, frontend: valid.admin },
        { ...valid, admin: "https://localhost:18080" },
        { ...valid, admin: "http://example.com:18080" },
        { ...valid, extra: true }])
        assert.throws(() => endpoints(value));
});

test("startup timing contract rejects unordered, stale, or invented field shapes", async () => {
    const { validateTiming } = await import("./tasks/none/tests/startup-verify.js");
    const now = Date.now();
    const timing = {
        launch_started_ms: now - 60_000, launch_returned_ms: now - 40_000,
        ready_ms: now - 1_000, endpoints_written_ms: now,
    };
    validateTiming(timing, now);
    for (const value of [null, {}, { ...timing, ready_ms: now - 70_000 },
        { ...timing, launch_started_ms: 0 }, { ...timing, endpoints_written_ms: now + 10_000 },
        { ...timing, launch_started_ms: "0" }, { ...timing, extra: true }])
        assert.throws(() => validateTiming(value, now));
});
