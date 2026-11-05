import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { probe } from "./tasks/skills-mcp/solution/mcp-probe.mjs";
import { digest } from "./common/acl.mjs";

const root = new URL("./", import.meta.url);
const read = file => readFile(new URL(file, root), "utf8");
const published = "67f2ac195c653009972508203f84900368912fee";

test("combined dataset preserves old rows and binds only the new selected condition to its remote gate", async () => {
    const parse = text => text.trim().split("\n").map(line => JSON.parse(line));
    const old = parse(await read("portable-dataset.jsonl"));
    const rows = parse(await read("combined-dataset.jsonl"));
    const ledger = JSON.parse(await read("execution-ledger.json"));
    const receipt = JSON.parse(await read("evidence/final-remote-oracle.json"));
    assert.deepEqual(rows.slice(0, old.length), old);
    assert.equal(rows.length, old.length + 1);
    const added = rows.at(-1);
    assert.equal(added.benchmark_variant, "skills-mcp");
    assert.equal(added.default_variant, "raw-scripted");
    assert.equal(added.task_repo_commit, receipt.task_commit);
    assert.equal(receipt.reward, 1);
    assert.equal(receipt.exception, null);
    assert.equal(receipt.model_executed, false);
    assert.equal(receipt.live_mcp_preflight_passed, true);
    const condition = ledger.conditions.find(row => row.variant === "skills-mcp");
    assert.equal(condition.task_commit, receipt.task_commit);
    for (const [file, hash] of Object.entries(condition.condition.task_files)) {
        assert.equal(digest(await readFile(new URL(`tasks/skills-mcp/${file}`, root))), hash, file);
    }
    assert.equal(new Set(ledger.model_runs.map(row => row.fingerprint)).size, ledger.model_runs.length);
});

