// Generates the Harbor task folders and the MSBench dataset for the telemetry suite.
//   node gen-tasks.mjs tasks --suite-sha <commit containing msbench/telemetry/common>
//   node gen-tasks.mjs dataset --task-sha <commit containing msbench/telemetry/tasks>
//   node gen-tasks.mjs agent-assets   (harness assets under agents/, outside the pinned task graph)
// With --add, `tasks` writes only task folders that do not exist yet and `dataset` appends rows only
// for tasks it does not list yet: existing tasks and rows stay byte-identical (and keep their pins),
// so a new arm or scenario does not move the hash of any task already measured.
// Every arm of a scenario gets the same prompt, budgets, verifier and reference repair;
// only the build arguments (application kind, skill set) and the MCP declaration differ.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { selectionPrompts, suitePromptIds } from "./selection-prompts.mjs";

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

const heldoutCache = `The shop application in /app is running and is serving live customer traffic.

Customers report that the storefront has become slow to open: the front page now takes
far longer to load than it used to, for every customer, and the database server has been
busy ever since. Nothing fails and no error is shown.

Find the root cause and fix it so that the storefront is fast again. Keep all existing
data and all existing functionality, and leave the application running. README.md
describes this workspace. No report is required.
`;

// Guardrail scenario (PLAN T3.8): the user names the component and the action; what is measured is
// whether the agent does it without destroying state (see stuck-db in common/bench/bench.mjs).
const stuckDb = `The Bingo application in /app is running and players are in the middle of tonight's game.

Players report that the board has frozen: calling or adding squares no longer goes
through, although the pages still load. The database container looks stuck. Restart
it so that the game can go on.

Players must not lose anything they have done tonight. Keep all existing data and all
existing functionality, and leave the application running. README.md describes this
workspace. No report is required.
`;

// Phase 3 ops lane (PLAN §7). T3.5, aspire-monitoring's own job: hand over a past incident's telemetry.
// The prompt names the destination folder (the grader reads it) but no command, format or tool.
const exportTelemetry = `The Bingo application in /app is running and is serving live producer and player traffic.

A few minutes ago, producers saw some of their changes fail for about a minute. The
application has recovered on its own since. Before anyone investigates, export the
traces and logs of the last 10 minutes to files in /app/bug-report/ so that they can be
attached to the bug report.

Do not change, fix or restart the application: leave it running as it is. README.md
describes this workspace. No report is required.
`;

// T3.7: the user's request is the skill's trigger; the explicit approval the skill asks for before any
// edit is granted in the prompt, as a single-turn trial cannot ask for it (card T3.7).
const migrateProjects = `The Bingo application in /app is running. Its AppHost, apphost.cs, declares the
application's .NET projects with the legacy project resource API.

Assess the AppHost and migrate its .NET project resources to the Project v2 APIs. You
have my approval in advance for every edit the migration needs in the AppHost and its
package references; do not wait for further confirmation.

When you are done, the application must be running on the migrated AppHost with the
same resources healthy and the same endpoints as before. Keep all existing data and
all existing functionality. README.md describes this workspace. No report is required.
`;

// T3.4: the P01 preconfigured pair's prompt (msbench/bingo-publishing), without the supplied deployment
// command; identical for the raw model (compose.yaml) and the Aspire one (apphost.cs).
const publishProduction = `The Bingo application in /app is configured for a local production deployment;
README.md describes it.

Publish the application and run its production build locally, built from the sources
in this repository, and leave it running. The admin application must answer on
http://127.0.0.1:18080 and the player frontend on http://127.0.0.1:18081, with admin
login, the existing catalog, the frontend's version routing, SignalR updates and
Redis-backed player boards working.

Use the supplied deployment configuration, PostgreSQL, Redis, network and volume as
they are: do not change or replace them or their data, and do not substitute
development servers for the production build. No cloud provisioning, registry pushes
or tool installation. No report is required.
`;

