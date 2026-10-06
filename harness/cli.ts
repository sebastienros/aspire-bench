import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { stringify, parse } from "yaml";
import { loadEvalSpec, validateEvalSpec, createGraderRegistry } from "@microsoft/vally";
import { command, interrupt, checkInterrupted } from "./process.js";
import { prepare, registry, repoRoot, isolatedEnv, type Run } from "./workspace.js";
import { dryAgent } from "./agent.js";
import { cleanup } from "./ownership.js";
import { submittedEndpoints } from "./verify.js";
import { registerGraders } from "./plugin.js";
import { compare, type Trial } from "./report.js";
import { configureRuntime, configureAspire } from "./runtime.js";
import { applicationAdapter } from "./adapters.js";
import { withFinalizer } from "./lifecycle.js";

process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    app: { type: "string", default: "bingo" },
    scenario: { type: "string", default: "launch-and-verify" },
    model: { type: "string" },
    pairs: { type: "string", default: "1" },
    timeout: { type: "string", default: "15m" },
    output: { type: "string" },
    "allow-paid": { type: "boolean", default: false },
  },
});
const action = positionals[0] ?? "help";
const app = values.app!;
const scenario = values.scenario!;
const vally = path.join(repoRoot, "node_modules/@microsoft/vally-cli/dist/index.js");
const plugin = path.join(repoRoot, "dist/plugin.js");

async function preflight() {
  const [node, dotnet, aspire, docker, compose] = await Promise.all([
    command("node", ["--version"]),
    command("dotnet", ["--list-sdks"]),
    command("aspire", ["--version"]),
    command("docker", ["version", "--format", "{{.Server.Version}}"]),
    command("docker", ["compose", "version", "--short"]),
  ]);
  if (Number(node.stdout.trim().replace(/^v/, "").split(".")[0]) < 24) {
    throw new Error("Bingo fixture requires Node 24 or newer");
  }
  if (!/^10\./m.test(dotnet.stdout)) throw new Error(".NET 10 SDK is required");
  if (!/^13\.6\./.test(aspire.stdout.trim())) throw new Error("Use Aspire CLI 13.6.x for this snapshot");
  await command("lsof", ["-v"], { accept: [0] });
  return {
    node: node.stdout.trim(), dotnet: dotnet.stdout.trim(), aspire: aspire.stdout.trim(),
    docker: docker.stdout.trim(), compose: compose.stdout.trim(),
    vally: "0.17.0", copilotSdk: "1.0.14", os: process.platform, arch: process.arch,
  };
}

async function validate() {
  const catalog = await registry();
  for (const application of Object.values(catalog.applications)) {
    applicationAdapter(application.adapter);
    for (const scenarioName of application.scenarios) {
      const spec = await loadEvalSpec(path.join(repoRoot, `scenarios/${scenarioName}.yaml`));
      const graders = createGraderRegistry();
      registerGraders(graders);
      const result = validateEvalSpec(spec, { registry: graders });
      if (!result.valid) throw new Error(JSON.stringify(result.diagnostics));
    }
    for (const variant of Object.values(application.variants)) {
      await readFile(path.join(repoRoot, variant.fixture, "README.md"));
      if (variant.kind === "aspire") await readFile(path.join(repoRoot, variant.fixture, variant.apphost!));
    }
  }
  console.log("Registry, fixtures and Vally evaluation schema valid.");
}

async function collectFiles(directory: string, basename: string): Promise<string[]> {
  const result: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...await collectFiles(file, basename));
    else if (item.name === basename) result.push(file);
  }
  return result;
}

async function runSmoke(run: Run) {
  const ownership = path.join(run.root, "ownership.json");
  await writeFile(ownership, JSON.stringify(run, null, 2));
  await withFinalizer(async () => {
    await configureRuntime(run);
    const adapter = applicationAdapter(run.adapter);
    await adapter.launch(run);
    const proof = await adapter.verify(run, await submittedEndpoints(run));
    await writeFile(path.join(run.root, "proof.json"), JSON.stringify(proof, null, 2));
    if (!proof.passed) throw new Error(proof.error);
    console.log(`${run.variant}: objective smoke passed (${run.root})`);
  }, () => cleanup(run));
}

