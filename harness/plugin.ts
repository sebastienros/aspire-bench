import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CopilotSdkExecutor } from "@microsoft/vally/executor";
import type { Executor, ExecutorOptions, ExecutorRegistry, Stimulus, Trajectory,
  TracingConfig } from "@microsoft/vally";
import { IsolatedClient } from "./agent.js";
import { inside, hashes, unchanged, type Run } from "./workspace.js";
import { withFinalizer } from "./lifecycle.js";
import { cleanup } from "./ownership.js";

type Delegate = Executor & { configureTracing?(config: TracingConfig): void };

export class BenchmarkExecutor implements Executor {
  name = "isolated-benchmark";
  supportsEnvVars = true;
  supportsMultiTurn = true;
  supportsTurnCompletion = true;
  private delegate?: Delegate;
  private stopped = false;
  private tracing?: TracingConfig;
  private previousRoot?: string;

  constructor(private createExecutor?: (run: Run) => Delegate) {}

  configureTracing(config: TracingConfig) { this.tracing = config; }

  async execute(stimulus: Stimulus, options: ExecutorOptions): Promise<Trajectory> {
    let ownership = process.env.ASPIRE_BENCH_OWNERSHIP;
    if (!ownership) throw new Error("Missing run context; use bash scripts/run.sh or scripts/setup.sh");
    const contexts = process.env.ASPIRE_BENCH_MODEL_CONTEXTS;
    if (contexts) {
      if (this.previousRoot) {
        try {
          const proof = JSON.parse(await readFile(path.join(this.previousRoot, "proof.json"), "utf8"));
          if (proof.cleanupError) throw new Error("Previous model cleanup failed; refusing another launch");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          const code = (await readFile(path.join(this.previousRoot, "cleanup-exit-code"), "utf8")).trim();
          if (code !== "0") throw new Error("Previous model cleanup failed; refusing another launch");
        }
      }
      const models: { model: string; root: string }[] = JSON.parse(await readFile(contexts, "utf8"));
      const selected = models.find(context => context.model === options.model);
      if (!selected) throw new Error("Native model does not match a prepared runtime");
      ownership = path.join(selected.root, "ownership.json");
      process.env.ASPIRE_BENCH_OWNERSHIP = ownership;
    }
    const run: Run = JSON.parse(await readFile(ownership, "utf8"));
    if (!inside(run.nativeWorkspaceRoot ?? path.join(run.root, "workspaces"), path.resolve(options.workDir))) {
      throw new Error("Vally workspace escapes the host-owned trial root");
    }
    const staged = await hashes(options.workDir);
    if (!unchanged(run.baselineHashes, staged)
      || Object.keys(staged).length !== Object.keys(run.baselineHashes).length) {
      throw new Error("Native Vally staging differs from the controlled local snapshot");
    }
    run.workDir = options.workDir;
    await writeFile(ownership, JSON.stringify(run, null, 2), { mode: 0o600 });
    if (contexts) this.previousRoot = run.root;
    let client: IsolatedClient | undefined;
    this.stopped = false;
    const execute = () => withFinalizer(async () => {
      this.delegate = this.createExecutor?.(run) ?? new CopilotSdkExecutor({
        createClient: (telemetry, onGetTraceContext) =>
          new IsolatedClient(run, { telemetry, onGetTraceContext }),
        createEnvClient: (_env, telemetry, onGetTraceContext) => {
          client = new IsolatedClient(run, { telemetry, onGetTraceContext });
          return client;
        },
      });
      if (this.tracing) this.delegate.configureTracing?.(this.tracing);
      const trajectory = await this.delegate.execute(stimulus, { ...options, env: run.env,
        sessionLog: options.sessionLog ?? { rootDir: path.join(run.root, "session-logs") },
      });
      const visibilityMs = client?.visibility?.setupMs ?? 0;
      trajectory.metrics.wallTimeMs = Math.max(0, trajectory.metrics.wallTimeMs - visibilityMs);
      trajectory.metadata.skillsLoaded = client?.visibility?.skills ?? [];
      await writeFile(path.join(run.root, "agent.json"), JSON.stringify({
        trajectoryId: trajectory.id, endReason: trajectory.endReason,
        setupMs: run.setupMs + visibilityMs, metrics: trajectory.metrics,
      }, null, 2), { mode: 0o600 });
      return trajectory;
    }, () => this.shutdown());
    try { return await execute(); }
    catch (error) {
      if (!contexts) throw error;
      return withFinalizer(async () => { throw error; }, async () => {
        try {
          await cleanup(run);
          await writeFile(path.join(run.root, "cleanup-exit-code"), "0\n");
        } catch (cleanupError) {
          await writeFile(path.join(run.root, "cleanup-exit-code"), "1\n");
          throw cleanupError;
        }
      });
    }
  }

  async shutdown() {
    if (this.delegate && !this.stopped) {
      this.stopped = true;
      await this.delegate.shutdown();
    }
  }
}

export function registerExecutors(registry: ExecutorRegistry) {
  registry.register(new BenchmarkExecutor());
}
