import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { openDatabase, createApp } from "@microsoft/vally-server";
import { compatibleOutcome, exportVally } from "../dist/export.js";
import { command } from "../dist/process.js";

const metadata = {
  lifecycle: "scripts", app: "bingo", scenario: "launch-and-verify", model: "offline-test",
  baseline: "raw", pairs: 1, startedAt: "2026-10-01T00:00:00Z", commit: "historic-scripted",
  versions: { vally: "0.18.0" },
  variantDefinitions: { raw: { lifecycle: "scripted", files: [{ src: "recorded/readme.md", dest: "README.md" }] } },
};
const metrics = { wallTimeMs: 2000, turnCount: 2, toolCallCount: 4,
  tokenUsage: { inputTokens: 12, outputTokens: 3, totalTokens: 15 } };
const grade = {
  name: "objective-success", kind: "code", passed: true, score: 1, evidence: "Application ready",
  stimulusName: "launch-and-verify", trajectoryId: "offline", timestamp: metadata.startedAt, details: [],
};
const native = {
  type: "trial-result", variant: "main", stimulus: "launch-and-verify", status: "success",
  gradeResult: grade, durationMs: 4000,
  trajectory: { id: "offline", metadata: { model: "offline-test" }, metrics,
    events: [], endReason: "completed", stimulus: { name: "launch-and-verify", prompt: "offline" } },
};
function input(overrides = {}) {
  return { metadata, variant: "raw", repetition: 1, native,
    proof: { passed: true, objectivePassed: true, checks: ["ready"], verificationMs: 42 },
    exitCode: 0, cleanupExitCode: 0, ...overrides };
}
test("compatible native results preserve metrics/events and real variants/repetitions/baselines", () => {
  const result = compatibleOutcome(input({ variant: "raw-scripted-bugs", repetition: 3 }));
  assert.equal(result.variant, "raw-scripted-bugs");
  assert.equal(result.trialIndex, 2);
  assert.equal(result.experiment.variant, "raw-scripted-bugs");
  assert.equal(result.experiment.baseline, "raw-bugs");
  assert.match(result.experiment.name, /bugs\/offline-test\/historic-scr/);
  assert.equal(result.harness.cohort, "bugs");
  assert.equal(result.harness.outcome, "pass");
  assert.deepEqual(result.trajectory, native.trajectory);
  assert.equal(result.gradeResult.passed, true);
  assert.deepEqual(result.harness.missingMetrics, []);
  assert.deepEqual(compatibleOutcome(input()).harness.variantDefinition, metadata.variantDefinitions.raw);
});

test("objective, cleanup, execution and incomplete outcomes cannot become native successes", () => {
  const cases = [
    [input({ proof: { passed: false }, native: { ...native, gradeResult: { ...grade, passed: false, score: 0 } },
      exitCode: 1 }), "objective-fail", "success"],
    [input({ cleanupExitCode: 1 }), "cleanup-fail", "success"],
    [input({ proof: { passed: false, objectivePassed: true, cleanupError: "owned resources remain" } }),
      "cleanup-fail", "success"],
    [input({ native: { status: "error", trajectory: null, gradeResult: null, durationMs: 900000 },
      exitCode: 1, proof: undefined }), "execution-error", "error"],
    [input({ cleanupExitCode: undefined }), "incomplete", "error"],
    [input({ native: undefined, exitCode: undefined, cleanupExitCode: undefined, proof: undefined }),
      "incomplete", "error"],
  ];
  for (const [data, outcome, status] of cases) {
    const result = compatibleOutcome(data);
    assert.equal(result.harness.outcome, outcome);
    assert.equal(result.status, status);
    assert.equal(result.gradeResult.passed, false);
    assert.equal(result.gradeResult.details.at(-1).passed, false);
  }
});

test("missing usage remains absent rather than fabricated and warning is visible in grader evidence", () => {
  const result = compatibleOutcome(input({ native: { status: "error", durationMs: 1234,
    trajectory: null, gradeResult: null }, proof: undefined }));
  assert.equal(result.trajectory, null);
  assert.deepEqual(result.harness.missingMetrics, ["agent time", "tokens", "tool calls", "turns"]);
  assert.match(result.gradeResult.evidence, /NOT zero-cost/);
  assert.equal(result.durationMs, 1234, "Recorded invocation duration is retained, not fabricated agent time");
});

