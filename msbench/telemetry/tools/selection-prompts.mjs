// Prompt set of the selection benchmark (PLAN card T3.9).
// Each prompt becomes one scenario `sel-<id>` whose instruction is the prompt alone, run against a
// static copy of the aspirified Bingo workspace (nothing running) and stopped after the first skill
// load or the third command (common/bench/selection/pretool.sh).
//   owner   the skill whose claimed job the prompt is (v0.0.6 names), or "suite" / "none"
//   source  the upstream microsoft/aspire-skills v0.0.6 stimulus it reuses (skills/<skill>/evals/
//           eval.yaml, stimulus name; the "invoke the matching skill" preamble the upstream harness
//           adds is dropped, and product names are adapted to this workspace), or "new"
// Six prompts per shipped skill (48), the suite's own prompts (3 distinct texts; slow-sql and
// slow-redis share one, so it counts twice), and 12 non-Aspire distractors.

const p = (id, owner, source, prompt) => ({ id, owner, source, prompt: prompt.replace(/\s+/g, " ").trim() + "\n" });

export const selectionPrompts = [
    // aspire (router): detect AppHosts, enforce guardrails, route.
    p("router-1", "aspire", "aspire/should_trigger_05", "How do I use the aspire CLI? Give a read-only overview; do not run commands, install tools or change files."),
    p("router-2", "aspire", "new", "Is this repository an Aspire application? Find its AppHost and tell me which Aspire version it targets and how it is meant to be run."),
    p("router-3", "aspire", "aspire/should_trigger_01", "How should an AI agent use aspire start for the AppHost in this repository when working in a git worktree? Give read-only guidance covering AppHost selection and unattended execution; do not start anything, install tools or edit files."),
    p("router-4", "aspire", "new", "Which Aspire workflows or skills apply to this repository, and which one should I use for each kind of task?"),
    p("router-5", "aspire", "new", "I changed only the admin application's code. Should I stop and start the whole Aspire app to pick it up, or is there a narrower way?"),
    p("router-6", "aspire", "new", "Is it safe to run aspire stop --force on this app? What would it delete?"),
    // aspire-monitoring: observe logs, traces, metrics, export, standalone dashboard, browser telemetry, deployed routing.
    p("mon-1", "aspire-monitoring", "aspire-monitoring/should_trigger_01", "Show me the Aspire logs for the boardadmin service."),
    p("mon-2", "aspire-monitoring", "aspire-monitoring/should_trigger_02", "Show me the distributed traces for this app with aspire otel traces."),
    p("mon-3", "aspire-monitoring", "aspire-monitoring/mon-export-001", "Export the last 10 minutes of traces and logs of this app to files so I can attach them to a bug report."),
    p("mon-4", "aspire-monitoring", "aspire-monitoring/should_trigger_08", "How do I open a standalone Aspire dashboard with aspire dashboard run, to view telemetry from a service that is not in an AppHost?"),
    p("mon-5", "aspire-monitoring", "aspire-monitoring/should_trigger_09", "View the browser console logs of the bingoboard frontend in the Aspire dashboard."),
    p("mon-6", "aspire-monitoring", "aspire-monitoring/should_trigger_07", "Tail the container app logs for my deployed Aspire service in Azure Container Apps."),
    // aspire-orchestration: start/stop/wait, resource restart, file locks, port conflicts, worktrees.
    p("orch-1", "aspire-orchestration", "aspire-orchestration/should_trigger_02", "How do I start my Aspire app?"),
    p("orch-2", "aspire-orchestration", "aspire-orchestration/should_trigger_06", "How do I restart just the boardadmin service in Aspire?"),
    p("orch-3", "aspire-orchestration", "aspire-orchestration/should_trigger_04", "I'm getting MSB3491 file lock errors building BingoBoard.Admin while the Aspire app is running."),
    p("orch-4", "aspire-orchestration", "aspire-orchestration/should_trigger_07", "Port 15173 is already in use after I ran aspire start."),
    p("orch-5", "aspire-orchestration", "aspire-orchestration/should_trigger_08", "How do I run aspire wait on my postgres resource?"),
    p("orch-6", "aspire-orchestration", "aspire-orchestration/should_trigger_03", "How do I run aspire stop to clean up?"),
    // aspireify: wire an AppHost, add integrations, ServiceDefaults.
    p("ify-1", "aspireify", "aspireify/should_trigger_06", "Add a RabbitMQ broker to the Aspire AppHost and reference it from boardadmin."),
    p("ify-2", "aspireify", "aspireify/should_trigger_07", "Add WithBrowserLogs to the bingoboard Vite app in apphost.cs."),
    p("ify-3", "aspireify", "new", "I added a new worker project at src/BingoBoard.Worker. Wire it into the Aspire AppHost so it starts with the app and can reach the database."),
    p("ify-4", "aspireify", "aspireify/should_trigger_02", "Add a MongoDB database to my Aspire AppHost."),
    p("ify-5", "aspireify", "aspire-orchestration/should_not_trigger_11", "Configure ServiceDefaults and OpenTelemetry for the migration service."),
    p("ify-6", "aspireify", "aspire-orchestration/should_not_trigger_10", "Scan my repo and add the right resources to apphost.cs."),
    // aspire-init: aspire new / aspire init, templates, hand-off to aspireify.
    p("init-1", "aspire-init", "aspire-init/should_trigger_02", "How do I scaffold a new Aspire app from scratch?"),
    p("init-2", "aspire-init", "aspire-init/should_trigger_04", "How do I run aspire new aspire-starter to create a new project?"),
    p("init-3", "aspire-init", "aspire-init/should_trigger_07", "How do I create a new Aspire TypeScript starter app?"),
    p("init-4", "aspire-init", "aspire-init/should_trigger_06", "Bootstrap Aspire into my FastAPI project."),
    p("init-5", "aspire-init", "aspire-init/should_trigger_01", "What's the first thing I should do to add Aspire to an Express + .NET API repo?"),
    p("init-6", "aspire-init", "aspire-init/should_trigger_05", "How do I run aspire init in a repo that has no AppHost yet?"),
    // aspire-deployment: publish/deploy to Compose, Kubernetes, Azure, AWS; teardown.
    p("deploy-1", "aspire-deployment", "aspire-deployment/should_trigger_01", "Deploy my Aspire app to Azure."),
    p("deploy-2", "aspire-deployment", "aspire-deployment/should_trigger_02", "Run aspire publish to generate deployment artifacts."),
    p("deploy-3", "aspire-deployment", "aspire-deployment/should_trigger_04", "Generate deployment artifacts for Kubernetes with Aspire."),
    p("deploy-4", "aspire-deployment", "aspire-deployment/should_trigger_06", "Publish this Aspire app as a Docker Compose deployment and run the production build locally."),
    p("deploy-5", "aspire-deployment", "aspire-deployment/should_trigger_07", "Tear down my Aspire deployment."),
    p("deploy-6", "aspire-deployment", "aspire-deployment/should_trigger_12", "Validate my Aspire deployment plan before applying."),
    // aspire-terminals: WithTerminal, REPLs, tapes, terminal CLI.
    p("term-1", "aspire-terminals", "aspire-terminals/terminal-repl-and-resource-ownership", "Give read-only advice for opening an authenticated PostgreSQL client for this app's postgres resource from Aspire. Must I put WithTerminal on the server and hard-code docker exec?"),
    p("term-2", "aspire-terminals", "aspire/router-terminals-001", "Should an auxiliary interactive tool that stays open after its resource command returns use WithTerminal or TerminalService? Do not edit, install or run."),
    p("term-3", "aspire-terminals", "aspire/router-terminal-tapes-001", "Give read-only guidance for automating an existing Aspire resource terminal with a VHS tape and keeping text checkpoints. Can Aspire save MP4 or .cast output?"),
    p("term-4", "aspire-terminals", "aspire-terminals/terminal-resource-edit", "Give the boardadmin process a PTY so I can type into it from the Aspire dashboard; do not create an auxiliary shell."),
    p("term-5", "aspire-terminals", "aspire-terminals/terminal-dock-edit", "Add a resource command to apphost.cs that opens a REPL in a dock terminal and returns while it stays open."),
    p("term-6", "aspire-terminals", "new", "How do I attach to a resource's terminal from the aspire CLI?"),
    // aspire-project-v2-migration: AddProject -> DotnetProjectResource APIs.
    p("v2-1", "aspire-project-v2-migration", "aspire-project-v2-migration/project-v2-routing-positive", "My Aspire AppHost uses AddProject. Assess migrating those resources to DotnetProjectResource; do not edit."),
    p("v2-2", "aspire-project-v2-migration", "new", "Migrate the AddProject calls in apphost.cs to the Project v2 APIs."),
    p("v2-3", "aspire-project-v2-migration", "aspire-project-v2-migration/project-v2-unsupported-assessment", "Assess this AppHost for migration to Project v2 without edits. Classify automatic, manual and unsupported resources."),
    p("v2-4", "aspire-project-v2-migration", "aspire-project-v2-migration/project-v2-ineligible-13-5", "I installed the newest CLI. Is this AppHost eligible for the Project v2 APIs? Do not upgrade its packages."),
    p("v2-5", "aspire-project-v2-migration", "aspire-project-v2-migration/project-v2-approved-csharp-subset", "I approve migrating only boardadmin in apphost.cs to AddDotnetProject, keeping its http launch profile. Leave the migration service unchanged."),
    p("v2-6", "aspire-project-v2-migration", "new", "Which resources in this AppHost would change if we moved to DotnetProjectResource, and what would break?"),
    // Non-Aspire distractors: no Aspire skill is the expected choice.
    p("other-1", "none", "aspire-monitoring/should_not_trigger_06", "Write unit tests for the square import endpoint of the admin application."),
    p("other-2", "none", "new", "Rename the Label property of the bingo square model to Text across the solution."),
    p("other-3", "none", "new", "Explain what the BingoService class in the admin application does."),
    p("other-4", "none", "new", "Fix every misspelling of 'recieve' in the repository."),
    p("other-5", "none", "aspire-orchestration/should_not_trigger_06", "Build my React app."),
    p("other-6", "none", "new", "Write a Python script that converts a CSV file to JSON."),
    p("other-7", "none", "aspire-orchestration/should_not_trigger_05", "What's the weather today?"),
    p("other-8", "none", "aspire/should_not_trigger_02", "Explain how to create an Azure VM. Give read-only guidance; do not provision resources or change files."),
    p("other-9", "none", "new", "Explain how git rebase differs from git merge."),
    p("other-10", "none", "aspire/should_not_trigger_06", "Give read-only guidance for writing a Docker Compose file for a Node.js app. Do not start containers, install tools or edit files."),
    p("other-11", "none", "new", "Add input validation so that a bingo square label cannot be longer than 200 characters."),
    p("other-12", "none", "new", "Update the npm dependencies of the bingo-board frontend to their latest minor versions."),
];

// The suite's own prompts are taken from gen-tasks.mjs (same text as the trials).
export const suitePromptIds = { "suite-sluggish": "slow-sql", "suite-readonly": "read-only", "suite-coldstart": "cold-start" };
