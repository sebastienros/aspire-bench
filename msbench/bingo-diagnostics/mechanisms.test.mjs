import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashes } from "../bingo/tasks/aspire/tests/hashes.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = file => readFile(path.join(root, file), "utf8");
const cells = ["aspire", "cli", "mcp", "skills-mcp", "generated-skills", "focused-trigger"];

test("diagnostic mechanism cells preserve actual fault, app, prompts, solution and grader", async () => {
    for (const cell of cells) {
        assert.equal(await read(`tasks/${cell}/instruction.md`), await read("tasks/aspire/instruction.md"));
        for (const dir of ["solution", "tests", "environment/app"]) {
            assert.deepEqual(await hashes(path.join(root, `tasks/${cell}/${dir}`)),
                await hashes(path.join(root, `tasks/aspire/${dir}`)));
        }
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
