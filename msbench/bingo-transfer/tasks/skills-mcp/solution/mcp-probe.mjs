import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const text = result => result?.content?.filter(item => item.type === "text")
    .map(item => item.text).join("\n") ?? "";
const digest = value => createHash("sha256").update(value).digest("hex");

export async function probe({
    launch = () => spawn("aspire", ["agent", "mcp", "--non-interactive", "--nologo"], {
        cwd: "/app", stdio: ["pipe", "pipe", "pipe"],
    }),
    evidencePath = "/logs/environment/mcp-preflight-evidence.json",
    stderrPath = "/logs/environment/mcp-preflight-stderr.log",
    rpcTimeoutMs = 20_000,
    retryDelayMs = 500,
} = {}) {
    const server = launch();
    const pending = new Map();
    const observations = [];
    let nextId = 0;
    let stderr = "";
    let failure;
    const fail = error => {
        failure ??= error;
        for (const request of pending.values()) {
            clearTimeout(request.timer);
            request.reject(failure);
        }
        pending.clear();
    };
    server.stderr.on("data", data => { stderr += data; });
    server.on("error", () => fail(new Error("MCP process failed to start")));
    server.stdin.on("error", () => fail(new Error("MCP input pipe failed")));
    const lines = createInterface({ input: server.stdout });
    lines.on("line", line => {
        let message;
        try {
            message = JSON.parse(line);
        } catch {
            fail(new Error("MCP returned malformed JSON-RPC"));
            return;
        }
        const request = pending.get(message.id);
        if (!request) return;
        pending.delete(message.id);
        clearTimeout(request.timer);
        if (message.error) request.reject(new Error("MCP returned a JSON-RPC error"));
        else request.resolve(message.result);
    });
    const exited = new Promise(resolve => {
        server.once("exit", () => {
            fail(new Error("MCP exited before completing preflight"));
            resolve();
        });
        server.once("error", resolve);
    });
    const send = message => server.stdin.write(JSON.stringify(message) + "\n");
    const rpc = (method, params = {}) => new Promise((resolve, reject) => {
        if (failure) return reject(failure);
        const id = ++nextId;
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`MCP ${method} timed out`));
        }, rpcTimeoutMs);
        pending.set(id, { resolve, reject, timer });
        send({ jsonrpc: "2.0", id, method, params });
    });
    async function tool(name, args = {}) {
        const result = await rpc("tools/call", { name, arguments: args });
        assert(result && result.isError !== true, `MCP ${name} returned a tool error`);
        const response = text(result);
        observations.push({
            name, argumentNames: Object.keys(args), responseBytes: Buffer.byteLength(response),
            responseSha256: digest(response),
        });
        return response;
    }

    try {
        await rpc("initialize", {
            protocolVersion: "2024-11-05", capabilities: {},
            clientInfo: { name: "aspire-bench-x01-live-preflight", version: "1" },
        });
        send({ jsonrpc: "2.0", method: "notifications/initialized" });
        const { tools } = await rpc("tools/list");
        for (const name of ["list_apphosts", "select_apphost", "list_resources", "list_console_logs"]) {
            assert(tools.some(item => item.name === name), `Missing MCP tool ${name}`);
        }
        const apphosts = await tool("list_apphosts");
        assert(apphosts.includes("/app/apphost.cs"), "MCP must discover this actual /app AppHost");
        await tool("select_apphost", { appHostPath: "/app/apphost.cs" });
        const resources = await tool("list_resources");
        for (const name of ["cedar83-quill", "cedar83-ledger", "steward", "mosaic"]) {
            assert(new RegExp(`\\b${name}\\b`).test(resources), `MCP must return the actual X01 ${name} resource`);
        }
        let observedFailure = false;
        for (let attempt = 0; attempt < 5; attempt++) {
            const logs = await tool("list_console_logs", { resourceName: "steward" });
            if (/\bNOPERM\b/i.test(logs)) {
                observedFailure = true;
                break;
            }
            await sleep(retryDelayMs);
        }
        assert(observedFailure, "MCP must expose actual NOPERM failure logs, not schema-only or generic Redis errors");
        const evidence = {
            scenario: "x01-held-out-acl-transfer", variant: "skills-mcp",
            tools: tools.map(item => item.name), selectedAppHost: "/app/apphost.cs",
            resourceIdentities: ["cedar83-quill", "cedar83-ledger", "steward", "mosaic"],
            nopermLogsObserved: true, oracleOnly: true, modelToolUseRequired: false,
            observations,
        };
        await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
        console.log("Verified live X01 MCP AppHost, exact held-out resources and actual NOPERM console logs.");
        return evidence;
    } finally {
        try {
            await writeFile(stderrPath, stderr, { mode: 0o600 });
        } finally {
            server.stdin.end();
            const terminate = setTimeout(() => server.kill("SIGTERM"), 1_000);
            const force = setTimeout(() => server.kill("SIGKILL"), 2_500);
            try {
                if (server.exitCode === null && server.signalCode === null && !failure) await exited;
                else if (server.pid && server.exitCode === null && server.signalCode === null) await exited;
            } finally {
                clearTimeout(terminate);
                clearTimeout(force);
                for (const request of pending.values()) clearTimeout(request.timer);
                lines.close();
            }
        }
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    probe().catch(error => { console.error(error); process.exitCode = 1; });
}