async function evaluate() {
  if (!values["allow-paid"]) throw new Error("Real evaluations spend model credits. Pass --allow-paid explicitly.");
  if (!values.model) throw new Error("Choose --model explicitly for a reproducible paid evaluation.");
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN && !process.env.COPILOT_GITHUB_TOKEN) {
    throw new Error("Export GH_TOKEN, GITHUB_TOKEN or COPILOT_GITHUB_TOKEN; host login/config is not inherited.");
  }
  const pairs = Number(values.pairs);
  if (!Number.isSafeInteger(pairs) || pairs < 1) throw new Error("--pairs must be a positive integer");
  if (!/^[1-9]\d*(ms|s|m|h)$/.test(values.timeout!)) throw new Error("--timeout requires a duration, e.g. 15m");
  const catalog = await registry();
  const application = catalog.applications[app];
  if (!application?.scenarios.includes(scenario)) throw new Error(`Unknown ${app}/${scenario}`);
  const variants = Object.keys(application.variants);
  if (variants.length !== 2) throw new Error("Initial paired runner requires exactly two variants");
  const versions = await preflight();
  await validate();
  const directory = path.resolve(values.output ?? path.join(repoRoot, ".runs", new Date().toISOString().replace(/[:.]/g, "-")));
  await mkdir(path.dirname(directory), { recursive: true, mode: 0o700 });
  await mkdir(directory, { recursive: false, mode: 0o700 });
  await writeFile(path.join(directory, "metadata.json"), JSON.stringify({
    versions, model: values.model, timeout: values.timeout, pairs, app, scenario,
    startedAt: new Date().toISOString(),
    commit: (await command("git", ["rev-parse", "HEAD"], { cwd: repoRoot })).stdout.trim(),
    source: JSON.parse(await readFile(path.join(repoRoot, `apps/${app}/provenance.json`), "utf8")),
    treatment: JSON.parse(await readFile(path.join(repoRoot, "treatment/provenance.json"), "utf8")),
  }, null, 2));
  const trials: Trial[] = [];
  for (let pair = 1; pair <= pairs; pair++) {
    for (const variant of pair % 2 ? variants : [...variants].reverse()) {
      checkInterrupted();
      const run = await prepare(app, variant);
      const trialDir = path.join(directory, `${pair}-${variant}`);
      await mkdir(trialDir);
      await writeFile(path.join(trialDir, "workspace.json"), JSON.stringify({
        root: run.root, id: run.id, fixtureHashes: run.baselineHashes,
      }, null, 2));
      const rawSpec = parse(await readFile(path.join(repoRoot, `scenarios/${scenario}.yaml`), "utf8"));
      rawSpec.defaults = { ...rawSpec.defaults, model: values.model, timeout: values.timeout };
      const specFile = path.join(trialDir, "eval.yaml");
      await writeFile(specFile, stringify(rawSpec));
      let error: string | undefined;
      let cleanupFailure: unknown;
      try {
        await withFinalizer(async () => {
          await configureRuntime(run);
          await command("node", [vally, "eval", "-e", specFile, "--work-dir", run.workDir,
            "--workspace", path.join(run.root, "workspaces"),
            "--output-dir", trialDir, "--workers", "1", "--max-retries", "0", "--require-pass",
            "--executor-plugin", plugin, "--grader-plugin", plugin, "--shutdown-timeout", "3m"],
          { cwd: run.workDir, env: { ...isolatedEnv(run), ASPIRE_BENCH_OWNERSHIP: path.join(run.root, "ownership.json") },
            timeout: durationMs(values.timeout!) + 360_000 });
        }, async () => {
          try {
            await cleanup(JSON.parse(await readFile(path.join(run.root, "ownership.json"), "utf8")));
          } catch (cause) {
            cleanupFailure = cause;
            throw cause;
          }
        });
      } catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
      const files = await collectFiles(trialDir, "results.jsonl");
      const proofFiles = await collectFiles(run.root, "proof.json");
      let trial: Trial = { variant, trial: pair, status: "error", success: false, error };
      if (files.length === 1) {
        const outcomes = (await readFile(files[0], "utf8")).trim().split("\n").map(line => JSON.parse(line));
        const outcome = outcomes.find(record => record.trajectory || record.status === "error");
        if (outcome) trial = { ...trial, status: outcome.status, success: outcome.gradeResult?.passed === true,
          metrics: outcome.trajectory?.metrics, error: outcome.error ?? error };
      }
      if (proofFiles.length === 1) {
        const proof = JSON.parse(await readFile(proofFiles[0], "utf8"));
        trial = { ...trial, success: proof.passed === true && !error,
          metrics: proof.metrics, setupMs: proof.setupMs, verificationMs: proof.verificationMs };
        await writeFile(path.join(trialDir, "proof.json"), JSON.stringify(proof, null, 2));
      }
      if ((await collectFiles(run.root, "visibility.json")).length) {
        await writeFile(path.join(trialDir, "visibility.json"), await readFile(path.join(run.root, "visibility.json")));
      }
      trials.push(trial);
      await writeFile(path.join(directory, "paired.json"), JSON.stringify(trials, null, 2));
      if (cleanupFailure) {
        await compare(directory);
        throw cleanupFailure;
      }
    }
  }
  console.log(await compare(directory));
  console.log(`Results: ${directory}`);
  if (trials.some(trial => !trial.success)) process.exitCode = 1;
}