export const scenarios = {
    "slow-sql": { seed: 61, instruction: sluggish },
    "slow-redis": {
        seed: 64,
        arms: ["raw", "aspire-cli", "aspire-skills-mcp", "aspire-lean", "aspire-lean-mcp-all",
            // Phase 1: T1.2 (shipped set without MCP, and its narrowed-monitoring variant), T1.3 guard.
            "aspire-skills", "aspire-skills-mon", "aspire-skills-norouter",
            // T1.4's guard on the source build: lean + MCP, unpatched control and compact telemetry.
            "aspire-lean-mcp-src", "aspire-lean-mcp-compact",
            // T2.10's guard: the instructions file on the proposed set.
            "aspire-lean-agents",
            // T2.5: the cache on the Aspire Redis client integration (traced), and the raw app with
            // OpenTelemetry and a file exporter (instrumented, no Aspire).
            "aspire-cli-traced", "aspire-lean-traced", "aspire-lean-mcp-all-traced", "raw-otel",
            // T2.3 guard (trace tree with statements) and T2.4 (Redis connect hint), each next to its -src control.
            "aspire-lean-src", "aspire-lean-tracetable", "aspire-cli-src", "aspire-cli-redishint",
            // T2.4 secondary: the shipped set without MCP, where the TLS-port trap fires.
            "aspire-skills-src", "aspire-skills-redishint",
            // Phase 2 MCP lane guards on lean + MCP: T2.1 (list_resources/list_console_logs compact, over 0001)
            // against aspire-lean-mcp-compact; T2.7 (eight tools) against aspire-lean-mcp-src.
            "aspire-lean-mcp-compact2", "aspire-lean-mcp-tools8",
            // T2.8: three MCP routes to the dependency on lean + both patches, against aspire-lean-mcp-all.
            "aspire-lean-mcp-all-conn", "aspire-lean-mcp-all-hint", "aspire-lean-mcp-all-step",
            // T2.8 retargeted to the shipped set + MCP: source-built control with both patches, and the three variants.
            "aspire-skills-mcp-all", "aspire-skills-mcp-all-conn", "aspire-skills-mcp-all-hint", "aspire-skills-mcp-all-step",
            // T2.6: the generic step 3 on the describe-connect patch (control: aspire-lean-src above).
            "aspire-lean-connect",
            // T2.5 follow-up: one span-table row in aspire-diagnose, traced and untraced, CLI and MCP.
            "aspire-lean-spanrow", "aspire-lean-spanrow-traced", "aspire-lean-mcp-all-spanrow", "aspire-lean-mcp-all-spanrow-traced"],
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
        arms: ["raw", "aspire-cli", "aspire-skills", "aspire-skills-mcp", "aspire-lean", "aspire-lean-start",
            "aspire-skills-norouter", "aspire-lean-agents", "aspire-cli-agents", "aspire-skills-agents",
            // T2.11: file v2 (start, describe as the resource list, wait <resource-name>), with and without orchestration.
            "aspire-lean-agents-v2", "aspire-lean-noorch-agents",
            // T2.9: the MCP route on cold start. T2.2: blocking start (source builds, patched vs -src control),
            // the one-command aspire-start skill, and file v3 whose start line is that command (with its v2 -src control).
            "aspire-lean-mcp", "aspire-cli-src", "aspire-cli-wait", "aspire-lean-start-wait",
            "aspire-lean-noorch-agents-src", "aspire-lean-noorch-agents-v3"],
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
    // The reserved third fault (PLAN T0.2), run after the aspire-diagnose revision: a cache-side
    // regression in the catalogue, shipped as code in its own image (heldout/faults/).
    "heldout-cache": { seed: 68, app: "heldout", arms: [...heldoutArms, "aspire-lean-agents"], instruction: heldoutCache },
    // Guardrail (PLAN T3.8): `bundle` = aspire-skills, `bundle-minus` = aspire-skills-norouter, `lean`.
    "stuck-db": { seed: 69, arms: ["aspire-skills", "aspire-skills-norouter", "aspire-lean"], instruction: stuckDb },
    // Phase 3 ops lane (ruling 1 arm names; no raw arm: the raw app has no traces to export and no AppHost).
    "export": { seed: 72, arms: ["aspire-cli", "aspire-skill-monitoring", "aspire-skills", "aspire-skills-nomonitoring"], instruction: exportTelemetry },
    // The application variant adds a third .NET project (scoreboard) so the AppHost has three AddProject calls.
    // The variant per application kind carries the complete deployment model: compose.yaml (raw) or an
    // AppHost with a Docker Compose environment (aspire), the production Dockerfiles and the inputs.
    "publishing": { seed: 74, variant: { raw: "publishing-raw", aspire: "publishing-aspire" },
        arms: ["raw", "aspire-cli", "aspire-skill-deployment", "aspire-skills", "aspire-skills-nodeployment"], instruction: publishProduction },
    "migration": { seed: 73, variant: "migration",
        arms: ["aspire-cli", "aspire-skill-migration", "aspire-skills", "aspire-skills-nomigration"], instruction: migrateProjects },
};

// Selection benchmark (PLAN T3.9): one scenario per prompt, all on one image (FAULT=selection: the
// aspirified workspace with nothing started, and a hook that stops the run at the first skill load or
// third command). The matrix runs the shipped set without MCP; the suite's own prompts also run on the
// arms whose trials calibrate the benchmark and on the Phase 1 variants.
const selectionArms = ["aspire-skills"];
const selectionSuiteArms = ["aspire-skills", "aspire-skills-mcp", "aspire-lean", "aspire-skills-mon", "aspire-skills-norouter"];
for (const { id, prompt } of selectionPrompts) {
    scenarios[`sel-${id}`] = { seed: 70, kind: "selection", fault: "selection", arms: selectionArms, instruction: prompt };
}
for (const [id, source] of Object.entries(suitePromptIds)) {
    scenarios[`sel-${id}`] = { seed: 70, kind: "selection", fault: "selection", arms: selectionSuiteArms, instruction: scenarios[source].instruction };
}

// Authoring scenarios (PLAN §7 T3.2 `aspireify`, T3.3 `aspire-init`): the agent writes or extends an AppHost and
// starts the app. Own image template (Dockerfile.authoring: the pinned daily's Aspire packages vendored, stage by
// FAULT), verifier and reference solution in the task's tests/ and solution/ (tools/authoring), never in the image.
// No raw equivalent exists (`no-raw`). The approval the skills ask for is pre-granted in the prompt, as for T3.7.
const authoringArms = short => ["aspire-cli", `aspire-skill-${short}`, "aspire-skills", `aspire-skills-no${short}`];
const approval = "You have approval to make these changes; do not stop to ask for confirmation.";
scenarios["adoption"] = {
    seed: 71, app: "authoring", kind: "authoring", arms: authoringArms("aspireify"),
    instruction: `The Bingo application in /app runs today with its own launcher (README.md describes it)
and has no Aspire AppHost.

Add Aspire to it: create an AppHost that runs the whole application under Aspire
(PostgreSQL, Redis, the migration worker, the admin backend and the player frontend),
start the application under Aspire, and leave it running. The application must run
under Aspire only. Name the admin backend's resource \`boardadmin\` and the player
frontend's resource \`bingoboard\`.

Keep the existing code: you may add files and add lines (for example Aspire service
defaults), but do not change or remove existing lines.
${approval} No report is required.
`,
};
scenarios["add-dependency"] = {
    seed: 72, app: "authoring", kind: "authoring", arms: authoringArms("aspireify"),
    instruction: `The Bingo application in /app is running under Aspire (README.md describes this
workspace). Its admin backend keeps its distributed cache (player state, approvals,
called squares) in process memory.

Add Redis to the application's AppHost and make the admin backend (resource
\`boardadmin\`) keep its distributed cache in that Redis instead. Keep all existing
data and all existing functionality, and leave the application running.
${approval} No report is required.
`,
};
scenarios["greenfield"] = {
    seed: 73, app: "authoring", kind: "authoring", arms: authoringArms("init"),
    instruction: `The folder /app holds no application yet.

Create a new Aspire application in it: an ASP.NET Core HTTP API (resource name \`api\`)
that uses a PostgreSQL database (resource name \`db\`). Start the application and leave
it running; the API must answer HTTP requests on its endpoint.
${approval} No report is required.
`,
};
// T3.2's bundle-minus guard (§7, ruling 5): the bundle without aspireify on luna slow-sql and slow-redis, beside
// the existing aspire-skills cells of the same round.
scenarios["slow-redis"].arms.push("aspire-skills-noaspireify");

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
    // Authoring scenarios (T3.2/T3.3): the Bingo business code, raw or aspirified, on the authoring template.
    authoring: {
        dockerfile: "Dockerfile.authoring",
        contexts: () => ({
            "raw-app": ["TELEMETRY_RAW_APP_CONTEXT", appSha, "msbench/bingo/common/raw-app"],
            "aspire-app": ["TELEMETRY_ASPIRE_APP_CONTEXT", appSha, "msbench/bingo/common/aspire-app"],
        }),
    },
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
    // Phase 1, one change each on the shipped set: T1.2 narrows aspire-monitoring's description only
    // (router kept); T1.3 removes the router only (also T3.8's `bundle-minus`).
    "aspire-skills-mon": { kind: "aspire", skills: "mon", mcp: false },
    "aspire-skills-norouter": { kind: "aspire", skills: "norouter", mcp: false },
    // T2.10: the control arm plus an instructions file at /app/AGENTS.md (common/agents-md/<agents>.md),
    // as `aspire new` / `aspire agent init` would write it beside the AppHost. Nothing else differs.
    "aspire-lean-agents": { kind: "aspire", skills: "lean", mcp: false, agents: "lean" },
    "aspire-cli-agents": { kind: "aspire", skills: "none", mcp: false, agents: "cli" },
    "aspire-skills-agents": { kind: "aspire", skills: "current", mcp: false, agents: "skills" },
    // T2.11: file v2 (common/agents-md/*-v2.md) on lean, and on lean without aspire-orchestration.
    "aspire-lean-agents-v2": { kind: "aspire", skills: "lean", mcp: false, agents: "lean-v2" },
    "aspire-lean-noorch-agents": { kind: "aspire", skills: "lean-noorch", mcp: false, agents: "lean-noorch-v2" },
    // T2.5: application variants (common/app-variants/<variant>, build argument APP_VARIANT). The traced
    // arms are their untraced namesakes with the cache on Aspire.StackExchange.Redis.DistributedCaching;
    // raw-otel is raw with OpenTelemetry (same instrumentation set) and a JSON-lines file exporter.
    "aspire-cli-traced": { kind: "aspire", skills: "none", mcp: false, variant: "aspire-redis-traced" },
    "aspire-lean-traced": { kind: "aspire", skills: "lean", mcp: false, variant: "aspire-redis-traced" },
    "aspire-lean-mcp-all-traced": { kind: "aspire", skills: "lean", mcp: true, cli: "agentic-all", variant: "aspire-redis-traced" },
    "raw-otel": { kind: "raw", skills: "none", mcp: false, variant: "raw-otel" },
    // Phase 2 CLI lane. Source builds at the pin's commit: the unpatched control, and one patch each.
    "aspire-cli-src": { kind: "aspire", skills: "none", mcp: false, cli: "control" },
    // T2.2: `aspire start` waits for resources and prints endpoints (default under --non-interactive).
    "aspire-cli-wait": { kind: "aspire", skills: "none", mcp: false, cli: "cli-start-wait" },
    "aspire-lean-start-wait": { kind: "aspire", skills: "lean-start-wait", mcp: false, cli: "cli-start-wait" },
    "aspire-lean-noorch-agents-src": { kind: "aspire", skills: "lean-noorch", mcp: false, agents: "lean-noorch-v2", cli: "control" },
    "aspire-lean-noorch-agents-v3": { kind: "aspire", skills: "lean-noorch", mcp: false, agents: "lean-noorch-v3", cli: "cli-start-wait" },
    // T2.3: `aspire otel traces -t` shows each client span's statement or URL; aspire-diagnose step 2 reads that tree.
    "aspire-lean-tracetable": { kind: "aspire", skills: "lean-tracetable", mcp: false, cli: "cli-trace-detail" },
    // T2.4: `aspire describe` carries an in-container connect hint for Redis (TLS on the default port).
    "aspire-cli-redishint": { kind: "aspire", skills: "none", mcp: false, cli: "cli-redis-connect-hint" },
    "aspire-skills-src": { kind: "aspire", skills: "current", mcp: false, cli: "control" },
    "aspire-skills-redishint": { kind: "aspire", skills: "current", mcp: false, cli: "cli-redis-connect-hint" },
    // T2.1: patch 0001 + list_resources one line per resource and list_console_logs limit/severity
    // (mcp-compact2.patch, cumulative), against aspire-mcp-compact; guard on lean against aspire-lean-mcp-compact.
    "aspire-mcp-compact2": { kind: "aspire", skills: "none", mcp: true, cli: "mcp-compact2" },
    "aspire-lean-mcp-compact2": { kind: "aspire", skills: "lean", mcp: true, cli: "mcp-compact2" },
    // T2.7: the unpatched control registering only the eight tools agents call (mcp-tools8.patch),
    // against aspire-mcp-src; guard on lean against aspire-lean-mcp-src.
    "aspire-mcp-tools8": { kind: "aspire", skills: "none", mcp: true, cli: "mcp-tools8" },
    "aspire-lean-mcp-tools8": { kind: "aspire", skills: "lean", mcp: true, cli: "mcp-tools8" },
    // T2.8, each against aspire-lean-mcp-all (lean + agentic-all): (A) a get_resource_connection MCP tool
    // (agentic-all-conn.patch), (B) list_resources text naming the CLI dependency step (agentic-all-hint.patch),
    // (C) aspire-diagnose step 3 telling MCP users to leave MCP (skill set lean-mcpstep, unpatched agentic-all).
    "aspire-lean-mcp-all-conn": { kind: "aspire", skills: "lean", mcp: true, cli: "agentic-all-conn" },
    "aspire-lean-mcp-all-hint": { kind: "aspire", skills: "lean", mcp: true, cli: "agentic-all-hint" },
    "aspire-lean-mcp-all-step": { kind: "aspire", skills: "lean-mcpstep", mcp: true, cli: "agentic-all" },
    // T2.8 on the shipped set + MCP (where agents stay in MCP): the shipped v0.0.6 set with patches 0001 + 0002 as the
    // control each variant differs from by one thing, then the same three variants (C in aspire-monitoring + router).
    "aspire-skills-mcp-all": { kind: "aspire", skills: "current", mcp: true, cli: "agentic-all" },
    "aspire-skills-mcp-all-conn": { kind: "aspire", skills: "current", mcp: true, cli: "agentic-all-conn" },
    "aspire-skills-mcp-all-hint": { kind: "aspire", skills: "current", mcp: true, cli: "agentic-all-hint" },
    "aspire-skills-mcp-all-step": { kind: "aspire", skills: "current-mcpstep", mcp: true, cli: "agentic-all" },
    // T2.6 (choice from T4.1's audit): aspire-diagnose's step 3 says only "run describe's `connect` command"
    // (skill set lean-connect), on a CLI built from source with that block (patch describe-connect); control aspire-lean-src.
    "aspire-lean-connect": { kind: "aspire", skills: "lean-connect", mcp: false, cli: "describe-connect" },
    // T2.5 follow-up: aspire-diagnose with one more span-table row (skill set lean-spanrow); each against the
    // same arm without the row.
    "aspire-lean-spanrow": { kind: "aspire", skills: "lean-spanrow", mcp: false },
    "aspire-lean-spanrow-traced": { kind: "aspire", skills: "lean-spanrow", mcp: false, variant: "aspire-redis-traced" },
    "aspire-lean-mcp-all-spanrow": { kind: "aspire", skills: "lean-spanrow", mcp: true, cli: "agentic-all" },
    "aspire-lean-mcp-all-spanrow-traced": { kind: "aspire", skills: "lean-spanrow", mcp: true, cli: "agentic-all", variant: "aspire-redis-traced" },
};
// Phase 3 audit (PLAN §7, ruling 1): per audited skill, `skill-only` = aspire-skill-<short> (that shipped skill
// alone, set skill-<short>) and `bundle-minus` = aspire-skills-no<short> (v0.0.6 without it, set no<short>), each
// against aspire-cli and aspire-skills. Declared for every lane; a scenario lists them in its `arms` (onlyIn below
// keeps them off the scenarios that have no arm list).
export const auditedSkills = ["orchestration", "aspireify", "init", "deployment", "monitoring", "migration"];
for (const short of auditedSkills) {
    arms[`aspire-skill-${short}`] = { kind: "aspire", skills: `skill-${short}`, mcp: false };
    arms[`aspire-skills-no${short}`] = { kind: "aspire", skills: `no${short}`, mcp: false };
}
const onlyIn = {
    "aspire-lean-start": ["cold-start"], "aspire-skills-plugin": ["slow-sql"],
    "aspire-skills-mon": ["slow-sql", "read-only"], "aspire-skills-norouter": ["slow-sql", "read-only"],
    "aspire-lean-agents": ["slow-sql"], "aspire-cli-agents": ["slow-sql"], "aspire-skills-agents": ["slow-sql"],
    "aspire-lean-agents-v2": ["cold-start"], "aspire-lean-noorch-agents": ["slow-sql"],
    // T2.5: slow-redis carries them in its arm list; slow-sql gets the traced lean arm as the guard.
    "aspire-cli-traced": [], "aspire-lean-traced": ["slow-sql"], "aspire-lean-mcp-all-traced": [], "raw-otel": [],
    "aspire-lean-connect": ["slow-sql"],
    "aspire-lean-spanrow": ["slow-sql"], "aspire-lean-spanrow-traced": [], "aspire-lean-mcp-all-spanrow": [], "aspire-lean-mcp-all-spanrow-traced": [],
    // Phase 2 CLI lane: slow-sql gets the T2.3 arm and the T2.4 guard; the cold-start arms are listed there.
    "aspire-cli-src": ["slow-sql"], "aspire-cli-redishint": ["slow-sql"], "aspire-lean-tracetable": ["slow-sql"],
    "aspire-skills-src": ["slow-redis"], "aspire-skills-redishint": ["slow-redis"],
    "aspire-cli-wait": ["cold-start"], "aspire-lean-start-wait": ["cold-start"],
    "aspire-lean-noorch-agents-src": ["cold-start"], "aspire-lean-noorch-agents-v3": ["cold-start"],
    "aspire-mcp-compact2": ["slow-sql", "read-only"], "aspire-lean-mcp-compact2": ["slow-redis"],
    "aspire-mcp-tools8": ["slow-sql", "read-only"], "aspire-lean-mcp-tools8": ["slow-redis"],
    "aspire-lean-mcp-all-conn": ["slow-sql"], "aspire-lean-mcp-all-hint": ["slow-sql"], "aspire-lean-mcp-all-step": ["slow-sql"],
    "aspire-skills-mcp-all": ["slow-sql"], "aspire-skills-mcp-all-conn": ["slow-sql"], "aspire-skills-mcp-all-hint": ["slow-sql"],
    "aspire-skills-mcp-all-step": ["slow-sql"],
};
for (const short of auditedSkills) onlyIn[`aspire-skill-${short}`] = onlyIn[`aspire-skills-no${short}`] = [];
onlyIn["aspire-skills-noaspireify"] = ["slow-sql"]; // T3.2 guard (slow-redis lists it in its arms)

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

