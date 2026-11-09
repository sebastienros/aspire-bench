// Generates the Harbor task folders and the MSBench dataset for the telemetry suite.
//   node gen-tasks.mjs tasks --suite-sha <commit containing msbench/telemetry/common>
//   node gen-tasks.mjs dataset --task-sha <commit containing msbench/telemetry/tasks>
// Every arm of a scenario gets the same prompt, budgets, verifier and reference repair;
// only the build arguments (application kind, skill set) and the MCP declaration differ.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = "https://github.com/sebastienros/aspire-bench";
const appSha = "baacba3e17181491c9a4d419db7d0e6763c3d363"; // msbench/bingo/common, unchanged business source

export const scenarios = {
    "slow-sql": {
        seed: 61,
        instruction: `The Bingo application in /app is running and is serving live producer and player traffic.

Producers report that the application has recently become sluggish: some of their
operations now take several seconds. Nothing fails and no error is shown.

Find the root cause and fix it so that the affected operations are fast again.
Keep all existing data and all existing functionality, and leave the application
running. README.md describes this workspace. No report is required.
`,
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
};

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
};

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
${skills === "none" ? "" : 'skills_dir = "/opt/agent-skills"\n'}
[environment.healthcheck]
command = "test -f /opt/benchmark/ready && docker info >/dev/null"
retries = 400
${mcp ? `
[[environment.mcp_servers]]
name = "aspire"
transport = "stdio"
command = "aspire"
args = ["agent", "mcp", "--non-interactive", "--nologo"]
` : ""}`;
}

function compose(scenario, { kind, skills, cli }, suiteSha) {
    const git = (sha, path) => `${repo}.git#${sha}:${path}`;
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
        suite: \${TELEMETRY_SUITE_CONTEXT:-${git(suiteSha, "msbench/telemetry/common")}}
        raw-app: \${TELEMETRY_RAW_APP_CONTEXT:-${git(appSha, "msbench/bingo/common/raw-app")}}
        aspire-app: \${TELEMETRY_ASPIRE_APP_CONTEXT:-${git(appSha, "msbench/bingo/common/aspire-app")}}
`;
}

if (process.argv[2] === "tasks") {
    const suiteSha = args["suite-sha"];
    if (!/^[0-9a-f]{40}$/.test(suiteSha ?? "")) throw new Error("--suite-sha <40-hex commit> required");
    rmSync(join(root, "tasks"), { recursive: true, force: true });
    for (const [scenario, definition] of Object.entries(scenarios)) {
        for (const [arm, config] of Object.entries(arms)) {
            const dir = join(root, "tasks", scenario, arm);
            for (const sub of ["environment", "tests", "solution"]) mkdirSync(join(dir, sub), { recursive: true });
            writeFileSync(join(dir, "task.toml"), taskToml(scenario, arm, definition, config));
            writeFileSync(join(dir, "instruction.md"), definition.instruction);
            cpSync(join(root, "tools/templates/Dockerfile"), join(dir, "environment/Dockerfile"));
            writeFileSync(join(dir, "environment/docker-compose.yaml"), compose(scenario, config, suiteSha));
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
    console.log(`Generated ${Object.keys(scenarios).length * Object.keys(arms).length} tasks pinned to suite ${suiteSha}`);
} else if (process.argv[2] === "dataset") {
    const taskSha = args["task-sha"];
    if (!/^[0-9a-f]{40}$/.test(taskSha ?? "")) throw new Error("--task-sha <40-hex commit> required");
    const rows = [];
    for (const scenario of Object.keys(scenarios)) {
        const logical = `aspire-telemetry-${scenario}`;
        for (const arm of Object.keys(arms)) {
            rows.push(JSON.stringify({
                benchmark: arm === "raw" ? logical : `${logical}-${arm}`,
                instance_id: logical,
                run_platform: "linux_container",
                container_registry: "msbenchstaging.azurecr.io",
                task_style: "harbor-native",
                task_repo: repo,
                task_path: `msbench/telemetry/tasks/${scenario}/${arm}`,
                task_repo_commit: taskSha,
                variant_of_benchmark: logical,
                benchmark_variant: arm,
                default_variant: "raw",
            }));
        }
    }
    writeFileSync(join(root, "dataset.jsonl"), rows.join("\n") + "\n");
    console.log(`Wrote ${rows.length} dataset rows pinned to tasks ${taskSha}`);
} else {
    throw new Error("Usage: gen-tasks.mjs tasks --suite-sha <sha> | dataset --task-sha <sha>");
}
