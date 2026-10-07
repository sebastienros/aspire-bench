import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { prepare, isolatedEnv } from "../dist/workspace.js";
import { command } from "../dist/process.js";
import { cleanup, ownedProcesses } from "../dist/ownership.js";
import { applicationAdapter } from "../dist/adapters.js";

async function fixture(mode = "success") {
  const run = await prepare("bingo", "raw-scripted");
  const bin = path.join(run.root, "bin");
  const events = path.join(run.root, "events");
  const resource = path.join(run.root, "container");
  const service = path.join(run.root, "service.mjs");
  await mkdir(bin);
  const vite = path.join(run.workDir, "src/bingo-board/node_modules/vite");
  await mkdir(path.join(vite, "bin"), { recursive: true });
  await writeFile(path.join(vite, "package.json"), '{"type":"module"}');
  await writeFile(service, `
    import {createServer} from "node:http";
    import {appendFileSync} from "node:fs";
    const name = process.argv[2];
    appendFileSync(process.env.FAKE_EVENTS, name + "\\n");
    if (name === "admin" && process.env.FAKE_MODE === "admin-failure") process.exit(8);
    const server = createServer((req, res) => {
      if (req.url === "/login" && process.env.FAKE_MODE.includes("check-failure")) res.statusCode = 500;
      res.end(JSON.stringify(req.url.startsWith("/bingohub")
        ? {connectionToken:"test", availableTransports:[{transport:"WebSockets"}]}
        : {dotNetVersion:"test", aspireVersion:"not configured"}));
    });
    server.listen(Number(process.env[name === "admin" ? "ADMIN_PORT" : "FRONTEND_PORT"]), "127.0.0.1");
    process.on("SIGTERM", () => server.close(() => process.exit()));
  `);
  await writeFile(path.join(vite, "bin/vite.js"),
    `process.argv[2] = "frontend"; await import(${JSON.stringify(service)});`);
  await writeFile(path.join(bin, "npm"), "#!/usr/bin/env bash\nexit 0\n", { mode: 0o700 });
  await writeFile(path.join(bin, "sleep"), "#!/usr/bin/env bash\n/bin/sleep 0.05\n", { mode: 0o700 });
  await writeFile(path.join(bin, "dotnet"), `#!/usr/bin/env bash
set -eu
if [[ "$1" == build ]]; then
    echo build >> "$FAKE_EVENTS"
    [[ "$FAKE_MODE" != build-failure ]] || exit 4
elif [[ "$1" == *MigrationService.dll ]]; then
    echo migration >> "$FAKE_EVENTS"
    [[ "$FAKE_MODE" != migration-failure ]] || exit 6
    if [[ "$FAKE_MODE" == startup-interrupt ]]; then /bin/sleep 1; fi
else
    exec ${JSON.stringify(process.execPath)} ${JSON.stringify(service)} admin
fi
`, { mode: 0o700 });
  await writeFile(path.join(bin, "docker"), `#!/usr/bin/env bash
set -eu
if [[ "$1" != compose ]]; then exit 0; fi
shift
if [[ "$1" == version ]]; then exit 0; fi
shift 4
case "$1" in
    up)
        echo "$COMPOSE_PROJECT_NAME up" >> "$FAKE_EVENTS"
        touch "$FAKE_RESOURCE"
        [[ "$FAKE_MODE" != compose-failure ]] || exit 7
        ;;
    stop)
        echo "$COMPOSE_PROJECT_NAME stop" >> "$FAKE_EVENTS"
        [[ "$FAKE_MODE" != cleanup-check-failure ]] || exit 9
        rm -f "$FAKE_RESOURCE"
        ;;
    exec)
        case "$4" in
            redis-cli) echo PONG ;;
            psql) echo t ;;
        esac
        ;;
esac
`, { mode: 0o700 });
  const env = { ...isolatedEnv(run), PATH: `${bin}:${process.env.PATH}`,
    FAKE_MODE: mode, FAKE_EVENTS: events, FAKE_RESOURCE: resource };
  run.env = { ...run.env, ...env };
  async function clean() {
    const previous = process.env.PATH;
    process.env.PATH = env.PATH;
    try { await cleanup(run); }
    finally { process.env.PATH = previous; }
  }
  return { run, env, events, resource, clean, async dispose() {
    await clean();
    await rm(run.root, { recursive: true });
  } };
}

