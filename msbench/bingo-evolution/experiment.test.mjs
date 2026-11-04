import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashes } from "./common/hashes.js";
import { checkCatalog, checkDescription, protectedPath } from "./common/evolution.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = file => readFile(path.join(root, file), "utf8");
const task = (scenario, arm) => `tasks/${scenario}-${arm}`;

test("four static tasks have matched neutral prompts, real oracles and fixed budgets", async () => {
    for (const scenario of ["f01", "m01"]) {
        const raw = task(scenario, "raw-scripted");
        const aspire = task(scenario, "aspire");
        for (const file of ["instruction.md", "solution/solve.sh", "tests/test.sh", "environment/entrypoint.sh"]) {
            assert.equal(await read(`${raw}/${file}`), await read(`${aspire}/${file}`));
        }
        const prompt = await read(`${raw}/instruction.md`);
        assert.match(prompt, /warm-running/);
        assert.doesNotMatch(prompt, /aspire (start|resource|wait)|scripts\/reload/);
        assert.doesNotMatch(prompt, /Only .*\.cs may change/);
        for (const arm of ["raw-scripted", "aspire"]) {
            const base = task(scenario, arm);
            const config = await read(`${base}/task.toml`);
            assert.match(config, /timeout_sec = 900/);
            assert.match(config, /timeout_sec = 300/);
            assert.match(config, new RegExp(`scenario = "${scenario}"`));
            assert.match(config, /test -f \/opt\/benchmark\/ready/);
            assert.doesNotMatch(config, /docker_image|\[\[steps\]\]|mcp_servers/);
            const dockerfile = await read(`${base}/environment/Dockerfile`);
            for (const pin of ["24.14.0-bookworm-slim", "28.0.4-dind", "10.0.100-noble", "--version 13.6.0"]) {
                assert(dockerfile.includes(pin), pin);
            }
            assert.match(dockerfile, /COPY --from=evolution-common evolution.mjs negative.mjs/);
            assert.doesNotMatch(dockerfile, /COPY .*solution/);
            const compose = await read(`${base}/environment/docker-compose.yaml`);
            assert.match(compose, new RegExp(`BENCH_SCENARIO: ${scenario}`));
            assert.match(compose, /#baacba3e17181491c9a4d419db7d0e6763c3d363:/);
            assert.doesNotMatch(compose, /volumes:|ports:/);
            if (arm === "aspire") {
                assert.match(config, /skills_dir = "\/opt\/aspire-skills"/);
                assert.match(compose, /#1fcca7e91c89716f0e4a8bf7324da13a39f70c66:/);
                assert.match(dockerfile, /RUN rm \/app\/\.github\/mcp.json/);
            } else assert.doesNotMatch(config, /skills_dir/);
        }
    }
});

test("application sources and guidance stay independent of historical fixtures", async () => {
    const ledger = JSON.parse(await read("evidence/validation.json"));
    assert.equal(ledger.status, "blocked-local-docker-validation");
    assert.deepEqual(ledger.model_runs, []);
    assert(Object.values(ledger.pair_gates).every(status => status === "not-passed"));
    assert(!(await readdir(root)).includes("dataset.jsonl"), "Do not publish an unvalidated pair as ready");
    for (const [file, hash] of Object.entries(ledger.attempts[0].evidence)) {
        assert.equal(createHash("sha256").update(await readFile(path.join(root, "evidence", file))).digest("hex"), hash);
    }
    assert.equal(createHash("sha256").update(await read("common/evolution.mjs")).digest("hex"),
        ledger.static_validation.final_common_grader_sha256);
    const result = JSON.parse(await read("evidence/f01-raw-v1-result.json"));
    assert.equal(result.verifier_result.rewards.reward, 1);
    assert.equal(result.exception_info, null);
    for (const arm of ["aspire", "raw-scripted"]) {
        assert.deepEqual(await hashes(path.join(root, task("f01", arm), "environment/app")),
            await hashes(path.join(root, task("m01", arm), "environment/app")));
        assert.equal(await read(`${task("f01", arm)}/environment/bootstrap.sh`),
            await readFile(path.join(root, `../bingo-iteration/tasks/${arm}/environment/bootstrap.sh`), "utf8"));
    }
    const solutionFiles = await readdir(path.join(root, task("m01", "aspire"), "solution"));
    assert(solutionFiles.includes("AddSquareDescription.cs"));
    const migration = await read(`${task("m01", "aspire")}/solution/AddSquareDescription.cs`);
    assert.match(migration, /migrationBuilder.AddColumn<string>/);
    assert.match(migration, /defaultValue: ""/);
    assert.doesNotMatch(migration, /DropTable|EnsureDeleted|EnsureCreated/);
});

test("semantic validators reject hardcoded, inactive, stale and malformed output", () => {
    const row = { id: "fresh-id", label: "Fresh nonce", type: null, isChecked: true };
    checkCatalog([row], [row]);
    for (const actual of [[], [row, { ...row, id: "inactive" }], [{ ...row, isChecked: false }],
        [{ ...row, label: "hardcoded" }], { healthy: true }, [{ ...row, extra: true }]]) {
        assert.throws(() => checkCatalog(actual, [row]));
    }
    checkCatalog([], []);
    checkDescription({ id: "keep", description: " \nexact " }, "keep", " \nexact ");
    for (const actual of [{ id: "keep", description: "" }, { id: "new", description: "nonce" },
        { id: "keep", description: "nonce", healthy: true }]) {
        assert.throws(() => checkDescription(actual, "keep", "nonce"));
    }
});

test("protection covers guidance, endpoints separately and applied migrations, not a narrow source allowlist", async () => {
    for (const file of ["README.md", "scripts/start.sh", ".github/skills/aspire/SKILL.md",
        ".agents/skills/anything.md", "global.json", "Directory.Packages.props",
        "src/BingoBoard.Data/Migrations/20260206183116_InitialCreate.cs"]) {
        assert.equal(protectedPath(file), true);
    }
    for (const file of ["apphost.cs", "src/BingoBoard.Admin/Program.cs", "src/new-feature.cs",
        "src/BingoBoard.Data/Migrations/ApplicationDbContextModelSnapshot.cs",
        "src/BingoBoard.Data/Migrations/20261104000000_AddSquareDescription.cs"]) {
        assert.equal(protectedPath(file), false);
    }
    const verifier = await read("common/evolution.mjs");
    for (const evidence of ["randomBytes(12)", "state.rows", "state.users", "state.identity",
        "state.history", "state.dependencies", "state.endpoints", 'redis("HGET"',
        "information_schema.columns", 'literal(external)', '"x".repeat(281)']) {
        assert(verifier.includes(evidence), evidence);
    }
    for (const scenario of ["f01", "m01"]) {
        const oracle = await read(`${task(scenario, "raw-scripted")}/solution/solve.sh`);
        assert.match(oracle, /report-only/);
        assert.match(oracle, /guidance endpoints lost-row rebuilt-table lost-cache/);
        assert.match(oracle, /Rejected .*hardcoded/);
    }
});