function durationMs(duration: string) {
  const match = /^(\d+)(ms|s|m|h)$/.exec(duration)!;
  return Number(match[1]) * ({ ms: 1, s: 1000, m: 60_000, h: 3_600_000 }[match[2]]!);
}

async function main() {
  if (action === "validate") return validate();
  if (action === "preflight") { console.log(JSON.stringify(await preflight(), null, 2)); return; }
  if (action === "compare") {
    if (!positionals[1]) throw new Error("compare requires an evaluation output directory");
    console.log(await compare(path.resolve(positionals[1]))); return;
  }
  if (action === "eval") return evaluate();
  if (action === "cleanup") {
    if (!positionals[1]) throw new Error("cleanup requires the exact retained runtime root");
    const root = path.resolve(positionals[1]);
    const run: Run = JSON.parse(await readFile(path.join(root, "ownership.json"), "utf8"));
    if (root !== run.root || !/^aspirebench-[a-f0-9]{16}$/.test(run.id)) {
      throw new Error("Runtime ownership manifest does not match requested root");
    }
    await cleanup(run);
    console.log(`Cleaned owned runtime resources for ${run.id}`); return;
  }
  if (action === "dry-run" || action === "smoke") {
    if (action === "smoke") await preflight();
    const application = (await registry()).applications[app];
    if (!application) throw new Error(`Unknown application: ${app}`);
    for (const variant of Object.keys(application.variants)) {
      checkInterrupted();
      const run = await prepare(app, variant);
      if (action === "smoke") {
        await runSmoke(run);
      }
      else {
        await configureAspire(run);
        console.log(JSON.stringify({ variant, root: run.root,
          ...(await dryAgent(run, values.model ?? "gpt-5.5")) }, null, 2));
      }
    }
    return;
  }
  if (action !== "help") throw new Error(`Unknown command: ${action}`);
  console.log("Commands: validate | preflight | dry-run [--model MODEL] | smoke | " +
    "eval --model MODEL --pairs 1 --allow-paid | compare OUTPUT | cleanup RUNTIME_ROOT\n" +
    "Options: --app bingo --scenario launch-and-verify --timeout 15m --output DIR");
}

try { await main(); }
catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
