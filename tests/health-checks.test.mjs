import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { gradeTrajectory, loadEvalSpec, resolveExperiment, runEval, validateEvalSpec, createDefaultGraderRegistry } from "@microsoft/vally";
import { CopilotSdkExecutor } from "@microsoft/vally/executor";
import { experiment, planEnvironment } from "../dist/experiment.js";
import { prepare, repoRoot } from "../dist/workspace.js";
import { BenchmarkExecutor } from "../dist/plugin.js";
import { gradeApplication } from "../dist/grade.js";
import { pairedReport } from "../dist/report.js";

const questions = [
  "Are all services running and healthy?",
  "Is the database ready and healthy?",
  "Is redis ready and healthy?",
];

test("native Vally resolves two evals × fourteen variants; health config is separate and identical across variants", async () => {
  const native = await resolveExperiment("experiments/bingo.experiment.yaml");
  assert.equal(native.plans.length, 28);
  const startup = await loadEvalSpec("scenarios/launch-and-verify.yaml");
  const health = await loadEvalSpec("scenarios/health-checks.yaml");
  assert.equal(startup.stimuli.length, 1);
  assert.equal(startup.stimuli[0].turns, undefined, "Existing launch scenario is unchanged");
  assert.equal(health.stimuli.length, 1);
  assert.equal(health.stimuli[0].turns[0], startup.stimuli[0].prompt);
  for (const [index, question] of questions.entries()) {
    assert(health.stimuli[0].turns[index + 1].startsWith(question + "\n"));
  }
  assert.deepEqual(health.stimuli[0].graders.filter(grader => grader.name.endsWith("-health"))
    .map(grader => [grader.name, grader.type, grader.turn, grader.required]),
    [["services-health", "custom-metrics", undefined, true],
      ["database-health", "custom-metrics", undefined, true], ["redis-health", "custom-metrics", undefined, true]]);
  assert.equal(validateEvalSpec(health, { registry: createDefaultGraderRegistry() }).valid, true);
  const launchPlans = await experiment("bingo", "launch-and-verify");
  const healthPlans = await experiment("bingo", "health-checks");
  assert.equal(launchPlans.plans.length, 14);
  assert.equal(healthPlans.plans.length, 14);
  for (const plan of healthPlans.plans) {
    assert.deepEqual(planEnvironment(plan),
      planEnvironment(launchPlans.plans.find(item => item.variant === plan.variant)));
    assert.deepEqual(plan.effectiveSpec.stimuli, health.stimuli);
  }
  assert.match(pairedReport([], "raw", "health-checks"), /Local health-checks comparison/);
});

