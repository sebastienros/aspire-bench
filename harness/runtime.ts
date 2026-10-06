import { cp, mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { command } from "./process.js";
import { containers, processSnapshot } from "./ownership.js";
import type { Run } from "./workspace.js";

export async function configureRuntime(run: Run) {
  const started = performance.now();
  await configureAspire(run);
  const plugins: { Name: string; Path: string }[] = JSON.parse(
    (await command("docker", ["info", "--format", "{{json .ClientInfo.Plugins}}"])).stdout);
  const compose = plugins.find(plugin => plugin.Name === "compose");
  if (!compose) throw new Error("Docker Compose plugin is required");
  const endpoint: { Host: string; SkipTLSVerify: boolean } = JSON.parse(
    (await command("docker", ["context", "inspect", "--format", "{{json .Endpoints.docker}}"])).stdout);
  const host = process.env.DOCKER_HOST ?? endpoint.Host;
  if (!host.startsWith("unix://")) throw new Error("Initial harness supports local Unix Docker sockets only");
  const config = path.join(run.home, ".docker");
  await mkdir(path.join(config, "cli-plugins"), { recursive: true });
  await symlink(await realpath(compose.Path), path.join(config, "cli-plugins/docker-compose"));
  run.env.DOCKER_CONFIG = config;
  run.env.DOCKER_HOST = host;
  if ((await containers(run)).length) throw new Error("Run ID already has containers; refusing reuse");
  const volumes = (await command("docker", ["volume", "ls", "--format", "{{.Name}}"])).stdout.split("\n");
  if (volumes.includes(`${run.id}-data`) || volumes.includes(`${run.id}_bingo-postgres-data`)) {
    throw new Error("Run ID already has a data volume; refusing reuse");
  }

  run.initialPids = await processSnapshot();
  run.setupMs += performance.now() - started;
  await writeFile(path.join(run.root, "ownership.json"), JSON.stringify(run, null, 2), { mode: 0o600 });
}

export async function configureAspire(run: Run) {
  if (run.config.kind !== "aspire") return;
  // Script-installed Aspire follows its installation sidecar before ASPIRE_HOME.
  // Copy only the existing executable (never settings or credentials), without that
  // sidecar, so CLI state is rooted in this run's explicit ASPIRE_HOME.
  const executable = (await command("which", ["aspire"])).stdout.trim();
  const directory = path.join(run.home, "bin");
  await mkdir(directory, { recursive: true });
  await cp(await realpath(executable), path.join(directory, "aspire"));
  run.env.PATH = `${directory}${path.delimiter}${process.env.PATH ?? ""}`;
}