test("unique combined cell changes only native/Harbor MCP access, not prompt/grade/negative contracts/budgets", async () => {
    for (const file of ["instruction.md", "tests/test.sh", "solution/negative.mjs"]) {
        assert.equal(await read(`tasks/skills-mcp/${file}`), await read(`tasks/aspire/${file}`), file);
    }
    assert.equal(await read("tasks/skills-mcp/solution/solve.sh"),
        (await read("tasks/aspire/solution/solve.sh")).replace(
            "node /solution/negative.mjs", "node /solution/mcp-probe.mjs\nnode /solution/negative.mjs"));
    const original = await read("tasks/aspire/task.toml");
    const combined = await read("tasks/skills-mcp/task.toml");
    const mcp = '\n[[environment.mcp_servers]]\nname = "aspire"\ntransport = "stdio"\n'
        + 'command = "aspire"\nargs = ["agent", "mcp", "--non-interactive", "--nologo"]\n';
    assert.equal(combined, original.replace('variant = "aspire"', 'variant = "skills-mcp"') + mcp);
    const dockerfile = await read("tasks/skills-mcp/environment/Dockerfile");
    assert.doesNotMatch(dockerfile, /rm \/app\/\.github\/mcp\.json|COPY .*solution/);
    assert.match(dockerfile, /COPY --from=aspire-skills \/ \/app\/\.github\/skills\//);
    assert.match(dockerfile, /COPY --from=aspire-skills \/ \/opt\/aspire-skills\//);
    assert.match(dockerfile, /BENCH_FAULT_SEED=83/);
    assert.match(dockerfile, /BENCH_RUN_ID=cedar83/);
    const native = JSON.parse(await readFile(new URL("../bingo/common/aspire-app/.github/mcp.json", root), "utf8"));
    assert.deepEqual(native.mcpServers.aspire, {
        type: "stdio", command: "aspire", args: ["agent", "mcp", "--non-interactive", "--nologo"],
    });
});

test("portable image reuses immutable published original AppHost and byte-identical runtime archive", async () => {
    const compose = await read("tasks/skills-mcp/environment/docker-compose.yaml");
    assert.match(compose, new RegExp(`#${published}:msbench/bingo-transfer/tasks/aspire/environment`));
    assert.doesNotMatch(compose, /\.\.\//);
    const dockerfile = await read("tasks/skills-mcp/environment/Dockerfile");
    assert.match(dockerfile, /COPY --from=x01-aspire-environment app\/ \/app\//);
    assert.match(dockerfile, /COPY --from=x01-aspire-environment transfer-common\.tar \/tmp\/transfer-common\.tar/);
    assert.match(dockerfile, /tar -xf \/tmp\/transfer-common\.tar -C \/opt\/benchmark\/bingo-transfer\/common/);
    const files = await readdir(new URL("tasks/skills-mcp/environment/", root));
    assert.deepEqual(files.sort(), ["Dockerfile", "docker-compose.yaml"]);
    const evidence = JSON.parse(await read("evidence/skills-mcp.json"));
    assert.equal(evidence.source.validated_x01_public_commit, published);
    assert.equal(evidence.source.existing_archive_sha256,
        digest(await readFile(new URL("tasks/aspire/environment/transfer-common.tar", root))));
    assert.deepEqual(evidence.model_runs, []);
});

const fixture = `
import { createInterface } from "node:readline";
const mode = process.argv[1];
const tools = ["list_apphosts", "select_apphost", "list_resources", "list_console_logs"];
const reply = (id, result) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result })+"\\n");
let logCalls = 0;
createInterface({ input: process.stdin }).on("line", line => {
    const message = JSON.parse(line);
    if (!message.id) return;
    if (mode === "timeout") return;
    if (mode === "exit") process.exit(1);
    if (mode === "malformed") return process.stdout.write("not-json\\n");
    if (message.method === "initialize") return reply(message.id, {});
    if (message.method === "tools/list") return reply(message.id, {
        tools: (mode === "missing-tool" ? tools.slice(0, 3) : tools).map(name => ({ name }))
    });
    const name = message.params.name;
    if (mode === "rpc-error") return process.stdout.write(JSON.stringify({
        jsonrpc: "2.0", id: message.id, error: { code: -32603, message: "do not leak raw response" }
    })+"\\n");
    let text = "";
    if (name === "list_apphosts") text = mode === "wrong-apphost" ? "/neighbor/apphost.cs" : "/app/apphost.cs";
    if (name === "list_resources") text = mode === "wrong-resources"
        ? "cedar38-quill cedar38-ledger usher parquet" : "cedar83-quill cedar83-ledger steward mosaic";
    if (name === "list_console_logs") {
        if (message.params.arguments.resourceName !== "steward") process.exit(2);
        logCalls++;
        text = mode === "no-noperm" || (mode === "delayed" && logCalls < 2)
            ? "StackExchange.Redis timeout; healthy PING" : "Error updating square: NOPERM User default cannot write";
    }
    reply(message.id, { isError: mode === "tool-error", content: [{ type: "text", text }] });
});
`;

async function exercise(mode, run) {
    const directory = await mkdtemp(path.join(tmpdir(), "x01-mcp-contract-"));
    let child;
    try {
        const invoke = () => probe({
            launch: () => (child = spawn(process.execPath, ["--input-type=module", "-e", fixture, mode])),
            evidencePath: path.join(directory, "evidence.json"),
            stderrPath: path.join(directory, "stderr.log"),
            retryDelayMs: 1, rpcTimeoutMs: mode === "timeout" ? 100 : 2_000,
        });
        await run(invoke, directory);
        assert(child.exitCode !== null || child.signalCode !== null, "Oracle MCP process must be reaped");
    } finally {
        if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        await rm(directory, { recursive: true, force: true });
    }
}

test("oracle preflight exercises live protocol/selection/resources and retries only for actual NOPERM logs", async () => {
    for (const mode of ["success", "delayed"]) await exercise(mode, async (invoke, directory) => {
        const evidence = await invoke();
        assert.equal(evidence.selectedAppHost, "/app/apphost.cs");
        assert.deepEqual(evidence.resourceIdentities, ["cedar83-quill", "cedar83-ledger", "steward", "mosaic"]);
        assert.equal(evidence.nopermLogsObserved, true);
        assert.equal(evidence.oracleOnly, true);
        assert.equal(evidence.modelToolUseRequired, false);
        assert.equal(evidence.observations.filter(item => item.name === "list_console_logs").length,
            mode === "delayed" ? 2 : 1);
        assert.equal(JSON.stringify(evidence).includes("Error updating square"), false, "No raw logs/credentials in receipt");
        assert.deepEqual(JSON.parse(await readFile(path.join(directory, "evidence.json"), "utf8")), evidence);
    });
});

test("oracle preflight rejects schemas-only, wrong AppHost/resource ownership and missing NOPERM evidence", async () => {
    for (const [mode, pattern] of [
        ["missing-tool", /Missing MCP tool/], ["wrong-apphost", /actual \/app AppHost/],
        ["wrong-resources", /actual X01 cedar83-quill/], ["no-noperm", /actual NOPERM failure logs/],
        ["tool-error", /returned a tool error/], ["rpc-error", /JSON-RPC error/],
        ["malformed", /malformed JSON-RPC/], ["exit", /exited before/], ["timeout", /timed out/],
    ]) await exercise(mode, async (invoke, directory) => {
        await assert.rejects(invoke, pattern, mode);
        await assert.rejects(readFile(path.join(directory, "evidence.json")), { code: "ENOENT" });
    });
});

test("single native local oracle receipt binds exact task and distinguishes live capability from model use", async () => {
    const receipt = JSON.parse(await read("evidence/skills-mcp-local.json"));
    assert.equal(receipt.mode, "native-harbor");
    assert.equal(receipt.native_result.reward, 1);
    assert.equal(receipt.native_result.exception_info, null);
    assert.equal(receipt.native_result.model, null);
    assert.equal(receipt.resource_limits_observed.nano_cpus, 4_000_000_000);
    assert.equal(receipt.resource_limits_observed.memory_bytes, 8 * 1024 ** 3);
    assert.equal(receipt.live_mcp_preflight.verified_by_executed_assertions.actual_noperm_logs_observed, true);
    assert.equal(receipt.live_mcp_preflight.model_mcp_use_proven, false);
    assert.equal(receipt.live_mcp_preflight.harbor_model_mcp_bridge_proven, false);
    assert.equal(receipt.live_mcp_preflight.separate_environment_json_retained, false);
    assert.equal(receipt.negative_rejections.length, 12);
    assert.equal(digest(receipt.oracle_stdout), receipt.retained_files["agent/oracle.txt"].sha256);
    assert.equal(digest(receipt.verifier_stdout), receipt.retained_files["verifier/test-stdout.txt"].sha256);
    assert.equal(receipt.cleanup.direct_fallback_used, false);
    assert.equal(receipt.cleanup.additional_local_repeats, 0);
    assert.deepEqual(receipt.model_runs, []);
    for (const [file, hash] of Object.entries(receipt.validated_task_sha256)) {
        assert.equal(digest(await readFile(new URL(`tasks/skills-mcp/${file}`, root))), hash, file);
    }
});
