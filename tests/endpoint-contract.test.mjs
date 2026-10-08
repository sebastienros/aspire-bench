import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadEvalSpec } from "@microsoft/vally";
import { gradeEndpointContract } from "../dist/grade.js";
import { command } from "../dist/process.js";
import { repoRoot } from "../dist/workspace.js";

const valid = { admin: "http://localhost:1234", frontend: "http://localhost:5678" };

test("endpoint contract is a separate required native program grader in the health scenario", async () => {
  for (const name of ["health-checks"]) {
    const spec = await loadEvalSpec(`scenarios/${name}.yaml`);
    assert.deepEqual(spec.stimuli[0].graders.filter(grader =>
      ["endpoint-contract", "objective-success"].includes(grader.name))
      .map(grader => [grader.name, grader.type, grader.required]),
      [["endpoint-contract", "program", true], ["objective-success", "program", true]]);
    assert.match(spec.stimuli[0].graders.find(grader => grader.name === "endpoint-contract")
      .config.args[1], /verify\.sh" endpoint-contract$/);
    assert.equal(spec.scoring.threshold, 1);
  }
});

test("endpoint contract rejects absent/malformed JSON and invalid fields without changing files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aspirebench-endpoints-"));
  const run = { root, workDir: path.join(root, "workspace") };
  await mkdir(run.workDir);
  const trajectory = { workDir: run.workDir };
  const file = path.join(run.workDir, "benchmark-endpoints.json");
  try {
    const missing = await gradeEndpointContract(run, trajectory);
    assert.equal(missing.passed, false);
    assert.match(missing.evidence, /ENOENT/);
    for (const content of [
      "{", "null", "[]",
      JSON.stringify({ admin: valid.admin }),
      JSON.stringify({ ...valid, extra: "unexpected" }),
      JSON.stringify({ ...valid, frontend: 1234 }),
      JSON.stringify({ ...valid, admin: "https://localhost:1234" }),
      JSON.stringify({ ...valid, admin: "http://example.com:1234" }),
      JSON.stringify({ ...valid, admin: "http://user:password@localhost:1234" }),
      JSON.stringify({ ...valid, admin: "http://localhost" }),
      JSON.stringify({ ...valid, admin: "http://localhost:1234/path" }),
      JSON.stringify({ ...valid, frontend: valid.admin }),
    ]) {
      await writeFile(file, content);
      const result = await gradeEndpointContract(run, trajectory);
      assert.equal(result.name, "endpoint-contract");
      assert.equal(result.passed, false, content);
      assert.equal(result.score, 0);
      assert(result.evidence);
      assert.equal(await readFile(file, "utf8"), content);
    }
    await writeFile(file, JSON.stringify(valid));
    const passed = await gradeEndpointContract(run, trajectory);
    assert.equal(passed.passed, true);
    assert.equal(passed.score, 1);
    assert.match(passed.evidence, /exactly admin and frontend/);
    const wrongWorkspace = await gradeEndpointContract(run, { workDir: root });
    assert.equal(wrongWorkspace.passed, false);
    assert.match(wrongWorkspace.evidence, /workspace must match/);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("actual host program reports contract results without launching services or doing objective cleanup", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aspirebench-endpoint-program-"));
  const run = { root, workDir: path.join(root, "workspace") };
  await mkdir(run.workDir);
  const ownership = path.join(root, "ownership.json");
  const input = path.join(root, "input.json");
  const endpoints = path.join(run.workDir, "benchmark-endpoints.json");
  try {
    await writeFile(ownership, JSON.stringify(run));
    await writeFile(input, JSON.stringify({ trajectory: { workDir: run.workDir } }));
    const env = {
      ...process.env, ASPIRE_BENCH_OWNERSHIP: ownership,
      EVALUATE_GRADER_INPUT: input, EVALUATE_WORKSPACE: run.workDir,
    };
    for (const [content, expected] of [[JSON.stringify(valid), true], ["{", false]]) {
      await writeFile(endpoints, content);
      const { stdout } = await command("bash", [path.join(repoRoot, "scripts/verify.sh"), "endpoint-contract"], { env });
      const result = JSON.parse(stdout);
      assert.equal(result.name, "endpoint-contract");
      assert.equal(result.passed, expected);
      assert.equal(result.score, expected ? 1 : 0);
      await assert.rejects(readFile(path.join(root, "proof.json")), /ENOENT/);
      assert.equal(await readFile(endpoints, "utf8"), content);
    }
    await assert.rejects(command("bash", [path.join(repoRoot, "scripts/verify.sh"), "unsupported"], { env }),
      /Unknown grader mode/);
    await assert.rejects(command("bash", [path.join(repoRoot, "scripts/verify.sh"), "endpoint-contract"],
      { env: { ...env, EVALUATE_WORKSPACE: root } }), /workspace must match/);
  } finally {
    await rm(root, { recursive: true });
  }
});
