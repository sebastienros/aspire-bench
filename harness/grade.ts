import assert from "node:assert/strict";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Trajectory } from "@microsoft/vally";
import { applicationAdapter } from "./adapters.js";
import { submittedEndpoints, type Endpoints, type Proof } from "./verify.js";
import { cleanup } from "./ownership.js";
import type { Run } from "./workspace.js";

export async function gradeEndpointContract(run: Run, trajectory: Trajectory) {
  const result = {
    name: "endpoint-contract", kind: "code" as const,
    passed: false, score: 0, evidence: "",
  };
  try {
    assert.equal(trajectory.workDir, run.workDir, "Grader workspace must match host ownership");
    await submittedEndpoints(run);
    result.passed = true;
    result.score = 1;
    result.evidence = "benchmark-endpoints.json contains exactly admin and frontend with distinct loopback HTTP origins";
  } catch (error) {
    result.evidence = error instanceof Error ? error.message : String(error);
  }
  return result;
}

export async function gradeHealthReport(run: Run, trajectory: Trajectory,
  subject: "services" | "database" | "redis") {
  const result = {
    name: `${subject}-health`, kind: "code" as const,
    passed: false, score: 0, evidence: "",
  };
  try {
    assert.equal(trajectory.workDir, run.workDir, "Grader workspace must match host ownership");
    const root = await realpath(run.root);
    const workDir = await realpath(run.workDir);
    assert(workDir.startsWith(root + path.sep), "Health report workspace escapes host ownership");
    const file = path.join(workDir, `benchmark-${subject}-health.json`);
    const stat = await lstat(file);
    assert(stat.isFile(), "Health report must be a regular file, not a symlink");
    assert(stat.size <= 64 * 1024, "Health report exceeds 64 KiB");
    const value: unknown = JSON.parse(await readFile(file, "utf8"));
    assert(value && typeof value === "object" && !Array.isArray(value), "Health report object required");
    const record = value as Record<string, unknown>;
    const state = subject === "services" ? "running" : "ready";
    assert.deepEqual(Object.keys(record).sort(), ["evidence", "healthy", state].sort());
    assert.equal(record[state], true, `Expected ${subject} to be ${state}`);
    assert.equal(record.healthy, true, `Expected ${subject} to be healthy`);
    assert(Array.isArray(record.evidence) && record.evidence.length > 0
      && record.evidence.every(item => typeof item === "string" && item.trim().length > 0),
      "Health report requires a nonempty array of observed checks and results");
    result.passed = true;
    result.score = 1;
    result.evidence = `benchmark-${subject}-health.json reports ${state} and healthy with recorded evidence; live state is independently checked by objective-success`;
  } catch (error) {
    result.evidence = error instanceof Error ? error.message : String(error);
  }
  return result;
}

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
  const mode = process.argv[2];
  assert(mode === undefined || mode === "endpoint-contract" || mode === "health-report", `Unknown grader mode: ${mode}`);
  let result;
  if (mode === "health-report") {
    const subject = process.argv[3];
    assert(subject === "services" || subject === "database" || subject === "redis",
      `Unknown health report subject: ${subject}`);
    result = await gradeHealthReport(run, input.trajectory, subject);
  } else {
    result = mode === "endpoint-contract"
      ? await gradeEndpointContract(run, input.trajectory)
      : await gradeApplication(run, input.trajectory);
  }
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