test("historical paired verdicts and recorded definitions are preserved, not reinterpreted", () => {
  const old = { ...metadata, lifecycle: undefined, variantDefinitions: undefined, commit: "006bffd" };
  const result = compatibleOutcome(input({ metadata: old, legacy: { success: false, status: "success" } }));
  assert.equal(result.gradeResult.passed, false, "Native passed grade cannot override original legacy verdict");
  assert.equal(result.harness.variantDefinition, null);
  assert.match(result.gradeResult.evidence, /Historical verdict preserved/);
  const preserved = compatibleOutcome(input({ metadata: old, legacy: { success: true } }));
  assert.equal(preserved.gradeResult.passed, true);
  assert.notEqual(result.experiment.name, compatibleOutcome(input()).experiment.name);
  assert.throws(() => compatibleOutcome(input({ legacy: { success: "true" } })), /Invalid recorded legacy/);
  assert.throws(() => compatibleOutcome(input({ native: { status: "invalid" } })), /Invalid native outcome/);
});

async function fixture(variants = ["raw", "aspire", "raw-bugs", "aspire-bugs"]) {
  const root = await mkdtemp(path.join(tmpdir(), "aspirebench-export-test-"));
  await writeFile(path.join(root, "metadata.json"), JSON.stringify({ ...metadata, variants }));
  for (const variant of variants) {
    const dir = path.join(root, `1-${variant}`);
    await mkdir(path.join(dir, "native"), { recursive: true });
    await writeFile(path.join(dir, "workspace.json"), JSON.stringify({ variant, repetition: 1 }));
    await writeFile(path.join(dir, "native/results.jsonl"), JSON.stringify(native) + "\n");
    await writeFile(path.join(dir, "proof.json"), '{"passed":true,"objectivePassed":true}');
    await writeFile(path.join(dir, "exit-code"), "0");
    await writeFile(path.join(dir, "cleanup-exit-code"), "0");
    await writeFile(path.join(dir, "plan.json"), JSON.stringify({ evalHash: "recorded-eval-hash",
      configHash: "recorded-config-hash", relativeEvalFile: "scenarios/launch-and-verify.yaml" }));
  }
  return root;
}

test("whole run exports load in native Vally serve APIs with cohort identities, preserving source files", async () => {
  const root = await fixture();
  const db = openDatabase(":memory:");
  try {
    const original = await readFile(path.join(root, "1-raw/native/results.jsonl"), "utf8");
    const output = await exportVally(root);
    assert.equal(await exportVally(root), output, "Same snapshot is idempotent");
    assert.equal(await readFile(path.join(root, "1-raw/native/results.jsonl"), "utf8"), original);
    const imported = await db.ingestDirectory(output);
    assert.equal(imported.length, 4);
    const summaries = await db.dataSource.listOutcomes();
    assert.deepEqual(summaries.items.map(o => o.variant).sort(), ["aspire", "aspire-bugs", "raw", "raw-bugs"]);
    assert(summaries.items.every(o => o.passed && o.toolCallCount === 4 && o.inputTokens === 12));
    assert.equal(new Set(summaries.items.map(o => o.experimentRunId)).size, 2);
    for (const outcome of summaries.items) {
      assert.equal(outcome.baseline, outcome.variant.endsWith("-bugs") ? "raw-bugs" : "raw");
      assert.equal(outcome.evalHash, "recorded-eval-hash");
      assert.equal(outcome.configHash, "recorded-config-hash");
    }
    const app = createApp(db.dataSource);
    const response = await app.request("http://127.0.0.1/api/outcomes?variant=aspire-bugs",
      { headers: { Host: "127.0.0.1" } });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].variant, "aspire-bugs");
    const dashboard = await app.request("http://127.0.0.1/", { headers: { Host: "127.0.0.1" } });
    assert.equal(dashboard.status, 200);
    await writeFile(path.join(root, "1-raw/cleanup-exit-code"), "1");
    const revised = await exportVally(root);
    assert.notEqual(output, revised);
    const failure = JSON.parse(await readFile(path.join(revised, "raw/results.jsonl"), "utf8"));
    assert.equal(failure.gradeResult.passed, false);
    assert.equal(failure.harness.outcome, "cleanup-fail");
    assert.equal(JSON.parse(await readFile(path.join(output, "raw/results.jsonl"))).gradeResult.passed, true,
      "Earlier immutable export remains unchanged");
  } finally { db.close(); await rm(root, { recursive: true }); }
});

