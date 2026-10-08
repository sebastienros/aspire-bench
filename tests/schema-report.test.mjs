import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { loadEvalSpec, validateEvalSpec, createDefaultGraderRegistry } from "@microsoft/vally";
import { pairedReport } from "../dist/report.js";

test("scenario uses the published Vally schema and identical scoring", async () => {
  const spec = await loadEvalSpec("scenarios/health-checks.yaml");
  const registry = createDefaultGraderRegistry();
  const result = validateEvalSpec(spec, { registry });
  assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
  const raw = parse(await readFile("scenarios/health-checks.yaml", "utf8"));
  assert.equal(raw.scoring.threshold, 1);
  assert.equal(raw.stimuli[0].graders[0].required, true);
  assert.equal(raw.stimuli[0].graders[0].type, "diff-contains");
  assert.equal(raw.defaults.executor, "isolated-benchmark");
  assert.equal(raw.stimuli.length, 1);
});

test("comparison deltas use the native baseline and matched successes, not cheap failures", () => {
  const metrics = (wallTimeMs, totalTokens) =>
    ({ wallTimeMs, tokenUsage: { totalTokens }, toolCallCount: 4, turnCount: 2 });
  const report = pairedReport([
    { trial: 1, variant: "raw", success: true, metrics: metrics(2000, 100) },
    { trial: 1, variant: "aspire", success: true, metrics: metrics(1000, 80) },
    { trial: 2, variant: "raw", success: false, metrics: metrics(500, 10) },
    { trial: 2, variant: "aspire", success: true, metrics: metrics(1000, 80) },
  ]);
  assert.match(report, /aspire \| 1 \| -1\.00 \| -20\.00 \| 0\.00 \| 0\.00/);
  assert.match(pairedReport([{ trial: 1, variant: "aspire-none", success: true }]),
    /Baseline \*\*raw\*\* was not selected/);
});

test("paired report represents unavailable costs honestly", () => {
  const report = pairedReport([
    { trial: 1, variant: "raw", status: "error", success: false },
    { trial: 1, variant: "aspire", status: "success", success: true,
      metrics: { wallTimeMs: 1234, tokenUsage: { totalTokens: 123 }, toolCallCount: 4, turnCount: 2 } },
  ]);
  assert.match(report, /raw: 0\/1/);
  assert.match(report, /aspire: 1\/1/);
  assert.match(report, /raw \| fail \| N\/A \| N\/A/);
  assert.match(report, /aspire \| pass \| 1.23 \| 123 \| 4 \| 2/);
});

test("bug variants compare to the corresponding bug control, never healthy raw", () => {
  const metrics = wallTimeMs =>
    ({ wallTimeMs, tokenUsage: { totalTokens: 10 }, toolCallCount: 1, turnCount: 1 });
  const report = pairedReport([
    { trial: 1, variant: "raw", success: true, metrics: metrics(1000) },
    { trial: 1, variant: "raw-bugs", success: true, metrics: metrics(5000) },
    { trial: 1, variant: "aspire-bugs", success: true, metrics: metrics(3000) },
  ]);
  assert.match(report, /versus \*\*raw-bugs\*\*/);
  assert.match(report, /aspire-bugs \| 1 \| -2\.00/);
  assert(!report.includes("aspire-bugs | 1 | 2.00"));
  assert.match(report, /no cross-task deltas/);
  assert.match(pairedReport([
    { trial: 1, variant: "aspire-bugs", success: true, metrics: metrics(3000) },
  ]), /Baseline \*\*raw-bugs\*\* was not selected/);
});
