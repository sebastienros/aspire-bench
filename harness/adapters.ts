import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { command } from "./process.js";
import { isolatedEnv, repoRoot, type Run } from "./workspace.js";
import { endpoints, verify, type Endpoints, type Proof } from "./verify.js";
import { resourceEndpoints } from "./aspire.js";

export interface ApplicationAdapter {
  launch(run: Run): Promise<void>;
  verify(run: Run, urls: Endpoints): Promise<Proof>;
}

export async function manualBingoCommands(run: Run, phase: "start" | "stop") {
  if (run.adapter !== "bingo" || run.config.lifecycle !== "manual") {
    throw new Error("Manual README commands require the manual Bingo fixture");
  }
  // Reference commands are host-only for smoke, including the unguided raw cell.
  // Evaluation setup never calls this function or exposes this guide to raw.
  const readme = await readFile(path.join(repoRoot, "apps/bingo/readmes/raw-documented.md"), "utf8");
  const sections = readme.split("## Stop only this stack");
  if (sections.length !== 2) throw new Error("Manual README stop section changed");
  const steps = sections[phase === "start" ? 0 : 1].matchAll(/```bash\n([\s\S]*?)```/g);
  const commands = [...steps].map(match => match[1]);
  if (commands.length !== (phase === "start" ? 7 : 1)) {
    throw new Error("Manual README smoke contract changed");
  }
  const result = await command("bash", ["-euc", commands.join("\n")],
    { cwd: run.workDir, env: isolatedEnv(run), timeout: 600_000 });
  await writeFile(path.join(run.root, phase === "start" ? "startup.log" : "manual-stop.log"),
    result.stdout + result.stderr);
}

async function launchBingo(run: Run) {
  const env = isolatedEnv(run);
  if (run.config.kind === "compose") {
    if (run.config.lifecycle === "manual") {
      // Smoke executes the documented commands, without staging a launcher.
      return manualBingoCommands(run, "start");
    }
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
