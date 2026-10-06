import assert from "node:assert/strict";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { resolveExperiment, type EnvironmentConfig, type ResolvedRunPlan } from "@microsoft/vally";
import { registry, repoRoot, inside } from "./workspace.js";

export function planEnvironment(plan: ResolvedRunPlan): EnvironmentConfig {
  const environment = plan.effectiveSpec.environment;
  assert(environment && typeof environment === "object", "Concrete experiment environment required");
  return environment;
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
  assert.deepEqual([...resolved.vary].sort(),
    ["/environment/files", "/environment/skills", "/environment/mcpServers"].sort(),
    "Only local snapshots, skills and MCP may differ");
  const plans = resolved.plans.filter(plan => plan.effectiveSpec.name === scenario);
  assert.equal(plans.length, resolved.variantNames.length, "One shared eval per variant required");
  for (const plan of plans) {
    const env = planEnvironment(plan);
    assert(plan.effectiveSpec.stimuli.every(stimulus => !stimulus.environment),
      "Stimulus environments must not override the shared experiment treatment");
    assert.equal(plan.effectiveSpec.defaults?.executor, "isolated-benchmark");
    assert.equal(plan.effectiveSpec.defaults?.runs, 1, "The adapter owns repetitions, not hidden native trials");
    assert(!env.git && !env.commands?.length && !Object.keys(env.env ?? {}).length,
      "Local experiment must not clone repositories or inject setup commands/environment");
    const config = entry.variants[plan.variant];
    const hasMcp = Object.keys(env.mcpServers ?? {}).length > 0;
    const hasSkills = (env.skills?.length ?? 0) > 0;
    assert(config.kind === "aspire" || (!hasMcp && !hasSkills),
      "The raw snapshot must not receive Aspire skills or MCP");
    const fixture = path.resolve(repoRoot, config.fixture);
    const files = env.files ?? [];
    const expected = [{ src: fixture, dest: "." },
      ...(config.kind === "aspire" ? [
        { src: path.join(repoRoot, "treatment/LICENSE"), dest: ".agents/LICENSE" },
        ...(hasMcp ? [{ src: path.join(repoRoot, "treatment/mcp.json"), dest: ".github/mcp.json" }] : []),
      ] : [])];
    assert.deepEqual(files, expected, "Manifest must stage only the registered snapshot and treatment files");
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
