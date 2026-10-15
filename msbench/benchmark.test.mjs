import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
const variants = ["raw", "raw-documented", "raw-scripted", "aspire"];

const root = path.dirname(fileURLToPath(import.meta.url));
const rows = (await readFile(path.join(root, "bingo/dataset.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);

test("MSBench variants use shared application sources and independent guidance overlays", async () => {
    assert.deepEqual(rows.map(row => row.benchmark_variant), variants);
    assert(rows.every(row => row.instance_id === "bingo-health-checks"
        && row.variant_of_benchmark === "aspire-bench" && row.default_variant === "raw"
        && row.task_style === "harbor-native"
        && row.task_repo === "https://github.com/sebastienros/aspire-bench"));
    assert(rows.every(row => !("image_tag" in row)
        && row.run_platform === "linux_container"
        && row.container_registry === "msbenchstaging.azurecr.io"),
        "Build-on-demand tasks must not request an unpublished prebuilt image");
    for (const row of rows) {
        const task = path.resolve(root, "..", row.task_path);
        assert(task.startsWith(path.join(root, "bingo/tasks") + path.sep));
        const config = await readFile(path.join(task, "task.toml"), "utf8");
        assert.equal((config.match(/\[\[steps\]\]/g) ?? []).length, 4);
        assert.match(config, /multi_step_reward_strategy = "final"/);
        assert.doesNotMatch(config, /^\s*docker_image\s*=/m);
        const { hashes } = await import(path.join(task, "tests/hashes.js"));
        const overlayHashes = await hashes(path.join(task, "environment/app"));
        const appName = row.benchmark_variant === "aspire" ? "aspire-app" : "raw-app";
        const commonApp = path.join(root, "bingo/common", appName);
        const commonHashes = await hashes(commonApp);
        assert(Object.keys(commonHashes).every(file => !(file in overlayHashes)),
            "Guidance overlays must not duplicate or replace shared application files");
        assert.deepEqual({ ...commonHashes, ...overlayHashes },
            JSON.parse(await readFile(path.join(task, "environment/input-hashes.json"), "utf8")));
        const dockerfile = await readFile(path.join(task, "environment/Dockerfile"), "utf8");
        assert(!dockerfile.includes("dotnet build") && !dockerfile.includes("npm ci"));
        assert(!/COPY\s+\.\.\//.test(dockerfile), "Build context must be self-contained");
        assert(dockerfile.includes(`COPY --from=${appName} / /app/`));
        for (const tool of ["jq", "unzip"]) {
            assert.match(dockerfile, new RegExp(`\\b${tool}\\b`));
        }
        assert.match(dockerfile, /apt-get install -y --no-install-recommends azure-cli/);
        assert.match(dockerfile, /signed-by=\/usr\/share\/keyrings\/microsoft-azure-cli\.gpg/);
        const compose = await readFile(path.join(task, "environment/docker-compose.yaml"), "utf8");
        assert.match(compose, /additional_contexts:/);
        assert(compose.includes(`https://github.com/sebastienros/aspire-bench.git#${row.task_repo_commit}:msbench/bingo/common/${appName}`));
        for (const step of ["startup", "services", "database", "redis"]) {
            assert((await readFile(path.join(task, `steps/${step}/instruction.md`), "utf8")).trim());
            await access(path.join(task, `steps/${step}/tests/test.sh`));
            await access(path.join(task, `steps/${step}/solution/solve.sh`));
        }
        if (row.benchmark_variant === "aspire") {
            assert.match(config, /skills_dir = "\/opt\/aspire-skills"/);
            assert.match(config, /transport = "stdio"/);
            await access(path.join(commonApp, "apphost.cs"));
            await assert.rejects(access(path.join(task, "environment/app/apphost.cs")));
        } else {
            assert(!config.includes("skills_dir") && !config.includes("mcp_servers"));
            await access(path.join(task, "environment/skills/.gitkeep"));
            await assert.rejects(access(path.join(commonApp, "apphost.cs")));
        }
        if (row.benchmark_variant === "raw-scripted") {
            await access(path.join(task, "environment/app/scripts/start.sh"));
        } else if (row.benchmark_variant !== "aspire") {
            await assert.rejects(access(path.join(task, "environment/app/scripts")));
        }
        for (const helper of ["harbor-verify.js", "http.js", "hashes.js", "process.js", "redis.js"]) {
            const source = await readFile(path.join(task, "tests", helper), "utf8");
            assert(!source.includes("@microsoft/vally") && !source.includes("/harness/"));
        }
    }
});

test("each standalone grader preserves checkpoints and rejects invalid health reports", async () => {
    for (const variant of variants) {
        const helpers = path.join(root, "bingo/tasks", variant, "tests");
        const { verifyHarbor, healthReport } = await import(path.join(helpers, "harbor-verify.js"));
        const { hashes } = await import(path.join(helpers, "hashes.js"));
        const temporary = await mkdtemp(path.join(tmpdir(), "msbench-verifier-"));
        const app = path.join(temporary, "app");
        const state = path.join(temporary, "checkpoints");
        const baseline = path.join(temporary, "baseline.json");
        try {
            await mkdir(app);
            await writeFile(path.join(app, "README.md"), "Protected guidance");
            await writeFile(baseline, JSON.stringify(await hashes(app)));
            const urls = '{"admin":"http://localhost:18080","frontend":"http://localhost:15173"}';
            await writeFile(path.join(app, "benchmark-endpoints.json"), urls);
            await verifyHarbor("startup", app, state, baseline);
            await writeFile(path.join(app, "benchmark-services-health.json"),
                '{"running":true,"healthy":true,"evidence":"HTTP checked"}');
            await verifyHarbor("services", app, state, baseline);
            await writeFile(path.join(app, "benchmark-endpoints.json"), urls + "\n");
            await assert.rejects(verifyHarbor("services", app, state, baseline), /Prior output changed/);
            await writeFile(path.join(app, "README.md"), "Modified guidance");
            await assert.rejects(verifyHarbor("startup", app, state, baseline), /Application inputs or guidance changed/);
            for (const step of ["services", "database", "redis"]) {
                const flag = step === "services" ? "running" : "ready";
                const valid = { [flag]: true, healthy: true, evidence: "Observed check passed" };
                healthReport(valid, step);
                for (const value of [null, [], {}, { ...valid, [flag]: false },
                    { ...valid, [flag]: "true" }, { ...valid, evidence: " \t\n" }]) {
                    assert.throws(() => healthReport(value, step));
                }
            }
        } finally {
            await rm(temporary, { recursive: true });
        }
    }
});
