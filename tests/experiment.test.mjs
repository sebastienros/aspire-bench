import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { stringify } from "yaml";
import {
  runEval, loadExperimentConfig, resolveExperiment, mergeVariantOverride,
  createExecutorRegistry, createDefaultGraderRegistry, loadExecutorPlugin,
} from "@microsoft/vally";
import { experiment, planEnvironment, selectVariants } from "../dist/experiment.js";
import { prepare, hashes, repoRoot } from "../dist/workspace.js";
import { sessionConfig } from "../dist/agent.js";
import { BenchmarkExecutor } from "../dist/plugin.js";
import { gradeApplication } from "../dist/grade.js";

test("native manifest controls six variants and unchanged default subset without drift", async () => {
  const resolved = await experiment("bingo", "launch-and-verify");
  assert.equal(resolved.name, "repo-comparison");
  assert.equal(resolved.baseline, "raw");
  assert.equal(resolved.execution.workers, 1);
  assert.deepEqual(resolved.variantNames, ["raw", "raw-scripted", "aspire-none", "aspire-mcp", "aspire-skills", "aspire"]);
  assert.deepEqual(selectVariants(resolved.variantNames), ["raw", "aspire"]);
  assert.equal(selectVariants(resolved.variantNames, "all").length, 6);
  assert.deepEqual(selectVariants(resolved.variantNames, "aspire-none,aspire-mcp"),
    ["aspire-none", "aspire-mcp"]);
  assert.throws(() => selectVariants(resolved.variantNames, "bad"));
  assert.throws(() => selectVariants(resolved.variantNames, "raw,raw"));
  const common = resolved.plans[0].effectiveSpec;
  for (const plan of resolved.plans) {
    assert.deepEqual(plan.effectiveSpec.stimuli, common.stimuli);
    assert.deepEqual(plan.effectiveSpec.defaults, common.defaults);
    assert.deepEqual(plan.effectiveSpec.scoring, common.scoring);
    assert(!planEnvironment(plan).git);
  }
  const configs = resolved.plans.filter(plan => plan.variant.startsWith("aspire")).map(plan =>
    planEnvironment(plan).files[0].src);
  assert.equal(new Set(configs).size, 1, "Every Aspire ablation uses the same application snapshot");
});

test("native drift detection rejects model differences outside declared axes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aspirebench-experiment-test-"));
  try {
    const config = await loadExperimentConfig(path.join(repoRoot, "experiments/bingo.experiment.yaml"));
    config.evals = [path.join(repoRoot, "scenarios/launch-and-verify.yaml")];
    config.variants.raw.overrides = { model: "different-model" };
    await writeFile(path.join(root, "experiment.yaml"), stringify(config));
    await assert.rejects(resolveExperiment(path.join(root, "experiment.yaml")), /drift|vary/i);
    const merged = mergeVariantOverride({
      environment: { skills: ["inherited"], files: [{ src: "old", dest: "." }],
        mcpServers: { inherited: { type: "stdio", command: "old" } }, env: { KEEP: "yes", REMOVE: "no" } },
    }, {
      environment: { skills: [], files: [{ src: "new", dest: "." }],
        mcpServers: null, env: { REMOVE: null, ADD: "yes" } },
    });
    assert.deepEqual(merged.environment.skills, []);
    assert.deepEqual(merged.environment.files, [{ src: "new", dest: "." }]);
    assert.equal(merged.environment.mcpServers, undefined);
    assert.deepEqual(merged.environment.env, { KEEP: "yes", ADD: "yes" });
  } finally {
    await rm(root, { recursive: true });
  }
});

test("supported plugin loaders register custom hooks and native staging executes every cell without inference", async () => {
  const executors = createExecutorRegistry();
  const graders = createDefaultGraderRegistry();
  const plugin = path.join(repoRoot, "dist/plugin.js");
  await loadExecutorPlugin(plugin, executors);
  assert(executors.get("isolated-benchmark"));
  assert(graders.get("program"));
  assert.equal(graders.get("application-ready"), undefined);
  const resolved = await experiment("bingo", "launch-and-verify");
  for (const plan of resolved.plans) {
    const run = await prepare("bingo", plan.variant, plan);
    run.nativeStaging = true;
    await writeFile(path.join(run.root, "ownership.json"), JSON.stringify(run));
    const old = process.env.ASPIRE_BENCH_OWNERSHIP;
    process.env.ASPIRE_BENCH_OWNERSHIP = path.join(run.root, "ownership.json");
    let cleaned = false;
    const executor = new BenchmarkExecutor(() => ({
        name: "offline", supportsEnvVars: true,
        async execute(stimulus, options) {
          assert.deepEqual(await hashes(options.workDir), run.baselineHashes);
          assert.equal(options.skills.length, run.skillNames.length);
          assert.deepEqual(Object.keys(options.mcpServers ?? {}), Object.keys(run.environment.mcpServers ?? {}));
          const config = sessionConfig({ ...run, workDir: options.workDir }, {});
          assert.equal(config.enableSkills, ["aspire-skills", "aspire"].includes(plan.variant));
          assert.deepEqual(Object.keys(config.mcpServers),
            ["aspire-mcp", "aspire"].includes(plan.variant) ? ["aspire"] : []);
          await assert.rejects(access(path.join(options.workDir, "harness")));
          await assert.rejects(access(path.join(options.workDir, "apps")));
          if (plan.variant.startsWith("raw")) {
            await assert.rejects(access(path.join(options.workDir, "apphost.cs")));
            await assert.rejects(access(path.join(options.workDir, "aspire/SKILL.md")));
          }
          await writeFile(path.join(options.workDir, "benchmark-endpoints.json"),
            JSON.stringify({ admin: "http://localhost:1234", frontend: "http://localhost:5678" }));
          return {
            id: run.id, stimulus, workDir: options.workDir, events: [], output: "offline",
            endReason: "completed", metadata: { model: "offline", skillsLoaded: [] },
            metrics: { wallTimeMs: 1, tokenUsage: { totalTokens: 0 }, toolCallCount: 0, turnCount: 0 },
          };
        },
        async shutdown() {},
    }));
    try {
      await mkdir(path.join(run.root, "workspaces"), { recursive: true });
      const stimulus = plan.effectiveSpec.stimuli[0];
      const result = await runEval({
        prompt: stimulus.prompt, stimulus, skills: [], executor,
        workDir: run.workDir, workspace: path.join(run.root, "workspaces/native"),
        environment: planEnvironment(plan), baseDir: path.dirname(plan.evalFile), timeout: 10_000,
      });
      assert.equal(cleaned, false, "Application must remain running until program grading");
      const owned = JSON.parse(await readFile(path.join(run.root, "ownership.json")));
      assert.equal((await gradeApplication(owned, result.trajectory, {
        async verify() { return { passed: true, checks: ["offline"], verificationMs: 0 }; },
        async cleanup() { cleaned = true; },
      })).passed, true);
      assert(cleaned);
      await result.cleanup();
    } finally {
      if (old === undefined) delete process.env.ASPIRE_BENCH_OWNERSHIP;
      else process.env.ASPIRE_BENCH_OWNERSHIP = old;
      await rm(run.root, { recursive: true });
    }
  }
});
