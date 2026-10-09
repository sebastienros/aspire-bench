import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { stringify } from "yaml";
import { validateEvalSpec, createDefaultGraderRegistry } from "@microsoft/vally";
import { command, interrupt, checkInterrupted } from "./process.js";
import { prepare, registry, repoRoot, isolatedEnv, stagedConfig, hashes, type Run } from "./workspace.js";
import { dryAgent } from "./agent.js";
import { cleanup } from "./ownership.js";
import { submittedEndpoints } from "./verify.js";
import { compare } from "./report.js";
import { configureRuntime, configureAspire } from "./runtime.js";
import { applicationAdapter, manualBingoCommands } from "./adapters.js";
import { withFinalizer } from "./lifecycle.js";
import { experiment, planEnvironment, selectVariants } from "./experiment.js";
import { exportVally } from "./export.js";
import { modelList } from "./models.js";

process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    app: { type: "string", default: "bingo" },
    scenario: { type: "string", default: "health-checks" },
    variants: { type: "string", default: "raw,aspire" },
    model: { type: "string" },
    pairs: { type: "string", default: "1" },
    timeout: { type: "string", default: "15m" },
    output: { type: "string" },
    repetition: { type: "string", default: "1" },
    "allow-paid": { type: "boolean", default: false },
  },
});
const action = positionals[0] ?? "help";
const app = values.app!;
const scenario = values.scenario!;

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
    vally: "0.18.0", copilotSdk: "1.0.14", os: process.platform, arch: process.arch,
  };
}

async function validate() {
  const catalog = await registry();
  for (const [applicationName, application] of Object.entries(catalog.applications)) {
    applicationAdapter(application.adapter);
    for (const scenarioName of application.scenarios) {
      for (const plan of (await experiment(applicationName, scenarioName)).plans) {
        const result = validateEvalSpec(plan.effectiveSpec, { registry: createDefaultGraderRegistry() });
        if (!result.valid) throw new Error(JSON.stringify(result.diagnostics));
      }
    }
    for (const variant of Object.values(application.variants)) {
      if (variant.kind === "aspire") await readFile(path.join(repoRoot, variant.fixture, "README.md"));
      if (variant.kind === "aspire") await readFile(path.join(repoRoot, variant.fixture, variant.apphost!));
    }
  }
  console.log("Registry, native Vally experiment drift checks, local staging and evaluation schemas valid.");
}

async function runSmoke(run: Run) {
  const ownership = path.join(run.root, "ownership.json");
  await writeFile(ownership, JSON.stringify(run, null, 2));
  await withFinalizer(async () => {
    for (const [file, digest] of Object.entries(run.repairFiles ?? {})) {
      await cp(path.join(repoRoot, run.config.fixture, file), path.join(run.workDir, file));
      if ((await hashes(run.workDir))[file] !== digest) throw new Error("Reference startup repair hash mismatch");
    }
    await configureRuntime(run);
    const adapter = applicationAdapter(run.adapter);
    await adapter.launch(run);
    const proof = await adapter.verify(run, await submittedEndpoints(run));
    await writeFile(path.join(run.root, "proof.json"), JSON.stringify(proof, null, 2));
    if (!proof.passed) throw new Error(proof.error);
    if (run.config.lifecycle === "manual") await manualBingoCommands(run, "stop");
    console.log(`${run.variant}: objective smoke passed (${run.root})`);
  }, () => cleanup(run));
}

