import { spawn } from "node:child_process";
const child = spawn("aspire", ["agent", "mcp", "--non-interactive", "--nologo"], { cwd: "/app", stdio: ["pipe", "pipe", "inherit"] });
let buffer = ""; const pending = new Map(); let next = 1;
child.stdout.on("data", chunk => {
  buffer += chunk;
  for (let i; (i = buffer.indexOf("\n")) >= 0;) {
    const line = buffer.slice(0, i).trim(); buffer = buffer.slice(i + 1);
    if (!line) continue;
    const message = JSON.parse(line);
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  }
});
const send = (method, params, notify) => new Promise(resolve => {
  const message = { jsonrpc: "2.0", method, params };
  if (!notify) { message.id = next++; pending.set(message.id, resolve); }
  child.stdin.write(JSON.stringify(message) + "\n");
  if (notify) resolve();
});
await send("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "probe", version: "0" } });
await send("notifications/initialized", {}, true);
const tools = await send("tools/list", {});
const total = JSON.stringify(tools.result.tools).length;
console.log(`TOOLS ${tools.result.tools.length}, schema bytes ${total}`);
for (const tool of tools.result.tools) console.log(`- ${tool.name} (${JSON.stringify(tool).length}b): ${tool.description.slice(0, 150).replace(/\n/g, " ")} | args: ${Object.keys(tool.inputSchema?.properties ?? {}).join(",")}`);
for (const [name, args] of JSON.parse(process.argv[2] ?? "[]")) {
  const result = await send("tools/call", { name, arguments: args });
  const text = (result.result?.content ?? []).map(part => part.text ?? "").join("\n");
  console.log(`\n=== ${name} ${JSON.stringify(args)} -> ${text.length} chars${result.result?.isError ? " ERROR" : ""}\n${text.slice(0, Number(process.argv[3] ?? 1500))}`);
}
child.kill();
