import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashes } from "../bingo/tasks/aspire/tests/hashes.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const original = path.join(root, "../bingo/tasks/aspire");
const task = arm => path.join(root, "tasks", arm);
const read = file => readFile(file, "utf8");
const candidates = {
    services: "aspire-service-health",
    database: "aspire-postgres-health",
    redis: "aspire-redis-health",
};

test("health dataset pins both four-step treatments to one published commit", async () => {
    const rows = (await read(path.join(root, "dataset.jsonl"))).trim().split("\n").map(JSON.parse);
    assert.deepEqual(rows.map(row => row.benchmark_variant), ["general", "specific"]);
    assert.equal(new Set(rows.map(row => row.task_repo_commit)).size, 1);
    for (const row of rows) {
        assert.match(row.task_repo_commit, /^[a-f0-9]{40}$/);
        assert.equal(row.task_path, `msbench/aspire-health/tasks/${row.benchmark_variant}`);
        assert.equal(row.task_repo, "https://github.com/sebastienros/aspire-bench");
        assert.equal(row.variant_of_benchmark, "aspire-health");
        assert.equal(row.default_variant, "general");
        assert.equal(row.instance_id, "bingo-health-checks");
        assert.equal(row.task_style, "harbor-native");
        assert.equal(row.container_registry, "msbenchstaging.azurecr.io");
        assert.equal(row.run_platform, "linux_container");
        assert(!("image_tag" in row));
    }
});

test("health comparison preserves prompts, app, limits, general skills and verifiers", async () => {
    const shared = await hashes(path.join(root, "../bingo/common/aspire-app"));
    delete shared[".github/mcp.json"];
    const generalSkills = Object.fromEntries(Object.entries(
        await hashes(path.join(original, "environment/skills")))
        .map(([file, digest]) => [`.github/skills/${file}`, digest]));
    for (const arm of ["general", "specific", "cli"]) {
        const config = await read(path.join(task(arm), "task.toml"));
        assert.equal(config, (await read(path.join(original, "task.toml")))
            .replace('variant = "aspire"', `variant = "${arm}"`)
            .replace(/\[\[environment\.mcp_servers\]\][\s\S]*?(?=\[\[steps\]\])/, ""));
        assert.doesNotMatch(config, /mcp_servers/);
        for (const step of ["startup", ...Object.keys(candidates)]) {
            assert.equal(await read(path.join(task(arm), `steps/${step}/instruction.md`)),
                await read(path.join(original, `steps/${step}/instruction.md`)));
            assert.equal(await read(path.join(task(arm), `steps/${step}/tests/test.sh`)),
                await read(path.join(original, `steps/${step}/tests/test.sh`)));
        }
        assert.deepEqual(await hashes(path.join(task(arm), "tests")),
            await hashes(path.join(original, "tests")));
        assert.equal(await read(path.join(task(arm), "environment/app/README.md")),
            await read(path.join(original, "environment/app/README.md")));
        const dockerfile = await read(path.join(task(arm), "environment/Dockerfile"));
        assert.equal(dockerfile, (await read(path.join(original, "environment/Dockerfile")))
            .replace("COPY app/ /app/\n", "COPY app/ /app/\nRUN rm /app/.github/mcp.json\n"
                + "COPY --from=aspire-skills / /opt/aspire-skills/\n"
                + "COPY --from=aspire-skills / /app/.github/skills/\n"));
        const compose = await read(path.join(task(arm), "environment/docker-compose.yaml"));
        assert.match(compose, /#1fcca7e91c89716f0e4a8bf7324da13a39f70c66:msbench\/bingo\/tasks\/aspire\/environment\/skills/);
        assert.match(compose, /#baacba3e17181491c9a4d419db7d0e6763c3d363:msbench\/bingo\/common\/aspire-app/);
        assert.doesNotMatch(compose, /volumes:|ports:/);
        const added = Object.fromEntries(Object.entries(
            await hashes(path.join(task(arm), "environment/skills")))
            .map(([file, digest]) => [`.github/skills/${file}`, digest]));
        assert.deepEqual(JSON.parse(await read(path.join(task(arm), "environment/input-hashes.json"))),
            { ...shared, ...await hashes(path.join(task(arm), "environment/app")), ...generalSkills, ...added });
    }
    assert.equal(await read(path.join(task("general"), "environment/Dockerfile")),
        await read(path.join(task("specific"), "environment/Dockerfile")));
    const startup = "environment/skills/aspire-startup/SKILL.md";
    assert.equal(await read(path.join(task("general"), startup)),
        await read(path.join(root, "../aspire-startup/tasks/startup-skill", startup)));
    assert.equal(await read(path.join(task("general"), startup)),
        await read(path.join(task("specific"), startup)));
});

test("CLI arm replaces type-specific skills with one generic table health skill", async () => {
    const skills = path.join(task("cli"), "environment/skills");
    assert.deepEqual((await readdir(skills)).sort(), ["aspire-health", "aspire-startup"]);
    assert.equal(await read(path.join(skills, "aspire-startup/SKILL.md")),
        await read(path.join(task("specific"), "environment/skills/aspire-startup/SKILL.md")));
    const document = await read(path.join(skills, "aspire-health/SKILL.md"));
    assert.match(document, /^---\nname: aspire-health\ndescription: .+\n---\n/);
    assert.match(document, /aspire describe <resource-name> .*--format table/);
    assert.match(document, /successful CLI exit alone does not mean healthy/);
    assert.doesNotMatch(document, /pg_isready|redis-cli|docker exec|boardadmin|bingoboard|BENCH_RUN_ID/);
    for (const step of Object.keys(candidates)) {
        const oracle = await read(path.join(task("cli"), `steps/${step}/solution/solve.sh`));
        assert.match(oracle, /aspire describe .*--format table --non-interactive/);
        assert.doesNotMatch(oracle, /docker |curl |fetch\(|psql|redis-cli/);
    }
});

test("CLI table oracle checks relevant rows rather than exit status or Healthy substrings", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "aspire-health-table-"));
    try {
        const separator = "\u2502";
        const row = (name, state, health) =>
            `${separator} ${[name, "Container", state, health, "-"].join(` ${separator} `)} ${separator}\n`;
        const header = row("Name", "State", "Health");
        const unrelated = row("unrelated", "Running", "Healthy");
        for (const [step, names] of Object.entries({
            services: ["boardadmin", "bingoboard"], database: ["db"], redis: ["cache"],
        })) {
            const oracle = await read(path.join(task("cli"), `steps/${step}/solution/solve.sh`));
            const script = oracle.match(/<<'JS'\n([\s\S]*?)\nJS/)[1]
                .replace('"/tmp/aspire-health-table.txt"', '"table.txt"');
            for (const scenario of ["healthy", "unhealthy", "missing", "duplicate", "finished", "unknown"]) {
                const rows = names.map(name => row(name,
                    scenario === "finished" ? "Finished" : "Running",
                    scenario === "unhealthy" ? "Unhealthy" : scenario === "unknown" ? "-" : "Healthy"));
                const text = header + unrelated
                    + (scenario === "missing" ? rows.slice(1).join("") : rows.join(""))
                    + (scenario === "duplicate" ? rows[0] : "")
                    + row("(http://localhost/?resource=wrapped-link)", "", "");
                await writeFile(path.join(directory, "table.txt"), text);
                const code = await new Promise((resolve, reject) => {
                    const child = spawn(process.execPath,
                        ["--input-type=module", "-e", script, "-", step, ...names],
                        { cwd: directory, stdio: "ignore" });
                    child.on("error", reject);
                    child.on("close", resolve);
                });
                const output = path.join(directory, `benchmark-${step}-health.json`);
                if (scenario === "healthy") {
                    assert.equal(code, 0);
                    assert.equal(JSON.parse(await read(output)).healthy, true);
                    await rm(output);
                } else {
                    assert.notEqual(code, 0, `${step}: ${scenario} must not produce success`);
                    await assert.rejects(access(output), { code: "ENOENT" });
                }
            }
        }
    } finally {
        await rm(directory, { recursive: true });
    }
});

