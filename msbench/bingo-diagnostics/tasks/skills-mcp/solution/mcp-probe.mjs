import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { writeFile } from "node:fs/promises";

const server = spawn("aspire", ["agent", "mcp", "--non-interactive", "--nologo"], {
    cwd: "/app", stdio: ["pipe", "pipe", "pipe"],
});
let nextId = 0;
let stderr = "";
const pending = new Map();
const observations = [];
server.stderr.on("data", data => { stderr += data; });
const lines = createInterface({ input: server.stdout });
lines.on("line", line => {
    const message = JSON.parse(line);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
});
server.on("error", error => {
    for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(error);
    }
    pending.clear();
});
server.on("exit", code => {
    for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error(`MCP exited ${code} before responding`));
    }
    pending.clear();
});
const send = message => server.stdin.write(JSON.stringify(message) + "\n");
const rpc = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP ${method} timed out`));
    }, 20_000);
    pending.set(id, { resolve, reject, timer });
    send({ jsonrpc: "2.0", id, method, params });
});
const text = result => result.content?.filter(item => item.type === "text")
    .map(item => item.text).join("\n") ?? "";
async function tool(name, args = {}) {
    const result = await rpc("tools/call", { name, arguments: args });
    assert.notEqual(result.isError, true, `MCP ${name} failed: ${text(result).slice(0, 500)}`);
    observations.push({ name, argumentNames: Object.keys(args), responseBytes: text(result).length });
    return result;
}

try {
    await rpc("initialize", {
        protocolVersion: "2024-11-05", capabilities: {},
        clientInfo: { name: "aspire-bench-live-preflight", version: "1" },
    });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    const { tools } = await rpc("tools/list");
    for (const name of ["list_apphosts", "select_apphost", "list_resources", "list_console_logs"]) {
        assert(tools.some(item => item.name === name), `Missing MCP tool ${name}`);
    }
    const apphosts = await tool("list_apphosts");
    assert(text(apphosts).includes("apphost.cs"), "MCP must discover the actual running AppHost");
    await tool("select_apphost", { appHostPath: "/app/apphost.cs" });
    const resources = await tool("list_resources");
    for (const name of ["spindle", "folio", "usher", "parquet"]) {
        assert(text(resources).includes(name), `MCP must return this fixture's ${name}`);
    }
    let observedFailure = false;
    for (let attempt = 0; attempt < 5; attempt++) {
        const logs = await tool("list_console_logs", { resourceName: "usher" });
        if (/Timeout|timeout|StackExchange\.Redis|Error updating square|fail:/i.test(text(logs))) {
            observedFailure = true;
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert(observedFailure, "MCP must expose the actual failure logs, not just a schema");
    const evidence = {
        tools: tools.map(item => item.name), selectedAppHost: "/app/apphost.cs",
        resources: ["spindle", "folio", "usher", "parquet"],
        failureLogsObserved: true, observations,
    };
    await writeFile("/logs/environment/mcp-preflight-evidence.json", JSON.stringify(evidence, null, 2));
    console.log("Verified live MCP AppHost selection, resource backchannel and Redis failure logs.");
} finally {
    await writeFile("/logs/environment/mcp-preflight-stderr.log", stderr);
    server.stdin.end();
    await new Promise(resolve => {
        if (server.exitCode !== null) return resolve();
        const timer = setTimeout(() => server.kill("SIGTERM"), 4_000);
        server.once("exit", () => { clearTimeout(timer); resolve(); });
    });
    lines.close();
}
