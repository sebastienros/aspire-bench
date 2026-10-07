import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { prepare, hashes, repoRoot } from "../dist/workspace.js";
import { sessionConfig } from "../dist/agent.js";
import { compare } from "../dist/report.js";
import { command } from "../dist/process.js";
import { validateRawFiles } from "../dist/experiment.js";

test("manual raw stages only licensed unchanged app/build files and README, never management scripts", async () => {
  const manual = await prepare("bingo", "raw-documented");
  const scripted = await prepare("bingo", "raw-scripted");
  try {
    assert.equal(manual.config.lifecycle, "manual");
    assert.equal(scripted.config.lifecycle, undefined);
    const staged = await hashes(manual.workDir);
    const original = await hashes(scripted.workDir);
    const expected = Object.fromEntries(Object.entries(original).filter(([name]) =>
      name !== "README.md" && !name.startsWith("scripts/")));
    assert.deepEqual(Object.fromEntries(Object.entries(staged).filter(([name]) => name !== "README.md")),
      expected, "Only guidance and absence of lifecycle scripts distinguish raw snapshots");
    const files = Object.keys(staged);
    assert(files.every(name => !/\.(sh|ps1|bat|cmd)$/.test(name)));
    assert(files.every(name => !/(^|\/)(scripts|harness|apps|\.agents|\.github)(\/|$)/.test(name)));
    assert(files.every(name => !/(^|\/)(start|stop|check|clean|common|launch)\.(mjs|js|cs)$/.test(name)));
    for (const name of ["scripts", "apphost.cs", "src/BingoBoard.ServiceDefaults", "ownership.json",
      "environment.sh", "raw-scripted", "aspire", ".agents", ".github/mcp.json"]) {
      await assert.rejects(access(path.join(manual.workDir, name)));
    }
    await access(path.join(scripted.workDir, "scripts/start.sh"));
    const config = sessionConfig(manual, {});
    assert.equal(config.enableSkills, false);
    assert.equal(config.enableConfigDiscovery, false);
    assert.deepEqual(config.mcpServers, {});
    assert.deepEqual(config.skillDirectories, []);
    const packageJson = JSON.parse(await readFile(path.join(manual.workDir, "src/bingo-board/package.json")));
    assert.deepEqual(packageJson.scripts, { dev: "vite", build: "vite build", preview: "vite preview" });
    const readme = await readFile(path.join(manual.workDir, "README.md"), "utf8");
    assert.equal([...readme.split("## Stop only this stack")[0].matchAll(/```bash\n([\s\S]*?)```/g)].length, 7);
    assert.match(readme, /nohup bash/);
    assert.match(readme, /benchmark-endpoints.json/);
    assert.match(readme, /leave the stack running/);
    assert.match(readme, /lsof -a -p/);
  } finally {
    await rm(manual.root, { recursive: true });
    await rm(scripted.root, { recursive: true });
  }
});

test("three raw cells compose the same source snapshot with only their declared README/script overlays", async () => {
  const runs = await Promise.all(["raw", "raw-documented", "raw-scripted"].map(name => prepare("bingo", name)));
  try {
    const readmes = [];
    const core = [];
    for (const run of runs) {
      assert.equal(run.config.fixture, "apps/bingo/raw");
      assert.equal(run.environment.files[0].src, path.join(repoRoot, "apps/bingo/raw"));
      assert.equal(run.environment.files[1].src, path.join(repoRoot, `apps/bingo/readmes/${run.variant}.md`));
      assert.equal(run.environment.files[1].dest, "README.md");
      const content = await hashes(run.workDir);
      core.push(Object.fromEntries(Object.entries(content).filter(([name]) =>
        name !== "README.md" && !name.startsWith("scripts/"))));
      readmes.push(await readFile(path.join(run.workDir, "README.md"), "utf8"));
      assert.equal(run.environment.files.length, run.variant === "raw-scripted" ? 3 : 2);
      if (run.variant === "raw-scripted") {
        assert.equal(run.environment.files[2].dest, "scripts");
        await access(path.join(run.workDir, "scripts/start.sh"));
      } else {
        await assert.rejects(access(path.join(run.workDir, "scripts")));
      }
      for (const name of ["readmes", "raw-documented.md", "raw-scripted", "harness", "apps", ".agents"]) {
        await assert.rejects(access(path.join(run.workDir, name)));
      }
      const config = sessionConfig(run, {});
      assert.equal(config.enableSkills, false);
      assert.deepEqual(config.mcpServers, {});
    }
    assert.deepEqual(core[0], core[1]);
    assert.deepEqual(core[0], core[2]);
    assert.equal(new Set(readmes).size, 3);
    assert(!readmes[0].includes("```"), "Unguided raw README contains no setup commands");
    assert(!/dotnet|compose|npm|nohup|benchmark-endpoints|migration|start|stop/i.test(readmes[0]));
    assert.match(readmes[1], /nohup bash/);
    assert.match(readmes[2], /scripts\/start.sh/);
    await assert.rejects(access(path.join(repoRoot, "apps/bingo/raw/README.md")));
    await assert.rejects(access(path.join(repoRoot, "apps/bingo/raw-scripted")));
  } finally {
    for (const run of runs) await rm(run.root, { recursive: true });
  }
});

