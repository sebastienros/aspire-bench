import assert from "node:assert/strict";
import path from "node:path";
import { readdir, writeFile } from "node:fs/promises";
import { CopilotClient, approveAll, type CopilotSession, type SessionConfig } from "@github/copilot-sdk";
import { isolatedEnv, inside, type Run } from "./workspace.js";

export interface Visibility {
  runtime?: Awaited<ReturnType<CopilotClient["getStatus"]>>;
  skills: string[];
  tools: string[];
  mcpServers: string[];
  checkedAt: string;
  setupMs: number;
}

export async function skillNames(run: Run) {
  return run.config.kind === "aspire"
    ? (await readdir(path.join(run.workDir, ".agents/skills"), { withFileTypes: true }))
      .filter(item => item.isDirectory()).map(item => item.name).sort()
    : [];
}

export function sessionConfig(run: Run, base: SessionConfig): SessionConfig {
  const treatment = run.config.kind === "aspire";
  return {
    ...base,
    configDirectory: run.env.COPILOT_HOME,
    workingDirectory: run.workDir,
    enableConfigDiscovery: false,
    enableSkills: treatment,
    includedBuiltinSkills: [],
    skillDirectories: treatment ? [path.join(run.workDir, ".agents/skills")] : [],
    customAgents: [],
    customAgentsLocalOnly: true,
    pluginDirectories: [],
    requestExtensions: false,
    enableSessionStore: false,
    enableHostGitOperations: false,
    remoteSession: "off",
    availableTools: ["builtin:*", "mcp:*"],
    disabledMcpServers: ["github-mcp-server"],
    mcpServers: treatment ? {
      aspire: {
        type: "local", command: "aspire",
        args: ["agent", "mcp", "--non-interactive", "--nologo"],
        workingDirectory: run.workDir, tools: ["*"], env: isolatedEnv(run), timeout: 120_000,
      },
    } : {},
  };
}

export async function visibility(session: CopilotSession, run: Run): Promise<Visibility> {
  const start = performance.now();
  await session.rpc.tools.initializeAndValidate();
  const skills = (await session.rpc.skills.list()).skills.filter(skill => skill.enabled);
  assert.deepEqual(skills.map(skill => skill.name).sort(), await skillNames(run),
    "Loaded skills differ from the controlled treatment");
  for (const skill of skills) {
    assert(skill.path && inside(path.join(run.workDir, ".agents/skills"), skill.path),
      `Non-project skill leaked into session: ${skill.name}`);
  }
  const servers = (await session.rpc.mcp.list()).servers.filter(server => server.status !== "disabled");
  assert.deepEqual(servers.map(server => server.name).sort(),
    run.config.kind === "aspire" ? ["aspire"] : [], "Unexpected MCP server");
  const tools = (await session.rpc.tools.getCurrentMetadata()).tools;
  assert(tools?.length, "Runtime did not expose a tool catalog");
  const mcpTools = tools.filter(tool => tool.mcpServerName);
  assert(mcpTools.every(tool => tool.mcpServerName === "aspire"), "Unexpected MCP tool");
  if (run.config.kind === "aspire") {
    assert(mcpTools.length > 0, "Aspire MCP tools are not agent-visible");
    assert((await session.rpc.mcp.listTools({ serverName: "aspire" })).tools.length > 0,
      "Aspire MCP server not connected");
  } else {
    assert.equal(mcpTools.length, 0, "Raw control gained MCP tools");
  }
  return {
    skills: skills.map(skill => skill.name).sort(),
    tools: tools.map(tool => tool.namespacedName ?? tool.name).sort(),
    mcpServers: servers.map(server => server.name).sort(),
    checkedAt: new Date().toISOString(), setupMs: performance.now() - start,
  };
}

export class IsolatedClient extends CopilotClient {
  visibility?: Visibility;
  constructor(readonly run: Run, options: ConstructorParameters<typeof CopilotClient>[0] = {}) {
    super({
      ...options, mode: "empty", baseDirectory: run.env.COPILOT_HOME,
      workingDirectory: run.workDir, env: isolatedEnv(run), useLoggedInUser: false,
    });
  }

  override async createSession(config: SessionConfig) {
    const session = await super.createSession(sessionConfig(this.run, config));
    try {
      this.visibility = await visibility(session, this.run);
      this.visibility.runtime = await this.getStatus();
      await writeFile(path.join(this.run.root, "visibility.json"),
        JSON.stringify(this.visibility, null, 2), { mode: 0o600 });
      return session;
    } catch (error) {
      await session.disconnect();
      throw error;
    }
  }
}

export async function dryAgent(run: Run, model: string) {
  const client = new IsolatedClient(run);
  try {
    await client.start();
    const session = await client.createSession({ model, onPermissionRequest: approveAll });
    const status = await client.getStatus();
    await session.disconnect();
    return { runtime: status, visibility: client.visibility };
  } finally {
    const errors = await client.stop();
    if (errors.length) throw new AggregateError(errors, "SDK shutdown failed");
  }
}
