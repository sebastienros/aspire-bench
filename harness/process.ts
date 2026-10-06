import { spawn } from "node:child_process";
import { open } from "node:fs/promises";
import type { ChildProcess } from "node:child_process";

const active = new Set<ChildProcess>();
let interrupted = false;
export function interrupt() {
  if (interrupted) return;
  interrupted = true;
  for (const child of active) {
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }, 1500).unref();
  }
}
export function checkInterrupted() {
  if (interrupted) throw new Error("Run interrupted; owned resources are being cleaned up");
}

export interface CommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
  accept?: number[];
}

export async function command(program: string, args: string[], options: CommandOptions = {}) {
  return new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
    const child = spawn(program, args, {
      cwd: options.cwd, env: options.env, stdio: ["ignore", "pipe", "pipe"],
    });
    active.add(child);
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let escalation: NodeJS.Timeout | undefined;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      escalation = setTimeout(() => child.kill("SIGKILL"), 1500);
    }, options.timeout ?? 120_000);
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => {
      active.delete(child); clearTimeout(timer); clearTimeout(escalation); reject(error);
    });
    child.on("close", code => {
      active.delete(child);
      clearTimeout(timer);
      clearTimeout(escalation);
      if (timedOut) {
        reject(new Error(`${program} timed out after ${options.timeout ?? 120_000}ms`));
      } else if (!(options.accept ?? [0]).includes(code ?? -1)) {
        reject(new Error(`${program} ${args.join(" ")} exited ${code}\n${stderr}\n${stdout}`));
      } else {
        resolve({ stdout, stderr, code: code ?? -1 });
      }
    });
  });
}

export async function launch(program: string, args: string[], cwd: string,
  env: NodeJS.ProcessEnv, log: string) {
  const file = await open(log, "w", 0o600);
  try {
    const child = spawn(program, args, { cwd, env, stdio: ["ignore", file.fd, file.fd] });
    active.add(child);
    child.once("close", () => active.delete(child));
    await new Promise<void>((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    return child;
  } finally {
    await file.close();
  }
}