for (const [variant, failStartup] of [
  ["raw", false], ["aspire", false], ["raw-bugs", false], ["aspire-bugs", false], ["raw", true],
]) {
test(`native health conversation: ${variant}, startup ${failStartup ? "failure" : "success"}, without inference`, async () => {
  const plan = (await experiment("bingo", "health-checks")).plans.find(item => item.variant === variant);
  const run = await prepare("bingo", variant, plan);
  const saved = { root: process.env.ASPIRE_BENCH_ROOT, ownership: process.env.ASPIRE_BENCH_OWNERSHIP };
  process.env.ASPIRE_BENCH_ROOT = repoRoot;
  process.env.ASPIRE_BENCH_OWNERSHIP = path.join(run.root, "ownership.json");
  const sent = [];
  const completions = [];
  let sessions = 0, completedStartup = false, stopped = false, cleaned = false;
  const executor = new BenchmarkExecutor(() => new CopilotSdkExecutor({
    createEnvClient() {
      return {
        async start() {},
        async stop() { stopped = true; return []; },
        async forceStop() { stopped = true; return []; },
        async createSession(options) {
          sessions++;
          return {
            sessionId: "offline-health",
            on() {},
            async getEvents() { return []; },
            async disconnect() {},
            async abort() {},
            async sendAndWait({ prompt }) {
              sent.push(prompt);
              if (sent.length === 1) {
                if (failStartup) throw new Error("Offline startup failure");
                for (const file of Object.keys(run.repairFiles ?? {})) {
                  const target = path.join(options.workingDirectory, file);
                  await writeFile(target, (await readFile(target, "utf8")).replace("--maxmemroy", "--maxmemory"));
                }
                await writeFile(path.join(options.workingDirectory, "benchmark-endpoints.json"),
                  '{"admin":"http://localhost:1234","frontend":"http://localhost:5678"}');
                completedStartup = true;
              } else {
                assert(completedStartup);
                assert(!cleaned, "Cleanup must not run between health questions");
                assert.equal(sessions, 1);
                assert.equal(completions.length, sent.length - 1, "Each previous turn completes before the next prompt");
                const subject = ["services", "database", "redis"][sent.length - 2];
                await writeFile(path.join(options.workingDirectory, `benchmark-${subject}-health.json`),
                  JSON.stringify({ [subject === "services" ? "running" : "ready"]: true,
                    healthy: true, evidence: "Offline observed check and result" }));
              }
              return { data: { content: `Offline response ${sent.length}` } };
            },
          };
        },
      };
    },
  }));
  let result;
  try {
    const stimulus = plan.effectiveSpec.stimuli[0];
    const execute = () => runEval({
      stimulus, prompt: stimulus.prompt, executor, skills: [], model: "offline-test",
      environment: planEnvironment(plan), baseDir: path.dirname(plan.evalFile),
      workDir: run.workDir, workspace: path.join(run.root, "workspaces/health"), timeout: 10_000,
      async onTurnComplete(completion) {
        assert.equal(completion.status, "completed");
        completions.push(completion.turn);
      },
    });
    if (failStartup) {
      await assert.rejects(execute(), /Offline startup failure/);
      assert.deepEqual(sent, [stimulus.turns[0]], "Health questions must not follow failed startup execution");
      assert.equal(sessions, 1);
      assert(stopped, "Failed native execution must still stop its SDK client");
      assert(!cleaned, "No successful objective grade is fabricated on execution failure");
      return;
    }
    result = await execute();
    assert.deepEqual(sent, stimulus.turns);
    assert.equal(sessions, 1);
    assert.deepEqual(completions, [0, 1, 2, 3]);
    assert(stopped);
    assert.equal(result.trajectory.metadata.sessionID, "offline-health");
    assert.deepEqual(result.trajectory.events.filter(event => event.type === "assistant_message")
      .map(event => event.turn), [0, 1, 2, 3]);
    assert.equal(result.trajectory.endReason, "completed");
    const reports = await gradeTrajectory(result.trajectory, stimulus.graders.filter(grader => grader.name.endsWith("-health")),
      { registry: createDefaultGraderRegistry(), stimulus });
    assert.equal(reports.passed, true, JSON.stringify(reports));
    assert.deepEqual(reports.details.map(detail => [detail.name, detail.passed]),
      [["services-health", true], ["database-health", true], ["redis-health", true]]);
    const owned = JSON.parse(await readFile(path.join(run.root, "ownership.json")));
    const grade = await gradeApplication(owned, result.trajectory, {
      async verify() { assert.equal(sent.length, 4); return { passed: true, checks: ["offline"], verificationMs: 0 }; },
      async cleanup() { cleaned = true; },
    });
    assert(grade.passed);
    assert(cleaned);
  } finally {
    await result?.cleanup();
    await executor.shutdown();
    if (saved.root === undefined) delete process.env.ASPIRE_BENCH_ROOT; else process.env.ASPIRE_BENCH_ROOT = saved.root;
    if (saved.ownership === undefined) delete process.env.ASPIRE_BENCH_OWNERSHIP;
    else process.env.ASPIRE_BENCH_OWNERSHIP = saved.ownership;
    await rm(run.root, { recursive: true });
  }
});
}
