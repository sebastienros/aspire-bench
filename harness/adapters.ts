import { writeFile } from "node:fs/promises";
import path from "node:path";
import { command, launch, checkInterrupted } from "./process.js";
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
    const child = await launch("bash", ["scripts/start.sh"], run.workDir, env,
      path.join(run.root, "startup.log"));
    const urls = endpoints({ admin: `http://localhost:${env.ADMIN_PORT}`,
      frontend: `http://localhost:${env.FRONTEND_PORT}` });
    await writeFile(path.join(run.workDir, "benchmark-endpoints.json"), JSON.stringify(urls));
    const deadline = Date.now() + 600_000;
    while (true) {
      checkInterrupted();
      if (child.exitCode !== null) throw new Error(`Raw launcher exited ${child.exitCode}; see ${run.root}/startup.log`);
      const ready = await command("curl", ["--fail", "--silent", "--max-time", "2",
        `${urls.frontend}/api/version-info`], { accept: [0, 7, 22, 28, 52, 56] });
      if (ready.code === 0) break;
      if (Date.now() >= deadline) throw new Error(`Raw startup timed out; see ${run.root}/startup.log`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
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
