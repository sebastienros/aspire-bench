import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { Writable } from "node:stream";
import { runEval, EvalJsonlReporter } from "@microsoft/vally";
import { BenchmarkExecutor } from "../dist/plugin.js";
import { gradeApplication } from "../dist/grade.js";
import { prepare, hashes, unchanged } from "../dist/workspace.js";
import { withFinalizer } from "../dist/lifecycle.js";
import { ownedCwds } from "../dist/ownership.js";
import { applicationAdapter } from "../dist/adapters.js";
import { command } from "../dist/process.js";

function fakeTrajectory(stimulus, workDir) {
  return {
    id: randomUUID(), stimulus, workDir, output: "Not trusted as verification evidence",
    events: [], endReason: "completed",
    metadata: { model: "offline-test", skillsLoaded: [] },
    metrics: {
      tokenUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, cacheReadTokens: 0,
        cacheWriteTokens: 0, callCount: 1, byModel: {} },
      wallTimeMs: 123, toolCallCount: 2, toolCallBreakdown: {}, simulatedToolCallCount: 0,
      skillActivationCount: 0, skillActivationBreakdown: {}, turnCount: 1, errorCount: 0,
    },
  };
}

test("native Vally execution, grading and JSONL preserve owned workspace and metrics without inference", async () => {
  const run = await prepare("bingo", "raw");
  const old = process.env.ASPIRE_BENCH_OWNERSHIP;
  process.env.ASPIRE_BENCH_OWNERSHIP = path.join(run.root, "ownership.json");
  let cleaned = 0;
  let stopped = 0;
  const executor = new BenchmarkExecutor(() => ({
      name: "offline-test", supportsEnvVars: true,
      async execute(stimulus, options) {
        assert(options.sessionLog.rootDir.startsWith(run.root + path.sep));
        assert(options.workDir.startsWith(path.join(run.root, "workspaces") + path.sep));
        assert(unchanged(run.baselineHashes, await hashes(options.workDir)));
        await writeFile(path.join(options.workDir, "benchmark-endpoints.json"),
          JSON.stringify({ admin: "http://localhost:1234", frontend: "http://localhost:5678" }));
        return fakeTrajectory(stimulus, options.workDir);
      },
      async shutdown() { stopped++; },
  }));
  try {
    const stimulus = { name: "offline", prompt: "Never sent to a model",
      graders: [{ type: "program", required: true }] };
    const result = await runEval({
      prompt: stimulus.prompt, stimulus, skills: [], executor, workDir: run.workDir,
      workspace: path.join(run.root, "workspaces/native-trial"), timeout: 10_000,
      environment: run.environment,
    });
    assert.equal(cleaned, 0);
    const owned = JSON.parse(await readFile(path.join(run.root, "ownership.json")));
    const objective = await gradeApplication(owned, result.trajectory, {
      async verify(owned, urls) {
        assert.notEqual(owned.workDir, run.workDir);
        assert.equal(urls.admin, "http://localhost:1234");
        return { passed: true, checks: ["offline injected objective"], verificationMs: 2 };
      },
      async cleanup() { cleaned++; },
    });
    const grade = { passed: objective.passed, score: objective.score, results: [objective] };
    assert.equal(grade.passed, true);
    assert.equal(cleaned, 1);
    assert.equal(stopped, 1);
    await executor.shutdown();
    assert.equal(cleaned, 1);
    let jsonl = "";
    const reporter = new EvalJsonlReporter({
      stream: new Writable({ write(chunk, _encoding, done) { jsonl += chunk; done(); } }),
    });
    await reporter.onTrialResult({
      item: { id: "offline", evalName: "test", variant: "raw", stimulus },
      result: { status: "success", durationMs: 123, trajectory: result.trajectory, grade },
    });
    const outcome = JSON.parse(jsonl.trim());
    assert.equal(outcome.type, "trial-result");
    assert.equal(outcome.gradeResult.passed, true);
    assert.equal(outcome.trajectory.metrics.tokenUsage.totalTokens, 15);
    assert.equal(JSON.parse(await readFile(path.join(run.root, "proof.json"))).passed, true);
    await result.cleanup();
  } finally {
    if (old === undefined) delete process.env.ASPIRE_BENCH_OWNERSHIP;
    else process.env.ASPIRE_BENCH_OWNERSHIP = old;
    await rm(run.root, { recursive: true });
  }
});

