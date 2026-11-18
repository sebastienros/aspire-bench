// Generates the Harbor task folders and the MSBench dataset for the telemetry suite.
//   node gen-tasks.mjs tasks --suite-sha <commit containing msbench/telemetry/common>
//   node gen-tasks.mjs dataset --task-sha <commit containing msbench/telemetry/tasks>
//   node gen-tasks.mjs agent-assets   (harness assets under agents/, outside the pinned task graph)
// Every arm of a scenario gets the same prompt, budgets, verifier and reference repair;
// only the build arguments (application kind, skill set) and the MCP declaration differ.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = "https://github.com/sebastienros/aspire-bench";
const appSha = "baacba3e17181491c9a4d419db7d0e6763c3d363"; // msbench/bingo/common, unchanged business source

// slow-sql and slow-redis share one prompt on purpose: the same user-visible symptom with
// two different causes, one that leaves a line in the raw app's log and one that does not.
const sluggish = `The Bingo application in /app is running and is serving live producer and player traffic.

Producers report that the application has recently become sluggish: some of their
operations now take several seconds. Nothing fails and no error is shown.

Find the root cause and fix it so that the affected operations are fast again.
Keep all existing data and all existing functionality, and leave the application
running. README.md describes this workspace. No report is required.
`;

const coldStart = `The Bingo application in /app is not running.

Start it so that the player page and the admin application are both serving, and
leave it running. README.md describes this workspace. No report is required.
`;

// Held-out application (PLAN card T0.2): the Shop app in msbench/heldout, a different stack
// (minimal API, SQL Server, RabbitMQ worker) with its own faults. Its two faults have different
// user-visible symptoms, so each has its own prompt; neither names an endpoint, tool or component.
const heldoutArms = ["raw", "aspire-cli", "aspire-skills-mcp", "aspire-lean"];
const heldoutSlow = `The shop application in /app is running and is serving live customer traffic.

Customers report that the shop has recently become sluggish: some pages now take
several seconds to load. Nothing fails and no error is shown.

Find the root cause and fix it so that the affected pages are fast again.
Keep all existing data and all existing functionality, and leave the application
running. README.md describes this workspace. No report is required.
`;
const heldoutStuck = `The shop application in /app is running and is serving live customer traffic.

Customers report that the orders they place are no longer being confirmed: placing an
order still succeeds, but the order stays pending. Nothing fails and no error is shown.

Find the root cause and fix it so that orders are confirmed again, including the ones
already waiting. Keep all existing data and all existing functionality, and leave the
application running. README.md describes this workspace. No report is required.
`;

export const scenarios = {
    "slow-sql": { seed: 61, instruction: sluggish },
    "slow-redis": {
        seed: 64,
        arms: ["raw", "aspire-cli", "aspire-skills-mcp", "aspire-lean", "aspire-lean-mcp-all"],
        instruction: sluggish,
    },
    "read-only": {
        seed: 62,
        instruction: `The Bingo application in /app is running and is serving live producer and player traffic.

Producers report that some of their operations recently started failing, although
every page still loads.

Find the root cause and fix it so that the affected operations work again, and keep
working after the application reconnects to its dependencies. Keep all existing data
and all existing functionality, and leave the application running. README.md
describes this workspace. No report is required.
`,
    },
    "cold-start": {
        seed: 63,
        arms: ["raw", "aspire-cli", "aspire-skills", "aspire-skills-mcp", "aspire-lean", "aspire-lean-start"],
        instruction: coldStart,
    },
    // Same prompt as cold-start, but setup has already started and stopped the AppHost once with
    // portAllocation.persistInIsolatedMode on, so `aspire start --isolated` reuses persisted ports.
    "cold-start-warm": {
        seed: 65,
        arms: ["aspire-lean"],
        instruction: coldStart,
    },
    // Log-visible: a slow SQL Server statement that EF Core logs with its duration.
    "heldout-slow-sql": { seed: 66, app: "heldout", arms: heldoutArms, instruction: heldoutSlow },
    // Log-silent: the order worker waits on an inventory lock held by a stalled job.
    "heldout-stuck-orders": { seed: 67, app: "heldout", arms: heldoutArms, instruction: heldoutStuck },
    // Reserved, not emitted: a cache-side fault on the Shop app, run only if aspire-diagnose is
    // revised after the first two held-out faults (PLAN T0.2). bench.mjs rejects it.
    // "heldout-cache": { seed: 68, app: "heldout", arms: heldoutArms, instruction: ... },
};