async function reachable(f) {
  for (const port of [f.env.ADMIN_PORT, f.env.FRONTEND_PORT]) {
    assert.equal((await fetch(`http://localhost:${port}/api/version-info`)).status, 200);
  }
}

test("raw startup returns after every check and survives launching process-group teardown", { timeout: 30_000 }, async () => {
  const f = await fixture();
  const caller = spawn(process.execPath, ["--input-type=module", "-e", `
    import {spawn} from "node:child_process";
    const child = spawn("bash", ["scripts/start.sh"], {stdio:["ignore","pipe","pipe"]});
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on("close", code => {
      console.log("launcher-closed:" + code);
      if(code) process.exit(code);
      setInterval(() => {}, 1000);
    });
  `], { cwd: f.run.workDir, env: f.env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  caller.stdout.on("data", chunk => { output += chunk; });
  caller.stderr.on("data", chunk => { output += chunk; });
  const closed = new Promise(resolve => caller.once("close", resolve));
  try {
    for (let attempt = 0; !output.includes("launcher-closed:0"); attempt++) {
      assert(attempt < 200, output || "Launcher did not return");
      await delay(50);
    }
    assert.equal((output.match(/OK:/g) ?? []).length, 8);
    assert.match(await readFile(f.events, "utf8"), /build\n.* up\nmigration\nadmin\nfrontend\n/);
    await reachable(f);
    process.kill(-caller.pid, "SIGTERM");
    await closed;
    await reachable(f);
    const owned = await ownedProcesses(f.run);
    assert(owned.length >= 3, "Detached supervisor and both services remain host-owned");
    await f.clean();
    assert.deepEqual(await ownedProcesses(f.run), []);
    await assert.rejects(readFile(f.resource), { code: "ENOENT" });
  } finally {
    if (caller.exitCode === null && caller.signalCode === null) process.kill(-caller.pid, "SIGTERM");
    await closed;
    await f.dispose();
  }
});

test("smoke adapter uses the readiness-returning raw entrypoint and cleanup is isolated", { timeout: 30_000 }, async () => {
  const first = await fixture();
  const neighbor = await fixture();
  try {
    await applicationAdapter("bingo").launch(first.run);
    await command("bash", ["scripts/start.sh"], { cwd: neighbor.run.workDir, env: neighbor.env, timeout: 10_000 });
    const urls = JSON.parse(await readFile(path.join(first.run.workDir, "benchmark-endpoints.json")));
    assert.equal(urls.admin, `http://localhost:${first.env.ADMIN_PORT}`);
    assert.equal(urls.frontend, `http://localhost:${first.env.FRONTEND_PORT}`);
    await reachable(first);
    await first.clean();
    await reachable(neighbor);
    assert.deepEqual(await ownedProcesses(first.run), []);
    assert((await ownedProcesses(neighbor.run)).length >= 3);
    assert.match(await readFile(first.events, "utf8"), new RegExp(`${first.run.id} stop`));
    assert(!String(await readFile(neighbor.events)).includes("stop"));
  } finally {
    await first.dispose();
    await neighbor.dispose();
  }
});

test("startup failures propagate and clean only resources that were started", { timeout: 30_000 }, async () => {
  for (const [mode, code] of [["build-failure", 4], ["compose-failure", 7],
    ["migration-failure", 6], ["admin-failure", 1], ["check-failure", 1],
    ["cleanup-check-failure", 1]]) {
    const f = await fixture(mode);
    try {
      await assert.rejects(command("bash", ["scripts/start.sh"], {
        cwd: f.run.workDir, env: f.env, timeout: 10_000,
      }), new RegExp(`exited ${code}`));
      assert.deepEqual(await ownedProcesses(f.run), [], mode);
      const events = await readFile(f.events, "utf8");
      assert.equal(events.includes("stop"), mode !== "build-failure", mode);
      if (mode === "cleanup-check-failure") {
        assert.match(await readFile(path.join(f.run.workDir, ".script-state/startup.log"), "utf8"),
          /Container cleanup failed/);
      } else {
        await assert.rejects(readFile(f.resource), { code: "ENOENT" });
      }
    } finally { await f.dispose(); }
  }
});

test("port conflicts do not stop unrelated services or start containers", { timeout: 10_000 }, async () => {
  const f = await fixture();
  const server = createServer(socket => { socket.resume(); socket.end(); });
  await new Promise(resolve => server.listen(Number(f.env.ADMIN_PORT), "127.0.0.1", resolve));
  try {
    await assert.rejects(command("bash", ["scripts/start.sh"], {
      cwd: f.run.workDir, env: f.env, timeout: 5_000,
    }), /already in use/);
    assert(server.listening);
    await assert.rejects(readFile(f.events), { code: "ENOENT" });
    assert.deepEqual(await ownedProcesses(f.run), []);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await f.dispose();
  }
});

test("foreground mode remains attached and TERM stops its owned stack", { timeout: 15_000 }, async () => {
  const f = await fixture();
  const child = spawn("bash", ["scripts/start.sh", "--foreground"],
    { cwd: f.run.workDir, env: f.env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const closed = new Promise(resolve => child.once("close", resolve));
  try {
    for (let attempt = 0; !output.includes("Press Ctrl+C"); attempt++) {
      assert(attempt < 150, output);
      await delay(50);
    }
    assert.equal(child.exitCode, null);
    await reachable(f);
    child.kill("SIGTERM");
    assert.equal(await closed, 143);
    assert.deepEqual(await ownedProcesses(f.run), []);
    await assert.rejects(readFile(f.resource), { code: "ENOENT" });
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    await closed;
    await f.dispose();
  }
});

test("TERM during detached startup returns failure after partial-resource cleanup", { timeout: 15_000 }, async () => {
  const f = await fixture("startup-interrupt");
  const child = spawn("bash", ["scripts/start.sh"],
    { cwd: f.run.workDir, env: f.env, stdio: "ignore" });
  const closed = new Promise(resolve => child.once("close", resolve));
  try {
    for (let attempt = 0; ; attempt++) {
      const events = await readFile(f.events, "utf8").catch(error => {
        if (error.code !== "ENOENT") throw error;
        return "";
      });
      if (events.includes("migration")) break;
      assert(attempt < 100, "Migration did not start");
      await delay(25);
    }
    child.kill("SIGTERM");
    assert.equal(await closed, 143);
    assert.deepEqual(await ownedProcesses(f.run), []);
    await assert.rejects(readFile(f.resource), { code: "ENOENT" });
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    await closed;
    await f.dispose();
  }
});

test("detached supervisor cleans the stack if a service exits after readiness", { timeout: 15_000 }, async () => {
  const f = await fixture();
  try {
    await command("bash", ["scripts/start.sh"], { cwd: f.run.workDir, env: f.env, timeout: 10_000 });
    const listeners = await command("lsof", ["-nP", `-iTCP:${f.env.ADMIN_PORT}`, "-sTCP:LISTEN", "-Fp"]);
    const pid = Number(listeners.stdout.split("\n").find(line => line.startsWith("p")).slice(1));
    assert((await ownedProcesses(f.run)).includes(pid));
    process.kill(pid, "SIGTERM");
    for (let attempt = 0; ; attempt++) {
      try { await readFile(f.resource); }
      catch (error) {
        if (error.code !== "ENOENT") throw error;
        break;
      }
      assert(attempt < 100, "Supervisor did not stop containers");
      await delay(25);
    }
    assert.deepEqual(await ownedProcesses(f.run), []);
    assert.match(await readFile(path.join(f.run.workDir, ".script-state/startup.log"), "utf8"),
      /application process exited unexpectedly/);
  } finally { await f.dispose(); }
});
