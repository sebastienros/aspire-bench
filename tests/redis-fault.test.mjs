import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { prepare, hashes, repoRoot } from "../dist/workspace.js";
import { verifyInputs } from "../dist/verify.js";
import { experiment } from "../dist/experiment.js";

test("only bug variants receive the same Redis fault; their healthy counterparts differ only by setup", async () => {
  const resolved = await experiment("bingo", "launch-and-verify");
  assert(resolved.vary.includes("/environment/commands"));
  for (const plan of resolved.plans) {
    const base = plan.variant.replace(/-bugs$/, "");
    if (base === plan.variant) {
      const run = await prepare("bingo", base, plan);
      try {
        assert.deepEqual(run.patches, []);
        assert.deepEqual(run.repairFiles, {});
        verifyInputs(run, run.baselineHashes);
      } finally { await rm(run.root, { recursive: true }); }
      continue;
    }
    const healthy = resolved.plans.find(item => item.variant === base).effectiveSpec.environment;
    const { commands, ...environment } = plan.effectiveSpec.environment;
    assert.deepEqual(environment, healthy);
    assert.equal(commands.length, 1);
    const run = await prepare("bingo", plan.variant, plan);
    try {
      const file = run.config.kind === "compose" ? "compose.yaml" : "apphost.cs";
      assert.deepEqual(Object.keys(run.repairFiles), [file]);
      assert.equal(run.patches.length, 1);
      const staged = await readFile(path.join(run.workDir, file), "utf8");
      assert.match(staged, /--maxmemroy/);
      assert.match(staged, /64mb/);
      assert(!Object.keys(run.baselineHashes).some(name => name.endsWith(".patch")));
      const original = await readFile(path.join(repoRoot, run.config.fixture, file), "utf8");
      assert(!original.includes("--maxmemroy"));
      assert.throws(() => verifyInputs(run, run.baselineHashes), /must be repaired/);
      await writeFile(path.join(run.workDir, file), staged.replace("--maxmemroy", "--maxmemory"));
      verifyInputs(run, await hashes(run.workDir));
      await writeFile(path.join(run.workDir, file), original);
      verifyInputs(run, await hashes(run.workDir));
      const bad = { ...await hashes(run.workDir), "README.md": "tampered" };
      assert.throws(() => verifyInputs(run, bad), /outside startup repair/);
      const missing = await hashes(run.workDir);
      delete missing[file];
      assert.throws(() => verifyInputs(run, missing), /must be repaired/);
    } finally { await rm(run.root, { recursive: true }); }
  }
});

test("shared scenario stays succinct and requires startup investigation without technology hints", async () => {
  const prompt = (await experiment("bingo", "launch-and-verify")).plans[0].effectiveSpec.stimuli[0].prompt;
  assert.match(prompt, /Start the application/);
  assert.match(prompt, /all its services are up and working/);
  assert.match(prompt, /Investigate and fix any startup problems/);
  assert.match(prompt, /Leave the application running/);
  assert.match(prompt, /benchmark-endpoints.json/);
  assert(prompt.trim().split(/\s+/).length <= 60, "Prompt must remain minimal");
  assert(!/aspire|apphost|compose|redis|postgres|signalr|migration|seeding|readme|logs|configuration|maxmemroy|maxmemory|64mb/i.test(prompt));
});