test("specific skills contain only focused self-contained read-only health recipes", async () => {
    assert.deepEqual((await readdir(path.join(task("general"), "environment/skills"))).sort(),
        ["aspire-startup"]);
    assert.deepEqual((await readdir(path.join(task("specific"), "environment/skills"))).sort(),
        [...Object.values(candidates), "aspire-startup"].sort());
    for (const [step, skill] of Object.entries(candidates)) {
        const document = await read(path.join(task("specific"), `environment/skills/${skill}/SKILL.md`));
        assert.match(document, new RegExp(`^---\\nname: ${skill}\\ndescription: .+\\n---\\n`));
        assert.doesNotMatch(document, /TODO|references\/|aspire start|docker run|docker restart/);
        const recipe = document.match(/```bash\n([\s\S]*?)```/)[1];
        assert.match(recipe, /^set -euo pipefail\n/);
        assert.equal(await read(path.join(task("specific"), `steps/${step}/solution/solve.sh`)),
            `#!/usr/bin/env bash\n${recipe}`);
        if (step === "database") assert.match(recipe, /ON_ERROR_STOP=1/);
        if (step === "redis") {
            assert.match(recipe, /--tls --cacert \/usr\/lib\/ssl\/aspire\/cert.pem/);
            assert.doesNotMatch(recipe, /--insecure/);
        }
    }
});

test("health recipes do not write success reports after failed observations", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "aspire-health-"));
    const server = createServer((request, response) => {
        response.writeHead(503);
        response.end("Not ready");
    });
    try {
        await mkdir(path.join(directory, "bin"));
        await writeFile(path.join(directory, "bin/docker"),
            '#!/bin/sh\nif [ "$1" = ps ]; then echo owned-container; '
            + 'else echo "Connection refused" >&2; exit 1; fi\n', { mode: 0o755 });
        await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
        const url = `http://127.0.0.1:${server.address().port}`;
        await writeFile(path.join(directory, "benchmark-endpoints.json"),
            JSON.stringify({ admin: url, frontend: url }));
        for (const [step, skill] of Object.entries(candidates)) {
            const document = await read(path.join(task("specific"), `environment/skills/${skill}/SKILL.md`));
            const recipe = document.match(/```bash\n([\s\S]*?)```/)[1]
                .replace("cd /app\n", "");
            const result = await new Promise((resolve, reject) => {
                const child = spawn("bash", ["-c", recipe], {
                    cwd: directory,
                    env: {
                        ...process.env, PATH: `${directory}/bin:${process.env.PATH}`,
                        BENCH_RUN_ID: "test",
                    },
                    stdio: ["ignore", "pipe", "pipe"],
                });
                let output = "";
                child.stdout.on("data", chunk => { output += chunk; });
                child.stderr.on("data", chunk => { output += chunk; });
                child.on("error", reject);
                child.on("close", code => resolve({ code, output }));
            });
            assert.notEqual(result.code, 0, `${step} failure must propagate: ${result.output}`);
            await assert.rejects(access(path.join(directory, `benchmark-${step}-health.json`)),
                { code: "ENOENT" });
        }
    } finally {
        await new Promise(resolve => server.close(resolve));
        await rm(directory, { recursive: true });
    }
});
