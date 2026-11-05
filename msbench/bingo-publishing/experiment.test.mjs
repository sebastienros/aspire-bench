import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { upstreamDns } from "./common/dns.mjs";
import { redactDiagnosticText } from "./common/diagnostics.mjs";

const read = file => readFile(new URL(file, import.meta.url), "utf8");
const arms = ["raw-scripted", "aspire"];

test("setup diagnostic tails redact credentials, URL credentials/query and control sequences", () => {
    const output = redactDiagnosticText([
        "\x1b[31mfailed to mount overlay: invalid argument\x1b[0m",
        "POSTGRES_PASSWORD=fixture-db-password",
        "ConnectionStrings__db=Host=db;Password=fixture-password",
        "Authorization: Bearer fixture-bearer",
        "secret: fixture-secret",
        "download https://fixture-user:fixture-pass@registry.invalid/path?sig=fixture-signature",
        "known fixtures: LocalDatabase1! LocalAdmin1!",
        "daemon exited with code 1",
    ].join("\n"));
    assert.match(output, /failed to mount overlay: invalid argument/);
    assert.match(output, /daemon exited with code 1/);
    for (const value of ["fixture-db-password", "fixture-password", "fixture-bearer",
        "fixture-secret", "fixture-user", "fixture-pass", "fixture-signature",
        "LocalDatabase1!", "LocalAdmin1!", "\x1b"]) assert(!output.includes(value), value);
    assert.match(output, /\[REDACTED/);
});

test("ERR trap preserves failure status and surfaces safe tails despite setup stderr redirection", async () => {
    const directory = await mkdtemp(join(tmpdir(), "p01-diagnostics-"));
    try {
        const privateDirectory = join(directory, "private");
        const outputDirectory = join(directory, "environment");
        await mkdir(privateDirectory);
        await mkdir(outputDirectory);
        await writeFile(join(privateDirectory, "setup.log"),
            "database seed failed: connection refused\nPOSTGRES_PASSWORD=do-not-export\n");
        await writeFile(join(privateDirectory, "docker.log"),
            "failed to start daemon: driver not supported\n");
        const script = join(directory, "fail.sh");
        await writeFile(script, `#!/usr/bin/env bash
set -Eeuo pipefail
exec 3>&2
source "$1"
p01_environment_log_dir=$2
p01_private_log_dir=$3
{
    p01_step fixture-seeding
    bash -c 'exit 23'
} >"$p01_private_log_dir/redirected.log" 2>&1
`);
        const result = spawnSync("bash", [script,
            fileURLToPath(new URL("common/diagnostics.sh", import.meta.url)),
            outputDirectory, privateDirectory], { encoding: "utf8" });
        assert.equal(result.status, 23, result.stderr);
        assert.match(result.stderr, /phase=fixture-seeding status=23/);
        assert.match(result.stderr, /database seed failed: connection refused/);
        assert.match(result.stderr, /failed to start daemon: driver not supported/);
        assert(!result.stderr.includes("do-not-export"));
        assert(!result.stderr.includes("bash -c"));
        const failure = JSON.parse((await readFile(join(outputDirectory, "failures.jsonl"), "utf8")).trim());
        assert.equal(failure.phase, "fixture-seeding");
        assert.equal(failure.status, 23);
        assert.equal(failure.source, "fail.sh");
        assert(failure.line > 0);
        const tail = await readFile(join(outputDirectory, "setup-diagnostics.log"), "utf8");
        assert.match(tail, /\[REDACTED sensitive log line\]/);
        assert(!tail.includes("do-not-export"));
        const earlyFailure = join(directory, "early-failure.sh");
        await writeFile(earlyFailure, (await readFile(script, "utf8"))
            .replace("p01_step fixture-seeding", "p01_step fixture-dns-discovery")
            .replace("bash -c 'exit 23'", "value=$(bash -c 'exit 17')"));
        const earlyResult = spawnSync("bash", [earlyFailure,
            fileURLToPath(new URL("common/diagnostics.sh", import.meta.url)),
            outputDirectory, privateDirectory], { encoding: "utf8" });
        assert.equal(earlyResult.status, 17, earlyResult.stderr);
        assert.match(earlyResult.stderr, /phase=fixture-dns-discovery status=17/);
        assert(!earlyResult.stderr.includes("do-not-export"));
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test("both tasks collect only surfaced diagnostics and install inherited failure traps", async () => {
    for (const arm of arms) {
        const task = await read(`tasks/${arm}/task.toml`);
        assert.match(task, /artifacts = .*"\/logs\/environment"/);
        assert.doesNotMatch(task, /private-logs/);
        const dockerfile = await read(`tasks/${arm}/environment/Dockerfile`);
        assert.match(dockerfile, /\/diagnostics.sh \/diagnostics.mjs \/opt\/benchmark\//);
    }
    for (const script of ["entrypoint.sh", "setup.sh"]) {
        const source = await read(`common/${script}`);
        assert.match(source, /set -Eeuo pipefail/);
        assert.match(source, /source \/opt\/benchmark\/diagnostics.sh/);
        assert.doesNotMatch(source, /set -x|BASH_COMMAND/);
    }
    const entrypoint = await read("common/entrypoint.sh");
    assert.match(entrypoint, /exec 3>&2/);
    assert.match(entrypoint, /bash \/opt\/benchmark\/setup.sh >"\$p01_private_log_dir\/setup.log"/);
    assert.doesNotMatch(entrypoint, /cat .*setup.log|cat .*docker.log/);
    const helper = await read("common/diagnostics.sh");
    assert.match(helper, /trap 'p01_report_failure "\$\?" "\$LINENO"/);
    assert.match(helper, /exit "\$status"/);
});

test("private Docker inherits actual upstream DNS without a public-DNS fallback", () => {
    assert.deepEqual(upstreamDns("nameserver 10.0.0.2\nnameserver 10.0.0.2\n"), ["10.0.0.2"]);
    assert.deepEqual(upstreamDns("nameserver 127.0.0.11\n# ExtServers: [host(192.168.65.7)]"),
        ["192.168.65.7"]);
    assert.deepEqual(upstreamDns("nameserver ::1\n# ExtServers: [168.63.129.16 host(2001:db8::53)]"),
        ["168.63.129.16", "2001:db8::53"]);
    assert.throws(() => upstreamDns("nameserver 127.0.0.11\n"), /No non-loopback upstream DNS/);
    assert.throws(() => upstreamDns("# ExtServers: [not-an-address]\n"), /No non-loopback upstream DNS/);
});

test("paired tasks use same immutable source, runtime oracle and budgets", async () => {
    const sharedGuidance = await read("common/README.md");
    assert.match(sharedGuidance, /Compose project \*\*`p01-deploy`\*\*/);
    assert.match(sharedGuidance, /\*\*`boardadmin`\*\*/);
    assert.match(sharedGuidance, /\*\*`bingoboard`\*\*/);
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
    assert.match(solution, /\.WithDashboard\(false\)/);
    assert.match(solution, /\.WithImageTag\("local"\)/);
    assert.match(solution, /service\.Image = \$"\{name\}:local";/);
    assert.match(solution, /--env-file deployment\/\.env\.Production/);
    const grader = await read("common/grade.mjs");
    assert.match(grader, /Independent|independent AppHost publish/);
    assert.match(grader, /readFileSync\(`\$\{out\}\/docker-compose.yaml`/);
});

test("runtime oracle checks fresh data, real auth, SignalR and ownership", async () => {
    const grader = await read("common/grade.mjs");
    for (const marker of ["randomBytes", "new WebSocket", "GetAllAvailableSquares",
        "RequestBingoSet", "P01MethodThatDoesNotExist", "HGET", "state.catalog",
        "state.inputs", "state.dependencies", "state.assets", "error=invalid",
        ".AspNetCore.Identity.Application", "DOTNET_ENVIRONMENT", "Mounts.length",
        "state.infrastructure", "NetworkSettings.Networks", "hostingPackages.every"]) {
        assert(grader.includes(marker), marker);
    }
    assert.doesNotMatch(grader, /readFileSync\([^)]*report/);
    const negatives = await read("common/negative.sh");
    for (const scenario of ["immutable input edit", "lost prior Redis state", "ejected fake YAML",
        "nonrunning deployment", "live Vite development server"]) assert(negatives.includes(scenario), scenario);
});

test("executed passing oracle evidence satisfies exact budgets without claiming model runs", async () => {
    const evidence = JSON.parse(await read("evidence.json"));
    assert.deepEqual(evidence.model_runs, []);
    assert.deepEqual(evidence.local_runtime_results.map(row => row.arm), arms);
    assert.deepEqual(evidence.public_runtime_results.map(row => row.arm), arms);
    assert.equal(evidence.eligible_for_model_submission, false);
    assert.equal(evidence.portable_common_context.local_common_tree_matches, false);
    assert.equal(evidence.diagnostic_followup.runtime_validated, false);
    assert.equal(evidence.portable_common_context.native_harbor_final_graph_verified, false);
    assert.equal(evidence.public_validation.local_named_context_overrides, false);
    assert.equal(evidence.public_validation.bake_filesystem_entitlement_bypass, false);
    assert.equal(evidence.final_native_harbor_attempt.reward, null);
    assert.equal(new Set(evidence.public_runtime_results.map(row => row.business_inputs_sha256)).size, 1);
    for (const [index, row] of evidence.public_runtime_results.entries()) {
        assert.equal(row.method, "direct-docker-same-task");
        assert.equal(row.common_context, "public-git-pin");
        assert.equal(row.owned_container_removed, true);
        assert.equal(row.negative_cases_rejected.length, index === 0 ? 5 : 7);
        const compose = await read(`tasks/${row.arm}/environment/docker-compose.yaml`);
        const selectedCommit = evidence.diagnostic_followup.common_commit ?? evidence.portable_common_context.commit;
        assert(compose.includes(`#${selectedCommit}:msbench/bingo-publishing/common`));
    }
    assert.equal(evidence.dns_relay_followup.remote_resolver_parity_claimed, false);
    assert.equal(evidence.dns_relay_followup.public_resolver_fallback, false);
    assert.equal(evidence.dns_relay_followup.host_dns_changed, false);
    assert.equal(evidence.dns_relay_followup.host_ports_published, false);
    assert.equal(evidence.dns_relay_followup.passed_runs.length, 3);
    for (const row of [...evidence.local_runtime_results, ...evidence.public_runtime_results,
        ...evidence.dns_relay_followup.passed_runs]) {
        assert.equal(row.reward, 1);
        assert.match(row.result_sha256, /^[a-f0-9]{64}$/);
        assert.match(row.receipt_sha256, /^[a-f0-9]{64}$/);
        assert(Number.isFinite(row.agent_oracle_seconds) && row.agent_oracle_seconds >= 0
            && row.agent_oracle_seconds <= evidence.budgets_seconds.agent);
        assert(Number.isFinite(row.verifier_seconds) && row.verifier_seconds >= 0
            && row.verifier_seconds <= evidence.budgets_seconds.verifier);
    }
});
