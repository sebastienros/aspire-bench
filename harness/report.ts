import { readFile, writeFile } from "node:fs/promises";
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

export async function compare(directory: string) {
  const trials: Trial[] = JSON.parse(await readFile(path.join(directory, "paired.json"), "utf8"));
  if (!Array.isArray(trials) || !trials.length) throw new Error("No paired results found");
  let baseline = "raw";
  try {
    const metadata = JSON.parse(await readFile(path.join(directory, "metadata.json"), "utf8"));
    if (metadata.baseline !== undefined) {
      if (typeof metadata.baseline !== "string") throw new Error("Invalid experiment baseline metadata");
      baseline = metadata.baseline;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const report = pairedReport(trials, baseline);
  await writeFile(path.join(directory, "comparison.md"), report);
  return report;
}
