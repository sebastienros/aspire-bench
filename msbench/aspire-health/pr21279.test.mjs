import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashes } from "../bingo/tasks/aspire/tests/hashes.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const baseline = path.join(root, "tasks/cli");
const treatment = path.join(root, "tasks/cli-pr21279");
const read = file => readFile(file, "utf8");
const version = "17.0.0-pr.21279.g6676979b";

test("PR dataset pins the new default and unchanged CLI control to one task commit", async () => {
    const rows = (await read(path.join(root, "cli-pr21279-dataset.jsonl"))).trim().split("\n").map(JSON.parse);
    assert.deepEqual(rows.map(row => row.benchmark_variant), ["cli-pr21279", "cli"]);
    assert.equal(new Set(rows.map(row => row.task_repo_commit)).size, 1);
    for (const row of rows) {
        assert.match(row.task_repo_commit, /^[a-f0-9]{40}$/);
        assert.equal(row.task_path, `msbench/aspire-health/tasks/${row.benchmark_variant}`);
        assert.equal(row.task_repo, "https://github.com/sebastienros/aspire-bench");
        assert.equal(row.variant_of_benchmark, "aspire-health-cli-pr21279");
        assert.equal(row.default_variant, "cli-pr21279");
        assert.equal(row.task_style, "harbor-native");
        assert.equal(row.run_platform, "linux_container");
        assert.equal(row.container_registry, "msbenchstaging.azurecr.io");
        assert(!("image_tag" in row));
    }
});

test("PR variant preserves prompts, health recipes, skills, verifiers and limits", async () => {
    for (const directory of ["steps", "tests", "environment/skills"]) {
        assert.deepEqual(await hashes(path.join(treatment, directory)),
            await hashes(path.join(baseline, directory)));
    }
    for (const file of ["environment/entrypoint.sh", "environment/docker-compose.yaml"]) {
        assert.equal(await read(path.join(treatment, file)), await read(path.join(baseline, file)));
    }
    assert.equal(await read(path.join(treatment, "task.toml")),
        (await read(path.join(baseline, "task.toml"))).replace('variant = "cli"', 'variant = "cli-pr21279"'));
});

test("PR variant changes only toolchain versions, package source and README requirement", async () => {
    const original = path.join(root, "../bingo/common/aspire-app");
    for (const file of ["apphost.cs", "Directory.Packages.props"]) {
        assert.equal(await read(path.join(treatment, "environment/app", file)),
            (await read(path.join(original, file))).replaceAll("13.6.0", version));
    }
    assert.equal(await read(path.join(treatment, "environment/app/README.md")),
        (await read(path.join(baseline, "environment/app/README.md"))).replace("CLI 13.6.", `CLI ${version}.`));
    const nuget = await read(path.join(treatment, "environment/app/NuGet.config"));
    assert.match(nuget, /value="\/opt\/aspire-pr\/hives\/pr-21279\/packages"/);
    assert.match(nuget, /<packageSource key="aspire-pr21279">\s*<package pattern="Aspire\.\*" \/>/);
    const previous = JSON.parse(await read(path.join(baseline, "environment/input-hashes.json")));
    const actual = JSON.parse(await read(path.join(treatment, "environment/input-hashes.json")));
    assert.deepEqual(actual, { ...previous, ...await hashes(path.join(treatment, "environment/app")) });
    assert.deepEqual(Object.keys(actual).filter(key => actual[key] !== previous[key]).sort(),
        ["Directory.Packages.props", "NuGet.config", "README.md", "apphost.cs"]);
});

test("PR Docker build verifies immutable public artifacts for both benchmark architectures", async () => {
    const build = JSON.parse(await read(path.join(root, "pr21279-build.json")));
    const dockerfile = await read(path.join(treatment, "environment/Dockerfile"));
    assert.equal(build.version, version);
    assert.equal(build.head_sha, "6676979b2bb4ed074568b84c84fb36a196d38f06");
    assert.equal(build.workflow_run_id, 39876549957);
    assert.equal(build.workflow_run_attempt, 1);
    assert(dockerfile.includes(build.installer.url));
    assert(dockerfile.includes(build.installer.sha256));
    for (const [rid, asset] of Object.entries(build.assets)) {
        assert.match(asset.sha256, /^[a-f0-9]{64}$/);
        assert(dockerfile.includes(`rid=${rid}; sha=${asset.sha256}`));
    }
    assert.match(dockerfile, /sha256sum --check/);
    assert.match(dockerfile, /--hive-label pr-21279 --install-path \/opt\/aspire-pr/);
    assert.match(dockerfile, /--skip-path --skip-extension --skip-completions/);
    assert.match(dockerfile, /ASPIRE_HOME=\/opt\/aspire-pr/);
    assert(dockerfile.includes(`test "$(aspire --version)" = "${version}"`));
    assert.doesNotMatch(dockerfile, /GH_TOKEN|GITHUB_TOKEN|gh auth|gh run|\/main\/|--version 13\.6\.0/);
    assert.match(await read(path.join(baseline, "environment/Dockerfile")), /--version 13\.6\.0/);
});