test("unfinished selected trials export as incomplete, malformed inputs fail explicitly", async () => {
  const root = await fixture(["raw"]);
  try {
    await writeFile(path.join(root, "metadata.json"), JSON.stringify({ ...metadata, variants: ["raw", "aspire"] }));
    const output = await exportVally(root);
    const pending = JSON.parse(await readFile(path.join(output, "aspire/results.jsonl")));
    assert.equal(pending.harness.outcome, "incomplete");
    assert.equal(pending.trajectory, null);
    await writeFile(path.join(root, "1-raw/native/results.jsonl"), '{"type":"trial-result"');
    await assert.rejects(exportVally(root), /Malformed native results/);
  } finally { await rm(root, { recursive: true }); }
});

test("CLI exports existing runs and reporting automatically publishes a native snapshot", async () => {
  const root = await fixture(["raw", "aspire"]);
  try {
    const cli = await command(process.execPath, ["dist/cli.js", "export-vally", root]);
    const output = cli.stdout.trim();
    assert.equal(output, await exportVally(root));
    const report = await command("bash", ["scripts/report.sh", root]);
    assert.match(report.stdout, /Native Vally dashboard export/);
    assert(report.stdout.includes(output));
    const summary = JSON.parse(await readFile(path.join(root, "paired.json")));
    assert.equal(summary.length, 2);
    assert(summary.every(item => item.success));
    assert.equal(await exportVally(root), output, "Modern derived paired.json does not alter native snapshot identity");
  } finally { await rm(root, { recursive: true }); }
});

test("multiple recorded histories import into one native database without relabeling legacy verdicts", async () => {
  const recent = await fixture(["raw", "aspire"]);
  const old = await fixture(["raw", "aspire"]);
  const db = openDatabase(":memory:");
  try {
    await writeFile(path.join(old, "metadata.json"), JSON.stringify({
      ...metadata, lifecycle: undefined, variantDefinitions: undefined, model: "old-model", commit: "006bffd",
    }));
    await writeFile(path.join(old, "paired.json"), JSON.stringify([
      { variant: "raw", trial: 1, success: false, status: "error" },
      { variant: "aspire", trial: 1, success: false, status: "success",
        error: "Original cleanup observer defect" },
    ]));
    const originals = await readFile(path.join(old, "paired.json"), "utf8");
    await db.ingestDirectory(await exportVally(recent));
    const historical = await exportVally(old);
    await db.ingestDirectory(historical);
    const outcomes = (await db.dataSource.listOutcomes()).items;
    assert.equal(outcomes.length, 4);
    assert.equal(new Set(outcomes.map(o => o.experimentRunId)).size, 2);
    assert.equal(outcomes.filter(o => o.passed).length, 2);
    assert.equal(await readFile(path.join(old, "paired.json"), "utf8"), originals);
    const exported = JSON.parse(await readFile(path.join(historical, "aspire/results.jsonl")));
    assert.equal(exported.harness.outcome, "objective-fail");
    assert.equal(exported.harness.variantDefinition, null);
    assert.equal(exported.error, "Original cleanup observer defect");
    assert.match(exported.gradeResult.evidence, /006bffd/);
    await rm(path.join(old, "paired.json"));
    await assert.rejects(exportVally(old), /original paired.json/);
  } finally {
    db.close();
    await rm(recent, { recursive: true });
    await rm(old, { recursive: true });
  }
});

test("export rejects unsafe identities, symlink escapes and modified snapshots", async () => {
  const root = await fixture(["raw"]);
  const other = await mkdtemp(path.join(tmpdir(), "aspirebench-export-outside-"));
  try {
    const output = await exportVally(root);
    await writeFile(path.join(output, "raw/results.jsonl"), "modified\n");
    await assert.rejects(exportVally(root), /modified/);
    await rm(path.join(root, "1-raw/proof.json"));
    await writeFile(path.join(other, "secret.json"), '{"secret":"not-to-be-read"}');
    await symlink(path.join(other, "secret.json"), path.join(root, "1-raw/proof.json"));
    await assert.rejects(exportVally(root), /regular file|symlink/);
    await rm(path.join(root, "1-raw/proof.json"));
    await writeFile(path.join(root, "1-raw/workspace.json"), '{"variant":"../escape","repetition":1}');
    await assert.rejects(exportVally(root), /Invalid recorded variant/);
    assert.deepEqual(await readdir(other), ["secret.json"]);
  } finally { await rm(root, { recursive: true }); await rm(other, { recursive: true }); }
});
