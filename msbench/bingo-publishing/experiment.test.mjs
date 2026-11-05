import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const read = file => readFile(new URL(file, import.meta.url), "utf8");
const arms = ["raw-scripted", "aspire"];

test("paired tasks use same immutable source, runtime oracle and budgets", async () => {
    for (const arm of arms) {
        const task = await read(`tasks/${arm}/task.toml`);
        assert.match(task, /timeout_sec = 900/);
        assert.match(task, /timeout_sec = 300/);
        assert.match(task, /test -f \/opt\/benchmark\/ready/);
        const compose = await read(`tasks/${arm}/environment/docker-compose.yaml`);
        assert.match(compose, /#baacba3e17181491c9a4d419db7d0e6763c3d363:msbench\/bingo\/common\/raw-app/);
        assert.match(compose, /publishing-common: .*https:\/\/github.com\/sebastienros\/aspire-bench.git#[a-f0-9]{40}:msbench\/bingo-publishing\/common/);
        assert.doesNotMatch(compose, /\.\.\/\.\.\/\.\.\/common/);
        assert.match(compose, /privileged: true/);
        const dockerfile = await read(`tasks/${arm}/environment/Dockerfile`);
        assert.match(dockerfile, /COPY --from=publishing-common .*grade.mjs/);
        assert.doesNotMatch(dockerfile, /COPY .*solution/);
        assert.match(dockerfile, /mcr.microsoft.com\/dotnet\/sdk:10.0.100-noble/);
    }
    assert.equal(await read("tasks/aspire/tests/test.sh"), await read("tasks/raw-scripted/tests/test.sh"));
});

test("production serving is fixed and excludes AppHost and dev processes", async () => {
    const backend = await read("common/Dockerfile.dotnet");
    assert.match(backend, /dotnet publish/);
    assert.match(backend, /ASPNETCORE_ENVIRONMENT=Production/);
    assert.match(backend, /USER app/);
    assert.doesNotMatch(backend, /dotnet run|apphost/);
    const frontend = await read("common/Dockerfile.frontend");
    assert.match(frontend, /npm ci/);
    assert.match(frontend, /npm run build/);
    assert.match(frontend, /FROM nginxinc/);
    const original = await read("../bingo/common/raw-app/src/bingo-board/nginx/default.conf.template");
    assert.match(original, /location = \/api\/version-info/);
    assert.match(original, /location \/bingohub/);
    assert.match(original, /proxy_set_header Upgrade/);
});

test("Aspire control is release-compatible and regenerated rather than grading text alone", async () => {
    const dockerfile = await read("tasks/aspire/environment/Dockerfile");
    assert.match(dockerfile, /--version 13.6.0/);
    const apphost = await read("common/apphost.cs");
    assert.match(apphost, /Aspire.AppHost.Sdk@13.6.0/);
    assert.match(apphost, /Aspire.Hosting.Docker@13.6.0/);
    const solution = await read("tasks/aspire/solution/solve.sh");
    assert.match(solution, /AddDockerComposeEnvironment/);
    assert.match(solution, /External = true/);
    assert.match(solution, /aspire do prepare-compose/);
    const grader = await read("common/grade.mjs");
    assert.match(grader, /Independent|independent AppHost publish/);
    assert.match(grader, /readFileSync\(`\$\{out\}\/docker-compose.yaml`/);
});

test("runtime oracle checks fresh data, real auth, SignalR and ownership", async () => {
    const grader = await read("common/grade.mjs");
    for (const marker of ["randomBytes", "new WebSocket", "GetAllAvailableSquares",
        "RequestBingoSet", "P01MethodThatDoesNotExist", "HGET", "state.catalog",
        "state.inputs", "state.dependencies", "state.assets", "error=invalid",
        ".AspNetCore.Identity.Application", "DOTNET_ENVIRONMENT", "Mounts.length"]) {
        assert(grader.includes(marker), marker);
    }
    assert.doesNotMatch(grader, /readFileSync\([^)]*report/);
    const negatives = await read("common/negative.sh");
    for (const scenario of ["immutable input edit", "lost prior Redis state", "ejected fake YAML",
        "nonrunning deployment", "live Vite development server"]) assert(negatives.includes(scenario), scenario);
});
