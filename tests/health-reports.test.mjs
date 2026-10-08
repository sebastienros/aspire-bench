import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDefaultGraderRegistry, gradeTrajectory, loadEvalSpec } from "@microsoft/vally";

for (const subject of ["services", "database", "redis"]) {
  test(`native custom-metrics grades the ${subject} report without services or inference`, async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aspirebench-health-report-"));
    const workDir = path.join(root, "workspace");
    const artifactDir = path.join(root, "artifacts");
    await mkdir(workDir);
    await mkdir(artifactDir);
    const spec = await loadEvalSpec("scenarios/health-checks.yaml");
    const stimulus = spec.stimuli[0];
    const config = stimulus.graders.find(grader => grader.name === `${subject}-health`);
    const registry = createDefaultGraderRegistry();
    const trajectory = {
      id: "offline-health", workDir, stimulus, events: [], output: "Not used as proof",
      metadata: { model: "offline" }, metrics: { wallTimeMs: 0 },
    };
    const grade = (value = trajectory) => gradeTrajectory(value, [config], { registry, stimulus });
    const file = path.join(workDir, `benchmark-${subject}-health.json`);
    const state = subject === "services" ? "running" : "ready";
    const valid = { [state]: true, healthy: true, evidence: "Observed live health check succeeded" };
    try {
      assert.equal(config.type, "custom-metrics");
      assert.equal(config.required, true);
      assert.equal(config.turn, undefined, "Workspace metrics are evaluated after the conversation");
      const missing = await grade();
      assert.equal(missing.passed, false);
      assert.match(missing.details[0].evidence, /not found/);
      for (const content of [
        "{", "null", "[]",
        JSON.stringify({ [state]: true, evidence: valid.evidence }),
        JSON.stringify({ healthy: true, evidence: valid.evidence }),
        JSON.stringify({ ...valid, [state]: false }),
        JSON.stringify({ ...valid, healthy: false }),
        JSON.stringify({ ...valid, [state]: "true" }),
        JSON.stringify({ ...valid, evidence: "" }),
        JSON.stringify({ ...valid, evidence: " \n\t" }),
        JSON.stringify({ ...valid, evidence: 1 }),
        JSON.stringify({ ...valid, evidence: ["Old array schema"] }),
      ]) {
        await writeFile(file, content);
        const result = await grade();
        assert.equal(result.details[0].name, `${subject}-health`);
        assert.equal(result.passed, false, content);
        assert(result.score < 1, "Partial assertion credit cannot pass the required grader");
        assert(result.details[0].evidence);
        assert.equal(await readFile(file, "utf8"), content);
      }
      for (const report of [valid, { ...valid, extra: "Native metrics permit additional keys" },
        { values: valid, schema: 1 }]) {
        await writeFile(file, JSON.stringify(report));
        const result = await grade();
        assert.equal(result.passed, true, JSON.stringify(result));
        assert.equal(result.score, 1);
        assert.deepEqual(result.details[0].details.map(detail => detail.passed), [true, true, true]);
      }
      const artifact = path.join(artifactDir, path.basename(file));
      await writeFile(artifact, JSON.stringify(valid));
      await rm(workDir, { recursive: true });
      const offline = { ...trajectory, artifactDir, artifactDirStrict: true };
      assert.equal((await grade(offline)).passed, true, "Native grader supports artifacts after workspace cleanup");
      await mkdir(workDir);
      await writeFile(file, JSON.stringify(valid));
      await writeFile(artifact, "{");
      assert.equal((await grade({ ...trajectory, artifactDir })).passed, false,
        "Malformed artifacts cannot fall back to valid workspace files");
      await rm(artifact);
      assert.equal((await grade({ ...trajectory, artifactDir })).passed, true);
      assert.equal((await grade(offline)).passed, false,
        "A strict artifact root cannot fall back to the workspace");
    } finally {
      await rm(root, { recursive: true });
    }
  });
}
