import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashes } from "../bingo/tasks/aspire/tests/hashes.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = file => readFile(path.join(root, file), "utf8");
const cells = ["aspire", "cli", "mcp", "skills-mcp", "generated-skills", "focused-trigger"];

test("diagnostic dataset pins every locally validated unique condition without automatic repeats", async () => {
    const rows = (await read("dataset.jsonl")).trim().split("\n").map(JSON.parse);
    assert.deepEqual(rows.map(row => row.benchmark_variant), ["raw-scripted", ...cells]);
    assert.equal(new Set(rows.map(row => row.task_repo_commit)).size, 1);
    for (const row of rows) {
        assert.match(row.task_repo_commit, /^[a-f0-9]{40}$/);
        assert.equal(row.task_path, `msbench/bingo-diagnostics/tasks/${row.benchmark_variant}`);
        assert.equal(row.task_repo, "https://github.com/sebastienros/aspire-bench");
        assert.equal(row.variant_of_benchmark, "bingo-runtime-diagnosis");
    }
    const ledger = JSON.parse(await read("pilot-ledger.json"));
    assert.equal(ledger.task_commit, rows[0].task_repo_commit);
    assert.equal(ledger.automatic_repeats, false);
    assert.equal(new Set(ledger.conditions.map(condition => condition.fingerprint)).size, 7);
});

test("diagnostic mechanism cells preserve actual fault, app, prompts, solution and grader", async () => {
    for (const cell of cells) {
        assert.equal(await read(`tasks/${cell}/instruction.md`), await read("tasks/aspire/instruction.md"));
        for (const dir of ["tests", "environment/app"]) {
            assert.deepEqual(await hashes(path.join(root, `tasks/${cell}/${dir}`)),
                await hashes(path.join(root, `tasks/aspire/${dir}`)));
        }
        const solution = await read(`tasks/${cell}/solution/solve.sh`);
        assert.equal(solution.replace("node /solution/mcp-probe.mjs\n", ""),
            await read("tasks/aspire/solution/solve.sh"));
        assert.equal(await read(`tasks/${cell}/solution/negative.mjs`),
            await read("tasks/aspire/solution/negative.mjs"));
        const config = await read(`tasks/${cell}/task.toml`);
        assert.match(config, new RegExp(`variant = "${cell}"`));
        assert.match(config, /fault_seed = 47/);
        assert.match(config, /timeout_sec = 900/);
        assert.match(config, /timeout_sec = 300/);
        const dockerfile = await read(`tasks/${cell}/environment/Dockerfile`);
        assert.match(dockerfile, /--version 13\.6\.0/);
        assert.match(dockerfile, /COPY --from=diagnostics-common/);
        assert.match(dockerfile, /BENCH_FAULT_SEED=47/);
    }
});

test("natural-choice factorial explicitly enables only its intended skills and MCP surfaces", async () => {
    for (const cell of cells) {
        const skills = ["aspire", "skills-mcp", "generated-skills", "focused-trigger"].includes(cell);
        const mcp = ["mcp", "skills-mcp"].includes(cell);
        const dockerfile = await read(`tasks/${cell}/environment/Dockerfile`);
        const config = await read(`tasks/${cell}/task.toml`);
        assert.equal(dockerfile.includes("COPY --from=aspire-skills"), skills, cell);
        assert.equal(config.includes("[[environment.mcp_servers]]"), mcp, cell);
        assert.equal(config.includes('skills_dir = "/opt/aspire-skills"'), skills, cell);
        assert.equal(dockerfile.includes("RUN rm /app/.github/mcp.json"), !mcp, cell);
        assert.doesNotMatch(config, /agent mcp.*--apphost/);
    }
});

test("focused-trigger changes only discovery description, not skill identity or executable knowledge", async () => {
    const originalDir = path.join(root, "../bingo/tasks/aspire/environment/skills");
    const original = await hashes(originalDir);
    const focused = await hashes(path.join(root, "focused-skills"));
    assert.deepEqual(Object.keys(focused).sort(), Object.keys(original).sort());
    assert.deepEqual(Object.keys(focused).filter(file => original[file] !== focused[file]), ["aspire-monitoring/SKILL.md"]);
    const before = await readFile(path.join(originalDir, "aspire-monitoring/SKILL.md"), "utf8");
    const after = await read("focused-skills/aspire-monitoring/SKILL.md");
    const strip = value => value.replace(/description: >-\n[\s\S]*?(?=license:)/, "");
    assert.equal(strip(after), strip(before));
});

test("generated skill treatment retains actual 13.6 generation output rather than changing the task recipe", async () => {
    const original = await hashes(path.join(root, "../bingo/tasks/aspire/environment/skills"));
    const generated = await hashes(path.join(root, "generated-skills"));
    assert.deepEqual(Object.keys(generated).sort(), Object.keys(original).sort());
    assert.deepEqual(Object.keys(generated).filter(file => original[file] !== generated[file]).sort(), [
        "aspire-init/SKILL.md", "aspire-init/references/init-workflow.md",
        "aspire/SKILL.md", "aspire/references/aspire-13-3-breaking-changes.md",
    ]);
    assert.match(await read("tasks/generated-skills/environment/docker-compose.yaml"), /aspire-skills: \.\.\/\.\.\/\.\.\/generated-skills/);
    assert.doesNotMatch(await read("tasks/generated-skills/environment/Dockerfile"), /hooks|agent init/);
});
