import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { runEval, loadExperimentConfig, resolveExperiment } from "@microsoft/vally";
import { stringify } from "yaml";
import { applyGitPatch, patchPaths, patchRecords } from "../dist/patch.js";
import { prepare, hashes, unchanged, repoRoot } from "../dist/workspace.js";
import { experiment, planEnvironment } from "../dist/experiment.js";
import { BenchmarkExecutor } from "../dist/plugin.js";

function diff(file, before, after) {
  return `diff --git a/${file} b/${file}
--- a/${file}
+++ b/${file}
@@ -1 +1 @@
-${before}
+${after}
`;
}

async function fixture() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "aspirebench-patch-test-")));
  const app = path.join(root, "app");
  await mkdir(app);
  return { root, app, async patch(contents, name = randomUUID() + ".patch") {
    const file = path.join(root, name);
    await writeFile(file, contents);
    return (await patchRecords([file]))[0];
  }, async dispose() { await rm(root, { recursive: true }); } };
}

test("text patches modify/add/delete files only in the copied workspace and apply in order", async () => {
  const f = await fixture();
  try {
    await writeFile(path.join(f.app, "app.txt"), "original\n");
    await applyGitPatch(f.app, await f.patch(diff("app.txt", "original", "changed")));
    await applyGitPatch(f.app, await f.patch(diff("app.txt", "changed", "second")));
    assert.equal(await readFile(path.join(f.app, "app.txt"), "utf8"), "second\n");
    await applyGitPatch(f.app, await f.patch(
      "diff --git a/new.txt b/new.txt\nnew file mode 100644\n--- /dev/null\n+++ b/new.txt\n@@ -0,0 +1 @@\n+new\n"));
    assert.equal(await readFile(path.join(f.app, "new.txt"), "utf8"), "new\n");
    await applyGitPatch(f.app, await f.patch(
      "diff --git a/new.txt b/new.txt\ndeleted file mode 100644\n--- a/new.txt\n+++ /dev/null\n@@ -1 +0,0 @@\n-new\n"));
    await assert.rejects(readFile(path.join(f.app, "new.txt")));
  } finally { await f.dispose(); }
});

test("malformed, nonapplicable or changed patches fail before mutation, with no partial hunks", async () => {
  const f = await fixture();
  try {
    await writeFile(path.join(f.app, "app.txt"), "original\n");
    for (const text of ["not a patch", diff("app.txt", "wrong baseline", "changed"),
      diff("app.txt", "original", "changed") + diff("missing.txt", "missing", "changed")]) {
      await assert.rejects(applyGitPatch(f.app, await f.patch(text)));
      assert.equal(await readFile(path.join(f.app, "app.txt"), "utf8"), "original\n");
    }
    const record = await f.patch(diff("app.txt", "original", "changed"));
    await writeFile(record.path, diff("app.txt", "original", "different"));
    await assert.rejects(applyGitPatch(f.app, record), /changed after preparation/);
    assert.equal(await readFile(path.join(f.app, "app.txt"), "utf8"), "original\n");
  } finally { await f.dispose(); }
});

test("patches reject escaping paths, symlinks, binary data and protected runtime/config targets", async () => {
  const f = await fixture();
  try {
    await writeFile(path.join(f.root, "outside.txt"), "outside\n");
    await symlink(f.root, path.join(f.app, "link"));
    const payloads = [
      diff("../outside.txt", "outside", "hacked"),
      diff("link/outside.txt", "outside", "hacked"),
      "diff --git a/link.txt b/link.txt\nnew file mode 120000\n--- /dev/null\n+++ b/link.txt\n@@ -0,0 +1 @@\n+../outside.txt\n",
      "diff --git a/image.png b/image.png\nBinary files a/image.png and b/image.png differ\n",
      "diff --git a/old.txt b/new.txt\nsimilarity index 100%\nrename from old.txt\nrename to new.txt\n",
      diff(".git/config", "original", "hacked"),
      diff(".github/mcp.json", "original", "hacked"),
      diff("benchmark-endpoints.json", "original", "hacked"),
    ];
    for (const payload of payloads) await assert.rejects(applyGitPatch(f.app, await f.patch(payload)));
    assert.equal(await readFile(path.join(f.root, "outside.txt"), "utf8"), "outside\n");
    const record = await f.patch(diff("a.txt", "before", "after"));
    const link = path.join(f.root, "symlink.patch");
    await symlink(record.path, link);
    await assert.rejects(patchRecords([link]), /regular file/);
  } finally { await f.dispose(); }
});

test("setup accepts only declared patch-helper invocations, not arbitrary shell commands", () => {
  const valid = 'node "$ASPIRE_BENCH_ROOT/dist/patch.js" "$ASPIRE_BENCH_ROOT/apps/bingo/patches/change.patch"';
  assert.deepEqual(patchPaths([valid]), [path.join(repoRoot, "apps/bingo/patches/change.patch")]);
  for (const invalid of [
    "echo hacked", valid + "; echo hacked", valid.replace("change.patch", "$(echo hacked).patch"),
    valid.replace("apps/bingo/patches/change.patch", "../../outside.patch"),
    valid.replace("dist/patch.js", "dist/cli.js"),
  ]) assert.throws(() => patchPaths([invalid]));
});

