import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TrajectoryMetrics } from "@microsoft/vally";

export interface Trial {
  variant: string; trial: number; status: string; success: boolean;
  setupMs?: number; verificationMs?: number; metrics?: TrajectoryMetrics; error?: string;
}

export function pairedReport(trials: Trial[]) {
  const rows = trials.map(trial => `| ${trial.trial} | ${trial.variant} | ${trial.success ? "pass" : "fail"} | ${
    trial.metrics ? (trial.metrics.wallTimeMs / 1000).toFixed(2) : "N/A"} | ${
    trial.metrics?.tokenUsage.totalTokens ?? "N/A"} | ${trial.metrics?.toolCallCount ?? "N/A"} | ${
    trial.metrics?.turnCount ?? "N/A"} |`);
  const variants = [...new Set(trials.map(trial => trial.variant))];
  const summary = variants.map(variant => {
    const selected = trials.filter(trial => trial.variant === variant);
    return `${variant}: ${selected.filter(trial => trial.success).length}/${selected.length} objective successes.`;
  });
  return `# Paired launch-and-verify results\n\n${summary.join(" ")}\n\n` +
    "| Pair | Variant | Success | Agent seconds | Tokens | Tool calls | Turns |\n" +
    "|---|---|---|---:|---:|---:|---:|\n" + rows.join("\n") +
    "\n\nTiming excludes fixture preparation, visibility checks, objective grading and cleanup. " +
    "Tokens/tool calls are Vally's normalized SDK metrics; inspect trajectories for missing usage events. " +
    "Failures without trajectories have unavailable metrics, not zero cost. " +
    "This is an agent-effectiveness comparison, not a throughput benchmark. " +
    "Small samples are descriptive, not statistically significant.\n";
}

export async function compare(directory: string) {
  const trials: Trial[] = JSON.parse(await readFile(path.join(directory, "paired.json"), "utf8"));
  if (!Array.isArray(trials) || !trials.length) throw new Error("No paired results found");
  const report = pairedReport(trials);
  await writeFile(path.join(directory, "comparison.md"), report);
  return report;
}
