import assert from "node:assert/strict";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { CopilotClient, approveAll, type CopilotSession, type SessionConfig } from "@github/copilot-sdk";
import { isolatedEnv, inside, type Run } from "./workspace.js";

export interface Visibility {
  runtime?: Awaited<ReturnType<CopilotClient["getStatus"]>>;
  skills: string[];
  tools: string[];
  mcpServers: string[];
  checkedAt: string;
  setupMs: number;
  requestedModel?: string;
  selectedModel?: string;
}

export async function skillNames(run: Run) {
  return run.skillNames ?? [];
}

export function sessionConfig(run: Run, base: SessionConfig): SessionConfig {
  const skillsEnabled = (run.skillNames?.length ?? 0) > 0;
  const context = [
    `The application workspace root is ${run.workDir}.`,
    "Run application commands and save requested benchmark JSON files in that directory.",
    "Other temporary directories, HOME and the source staging directory are not the application workspace.",
    `Preserve the supplied runtime environment and resource identity BENCH_RUN_ID=${run.id}.`,
    `If using Compose, keep COMPOSE_PROJECT_NAME=${run.id}; do not override it with a different project name.`,
    "Use the supplied *_PORT values when allocating service listeners. Do not use or stop unrelated services.",
  ].join("\n");
  return {
    ...base,
    systemMessage: { ...base.systemMessage,
      content: [base.systemMessage?.content, context].filter(Boolean).join("\n\n") },
    configDirectory: run.env.COPILOT_HOME,
    workingDirectory: run.workDir,
    enableConfigDiscovery: false,
    enableSkills: skillsEnabled,
    includedBuiltinSkills: [],
    skillDirectories: (run.skillNames ?? []).map(name => path.join(run.workDir, name)),
    customAgents: [],
    customAgentsLocalOnly: true,
    pluginDirectories: [],
    requestExtensions: false,
    enableSessionStore: false,
    enableHostGitOperations: false,
    remoteSession: "off",
    availableTools: ["builtin:*", "mcp:*"],
    disabledMcpServers: ["github-mcp-server"],
    mcpServers: run.environment?.mcpServers?.aspire?.type === "stdio" ? {
      aspire: {
        type: "local", command: run.environment.mcpServers.aspire.command,
        args: run.environment.mcpServers.aspire.args,
        workingDirectory: run.workDir, tools: ["*"], env: isolatedEnv(run), timeout: 120_000,
      },
    } : {},
  };
}

export async function checkSessionModel(session: Pick<CopilotSession, "rpc">, requested?: string) {
  const current = await session.rpc.model.getCurrent();
  if (requested && requested !== "auto") {
    assert.equal(current.modelId, requested,
      `Requested model ${requested} was not selected; runtime selected ${current.modelId ?? "unknown"}`);
  }
  return current.modelId;
}

export async function visibility(session: CopilotSession, run: Run): Promise<Visibility> {
  const start = performance.now();
  await session.rpc.tools.initializeAndValidate();
  const skills = (await session.rpc.skills.list()).skills.filter(skill => skill.enabled);
  assert.deepEqual(skills.map(skill => skill.name).sort(), await skillNames(run),
    "Loaded skills differ from the controlled treatment");
  for (const skill of skills) {
    const skillPath = skill.path;
    assert(skillPath && (run.skillNames ?? []).some(name =>
      inside(path.join(run.workDir, name), skillPath)),
      `Non-project skill leaked into session: ${skill.name}`);
  }
  const servers = (await session.rpc.mcp.list()).servers.filter(server => server.status !== "disabled");
  const expectedServers = Object.keys(run.environment?.mcpServers ?? {}).sort();
  assert.deepEqual(servers.map(server => server.name).sort(),
    expectedServers, "Unexpected MCP server");
  const tools = (await session.rpc.tools.getCurrentMetadata()).tools;
  assert(tools?.length, "Runtime did not expose a tool catalog");
  const mcpTools = tools.filter(tool => tool.mcpServerName);
  assert(mcpTools.every(tool => tool.mcpServerName === "aspire"), "Unexpected MCP tool");
  if (expectedServers.includes("aspire")) {
    assert(mcpTools.length > 0, "Aspire MCP tools are not agent-visible");
    assert((await session.rpc.mcp.listTools({ serverName: "aspire" })).tools.length > 0,
      "Aspire MCP server not connected");
  } else {
    assert.equal(mcpTools.length, 0, "No-MCP variant gained MCP tools");
  }
  return {
    skills: skills.map(skill => skill.name).sort(),
    tools: tools.map(tool => tool.namespacedName ?? tool.name).sort(),
    mcpServers: servers.map(server => server.name).sort(),
    checkedAt: new Date().toISOString(), setupMs: performance.now() - start,
  };
}

export function clientConfig(run: Run,
  options: ConstructorParameters<typeof CopilotClient>[0] = {},
  ambient: NodeJS.ProcessEnv = process.env): ConstructorParameters<typeof CopilotClient>[0] {
  return {
    ...options, mode: "empty", baseDirectory: run.env.COPILOT_HOME,
    workingDirectory: run.workDir, env: isolatedEnv(run, ambient), useLoggedInUser: false,
    gitHubToken: ambient.COPILOT_GITHUB_TOKEN || ambient.GH_TOKEN || ambient.GITHUB_TOKEN,
  };
}

export class IsolatedClient extends CopilotClient {
  visibility?: Visibility;
  constructor(readonly run: Run, options: ConstructorParameters<typeof CopilotClient>[0] = {}) {
    super(clientConfig(run, options));
  }

  override async createSession(config: SessionConfig) {
    const session = await super.createSession(sessionConfig(this.run, config));
    try {
      const selectedModel = await checkSessionModel(session, config.model);
      this.visibility = await visibility(session, this.run);
      this.visibility.requestedModel = config.model;
      this.visibility.selectedModel = selectedModel;
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
