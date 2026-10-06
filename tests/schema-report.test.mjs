import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { loadEvalSpec, validateEvalSpec, createGraderRegistry } from "@microsoft/vally";
import { registerGraders } from "../dist/plugin.js";
import { pairedReport } from "../dist/report.js";

test("scenario uses the published Vally schema and identical scoring", async () => {
  const spec = await loadEvalSpec("scenarios/launch-and-verify.yaml");
  const registry = createGraderRegistry();
  registerGraders(registry);
  const result = validateEvalSpec(spec, { registry });
  assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
  const raw = parse(await readFile("scenarios/launch-and-verify.yaml", "utf8"));
  assert.equal(raw.scoring.threshold, 1);
  assert.equal(raw.stimuli[0].graders[0].required, true);
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
