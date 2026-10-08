import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { stringify } from "yaml";
import { command } from "../dist/process.js";
import { prepare, repoRoot } from "../dist/workspace.js";
import { experiment } from "../dist/experiment.js";
import { compare } from "../dist/report.js";

async function fixture(mode = "success") {
  const directory = await mkdtemp(path.join(tmpdir(), "aspirebench-scripts-test-"));
  const run = await prepare("bingo", "raw");
  const bin = path.join(directory, "bin");
  const mock = path.join(directory, "mock");
  const output = path.join(directory, "results");
  await Promise.all([mkdir(bin), mkdir(output), mkdir(path.join(mock, "dist"), { recursive: true }),
    mkdir(path.join(mock, "scripts"), { recursive: true }),
    mkdir(path.join(mock, "node_modules/@microsoft"), { recursive: true })]);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, NODE_TLS_REJECT_UNAUTHORIZED: "0" };
  await writeFile(path.join(bin, "docker"), `#!/usr/bin/env bash
if [[ "$1" == info ]]; then
    printf '%s\\n' '${JSON.stringify([{ Name: "compose", Path: path.join(bin, "docker") }])}'
elif [[ "$1" == context ]]; then
    printf '%s\\n' '{"Host":"unix:///tmp/aspirebench-offline.sock","SkipTLSVerify":false}'
elif [[ ${JSON.stringify(mode)} == cleanup-failure ]] && [[ "$1" == volume ]]; then
    echo "offline cleanup failure" >&2
    exit 3
fi
`, { mode: 0o700 });
  await writeFile(path.join(bin, "lsof"), "#!/usr/bin/env bash\nexit 1\n", { mode: 0o700 });
  await writeFile(path.join(mock, "package.json"), '{"type":"module"}');
  await symlink(path.join(repoRoot, "node_modules/@microsoft/vally-cli"),
    path.join(mock, "node_modules/@microsoft/vally-cli"));
  await writeFile(path.join(mock, "dist/plugin.js"), `
    import {writeFile} from "node:fs/promises";
    import path from "node:path";
    import {BenchmarkExecutor} from ${JSON.stringify(new URL("../dist/plugin.js", import.meta.url).href)};
    export function registerExecutors(registry) {
      registry.register(new BenchmarkExecutor(() => ({
        name:"offline", supportsEnvVars:true,
        async execute(stimulus, options) {
          if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== undefined)
            throw new Error("Ambient TLS bypass leaked");
          if (${JSON.stringify(mode)} === "failure") throw new Error("offline execution failure");
          if (${JSON.stringify(mode)} === "hang") {
            await writeFile(${JSON.stringify(path.join(output, "started"))}, "ready");
            await new Promise(() => { setInterval(() => {}, 1000); });
          }
          const mode = ${JSON.stringify(mode)};
          const writeReport = async (subject, healthy = true) => {
            await writeFile(path.join(options.workDir, "benchmark-" + subject + "-health.json"),
              JSON.stringify({[subject === "services" ? "running" : "ready"]:true,
                healthy,evidence:"Offline observed health check succeeded"}));
          };
          const prompts = stimulus.turns ?? [stimulus.prompt];
          for (let turn = 0; turn < prompts.length; turn++) {
            if (turn === 0) {
              await writeFile(path.join(options.workDir,"benchmark-endpoints.json"),
                JSON.stringify(mode === "invalid-endpoints"
                  ? {admin:"http://localhost:1234"}
                  : {admin:"http://localhost:1234",frontend:"http://localhost:5678"}));
            } else {
              const subject = ["services", "database", "redis"][turn - 1];
              if (!(mode === "health-missing-report" && subject === "redis")
                && !(mode === "health-late-report" && subject === "services")) {
                await writeReport(subject, !(mode === "health-late-repair" && subject === "services"));
              }
              if ((mode === "health-late-report" && turn === 2)
                || (mode === "health-late-repair" && turn === 3)) await writeReport("services");
            }
            await options.onTurnComplete?.({turn,status:"completed",final:turn === prompts.length - 1});
          }
          return {id:"offline-trajectory",stimulus,workDir:options.workDir,output:"offline",
            events:stimulus.turns?.map((prompt,turn)=>({type:"assistant_message",turn,timestamp:new Date(),
              data:{content:"Offline assessment "+turn}}))??[],
            endReason:"completed",metadata:{model:"offline",skillsLoaded:[]},
            metrics:{wallTimeMs:123,tokenUsage:{inputTokens:10,outputTokens:5,totalTokens:15,
              cacheReadTokens:0,cacheWriteTokens:0,callCount:1,byModel:{}},
              toolCallCount:2,toolCallBreakdown:{},simulatedToolCallCount:0,
              skillActivationCount:0,skillActivationBreakdown:{},turnCount:stimulus.turns?.length??1,errorCount:0}};
        }, async shutdown() {}
      })));
    }
  `);
  await writeFile(path.join(mock, "scripts/verify.sh"),
    `#!/usr/bin/env bash\nexec node ${JSON.stringify(mode === "real-grader"
      ? path.join(repoRoot, "dist/grade.js") : path.join(mock, "dist/grade.js"))} "$@"\n`);
  await writeFile(path.join(mock, "dist/grade.js"), `
    import {readFile} from "node:fs/promises";
    import {gradeApplication,gradeEndpointContract} from ${JSON.stringify(new URL("../dist/grade.js", import.meta.url).href)};
    const run = JSON.parse(await readFile(process.env.ASPIRE_BENCH_OWNERSHIP));
    const input = JSON.parse(await readFile(process.env.EVALUATE_GRADER_INPUT));
    if(process.env.EVALUATE_WORKSPACE !== input.trajectory.workDir) throw new Error("Native workspace missing");
    const result = process.argv[2] === "endpoint-contract"
      ? await gradeEndpointContract(run, input.trajectory)
      : await gradeApplication(run, input.trajectory, {
      async verify(){return {passed:true,checks:["injected offline objective"],verificationMs:2}},
      async cleanup(){},
    });
    console.log(JSON.stringify(result));
  `);
  run.env.PATH = env.PATH;
  await writeFile(path.join(run.root, "ownership.json"), JSON.stringify(run));
  await writeFile(path.join(run.root, "environment.sh"), Object.entries({
    ...run.env, ASPIRE_BENCH_ROOT: mock, ASPIRE_BENCH_OWNERSHIP: path.join(run.root, "ownership.json"),
  }).map(([key, value]) => `export ${key}='${value.replaceAll("'", "'\\''")}'`).join("\n"));
  await writeFile(path.join(output, "workspace.json"),
    JSON.stringify({ root: run.root, variant: "raw", repetition: 1 }));
  const plan = (await experiment("bingo", mode.startsWith("health-") ? "health-checks" : "launch-and-verify"))
    .plans.find(plan => plan.variant === "raw");
  await writeFile(path.join(output, "eval.yaml"), stringify(plan.effectiveSpec));
  await writeFile(path.join(directory, "metadata.json"), '{"lifecycle":"scripts","baseline":"raw"}');
  return { directory, run, output, env, async dispose() {
    await rm(run.root, { recursive: true });
    await rm(directory, { recursive: true });
  } };
}

