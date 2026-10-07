import assert from "node:assert/strict";
import path from "node:path";
import { lstat, readdir } from "node:fs/promises";
import { resolveExperiment, type EnvironmentConfig, type ResolvedRunPlan } from "@microsoft/vally";
import { registry, repoRoot, inside } from "./workspace.js";
import { patchPaths, patchRecords } from "./patch.js";

export function planEnvironment(plan: ResolvedRunPlan): EnvironmentConfig {
  const environment = plan.effectiveSpec.environment;
  assert(environment && typeof environment === "object", "Concrete experiment environment required");
  return environment;
}

export async function validateRawFiles(files: NonNullable<EnvironmentConfig["files"]>, fixture: string) {
  assert.deepEqual(files[0], { src: fixture, dest: "." },
    "Raw variants must start with the registered common app snapshot");
  const assets = path.dirname(fixture);
  const overlays = files.slice(1);
  assert(overlays.length >= 1 && overlays.length <= 2, "Raw requires one README and optional scripts");
  assert.equal(overlays.filter(file => file.dest === "README.md").length, 1,
    "Exactly one raw README overlay is required");
  for (const overlay of overlays) {
    assert(!overlay.dest_root, "Raw overlays must target the workspace");
    const src = path.resolve(overlay.src);
    const isReadme = overlay.dest === "README.md"
      && path.dirname(src) === path.join(assets, "readmes") && path.extname(src) === ".md";
    const isScripts = overlay.dest === "scripts" && src === path.join(assets, "scripts");
    assert(isReadme || isScripts, "Raw overlays must be an application README or lifecycle scripts");
    const item = await lstat(src);
    assert(!item.isSymbolicLink(), "Overlay symlinks are not allowed");
    assert(isReadme ? item.isFile() : item.isDirectory(), "Invalid overlay source type");
    if (isScripts) await cleanSource(src);
  }
}

export async function experiment(application: string, scenario: string) {
  const entry = (await registry()).applications[application];
  assert(entry?.scenarios.includes(scenario), `Unknown ${application}/${scenario}`);
  const file = path.resolve(repoRoot, entry.experiment);
  assert(inside(repoRoot, file), "Experiment path escapes repository");
  const resolved = await resolveExperiment(file);
  assert.equal(resolved.execution.workers, 1, "Local stacks must run serially");
  assert.equal(resolved.baseline, "raw", "Raw must be the control");
  assert.deepEqual([...resolved.variantNames].sort(), Object.keys(entry.variants).sort());
  assert.deepEqual(resolved.vary.filter(axis => axis !== "/environment/commands").sort(),
    ["/environment/files", "/environment/skills", "/environment/mcpServers"].sort(),
    "Only local snapshots, skills, MCP and declared patch setup commands may differ");
  const plans = resolved.plans.filter(plan => plan.effectiveSpec.name === scenario);
  assert.equal(plans.length, resolved.variantNames.length, "One shared eval per variant required");
  for (const plan of plans) {
    const env = planEnvironment(plan);
    assert(plan.effectiveSpec.stimuli.every(stimulus => !stimulus.environment),
      "Stimulus environments must not override the shared experiment treatment");
    assert.equal(plan.effectiveSpec.defaults?.executor, "isolated-benchmark");
    assert.equal(plan.effectiveSpec.defaults?.runs, 1, "The adapter owns repetitions, not hidden native trials");
    assert(!env.git && !Object.keys(env.env ?? {}).length,
      "Local experiment must not clone repositories or inject agent environment");
    await patchRecords(patchPaths(env.commands));
    const config = entry.variants[plan.variant];
    const hasMcp = Object.keys(env.mcpServers ?? {}).length > 0;
    const hasSkills = (env.skills?.length ?? 0) > 0;
    assert(config.kind === "aspire" || (!hasMcp && !hasSkills),
      "The raw snapshot must not receive Aspire skills or MCP");
    const fixture = path.resolve(repoRoot, config.fixture);
    const files = env.files ?? [];
    const expected = [{ src: fixture, dest: "." },
      ...(config.kind === "aspire" && hasMcp
        ? [{ src: path.join(repoRoot, "treatment/mcp.json"), dest: ".github/mcp.json" }] : [])];
    if (config.kind === "aspire") {
      assert.deepEqual(files, expected, "Manifest must stage only the registered snapshot and treatment files");
    } else {
      await validateRawFiles(files, fixture);
    }
    const names = hasSkills
      ? (await readdir(path.join(repoRoot, "treatment/skills"))).sort() : [];
    assert.deepEqual((env.skills ?? []).map(src => path.resolve(src)).sort(),
      names.map(name => path.join(repoRoot, "treatment/skills", name)));
    assert.deepEqual(env.mcpServers ?? {}, hasMcp ? {
      aspire: { type: "stdio", command: "aspire",
        args: ["agent", "mcp", "--non-interactive", "--nologo"] },
    } : {}, "MCP declaration must match the controlled treatment");
    await cleanSource(fixture);
  }

  return { ...resolved, plans };
}

export function selectVariants(names: string[], selection = "raw,aspire") {
  const selected = selection === "all" ? names : selection.split(",").map(name => name.trim());
  assert(selected.length && selected.every(name => names.includes(name)),
    `Unknown variant selection: ${selection}; available: ${names.join(", ")}`);
  assert.equal(new Set(selected).size, selected.length, "Duplicate variants are not allowed");
  return selected;
}

async function cleanSource(directory: string): Promise<void> {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    assert(!item.isSymbolicLink(), `Fixture symlink not allowed: ${directory}/${item.name}`);
    assert(!["bin", "obj", "node_modules", ".aspire", ".script-state", ".env", ".git"].includes(item.name),
      `Generated/private fixture inputs must be removed before staging: ${directory}/${item.name}`);
    if (item.isDirectory()) await cleanSource(path.join(directory, item.name));
  }
}
