import { writeFile } from "node:fs/promises";
import path from "node:path";
import { command } from "./process.js";
import { isolatedEnv, type Run } from "./workspace.js";
import { endpoints, verify, type Endpoints, type Proof } from "./verify.js";
import { resourceEndpoints } from "./aspire.js";

export interface ApplicationAdapter {
  launch(run: Run): Promise<void>;
  verify(run: Run, urls: Endpoints): Promise<Proof>;
}

async function launchBingo(run: Run) {
  const env = isolatedEnv(run);
  if (run.config.kind === "compose") {
    const started = await command("bash", ["scripts/start.sh"],
      { cwd: run.workDir, env, timeout: 600_000 });
    await writeFile(path.join(run.root, "startup.log"), started.stdout + started.stderr);
    const urls = endpoints({ admin: `http://localhost:${env.ADMIN_PORT}`,
      frontend: `http://localhost:${env.FRONTEND_PORT}` });
    await writeFile(path.join(run.workDir, "benchmark-endpoints.json"), JSON.stringify(urls));
  } else if (run.config.kind === "aspire") {
    const host = path.join(run.workDir, run.config.apphost!);
    const started = await command("aspire", ["start", "--apphost", host, "--launch-profile", "http",
      "--non-interactive", "--isolated", "--format", "Json", "--nologo"],
    { cwd: run.workDir, env, timeout: 600_000 });
    await writeFile(path.join(run.root, "startup.log"), started.stdout + started.stderr);
    for (const resource of ["boardadmin", "bingoboard"]) {
      await command("aspire", ["wait", resource, "--apphost", host, "--non-interactive",
        "--timeout", "600", "--nologo"], { cwd: run.workDir, env, timeout: 620_000 });
    }
    const described = await command("aspire", ["describe", "--apphost", host,
      "--format", "Json", "--non-interactive", "--nologo"], { cwd: run.workDir, env });
    await writeFile(path.join(run.root, "resources.json"), described.stdout);
    await writeFile(path.join(run.workDir, "benchmark-endpoints.json"),
      JSON.stringify(resourceEndpoints(JSON.parse(described.stdout))));
  } else {
    throw new Error(`Unsupported Bingo infrastructure: ${run.config.kind}`);
  }
}

const adapters: Record<string, ApplicationAdapter> = {
  bingo: { launch: launchBingo, verify },
};

export function applicationAdapter(name: string): ApplicationAdapter {
  const adapter = Object.hasOwn(adapters, name) && adapters[name];
  if (!adapter) throw new Error(`Unsupported application adapter: ${name}`);
  return adapter;
}