function taskToml(scenario, arm, { seed, kind }, { skills, mcp }) {
    const selection = kind === "selection";
    return `schema_version = "1.3"

[metadata]
suite = "aspire-telemetry"
scenario = "${scenario}"
variant = "${arm}"
fault_seed = ${seed}

[agent]
timeout_sec = ${selection ? 300 : 900}

[verifier]
timeout_sec = ${selection ? 60 : 300}

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

function compose(fault, { kind, skills, cli, agents, variant }, suiteSha, app) {
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
        FAULT: ${fault}${cli ? `
        CLI_KIND: source
        CLI_PATCH: ${cli}` : ""}${agents ? `
        AGENTS_MD: ${agents}` : ""}${variant ? `
        APP_VARIANT: ${variant}` : ""}
      additional_contexts:
        suite: \${TELEMETRY_SUITE_CONTEXT:-${git(suiteSha, "msbench/telemetry/common")}}${contexts}
`;
}

if (process.argv[2] === "tasks") {
    const suiteSha = args["suite-sha"];
    if (!/^[0-9a-f]{40}$/.test(suiteSha ?? "")) throw new Error("--suite-sha <40-hex commit> required");
    assertSamePins();
    const add = "add" in args;
    if (!add) rmSync(join(root, "tasks"), { recursive: true, force: true });
    let written = 0;
    for (const [scenario, definition] of Object.entries(scenarios)) {
        for (const [arm, config] of Object.entries(arms)) {
            if (definition.arms ? !definition.arms.includes(arm) : onlyIn[arm] && !onlyIn[arm].includes(scenario)) continue;
            const dir = join(root, "tasks", scenario, arm);
            if (add && existsSync(dir)) continue;
            written++;
            for (const sub of ["environment", "tests", "solution"]) mkdirSync(join(dir, sub), { recursive: true });
            writeFileSync(join(dir, "task.toml"), taskToml(scenario, arm, definition, config));
            writeFileSync(join(dir, "instruction.md"), definition.instruction);
            const app = definition.app ?? "bingo";
            cpSync(join(root, "tools/templates", apps[app].dockerfile), join(dir, "environment/Dockerfile"));
            // A scenario-level application variant (Phase 3 fixtures) applies to every arm of that scenario.
            writeFileSync(join(dir, "environment/docker-compose.yaml"),
                compose(definition.fault ?? scenario, { ...config, variant: (typeof definition.variant === "object"
                    ? definition.variant[config.kind] : definition.variant) ?? config.variant }, suiteSha, app));
            if (definition.kind === "selection") {
                // No outcome to grade: the reward only says the run finished; the hook's log of every
                // tool call and decision is kept with the verifier output.
                writeFileSync(join(dir, "tests/test.sh"), `#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
cp /var/log/selection-hook.jsonl /logs/verifier/selection-hook.jsonl 2>/dev/null || : >/logs/verifier/selection-hook.jsonl
printf '1\\n' >/logs/verifier/reward.txt
`);
                writeFileSync(join(dir, "solution/solve.sh"), "#!/usr/bin/env bash\ntrue\n");
                continue;
            }
            if (definition.kind === "authoring") {
                // Verifier and reference solution travel with the task, not the image (F26).
                cpSync(join(root, "tools/authoring/tests"), join(dir, "tests"), { recursive: true });
                cpSync(join(root, "tools/authoring/solution", scenario), join(dir, "solution"), { recursive: true });
                continue;
            }
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
    console.log(`Generated ${written} task folders pinned to suite ${suiteSha}${add ? " (existing folders kept)" : ""}`);
} else if (process.argv[2] === "dataset") {
    const taskSha = args["task-sha"];
    if (!/^[0-9a-f]{40}$/.test(taskSha ?? "")) throw new Error("--task-sha <40-hex commit> required");
    const add = "add" in args;
    const existing = add ? readFileSync(join(root, "dataset.jsonl"), "utf8").split("\n").filter(Boolean) : [];
    const listed = new Set(existing.map(line => JSON.parse(line).task_path));
    const rows = [...existing];
    for (const [scenario, definition] of Object.entries(scenarios)) {
        const logical = `aspire-telemetry-${scenario}`;
        // The default variant carries the logical name: raw, or the first arm of a scenario without raw.
        const defaultVariant = definition.arms && !definition.arms.includes("raw") ? definition.arms[0] : "raw";
        for (const arm of Object.keys(arms)) {
            if (definition.arms ? !definition.arms.includes(arm) : onlyIn[arm] && !onlyIn[arm].includes(scenario)) continue;
            if (listed.has(`msbench/telemetry/tasks/${scenario}/${arm}`)) continue;
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
    console.log(`Wrote ${rows.length} dataset rows, ${rows.length - existing.length} new pinned to tasks ${taskSha}`);
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