async function initialize() {
  const resolved = await experiment(app, scenario);
  const catalog = await registry();
  const variants = selectVariants(resolved.variantNames, values.variants);
  const pairs = Number(values.pairs);
  if (!Number.isSafeInteger(pairs) || pairs < 1) throw new Error("--pairs must be a positive integer");
  if (!values.model) throw new Error("--model is required");
  const models = modelList(values.model);
  if (!/^[1-9]\d*(ms|s|m|h)$/.test(values.timeout!)) throw new Error("Invalid --timeout duration");
  const versions = await preflight();
  const directory = path.resolve(values.output ?? path.join(repoRoot, ".runs", new Date().toISOString().replace(/[:.]/g, "-")));
  await mkdir(path.dirname(directory), { recursive: true, mode: 0o700 });
  await mkdir(directory, { recursive: false, mode: 0o700 });
  await writeFile(path.join(directory, "experiment-plan.json"), JSON.stringify(resolved, null, 2));
  await cp(resolved.experimentFile, path.join(directory, "experiment.yaml"));
  await writeFile(path.join(directory, "metadata.json"), JSON.stringify({
    versions, model: values.model, models, timeout: values.timeout, pairs, app, scenario, variants,
    baseline: resolved.baseline,
    lifecycle: "scripts",
    variantDefinitions: Object.fromEntries(resolved.plans.filter(plan => variants.includes(plan.variant))
      .map(plan => [plan.variant, {
        ...stagedConfig(catalog.applications[app].variants[plan.variant], planEnvironment(plan)),
        files: planEnvironment(plan).files?.map(file =>
          ({ ...file, src: path.relative(repoRoot, file.src) })),
      }])),
    startedAt: new Date().toISOString(),
    commit: (await command("git", ["rev-parse", "HEAD"], { cwd: repoRoot })).stdout.trim(),
    source: JSON.parse(await readFile(path.join(repoRoot, `apps/${app}/provenance.json`), "utf8")),
    treatment: JSON.parse(await readFile(path.join(repoRoot, "treatment/provenance.json"), "utf8")),
  }, null, 2));
  console.log(directory);
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function setup() {
  if (!values.output || !values.model) throw new Error("setup requires --output and --model");
  const models = modelList(values.model);
  if (!/^[1-9]\d*(ms|s|m|h)$/.test(values.timeout!)) throw new Error("Invalid --timeout duration");
  const repetition = Number(values.repetition);
  if (!Number.isSafeInteger(repetition) || repetition < 1) throw new Error("Invalid --repetition");
  const resolved = await experiment(app, scenario);
  const selected = selectVariants(resolved.variantNames, values.variants);
  if (selected.length !== 1) throw new Error("setup requires exactly one --variants entry");
  const plan = resolved.plans.find(item => item.variant === selected[0])!;
  const directory = path.resolve(values.output);
  await mkdir(directory, { recursive: false, mode: 0o700 });
  const run = await prepare(app, plan.variant, plan);
  run.nativeStaging = true;
  const runs = [run];
  try {
    for (let index = 1; index < models.length; index++) {
      const next = await prepare(app, plan.variant, plan);
      next.nativeStaging = true;
      runs.push(next);
    }
    if (models.length > 1) {
      for (const runtime of runs) runtime.nativeWorkspaceRoot = path.join(run.root, "workspaces");
      await writeFile(path.join(run.root, "model-contexts.json"), JSON.stringify(
        runs.map((runtime, index) => ({ model: models[index], root: runtime.root }))), { mode: 0o600 });
    }
    await writeFile(path.join(directory, "workspace.json"), JSON.stringify({
      root: run.root, id: run.id, variant: plan.variant, repetition,
      fixtureHashes: run.baselineHashes, patches: run.patches, repairFiles: run.repairFiles,
    }, null, 2));
    for (const runtime of runs) await configureRuntime(runtime);
    await writeFile(path.join(directory, "plan.json"), JSON.stringify(plan, null, 2));
    await writeFile(path.join(directory, "eval.yaml"), stringify({
      ...plan.effectiveSpec,
      environment: undefined,
      agent_environment: planEnvironment(plan),
      stimuli: plan.effectiveSpec.stimuli.map(stimulus => {
        if (!stimulus.turns) return stimulus;
        const { prompt, ...configured } = stimulus;
        return configured;
      }),
      defaults: { ...plan.effectiveSpec.defaults, model: models[0], timeout: values.timeout },
    }));
    const env = isolatedEnv(run);
    for (const key of ["GH_TOKEN", "GITHUB_TOKEN", "COPILOT_GITHUB_TOKEN"]) delete env[key];
    env.ASPIRE_BENCH_OWNERSHIP = path.join(run.root, "ownership.json");
    env.ASPIRE_BENCH_SETUP_OWNERSHIP = env.ASPIRE_BENCH_OWNERSHIP;
    env.ASPIRE_BENCH_ROOT = repoRoot;
    env.ASPIRE_BENCH_MODELS = models.join(",");
    if (models.length > 1) env.ASPIRE_BENCH_MODEL_CONTEXTS = path.join(run.root, "model-contexts.json");
    await writeFile(path.join(run.root, "environment.sh"), Object.entries(env)
      .map(([key, value]) => `export ${key}=${shellQuote(value)}`).join("\n") + "\n", { mode: 0o600 });
    console.log(run.root);
  } catch (error) {
    await withFinalizer(async () => { throw error; }, async () => {
      const errors = [];
      for (const runtime of runs) {
        try { await cleanup(runtime); } catch (cleanupError) { errors.push(cleanupError); }
      }
      if (errors.length) throw new AggregateError(errors, "Model runtime cleanup failed");
    });
  }
}

async function retain(root: string, directory: string, singleModel = false) {
  if (!singleModel && (await readdir(root)).includes("model-contexts.json")) {
    const contexts: { model: string; root: string }[] = JSON.parse(
      await readFile(path.join(root, "model-contexts.json"), "utf8"));
    const workspace = JSON.parse(await readFile(path.join(directory, "workspace.json"), "utf8"));
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith("model-")) {
        const file = path.join(directory, entry.name, "results.jsonl");
        if ((await readdir(path.join(directory, entry.name))).includes("results.jsonl")) files.push(file);
      }
    }
    if (files.length > 1) throw new Error("Expected one native multi-model result file");
    const records = files.length ? (await readFile(files[0], "utf8")).split("\n").filter(Boolean)
      .map(line => JSON.parse(line)).filter(record => record.type === "trial-result") : [];
    for (const [index, context] of contexts.entries()) {
      const target = path.join(directory, `model-${index + 1}`);
      await mkdir(target, { recursive: true });
      await retain(context.root, target, true);
      const runtime: Run = JSON.parse(await readFile(path.join(context.root, "ownership.json"), "utf8"));
      await writeFile(path.join(target, "workspace.json"), JSON.stringify({
        ...workspace, root: context.root, id: runtime.id, model: context.model,
        fixtureHashes: runtime.baselineHashes, patches: runtime.patches, repairFiles: runtime.repairFiles,
      }));
      await cp(path.join(directory, "plan.json"), path.join(target, "plan.json"));
      const selected = records.filter(record =>
        (record.model ?? record.trajectory?.metadata?.model) === context.model);
      if (selected.length > 1) throw new Error("Expected one native trial per model");
      if (selected.length) {
        await writeFile(path.join(target, "results.jsonl"), JSON.stringify(selected[0]) + "\n");
        await writeFile(path.join(target, "exit-code"),
          selected[0].status === "success" && selected[0].gradeResult?.passed === true ? "0\n" : "1\n");
      }
    }
    return;
  }
  for (const name of ["proof.json", "agent.json", "visibility.json", "session-logs"]) {
    if ((await readdir(root)).includes(name)) {
      await cp(path.join(root, name), path.join(directory, name), { recursive: true });
    }
  }
  if ((await readdir(root)).includes("cleanup-exit-code")) {
    await cp(path.join(root, "cleanup-exit-code"), path.join(directory, "cleanup-exit-code"));
  }
}

