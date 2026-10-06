import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CopilotSdkExecutor } from "@microsoft/vally/executor";
import type { Executor, ExecutorOptions, ExecutorRegistry, Stimulus, Trajectory,
  Grader, GraderInput, GraderRegistry, GraderMetadata } from "@microsoft/vally";
import { IsolatedClient } from "./agent.js";
import { cleanup } from "./ownership.js";
import { submittedEndpoints, type Proof, type Endpoints } from "./verify.js";
import { inside, hashes, unchanged, type Run } from "./workspace.js";
import type { TracingConfig } from "@microsoft/vally";
import { applicationAdapter } from "./adapters.js";
import { withFinalizer } from "./lifecycle.js";

const proofs = new Map<string, Proof>();
type Delegate = Executor & { configureTracing?(config: TracingConfig): void };
interface ExecutorDependencies {
  createExecutor?(run: Run): Delegate;
  verify?(run: Run, urls: Endpoints): Promise<Proof>;
  cleanup?(run: Run): Promise<void>;
}

export class BenchmarkExecutor implements Executor {
  name = "isolated-benchmark";
  supportsEnvVars = true;
  private delegate?: Delegate;
  private stopped = false;
  private run?: Run;
  private cleaned = false;
  private tracing?: TracingConfig;

  constructor(private dependencies: ExecutorDependencies = {}) {}

  configureTracing(config: TracingConfig) { this.tracing = config; }

  async execute(stimulus: Stimulus, options: ExecutorOptions): Promise<Trajectory> {
    const ownership = process.env.ASPIRE_BENCH_OWNERSHIP;
    if (!ownership) throw new Error("Use npm run bench -- eval; missing host-owned run context");
    const run: Run = JSON.parse(await readFile(ownership, "utf8"));
    if (!inside(path.join(run.root, "workspaces"), path.resolve(options.workDir))) {
      throw new Error("Vally workspace escapes the host-owned trial root");
    }
    const copyStart = performance.now();
    if (run.nativeStaging) {
      const staged = await hashes(options.workDir);
      if (!unchanged(run.baselineHashes, staged)
        || Object.keys(staged).length !== Object.keys(run.baselineHashes).length) {
        throw new Error("Native Vally staging differs from the controlled local snapshot");
      }
    } else {
      await cp(run.workDir, options.workDir, { recursive: true });
    }
    run.workDir = options.workDir;
    run.setupMs += performance.now() - copyStart;
    await writeFile(ownership, JSON.stringify(run, null, 2), { mode: 0o600 });
    this.run = run;
    let client: IsolatedClient | undefined;
    let captured: Trajectory | undefined;
    let objectiveProof: Proof | undefined;
    let visibilitySetupMs = 0;
    this.stopped = false;
    this.cleaned = false;
    return withFinalizer(async () => {
      this.delegate = this.dependencies.createExecutor?.(run) ?? new CopilotSdkExecutor({
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
      captured = trajectory;
      const setupMs = client?.visibility?.setupMs ?? 0;
      visibilitySetupMs = setupMs;
      trajectory.metrics.wallTimeMs = Math.max(0, trajectory.metrics.wallTimeMs - setupMs);
      trajectory.metadata.skillsLoaded = client?.visibility?.skills ?? [];
      let proof: Proof;
      try {
        proof = await (this.dependencies.verify ?? applicationAdapter(run.adapter).verify)(
          run, await submittedEndpoints(run));
      } catch (error) {
        proof = { passed: false, checks: [], error: error instanceof Error ? error.message : String(error),
          verificationMs: 0 };
      }
      if (trajectory.endReason !== "completed") {
        proof.passed = false;
        proof.error = `Agent ended with ${trajectory.endReason}`;
      }
      objectiveProof = proof;
      proofs.set(trajectory.id, proof);
      await writeFile(path.join(run.root, "proof.json"), JSON.stringify({
        ...proof, setupMs: run.setupMs + setupMs, metrics: trajectory.metrics,
      }, null, 2), { mode: 0o600 });
      return trajectory;
    }, async () => {
      try {
        await this.finish();
      } catch (error) {
        if (!captured || !objectiveProof) throw error;
        const objectivePassed = objectiveProof.passed;
        const cleanupError = error instanceof Error ? error.message : String(error);
        objectiveProof.passed = false;
        objectiveProof.error = `${objectiveProof.error ? `${objectiveProof.error}; ` : ""}Cleanup failed: ${cleanupError}`;
        await writeFile(path.join(run.root, "proof.json"), JSON.stringify({
          ...objectiveProof, objectivePassed, cleanupError,
          setupMs: run.setupMs + visibilitySetupMs, metrics: captured.metrics,
        }, null, 2), { mode: 0o600 });
      }
    });
  }

  private async finish() {
    await withFinalizer(async () => {
      if (this.delegate && !this.stopped) {
        this.stopped = true;
        await this.delegate.shutdown();
      }
    }, async () => {
      if (this.run && !this.cleaned) {
        await (this.dependencies.cleanup ?? cleanup)(this.run);
        this.cleaned = true;
      }
    });
  }

  async shutdown() { await this.finish(); }
}

export class ApplicationReadyGrader implements Grader {
  metadata: GraderMetadata = {
    name: "application-ready", description: "Host-side live application verification",
    behavior: {}, determinism: "complex-static", reference: "reference-free",
    temporalScope: "trajectory-level", costProfile: "free",
  };
  async grade({ trajectory }: GraderInput) {
    const proof = trajectory && proofs.get(trajectory.id);
    if (!proof) throw new Error("Missing host-side verification evidence; cannot grade self-report");
    return {
      name: this.metadata.name, kind: "code" as const, passed: proof.passed,
      score: proof.passed ? 1 : 0,
      evidence: [...proof.checks, ...(proof.error ? [proof.error] : [])].join("; "),
    };
  }
}

export function registerExecutors(registry: ExecutorRegistry) {
  registry.register(new BenchmarkExecutor());
}
export function registerGraders(registry: GraderRegistry) {
  registry.register(new ApplicationReadyGrader());
}
