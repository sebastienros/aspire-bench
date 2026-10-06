import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { realpath } from "node:fs/promises";
import { command } from "./process.js";
import { inside, isolatedEnv, type Run } from "./workspace.js";

export interface Container {
  Id: string;
  Name: string;
  Config: { Labels: Record<string, string> | null };
  NetworkSettings: { Ports: Record<string, { HostPort: string }[] | null> };
}

export function ownsContainer(run: Pick<Run, "id" | "config">, container: Container) {
  return run.config.kind === "compose"
    ? container.Config.Labels?.["com.docker.compose.project"] === run.id
    : [`/${run.id}-postgres`, `/${run.id}-redis`].includes(container.Name);
}

export async function containers(run: Run): Promise<Container[]> {
  const names = run.config.kind === "compose"
    ? ["--filter", `label=com.docker.compose.project=${run.id}`]
    : ["--filter", `name=^/${run.id}-(postgres|redis)$`];
  const ids = (await command("docker", ["ps", "-aq", ...names])).stdout.trim().split(/\s+/).filter(Boolean);
  if (ids.length === 0) return [];
  const inspected: Container[] = JSON.parse((await command("docker", ["inspect", ...ids])).stdout);
  if (!inspected.every(item => ownsContainer(run, item))) throw new Error("Container ownership mismatch");
  return inspected;
}

export async function processSnapshot() {
  return (await command("ps", ["-axo", "pid="])).stdout.trim().split(/\s+/).map(Number);
}

export async function ownedProcesses(run: Run) {
  // Only newly created processes whose kernel-reported cwd is inside our copied tree.
  // Agent-writable PID files are never used as cleanup authority.
  const result = await command("lsof", ["-n", "-d", "cwd", "-Fpn"], { accept: [0, 1] });
  const root = await realpath(run.root);
  return ownedCwds(root, run.initialPids, result.stdout, process.pid, result.pid);
}

export function ownedCwds(root: string, initialPids: number[], output: string,
  currentPid: number, observerPid?: number) {
  let pid = 0;
  const pids: number[] = [];
  for (const line of output.split("\n")) {
    if (line.startsWith("p")) pid = Number(line.slice(1));
    if (line.startsWith("n") && pid !== currentPid && pid !== observerPid && !initialPids.includes(pid)) {
      const cwd = line.slice(1);
      if (cwd === root || inside(root, cwd)) pids.push(pid);
    }
  }
  return [...new Set(pids)];
}

export async function cleanup(run: Run) {
  const errors: Error[] = [];
  async function attempt(action: () => Promise<void>) {
    try { await action(); }
    catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
  }
  if (run.config.kind === "aspire") {
    await attempt(async () => {
      // "No running AppHost" is an expected no-op; all other failures are reported.
      const stopped = await command("aspire", ["stop", "--apphost",
        path.join(run.workDir, run.config.apphost!), "--non-interactive", "--nologo"],
      { cwd: run.workDir, env: isolatedEnv(run), timeout: 120_000, accept: [0, 1] });
      if (stopped.code !== 0 && !/no running|not running|could not find.*running/i.test(
        stopped.stdout + stopped.stderr)) throw new Error(stopped.stdout + stopped.stderr);
    });
  }
  await attempt(async () => {
    for (const pid of await ownedProcesses(run)) {
      try { process.kill(pid, "SIGTERM"); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      }
    }
    await delay(1500);
    for (const pid of await ownedProcesses(run)) {
      try { process.kill(pid, "SIGKILL"); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      }
    }
  });
  await attempt(async () => {
    for (const container of await containers(run)) {
      await attempt(async () => { await command("docker", ["rm", "-f", container.Id]); });
    }
  });
  await attempt(async () => {
    const volumes = (await command("docker", ["volume", "ls", "--format", "{{.Name}}"])).stdout
      .trim().split("\n").filter(name => name === `${run.id}-data` || name === `${run.id}_bingo-postgres-data`);
    for (const name of volumes) {
      await attempt(async () => { await command("docker", ["volume", "rm", name]); });
    }
  });
  await attempt(async () => {
    const networks = (await command("docker", ["network", "ls", "-q", "--filter",
      `label=com.docker.compose.project=${run.id}`])).stdout.trim().split(/\s+/).filter(Boolean);
    for (const id of networks) {
      await attempt(async () => { await command("docker", ["network", "rm", id]); });
    }
  });
  await attempt(async () => {
    if ((await containers(run)).length || (await ownedProcesses(run)).length) {
      throw new Error("Owned runtime resources remain after cleanup");
    }
  });
  if (errors.length) throw new AggregateError(errors, `Cleanup failed for ${run.id}: ${
    errors.map(error => error.message).join("; ")}`);
}
