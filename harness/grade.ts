import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Trajectory } from "@microsoft/vally";
import { applicationAdapter } from "./adapters.js";
import { submittedEndpoints, type Endpoints, type Proof } from "./verify.js";
import { cleanup } from "./ownership.js";
import type { Run } from "./workspace.js";

export async function gradeApplication(run: Run, trajectory: Trajectory, dependencies: {
  verify?(run: Run, urls: Endpoints): Promise<Proof>;
  cleanup?(run: Run): Promise<void>;
} = {}) {
  let proof: Proof = { passed: false, checks: [], verificationMs: 0 };
  try {
    assert.equal(trajectory.workDir, run.workDir, "Grader workspace must match host ownership");
    const agent = JSON.parse(await readFile(path.join(run.root, "agent.json"), "utf8"));
    assert.equal(agent.trajectoryId, trajectory.id, "Host executor evidence must match the trajectory");
    assert.equal(trajectory.endReason, "completed", `Agent ended with ${trajectory.endReason}`);
    proof = await (dependencies.verify ?? applicationAdapter(run.adapter).verify)(
      run, await submittedEndpoints(run));
  } catch (error) {
    proof.error = error instanceof Error ? error.message : String(error);
  }
  const objectivePassed = proof.passed;
  let cleanupError: string | undefined;
  try {
    await (dependencies.cleanup ?? cleanup)(run);
  } catch (error) {
    cleanupError = error instanceof Error ? error.message : String(error);
    proof.passed = false;
    proof.error = [proof.error, `Cleanup failed: ${cleanupError}`].filter(Boolean).join("; ");
  }
  await writeFile(path.join(run.root, "proof.json"), JSON.stringify({
    ...proof, objectivePassed, cleanupError, metrics: trajectory.metrics,
  }, null, 2), { mode: 0o600 });
  return {
    name: "objective-success", kind: "code" as const,
    passed: proof.passed, score: proof.passed ? 1 : 0,
    evidence: [...proof.checks, ...(proof.error ? [proof.error] : [])].join("; "),
  };
}

async function main() {
  const ownership = process.env.ASPIRE_BENCH_OWNERSHIP;
  const inputFile = process.env.EVALUATE_GRADER_INPUT;
  if (!ownership || !inputFile) throw new Error("Native Vally program-grader and ownership context required");
  const run: Run = JSON.parse(await readFile(ownership, "utf8"));
  const input = JSON.parse(await readFile(inputFile, "utf8"));
  assert.equal(path.resolve(ownership), path.join(run.root, "ownership.json"));
  assert.equal(process.env.EVALUATE_WORKSPACE, run.workDir, "Native grader workspace must match ownership");
  const result = await gradeApplication(run, input.trajectory);
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
