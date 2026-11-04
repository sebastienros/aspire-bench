import { spawn } from "node:child_process";
import { open } from "node:fs/promises";
const active = new Set();
let interrupted = false;
export function interrupt() {
    if (interrupted)
        return;
    interrupted = true;
    for (const child of active) {
        child.kill("SIGTERM");
        setTimeout(() => {
            if (child.exitCode === null && child.signalCode === null)
                child.kill("SIGKILL");
        }, 1500).unref();
    }
}
export function checkInterrupted() {
    if (interrupted)
        throw new Error("Run interrupted; owned resources are being cleaned up");
}
export async function command(program, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(program, args, {
            cwd: options.cwd, env: options.env, stdio: ["ignore", "pipe", "pipe"],
        });
        active.add(child);
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        let escalation;
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
            escalation = setTimeout(() => child.kill("SIGKILL"), 1500);
        }, options.timeout ?? 120_000);
        child.stdout.on("data", chunk => { stdout += chunk; });
        child.stderr.on("data", chunk => { stderr += chunk; });
        child.on("error", error => {
            active.delete(child);
            clearTimeout(timer);
            clearTimeout(escalation);
            reject(error);
        });
        child.on("close", code => {
            active.delete(child);
            clearTimeout(timer);
            clearTimeout(escalation);
            if (timedOut) {
                reject(new Error(`${program} timed out after ${options.timeout ?? 120_000}ms`));
            }
            else if (!(options.accept ?? [0]).includes(code ?? -1)) {
                reject(new Error(`${program} ${args.join(" ")} exited ${code}\n${stderr}\n${stdout}`));
            }
            else {
                resolve({ stdout, stderr, code: code ?? -1, pid: child.pid });
            }
        });
    });
}
export async function launch(program, args, cwd, env, log) {
    const file = await open(log, "w", 0o600);
    try {
        const child = spawn(program, args, { cwd, env, stdio: ["ignore", file.fd, file.fd] });
        active.add(child);
        child.once("close", () => active.delete(child));
        await new Promise((resolve, reject) => {
            child.once("spawn", resolve);
            child.once("error", reject);
        });
        return child;
    }
    finally {
        await file.close();
    }
}