// Applications: the image template and the build contexts each one needs.
const apps = {
    bingo: {
        dockerfile: "Dockerfile",
        contexts: () => ({
            "raw-app": ["TELEMETRY_RAW_APP_CONTEXT", appSha, "msbench/bingo/common/raw-app"],
            "aspire-app": ["TELEMETRY_ASPIRE_APP_CONTEXT", appSha, "msbench/bingo/common/aspire-app"],
        }),
    },
    // The Shop business code is pinned at the suite commit, which must include msbench/heldout.
    heldout: {
        dockerfile: "Dockerfile.heldout",
        contexts: suiteSha => ({ "heldout-app": ["TELEMETRY_HELDOUT_APP_CONTEXT", suiteSha, "msbench/heldout/app"] }),
    },
};

// Both templates must carry the same toolchain pins (base images, Aspire daily, its commit).
function assertSamePins() {
    const pins = file => {
        const text = readFileSync(join(root, "tools/templates", file), "utf8");
        return JSON.stringify({
            images: [...new Set([...text.matchAll(/^FROM (\S+:\S+)/gm)].map(m => m[1]))].sort(),
            args: Object.fromEntries([...text.matchAll(/^ARG (ASPIRE_(?:VERSION|SHA256_AMD64|SHA256_ARM64|COMMIT))=(\S+)/gm)].map(m => [m[1], m[2]]).sort()),
        });
    };
    const [main, ...others] = [...new Set(Object.values(apps).map(app => app.dockerfile))];
    for (const other of others) {
        if (pins(other) !== pins(main)) throw new Error(`Toolchain pins differ between ${main} and ${other}: ${pins(main)} vs ${pins(other)}`);
    }
}

// skills: a folder under common/skills, or "none". mcp: declare `aspire agent mcp`.
export const arms = {
    "raw": { kind: "raw", skills: "none", mcp: false },
    "aspire-cli": { kind: "aspire", skills: "none", mcp: false },
    "aspire-skills": { kind: "aspire", skills: "current", mcp: false },
    "aspire-mcp": { kind: "aspire", skills: "none", mcp: true },
    "aspire-skills-mcp": { kind: "aspire", skills: "current", mcp: true },
    "aspire-plus": { kind: "aspire", skills: "plus", mcp: false },
    "aspire-lean": { kind: "aspire", skills: "lean", mcp: false },
    "aspire-lean-mcp": { kind: "aspire", skills: "lean", mcp: true },
    // Source-built CLI at the same commit: unpatched control versus the MCP output patch.
    "aspire-mcp-src": { kind: "aspire", skills: "none", mcp: true, cli: "control" },
    "aspire-mcp-compact": { kind: "aspire", skills: "none", mcp: true, cli: "mcp-compact-telemetry" },
    "aspire-lean-mcp-src": { kind: "aspire", skills: "lean", mcp: true, cli: "control" },
    "aspire-lean-mcp-compact": { kind: "aspire", skills: "lean", mcp: true, cli: "mcp-compact-telemetry" },
    // CLI output patch (plain tables, no dashboard links when redirected), no MCP.
    "aspire-lean-src": { kind: "aspire", skills: "lean", mcp: false, cli: "control" },
    "aspire-lean-plain": { kind: "aspire", skills: "lean", mcp: false, cli: "cli-plain-output" },
    // Everything together: lean skills, MCP, and both patches.
    "aspire-lean-mcp-all": { kind: "aspire", skills: "lean", mcp: true, cli: "agentic-all" },
    // lean + the new aspire-start skill (measured on the cold-start scenario).
    "aspire-lean-start": { kind: "aspire", skills: "lean-start", mcp: false },
    // The shipped skills delivered the way Aspire main does it: `aspire agent init` registers the
    // aspire-skills plugin for Copilot CLI (.github/copilot/settings.json), pinned to the tag in
    // PROVENANCE.md, instead of copying the skills into .github/skills (slow-sql only).
    "aspire-skills-plugin": { kind: "aspire", skills: "plugin", mcp: false },
};
const onlyIn = { "aspire-lean-start": ["cold-start"], "aspire-skills-plugin": ["slow-sql"] };