async function nativeTrial(f) {
  const files = (await readdir(f.output, { recursive: true })).filter(file => file.endsWith("results.jsonl"));
  assert.equal(files.length, 1);
  const trials = (await readFile(path.join(f.output, files[0]), "utf8")).trim().split("\n")
    .map(line => JSON.parse(line)).filter(record => record.type === "trial-result");
  assert.equal(trials.length, 1);
  return trials[0];
}

test("shell lifecycle calls actual Vally CLI and built-in program grader without custom grader/inference", async () => {
  const f = await fixture();
  try {
    await command("bash", ["scripts/trial.sh", f.run.root, f.output, "30"], { env: f.env });
    assert.equal((await readFile(path.join(f.output, "exit-code"), "utf8")).trim(), "0");
    const proof = JSON.parse(await readFile(path.join(f.output, "proof.json")));
    assert.equal(proof.passed, true);
    assert.deepEqual((await nativeTrial(f)).gradeResult.details.map(detail => [detail.name, detail.passed]),
      [["endpoint-contract", true], ["objective-success", true]]);
    assert.equal(proof.metrics.tokenUsage.totalTokens, 15);
    const report = await compare(f.directory);
    assert.match(report, /raw: 1\/1/);
    assert.match(report, /raw \| pass \| 0.12 \| 15 \| 2 \| 1/);
    await writeFile(path.join(f.output, "cleanup-exit-code"), "1");
    assert.match(await compare(f.directory), /raw: 0\/1/);
    await writeFile(path.join(f.output, "exit-code"), "1");
    assert.match(await compare(f.directory), /raw: 0\/1/);
  } finally { await f.dispose(); }
});