test("native experiment command axis and setup patch the baseline before any executor/agent runs", async () => {
  await mkdir(path.join(repoRoot, ".runs"), { recursive: true });
  const root = await mkdtemp(path.join(repoRoot, ".runs", "patch-pipeline-test-"));
  const file = path.join(root, "change.patch");
  const relative = path.relative(repoRoot, file);
  const setup = `node "$ASPIRE_BENCH_ROOT/dist/patch.js" "$ASPIRE_BENCH_ROOT/${relative}"`;
  let run;
  const oldRoot = process.env.ASPIRE_BENCH_ROOT;
  const oldOwnership = process.env.ASPIRE_BENCH_OWNERSHIP;
  try {
    const target = "src/bingo-board/package.json";
    const patch = `diff --git a/${target} b/${target}
--- a/${target}
+++ b/${target}
@@ -1,4 +1,4 @@
 {
   "name": "aspirifridays",
-  "version": "1.0.0",
+  "version": "1.0.1",
   "description": "AspiriFridays bingo",
`;
    await writeFile(file, patch);
    const spec = await loadExperimentConfig(path.join(repoRoot, "experiments/bingo.experiment.yaml"));
    spec.evals = [path.join(repoRoot, "scenarios/health-checks.yaml")];
    for (const plan of (await experiment("bingo", "health-checks")).plans) {
      spec.variants[plan.variant].environment = planEnvironment(plan);
    }
    if (!spec.vary.includes("/environment/commands")) spec.vary.push("/environment/commands");
    spec.variants.raw.environment.commands = [setup];
    await writeFile(path.join(root, "experiment.yaml"), stringify(spec));
    const resolved = await resolveExperiment(path.join(root, "experiment.yaml"));
    const plan = resolved.plans.find(item => item.variant === "raw");
    run = await prepare("bingo", "raw", plan);
    assert.equal(run.patches.length, 1);
    assert.equal(run.patches[0].path, file);
    assert.equal(run.patches[0].sha256.length, 64);
    assert.equal(JSON.parse(await readFile(path.join(run.workDir, target))).version, "1.0.1");
    assert.equal(JSON.parse(await readFile(path.join(repoRoot, "apps/bingo/raw", target))).version, "1.0.0");
    assert(unchanged(run.baselineHashes, await hashes(run.workDir)));
    process.env.ASPIRE_BENCH_ROOT = repoRoot;
    process.env.ASPIRE_BENCH_OWNERSHIP = path.join(run.root, "ownership.json");
    let called = false;
    const executor = new BenchmarkExecutor(() => ({
      name: "offline", supportsEnvVars: true,
      async execute(stimulus, options) {
        called = true;
        assert.deepEqual(await hashes(options.workDir), run.baselineHashes);
        assert.equal(JSON.parse(await readFile(path.join(options.workDir, target))).version, "1.0.1");
        await assert.rejects(readFile(path.join(options.workDir, "change.patch")));
        return { id: "offline", stimulus, workDir: options.workDir, output: "offline",
          events: [], endReason: "completed", metadata: { model: "offline", skillsLoaded: [] },
          metrics: { wallTimeMs: 1, tokenUsage: { totalTokens: 0 }, toolCallCount: 0, turnCount: 0 } };
      },
      async shutdown() {},
    }));
    const stimulus = plan.effectiveSpec.stimuli[0];
    const result = await runEval({
      stimulus, prompt: stimulus.prompt, skills: [], executor, workDir: run.workDir,
      workspace: path.join(run.root, "workspaces/patched"), environment: planEnvironment(plan),
      timeout: 10_000, captureWorkspacePatch: true,
    });
    assert(called);
    assert(!result.trajectory.workspacePatch, "Setup patches must not appear as agent-authored edits");
    await result.cleanup();
    await writeFile(file, patch + "\n");
    called = false;
    await assert.rejects(runEval({
      stimulus, prompt: stimulus.prompt, skills: [], executor, workDir: run.workDir,
      workspace: path.join(run.root, "workspaces/changed-input"), environment: planEnvironment(plan),
      timeout: 10_000,
    }), /changed after preparation/);
    assert.equal(called, false);
  } finally {
    if (oldRoot === undefined) delete process.env.ASPIRE_BENCH_ROOT;
    else process.env.ASPIRE_BENCH_ROOT = oldRoot;
    if (oldOwnership === undefined) delete process.env.ASPIRE_BENCH_OWNERSHIP;
    else process.env.ASPIRE_BENCH_OWNERSHIP = oldOwnership;
    if (run) await rm(run.root, { recursive: true });
    await rm(root, { recursive: true });
  }
});