test("raw file composition rejects sibling snapshots, host files, missing/duplicate guides and unsafe destinations", async () => {
  const fixture = path.join(repoRoot, "apps/bingo/raw");
  const base = { src: fixture, dest: "." };
  const readme = { src: path.join(repoRoot, "apps/bingo/readmes/raw.md"), dest: "README.md" };
  const scripts = { src: path.join(repoRoot, "apps/bingo/scripts"), dest: "scripts" };
  await validateRawFiles([base, readme], fixture);
  await validateRawFiles([base, readme, scripts], fixture);
  for (const files of [
    [base], [base, scripts], [base, readme, readme],
    [{ ...base, src: path.join(repoRoot, "apps/bingo/aspire") }, readme],
    [base, { src: path.join(repoRoot, "README.md"), dest: "README.md" }],
    [base, readme, { src: path.join(repoRoot, "harness"), dest: "scripts" }],
    [base, { ...readme, dest: "../README.md" }],
    [base, { ...readme, dest_root: "assets" }],
    [base, readme, { ...scripts, dest: "hidden" }],
  ]) await assert.rejects(validateRawFiles(files, fixture));
});

test("manual stop guidance refuses a recycled/unrelated PID without sending signals or stopping Compose", async () => {
  const run = await prepare("bingo", "raw-documented");
  const bin = path.join(run.root, "bin");
  try {
    await mkdir(bin);
    await mkdir(path.join(run.workDir, ".manual-state"));
    await writeFile(path.join(run.workDir, ".manual-state/admin.pid"), "999999");
    await writeFile(path.join(bin, "lsof"), "#!/usr/bin/env bash\nprintf 'n/tmp/unrelated\\n'\n", { mode: 0o700 });
    await writeFile(path.join(bin, "docker"), "#!/usr/bin/env bash\necho 'Unsafe Compose stop' >&2; exit 99\n",
      { mode: 0o700 });
    const readme = await readFile(path.join(run.workDir, "README.md"), "utf8");
    const stop = [...readme.split("## Stop only this stack")[1].matchAll(/```bash\n([\s\S]*?)```/g)][0][1];
    await assert.rejects(command("bash", ["-euc", stop], {
      cwd: run.workDir, env: { ...process.env, ...run.env, PATH: `${bin}:${process.env.PATH}` },
    }), error => error.message.includes("Refusing to stop unverified PID")
      && !error.message.includes("Unsafe Compose stop"));
  } finally { await rm(run.root, { recursive: true }); }
});

test("historical raw reports do not resolve meanings from the current manual registry or rewrite original outcomes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "aspirebench-history-test-"));
  try {
    const original = JSON.stringify([{ variant: "raw", trial: 1, status: "error", success: false }]);
    const metadata = JSON.stringify({ baseline: "raw", commit: "historic-scripted-harness" });
    await writeFile(path.join(directory, "paired.json"), original);
    await writeFile(path.join(directory, "metadata.json"), metadata);
    const report = await compare(directory);
    assert.match(report, /Before the raw\/raw-scripted split, \*\*raw\*\* denoted the scripted fixture/);
    assert.equal(await readFile(path.join(directory, "paired.json"), "utf8"), original);
    assert.equal(await readFile(path.join(directory, "metadata.json"), "utf8"), metadata);
    await writeFile(path.join(directory, "metadata.json"), JSON.stringify({
      baseline: "raw", variantDefinitions: { raw: { fixture: "apps/bingo/raw", kind: "compose", lifecycle: "manual" } },
    }));
    assert.match(await compare(directory), /"lifecycle":"manual"/);
    assert.equal(await readFile(path.join(directory, "paired.json"), "utf8"), original);
  } finally { await rm(directory, { recursive: true }); }
});