test("native Vally records an endpoint-contract failure and rejects the trial despite completed execution", async () => {
  const f = await fixture("invalid-endpoints");
  try {
    await assert.rejects(command("bash", ["scripts/trial.sh", f.run.root, f.output, "30"], { env: f.env }), /exited 1/);
    const outcome = await nativeTrial(f);
    assert.equal(outcome.status, "success", "Agent execution completed, but grading must fail");
    assert.equal(outcome.gradeResult.passed, false);
    const contract = outcome.gradeResult.details.find(detail => detail.name === "endpoint-contract");
    assert.equal(contract.passed, false);
    assert.equal(contract.score, 0);
    assert(contract.evidence);
    assert.equal((await readFile(path.join(f.output, "cleanup-exit-code"), "utf8")).trim(), "0");
  } finally { await f.dispose(); }
});

for (const mode of ["health-success", "health-missing-report", "health-late-report", "health-late-repair"]) {
  test(`native health grading and artifact capture: ${mode}`, async () => {
    const f = await fixture(mode);
    try {
      const execute = () => command("bash", ["scripts/trial.sh", f.run.root, f.output, "30"], { env: f.env });
      if (mode === "health-success") await execute();
      else await assert.rejects(execute(), /exited 1/);
      const outcome = await nativeTrial(f);
      const passed = mode === "health-success";
      assert.equal(outcome.gradeResult.passed, passed);
      assert.deepEqual(outcome.gradeResult.details.map(detail => [detail.name, detail.passed]),
        [["startup-endpoint-output", true], ["endpoint-contract", true],
          ["services-health-output", mode !== "health-late-report"], ["preserve-startup-output", true],
          ["services-health", true], ["database-health-output", true],
          ["preserve-startup-and-services", mode !== "health-late-report"], ["database-health", true],
          ["redis-health-output", mode !== "health-missing-report"],
          ["preserve-prior-outputs", mode !== "health-late-repair"],
          ["redis-health", mode !== "health-missing-report"], ["objective-success", true]]);
      assert.deepEqual(outcome.trajectory.turnDiffs.map(record => record.turn), [0, 1, 2, 3]);
      assert.equal(JSON.parse(await readFile(path.join(f.output, "proof.json"))).passed, true);
      assert.match(await compare(f.directory), new RegExp("raw: " + (passed ? "1" : "0") + "/1"));
      const artifacts = (await readdir(f.output, { recursive: true }))
        .filter(file => file.includes("artifacts/") && file.endsWith("-health.json"));
      assert.equal(artifacts.length, mode === "health-missing-report" ? 2 : 3);
      for (const file of artifacts) {
        assert.equal(JSON.parse(await readFile(path.join(f.output, file), "utf8")).healthy, true);
      }
      assert.equal((await readFile(path.join(f.output, "cleanup-exit-code"), "utf8")).trim(), "0");
    } finally { await f.dispose(); }
  });
}

test("shell finalizer cleans and retains failure outcomes even when grading never runs", async () => {
  const f = await fixture("failure");
  try {
    await assert.rejects(command("bash", ["scripts/trial.sh", f.run.root, f.output, "30"], { env: f.env }), /exited 1/);
    assert.equal((await readFile(path.join(f.output, "cleanup-exit-code"), "utf8")).trim(), "0");
    assert.match(await readFile(path.join(f.output, "vally.log"), "utf8"), /offline execution failure/);
    assert.match(await compare(f.directory), /raw: 0\/1/);
  } finally { await f.dispose(); }
});

test("actual host program grader rejects absent application dependencies through native Vally", async () => {
  const f = await fixture("real-grader");
  try {
    await assert.rejects(command("bash", ["scripts/trial.sh", f.run.root, f.output, "30"], { env: f.env }), /exited 1/);
    const proof = JSON.parse(await readFile(path.join(f.output, "proof.json")));
    assert.equal(proof.passed, false);
    assert.match(proof.error, /Exactly one owned postgres/);
    assert.deepEqual((await nativeTrial(f)).gradeResult.details.map(detail => [detail.name, detail.passed]),
      [["endpoint-contract", true], ["objective-success", false]]);
    assert.equal((await readFile(path.join(f.output, "cleanup-exit-code"), "utf8")).trim(), "0");
    assert.match(await compare(f.directory), /raw: 0\/1/);
  } finally { await f.dispose(); }
});

