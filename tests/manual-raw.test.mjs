import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { prepare, hashes } from "../dist/workspace.js";
import { sessionConfig } from "../dist/agent.js";
import { compare } from "../dist/report.js";
import { command } from "../dist/process.js";

test("manual raw stages only licensed unchanged app/build files and README, never management scripts", async () => {
  const manual = await prepare("bingo", "raw");
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

test("manual stop guidance refuses a recycled/unrelated PID without sending signals or stopping Compose", async () => {
  const run = await prepare("bingo", "raw");
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