async function main() {
  if (action === "validate") return validate();
  if (action === "preflight") { console.log(JSON.stringify(await preflight(), null, 2)); return; }
  if (action === "compare") {
    if (!positionals[1]) throw new Error("compare requires an evaluation output directory");
    console.log(await compare(path.resolve(positionals[1]))); return;
  }
  if (action === "export-vally") {
    if (!positionals[1]) throw new Error("export-vally requires one harness run folder");
    console.log(await exportVally(path.resolve(positionals[1]))); return;
  }
  if (action === "initialize") return initialize();
  if (action === "setup") return setup();
  if (action === "selection") {
    console.log(selectVariants((await experiment(app, scenario)).variantNames, values.variants).join("\n"));
    return;
  }
  if (action === "retain") {
    if (!positionals[1] || !values.output) throw new Error("retain requires runtime root and --output");
    return retain(path.resolve(positionals[1]), path.resolve(values.output));
  }
  if (action === "plan") {
    console.log(JSON.stringify(await experiment(app, scenario), null, 2));
    return;
  }
  if (action === "cleanup") {
    if (!positionals[1]) throw new Error("cleanup requires the exact retained runtime root");
    const root = path.resolve(positionals[1]);
    const run: Run = JSON.parse(await readFile(path.join(root, "ownership.json"), "utf8"));
    if (root !== run.root || !/^aspirebench-[a-f0-9]{16}$/.test(run.id)) {
      throw new Error("Runtime ownership manifest does not match requested root");
    }
    const contexts = (await readdir(root)).includes("model-contexts.json")
      ? JSON.parse(await readFile(path.join(root, "model-contexts.json"), "utf8")) as { root: string }[]
      : [{ root }];
    const errors = [];
    for (const context of contexts) {
      const runtime: Run = JSON.parse(await readFile(path.join(context.root, "ownership.json"), "utf8"));
      if (runtime.root !== context.root || !/^aspirebench-[a-f0-9]{16}$/.test(runtime.id)) {
        throw new Error("Model runtime ownership mismatch");
      }
      try {
        await cleanup(runtime);
        await writeFile(path.join(runtime.root, "cleanup-exit-code"), "0\n");
      } catch (error) {
        await writeFile(path.join(runtime.root, "cleanup-exit-code"), "1\n");
        errors.push(error);
      }
    }
    if (errors.length) throw new AggregateError(errors, `Model runtime cleanup failed: ${
      errors.map(error => error instanceof Error ? error.message : String(error)).join("; ")}`);
    console.log(`Cleaned owned runtime resources for ${run.id}`); return;
  }
  if (action === "dry-run" || action === "smoke") {
    if (action === "smoke") await preflight();
    const resolved = await experiment(app, scenario);
    const selected = selectVariants(resolved.variantNames, values.variants);
    for (const plan of resolved.plans.filter(item => selected.includes(item.variant))) {
      const variant = plan.variant;
      checkInterrupted();
      const run = await prepare(app, variant, plan);
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
  console.log("Commands: validate | plan | preflight | dry-run [--model MODEL] | smoke | " +
    "compare OUTPUT | export-vally OUTPUT | cleanup RUNTIME_ROOT | setup --model MODEL --variants ONE --output DIR\n" +
    "Evaluations: bash scripts/run.sh --model MODEL[,MODEL...] --pairs 1 --allow-paid\n" +
    "Options: --app bingo --scenario health-checks --variants raw,aspire|all --timeout 15m --output DIR");
}

try { await main(); }
catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