test("outer cleanup failure preserves successful objective evidence but rejects lifecycle success", async () => {
  const f = await fixture("cleanup-failure");
  try {
    await assert.rejects(command("bash", ["scripts/trial.sh", f.run.root, f.output, "30"], { env: f.env }),
      /offline cleanup failure/);
    assert.equal((await readFile(path.join(f.output, "cleanup-exit-code"), "utf8")).trim(), "1");
    assert.equal(JSON.parse(await readFile(path.join(f.output, "proof.json"))).objectivePassed, true);
    assert.match(await compare(f.directory), /raw: 0\/1/);
  } finally { await f.dispose(); }
});

test("setup script resolves native spec and writes no authentication or ambient feature flags", async () => {
  const f = await fixture();
  let root;
  try {
    const output = path.join(f.directory, "setup");
    const result = await command("bash", ["scripts/setup.sh", "--model", "offline",
      "--variants", "raw", "--output", output],
    { env: { ...f.env, COPILOT_GITHUB_TOKEN: "offline-token-not-for-persistence",
      COPILOT_CUSTOM_SETTING: "do-not-inherit" } });
    root = result.stdout.trim();
    const shell = await readFile(path.join(root, "environment.sh"), "utf8");
    const ownership = await readFile(path.join(root, "ownership.json"), "utf8");
    const spec = await readFile(path.join(output, "eval.yaml"), "utf8");
    for (const text of [shell, ownership, spec]) {
      assert(!text.includes("offline-token-not-for-persistence"));
      assert(!text.includes("do-not-inherit"));
      assert(!text.includes("NODE_TLS_REJECT_UNAUTHORIZED"));
    }
    assert.match(shell, /ASPIRE_BENCH_ROOT/);
    assert.match(spec, /type: program/);
    assert.match(spec, /executor: isolated-benchmark/);
    await command("bash", ["scripts/cleanup.sh", root], { env: f.env });
  } finally {
    if (root) await rm(root, { recursive: true });
    await f.dispose();
  }
});

test("shell lifecycle deadline and TERM both clean a trial without a trajectory", async () => {
  for (const interrupt of [false, true]) {
    const f = await fixture("hang");
    try {
      if (!interrupt) {
        await assert.rejects(command("bash", ["scripts/trial.sh", f.run.root, f.output, "2"],
          { env: f.env }), /exited/);
        assert.match(await readFile(path.join(f.output, "timeout.txt"), "utf8"), /deadline/);
      } else {
        const child = spawn("bash", ["scripts/trial.sh", f.run.root, f.output, "30"],
          { env: f.env, cwd: repoRoot, stdio: "ignore" });
        const closed = new Promise(resolve => child.once("close", resolve));
        for (let attempt = 0; attempt < 100; attempt++) {
          try { await readFile(path.join(f.output, "started")); break; }
          catch (error) {
            if (error.code !== "ENOENT") throw error;
            await new Promise(resolve => setTimeout(resolve, 50));
            if (attempt === 99) { child.kill("SIGTERM"); throw new Error("Offline executor did not start"); }
          }
        }
        child.kill("SIGTERM");
        assert.equal(await closed, 143);
      }
      assert.equal((await readFile(path.join(f.output, "cleanup-exit-code"), "utf8")).trim(), "0");
      assert.match(await compare(f.directory), /raw: 0\/1/);
    } finally { await f.dispose(); }
  }
});

test("paid scripts fail before setup without explicit consent, model and supported token", async () => {
  await assert.rejects(command("bash", ["scripts/run.sh"]), /allow-paid/);
  await assert.rejects(command("bash", ["scripts/run.sh", "--allow-paid"]), /model/);
  await assert.rejects(command("bash", ["scripts/run.sh", "--allow-paid", "--model", "offline"],
    { env: { PATH: process.env.PATH } }), /Export COPILOT_GITHUB_TOKEN/);
});
