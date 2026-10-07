import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../", import.meta.url));
const log = new URL("../.script-state/startup.log", import.meta.url);
mkdirSync(new URL("../.script-state/", import.meta.url), { recursive: true });
const file = openSync(log, "w", 0o600);
let child;
try {
  // A new session and file-backed stdio keep the supervisor outside the caller's
  // process group and terminal lifetime. FD 3 is only the readiness handshake.
  child = spawn("bash", ["scripts/start.sh", "--daemon"], {
    cwd: directory, detached: true, stdio: ["ignore", file, file, "pipe"],
  });
} finally {
  closeSync(file);
}

const signals = { SIGINT: 130, SIGTERM: 143 };
const handlers = new Map();
for (const [signal, code] of Object.entries(signals)) {
  const handler = () => {
    process.exitCode = code;
    child.kill(signal);
  };
  handlers.set(signal, handler);
  process.on(signal, handler);
}

try {
  await new Promise((resolve, reject) => {
    let notification = "";
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      process.exitCode ||= code || signals[signal] || 1;
      reject(new Error(`Raw startup exited ${code ?? signal}; see ${fileURLToPath(log)}`));
    });
    child.stdio[3].setEncoding("utf8");
    child.stdio[3].on("data", chunk => {
      notification += chunk;
      if (notification === "ready\n" && !process.exitCode) resolve();
    });
  });
  child.stdio[3].destroy();
  child.unref();
  process.stdout.write(readFileSync(log, "utf8"));
} catch (error) {
  process.stderr.write(readFileSync(log, "utf8"));
  console.error(error.message);
  process.exitCode ||= 1;
} finally {
  for (const [signal, handler] of handlers) process.off(signal, handler);
}