test("executor aggregates execution/shutdown errors and refuses unowned staging", async () => {
  const run = await prepare("bingo", "raw");
  const old = process.env.ASPIRE_BENCH_OWNERSHIP;
  process.env.ASPIRE_BENCH_OWNERSHIP = path.join(run.root, "ownership.json");
  const executor = new BenchmarkExecutor(() => ({
      name: "offline", supportsEnvVars: true,
      async execute() { throw new Error("execution failure"); },
      async shutdown() { throw new Error("shutdown failure"); },
  }));
  try {
    await assert.rejects(runEval({
      prompt: "offline", stimulus: { name: "test", prompt: "offline" }, skills: [], executor,
      workDir: run.workDir, workspace: path.join(run.root, "workspaces/failure"), timeout: 10_000,
      environment: run.environment,
    }),
      error => error instanceof AggregateError
        && error.errors[0].message === "execution failure"
        && error.errors[1].message === "shutdown failure");
    await executor.shutdown();
    await assert.rejects(executor.execute({ name: "test", prompt: "offline" }, { workDir: "/outside" }),
      /escapes/);
  } finally {
    if (old === undefined) delete process.env.ASPIRE_BENCH_OWNERSHIP;
    else process.env.ASPIRE_BENCH_OWNERSHIP = old;
    await rm(run.root, { recursive: true });
  }
});

test("cleanup failure retains normalized trajectory metrics and fails objective grading explicitly", async () => {
  const run = await prepare("bingo", "raw");
  const old = process.env.ASPIRE_BENCH_OWNERSHIP;
  process.env.ASPIRE_BENCH_OWNERSHIP = path.join(run.root, "ownership.json");
  const executor = new BenchmarkExecutor(() => ({
      name: "offline", supportsEnvVars: true,
      async execute(stimulus, options) {
        await writeFile(path.join(options.workDir, "benchmark-endpoints.json"),
          JSON.stringify({ admin: "http://localhost:1234", frontend: "http://localhost:5678" }));
        return fakeTrajectory(stimulus, options.workDir);
      },
      async shutdown() {},
  }));
  try {
    const result = await runEval({
      prompt: "offline", stimulus: { name: "test", prompt: "offline" }, skills: [], executor,
      workDir: run.workDir, workspace: path.join(run.root, "workspaces/cleanup-failure"), timeout: 10_000,
      environment: run.environment,
    });
    const trajectory = result.trajectory;
    assert.equal(trajectory.metrics.tokenUsage.totalTokens, 15);
    const owned = JSON.parse(await readFile(path.join(run.root, "ownership.json")));
    const grade = await gradeApplication(owned, trajectory, {
      async verify() { return { passed: true, checks: ["objective passed"], verificationMs: 1 }; },
      async cleanup() { throw new Error("owned resource remains"); },
    });
    assert.equal(grade.passed, false);
    const proof = JSON.parse(await readFile(path.join(run.root, "proof.json")));
    assert.equal(proof.objectivePassed, true);
    assert.equal(proof.passed, false);
    assert.match(proof.cleanupError, /owned resource remains/);
    await executor.shutdown();
    await result.cleanup();
  } finally {
    if (old === undefined) delete process.env.ASPIRE_BENCH_OWNERSHIP;
    else process.env.ASPIRE_BENCH_OWNERSHIP = old;
    await rm(run.root, { recursive: true });
  }
});

test("finalization preserves primary errors and ownership excludes preexisting or neighboring PIDs", async () => {
  await assert.rejects(withFinalizer(
    async () => { throw new Error("primary"); },
    async () => { throw new Error("cleanup"); },
  ), error => error instanceof AggregateError && error.errors.length === 2);
  assert.deepEqual(ownedCwds("/private/tmp/owned", [100], [
    "p100", "n/private/tmp/owned/app", "p101", "n/private/tmp/owned/app",
    "p102", "n/private/tmp/owned-neighbor", "p103", "n/private/tmp/owned/home",
    "p104", "n/private/tmp/owned", "p105", "n/private/tmp/owned/app",
  ].join("\n"), 103, 105), [101, 104]);
  assert.throws(() => applicationAdapter("unknown"), /Unsupported/);
  assert.throws(() => applicationAdapter("toString"), /Unsupported/);
});

test("process ownership excludes its own lsof observer when invoked inside a runtime workspace", async () => {
  const run = await prepare("bingo", "raw");
  try {
    const module = new URL("../dist/ownership.js", import.meta.url).href;
    const output = await command(process.execPath, ["--input-type=module", "-e", `
      import {ownedProcesses} from ${JSON.stringify(module)};
      console.log(JSON.stringify(await ownedProcesses(${JSON.stringify(run)})));
    `], { cwd: run.workDir });
    assert.deepEqual(JSON.parse(output.stdout), []);
  } finally {
    await rm(run.root, { recursive: true });
  }
});

test("command timeout escalates a TERM-resistant owned child and awaits its exit", async () => {
  await assert.rejects(command(process.execPath, ["-e",
    'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'], { timeout: 200 }), /timed out/);
});
