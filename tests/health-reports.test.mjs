import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gradeHealthReport } from "../dist/grade.js";
import { command } from "../dist/process.js";
import { repoRoot } from "../dist/workspace.js";

for (const subject of ["services", "database", "redis"]) {
  test(`${subject} report has an independent strict grade, without services or inference`, async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aspirebench-health-report-"));
    const run = { root, workDir: path.join(root, "workspace") };
    await mkdir(run.workDir);
    const trajectory = { workDir: run.workDir };
    const file = path.join(run.workDir, `benchmark-${subject}-health.json`);
    const state = subject === "services" ? "running" : "ready";
    const valid = { [state]: true, healthy: true, evidence: ["Observed live health check succeeded"] };
    try {
      const missing = await gradeHealthReport(run, trajectory, subject);
      assert.equal(missing.passed, false);
      assert.match(missing.evidence, /ENOENT/);
      for (const content of [
        "{", "null", "[]",
        JSON.stringify({ [state]: true, evidence: valid.evidence }),
        JSON.stringify({ healthy: true, evidence: valid.evidence }),
        JSON.stringify({ ...valid, extra: "unexpected" }),
        JSON.stringify({ ...valid, [state]: false }),
        JSON.stringify({ ...valid, healthy: false }),
        JSON.stringify({ ...valid, [state]: "true" }),
        JSON.stringify({ ...valid, evidence: [] }),
        JSON.stringify({ ...valid, evidence: [" "] }),
        JSON.stringify({ ...valid, evidence: [1] }),
        JSON.stringify({ ...valid, evidence: "not an array" }),
      ]) {
        await writeFile(file, content);
        const result = await gradeHealthReport(run, trajectory, subject);
        assert.equal(result.name, `${subject}-health`);
        assert.equal(result.passed, false, content);
        assert.equal(result.score, 0);
        assert(result.evidence);
        assert.equal(await readFile(file, "utf8"), content);
      }
      await writeFile(file, JSON.stringify(valid));
      const passed = await gradeHealthReport(run, trajectory, subject);
      assert.equal(passed.passed, true);
      assert.equal(passed.score, 1);
      assert.match(passed.evidence, /live state is independently checked/);
      const wrong = await gradeHealthReport(run, { workDir: root }, subject);
      assert.equal(wrong.passed, false);
      assert.match(wrong.evidence, /workspace must match/);
      await writeFile(file, " ".repeat(65_537));
      assert.match((await gradeHealthReport(run, trajectory, subject)).evidence, /exceeds 64 KiB/);
      await rm(file);
      const target = path.join(root, "foreign.json");
      await writeFile(target, JSON.stringify(valid));
      await symlink(target, file);
      assert.match((await gradeHealthReport(run, trajectory, subject)).evidence, /regular file/);
      await rm(file);
      await writeFile(file, JSON.stringify(valid));
      const ownership = path.join(root, "ownership.json");
      const input = path.join(root, "input.json");
      await writeFile(ownership, JSON.stringify(run));
      await writeFile(input, JSON.stringify({ trajectory }));
      const env = { ...process.env, ASPIRE_BENCH_OWNERSHIP: ownership,
        EVALUATE_GRADER_INPUT: input, EVALUATE_WORKSPACE: run.workDir };
      const result = await command("bash", [path.join(repoRoot, "scripts/verify.sh"), "health-report", subject], { env });
      assert.equal(JSON.parse(result.stdout).passed, true);
      await assert.rejects(command("bash", [path.join(repoRoot, "scripts/verify.sh"), "health-report", "unknown"], { env }),
        /Unknown health report subject/);
      await assert.rejects(readFile(path.join(root, "proof.json")), /ENOENT/);
    } finally {
      await rm(root, { recursive: true });
    }
  });
}