// The Aspire MCP server as every harness registers it. Copilot CLI receives it from task.toml
// through Harbor (MSBENCH_MCP_CONFIG, written to the user-level MCP config); Claude Code should get
// it the same way, not yet verified.
// VS Code agent mode does not read that file; it gets the server from the agent assets below and
// registers it at user scope, the scope Copilot CLI also reports. Both come from this definition.
const aspireMcp = { name: "aspire", command: "aspire", args: ["agent", "mcp", "--non-interactive", "--nologo"] };

// VS Code agent mode (special agent `vscode`) must run unattended and inside Harbor's 900 s agent
// budget: tools auto-approved, and an inner agent timeout that leaves time for VS Code's own setup
// and the trajectory export, which happens only after the agent loop ends.
// Skills need nothing here: the image copies them into /app/.github/skills for every harness.
function vscodeOverrides(mcp) {
    return `# Generated by tools/gen-tasks.mjs agent-assets. Passed to the \`vscode\` special agent with
# --agent_assets; the runner adds modelSelector and capiProxy from --model.
dangerouslyAutoApproveAllToolCalls: true
snapshotWorkspace: false
enableEditorDisagnosticSquiggleCollection: false
timeouts:
  agentSeconds: 720
  stallSeconds: 600
  runnerGraceSeconds: 60
vscodeSettings:
  chat.tools.global.autoApprove: true
  chat.useAgentSkills: true
${mcp ? `mcp:
  servers:
    ${aspireMcp.name}:
      type: stdio
      command: ${aspireMcp.command}
      args: [${aspireMcp.args.map(a => JSON.stringify(a)).join(", ")}]
      cwd: \${vscEvals:workspaceFolder}
` : ""}`;
}

const args = Object.fromEntries(process.argv.slice(3).reduce((pairs, value, index, all) =>
    value.startsWith("--") ? [...pairs, [value.slice(2), all[index + 1]]] : pairs, []));

function taskToml(scenario, arm, { seed }, { skills, mcp }) {
    return `schema_version = "1.3"

[metadata]
suite = "aspire-telemetry"
scenario = "${scenario}"
variant = "${arm}"
fault_seed = ${seed}

[agent]
timeout_sec = 900

[verifier]
timeout_sec = 300

[environment]
build_timeout_sec = 1800
cpus = 4
memory_mb = 8192
storage_mb = 20480
workdir = "/app"
network_mode = "public"
${skills === "none" || skills === "plugin" ? "" : 'skills_dir = "/opt/agent-skills"\n'}
[environment.healthcheck]
command = "test -f /opt/benchmark/ready && docker info >/dev/null"
retries = 400
${mcp ? `
[[environment.mcp_servers]]
name = "${aspireMcp.name}"
transport = "stdio"
command = "${aspireMcp.command}"
args = [${aspireMcp.args.map(a => JSON.stringify(a)).join(", ")}]
` : ""}`;
}

function compose(scenario, { kind, skills, cli }, suiteSha, app) {
    const git = (sha, path) => `${repo}.git#${sha}:${path}`;
    const contexts = Object.entries(apps[app].contexts(suiteSha))
        .map(([name, [variable, sha, path]]) => `\n        ${name}: \${${variable}:-${git(sha, path)}}`).join("");
    return `services:
  main:
    privileged: true
    build:
      args:
        APP_KIND: ${kind}
        SKILLS: ${skills}
        FAULT: ${scenario}${cli ? `
        CLI_KIND: source
        CLI_PATCH: ${cli}` : ""}
      additional_contexts:
        suite: \${TELEMETRY_SUITE_CONTEXT:-${git(suiteSha, "msbench/telemetry/common")}}${contexts}
`;
}

