import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TrajectoryMetrics } from "@microsoft/vally";

export interface Trial {
  variant: string; trial: number; status: string; success: boolean;
  setupMs?: number; verificationMs?: number; metrics?: TrajectoryMetrics; error?: string;
}

export function pairedReport(trials: Trial[], baseline = "raw") {
  const rows = trials.map(trial => `| ${trial.trial} | ${trial.variant} | ${trial.success ? "pass" : "fail"} | ${
    trial.metrics ? (trial.metrics.wallTimeMs / 1000).toFixed(2) : "N/A"} | ${
    trial.metrics?.tokenUsage.totalTokens ?? "N/A"} | ${trial.metrics?.toolCallCount ?? "N/A"} | ${
    trial.metrics?.turnCount ?? "N/A"} |`);
  const variants = [...new Set(trials.map(trial => trial.variant))];
  const summary = variants.map(variant => {
    const selected = trials.filter(trial => trial.variant === variant);
    return `${variant}: ${selected.filter(trial => trial.success).length}/${selected.length} objective successes.`;
  });
  const control = trials.filter(trial => trial.variant === baseline);
  const deltas = variants.filter(variant => variant !== baseline).map(variant => {
    const matched = trials.filter(trial => trial.variant === variant && trial.success && trial.metrics)
      .flatMap(trial => {
        const other = control.find(item => item.trial === trial.trial && item.success && item.metrics);
        return other?.metrics && trial.metrics ? [{ trial: trial.metrics, control: other.metrics }] : [];
      });
    const average = (select: (metrics: TrajectoryMetrics) => number) => matched.length
      ? (matched.reduce((sum, item) => sum + select(item.trial) - select(item.control), 0) / matched.length).toFixed(2)
      : "N/A";
    return `| ${variant} | ${matched.length} | ${average(metrics => metrics.wallTimeMs / 1000)} | ${
      average(metrics => metrics.tokenUsage.totalTokens)} | ${average(metrics => metrics.toolCallCount)} | ${
      average(metrics => metrics.turnCount)} |`;
  });
  const deltaReport = control.length
    ? `\n\nMean deltas versus **${baseline}** (variant minus baseline), using only matched successful repetitions:\n\n` +
      "| Variant | Matched successes | Seconds delta | Tokens delta | Tool calls delta | Turns delta |\n" +
      "|---|---:|---:|---:|---:|---:|\n" + deltas.join("\n")
    : `\n\nBaseline **${baseline}** was not selected; no baseline deltas are reported.`;
  return `# Local launch-and-verify comparison\n\n${summary.join(" ")}\n\n` +
    "| Repetition | Variant | Success | Agent seconds | Tokens | Tool calls | Turns |\n" +
    "|---|---|---|---:|---:|---:|---:|\n" + rows.join("\n") + deltaReport +
    "\n\nTiming excludes fixture preparation, visibility checks, objective grading and cleanup. " +
    "Tokens/tool calls are Vally's normalized SDK metrics; inspect trajectories for missing usage events. " +
    "Failures without trajectories have unavailable metrics, not zero cost. " +
    "This is an agent-effectiveness comparison, not a throughput benchmark. " +
    "Small samples are descriptive, not statistically significant.\n";
}

async function optionalJson(file: string) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return undefined;
  }
}

async function results(directory: string): Promise<Trial[]> {
  const trials: Trial[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const root = path.join(directory, entry.name);
    const workspace = await optionalJson(path.join(root, "workspace.json"));
    if (!workspace) continue;
    const files: string[] = [];
    async function walk(parent: string) {
      for (const item of await readdir(parent, { withFileTypes: true })) {
        const file = path.join(parent, item.name);
        if (item.isDirectory() && item.name !== "session-logs") await walk(file);
        else if (item.name === "results.jsonl") files.push(file);
      }
    }
    await walk(root);
    if (files.length > 1) throw new Error(`Expected one native result file for ${entry.name}`);
    const records = files.length ? (await readFile(files[0], "utf8")).trim().split("\n")
      .filter(Boolean).map(line => JSON.parse(line)).filter(record => record.type === "trial-result") : [];
    if (records.length > 1) throw new Error(`Expected one native trial for ${entry.name}`);
    const outcome = records[0];
    const agent = await optionalJson(path.join(root, "agent.json"));
    const proof = await optionalJson(path.join(root, "proof.json"));
    let lifecyclePassed = false;
    try {
      lifecyclePassed = (await readFile(path.join(root, "exit-code"), "utf8")).trim() === "0"
        && (await readFile(path.join(root, "cleanup-exit-code"), "utf8")).trim() === "0";
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    trials.push({
      variant: workspace.variant, trial: workspace.repetition,
      status: outcome?.status ?? "error",
      success: lifecyclePassed && outcome?.gradeResult?.passed === true && proof?.passed === true,
      metrics: outcome?.trajectory?.metrics ?? agent?.metrics,
      setupMs: agent?.setupMs, verificationMs: proof?.verificationMs,
      error: outcome?.error ?? proof?.error ?? (!lifecyclePassed ? "Incomplete or failed trial lifecycle" : undefined),
    });
  }
  return trials.sort((a, b) => a.trial - b.trial || a.variant.localeCompare(b.variant));
}

export async function compare(directory: string) {
  const metadata = await optionalJson(path.join(directory, "metadata.json"));
  // Legacy runs retain their original outcomes; new runs derive summaries from
  // native JSONL only after the scripts have finished cleanup.
  const trials: Trial[] = metadata?.lifecycle === "scripts"
    ? await results(directory) : await optionalJson(path.join(directory, "paired.json")) ?? [];
  if (!Array.isArray(trials) || !trials.length) throw new Error("No paired results found");
  let baseline = "raw";
  if (metadata?.baseline !== undefined) {
    if (typeof metadata.baseline !== "string") throw new Error("Invalid experiment baseline metadata");
    baseline = metadata.baseline;
  }
  if (metadata?.lifecycle === "scripts") {
    await writeFile(path.join(directory, "paired.json"), JSON.stringify(trials, null, 2));
  }
  const recordedDefinitions = metadata?.variantDefinitions;
  const meanings = recordedDefinitions
    ? "\nVariant definitions recorded at evaluation time:\n\n" +
      Object.entries(recordedDefinitions).map(([name, definition]) =>
        `- **${name}**: \`${JSON.stringify(definition)}\``).join("\n") + "\n"
    : "\nVariant meanings follow this run's recorded harness commit/provenance, " +
      "not the current registry. Before the raw/raw-scripted split, **raw** " +
      "denoted the scripted fixture. At commit 319104f raw had the manual README; " +
      "the current raw has no setup guidance. No lifecycle definitions were recorded for this run.\n";
  const report = pairedReport(trials, baseline) + meanings;
  await writeFile(path.join(directory, "comparison.md"), report);
  return report;
}
