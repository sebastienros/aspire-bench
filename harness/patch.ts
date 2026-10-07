import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { command } from "./process.js";
import { inside, repoRoot, type Run } from "./workspace.js";

export interface PatchRecord { path: string; sha256: string }

export function patchPaths(commands: string[] = []): string[] {
  return commands.map(value => {
    const match = /^node "\$ASPIRE_BENCH_ROOT\/dist\/patch\.js" "\$ASPIRE_BENCH_ROOT\/([A-Za-z0-9_./-]+\.(?:patch|diff))"$/.exec(value);
    assert(match, 'Setup commands must use node "$ASPIRE_BENCH_ROOT/dist/patch.js" "$ASPIRE_BENCH_ROOT/PATH.patch"');
    const file = path.resolve(repoRoot, match[1]);
    assert(inside(repoRoot, file), "Patch input escapes the repository");
    return file;
  });
}

export async function patchRecords(files: string[]): Promise<PatchRecord[]> {
  return Promise.all(files.map(async file => {
    const stat = await lstat(file);
    assert(stat.isFile() && !stat.isSymbolicLink(), "Patch input must be a regular file");
    assert.equal(await realpath(file), path.resolve(file), "Patch input must not traverse symlinks");
    return { path: file, sha256: createHash("sha256").update(await readFile(file)).digest("hex") };
  }));
}

export async function applyGitPatch(workDir: string, record: PatchRecord) {
  const [actual] = await patchRecords([record.path]);
  assert.equal(actual.sha256, record.sha256, `Patch changed after preparation: ${record.path}`);
  const cwd = await realpath(workDir);
  const env = {
    PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
    GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CEILING_DIRECTORIES: path.dirname(cwd),
  };
  const git = (args: string[]) => command("git", ["apply", ...args, record.path], { cwd, env });
  const summary = (await git(["--summary"])).stdout;
  assert(!/\b(?:120000|160000)\b/.test(summary), "Patches must not create symlinks or submodules");
  assert(!/^\s*(?:rename|copy)\s/m.test(summary), "Rename/copy patches are not supported");
  const numstat = (await git(["--numstat", "-z"])).stdout;
  const entries = numstat.split("\0").filter(Boolean);
  assert(entries.length, "Patch must contain file changes");
  for (const entry of entries) {
    const match = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(entry);
    assert(match, "Unsupported patch path format");
    assert(match[1] !== "-" && match[2] !== "-", "Only text patches are supported");
    const name = match[3];
    const target = path.resolve(cwd, name);
    assert(inside(cwd, target), `Patch target escapes workspace: ${name}`);
    assert(!name.split(/[\\/]/).some(segment => [
      ".git", ".aspire", ".agents", ".github", "node_modules", "bin", "obj",
      ".script-state", ".manual-state", "benchmark-endpoints.json",
    ].includes(segment)), `Patch targets protected configuration/runtime state: ${name}`);
    for (let parent = target; inside(cwd, parent); parent = path.dirname(parent)) {
      try { assert(!(await lstat(parent)).isSymbolicLink(), `Patch target traverses a symlink: ${name}`); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }
  await git(["--check"]);
  await git([]);
}

async function main() {
  assert.equal(process.argv.length, 3, "Usage: node dist/patch.js PATCH_FILE");
  const ownership = process.env.ASPIRE_BENCH_OWNERSHIP;
  assert(ownership, "Patch setup requires a host-owned benchmark workspace");
  const run: Run = JSON.parse(await readFile(ownership, "utf8"));
  assert.equal(path.resolve(ownership), path.join(run.root, "ownership.json"));
  const cwd = await realpath(process.cwd());
  assert(cwd === run.workDir || inside(path.join(run.root, "workspaces"), cwd),
    "Patch setup must run in the owned application workspace");
  const record = run.patches?.find(item => item.path === path.resolve(process.argv[2]));
  assert(record, "Patch input was not declared and fingerprinted during preparation");
  await applyGitPatch(cwd, record);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