if (process.argv[2] === "tasks") {
    const suiteSha = args["suite-sha"];
    if (!/^[0-9a-f]{40}$/.test(suiteSha ?? "")) throw new Error("--suite-sha <40-hex commit> required");
    assertSamePins();
    rmSync(join(root, "tasks"), { recursive: true, force: true });
    for (const [scenario, definition] of Object.entries(scenarios)) {
        for (const [arm, config] of Object.entries(arms)) {
            if (definition.arms ? !definition.arms.includes(arm) : onlyIn[arm] && !onlyIn[arm].includes(scenario)) continue;
            const dir = join(root, "tasks", scenario, arm);
            for (const sub of ["environment", "tests", "solution"]) mkdirSync(join(dir, sub), { recursive: true });
            writeFileSync(join(dir, "task.toml"), taskToml(scenario, arm, definition, config));
            writeFileSync(join(dir, "instruction.md"), definition.instruction);
            const app = definition.app ?? "bingo";
            cpSync(join(root, "tools/templates", apps[app].dockerfile), join(dir, "environment/Dockerfile"));
            writeFileSync(join(dir, "environment/docker-compose.yaml"), compose(scenario, config, suiteSha, app));
            writeFileSync(join(dir, "tests/test.sh"), `#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
printf '0\\n' >/logs/verifier/reward.txt
node /opt/benchmark/bench.mjs verify
printf '1\\n' >/logs/verifier/reward.txt
`);
            writeFileSync(join(dir, "solution/solve.sh"), `#!/usr/bin/env bash
set -euo pipefail
node /opt/benchmark/bench.mjs solve
`);
        }
    }
    console.log(`Generated tasks pinned to suite ${suiteSha}`);
} else if (process.argv[2] === "dataset") {
    const taskSha = args["task-sha"];
    if (!/^[0-9a-f]{40}$/.test(taskSha ?? "")) throw new Error("--task-sha <40-hex commit> required");
    const rows = [];
    for (const [scenario, definition] of Object.entries(scenarios)) {
        const logical = `aspire-telemetry-${scenario}`;
        // The default variant carries the logical name: raw, or the first arm of a scenario without raw.
        const defaultVariant = definition.arms && !definition.arms.includes("raw") ? definition.arms[0] : "raw";
        for (const arm of Object.keys(arms)) {
            if (definition.arms ? !definition.arms.includes(arm) : onlyIn[arm] && !onlyIn[arm].includes(scenario)) continue;
            rows.push(JSON.stringify({
                benchmark: arm === defaultVariant ? logical : `${logical}-${arm}`,
                instance_id: logical,
                run_platform: "linux_container",
                container_registry: "msbenchstaging.azurecr.io",
                task_style: "harbor-native",
                task_repo: repo,
                task_path: `msbench/telemetry/tasks/${scenario}/${arm}`,
                task_repo_commit: taskSha,
                variant_of_benchmark: logical,
                benchmark_variant: arm,
                default_variant: defaultVariant,
            }));
        }
    }
    writeFileSync(join(root, "dataset.jsonl"), rows.join("\n") + "\n");
    console.log(`Wrote ${rows.length} dataset rows pinned to tasks ${taskSha}`);
} else if (process.argv[2] === "agent-assets") {
    // One asset folder per MCP setting; submit.sh picks the one matching the task's task.toml.
    for (const [name, mcp] of [["base", false], ["mcp", true]]) {
        const dir = join(root, "agents/vscode", name);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "user-overrides.yaml"), vscodeOverrides(mcp));
    }
    console.log("Wrote agents/vscode/{base,mcp}/user-overrides.yaml");
} else {
    throw new Error("Usage: gen-tasks.mjs tasks --suite-sha <sha> | dataset --task-sha <sha> | agent-assets");
}
