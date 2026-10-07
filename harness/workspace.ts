import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { applyEnvironment, type EnvironmentConfig, type ResolvedRunPlan } from "@microsoft/vally";
import { createHash, randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PatchRecord } from "./patch.js";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export type Variant = {
  fixture: string; kind: "compose" | "aspire"; apphost?: string; lifecycle?: "manual";
};
export type Application = {
  description: string; adapter: string; experiment: string; variants: Record<string, Variant>; scenarios: string[];
};
export type Registry = { schemaVersion: number; applications: Record<string, Application> };
export interface Run {
  id: string;
  root: string;
  workDir: string;
  home: string;
  variant: string;
  application: string;
  adapter: string;
  config: Variant;
  env: Record<string, string>;
  baselineHashes: Record<string, string>;
  initialPids: number[];
  setupMs: number;
  environment?: EnvironmentConfig;
  skillNames?: string[];
  nativeStaging?: boolean;
  patches?: PatchRecord[];
}

export async function registry(): Promise<Registry> {
  const value: Registry = JSON.parse(await readFile(path.join(repoRoot, "apps/registry.json"), "utf8"));
  if (value.schemaVersion !== 1) throw new Error("Unsupported application registry version");
  return value;
}

export function inside(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

async function port() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Cannot allocate port");
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port.toString();
}

export async function hashes(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function walk(directory: string) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (["node_modules", "bin", "obj", ".aspire", ".script-state", ".git"].includes(item.name)) continue;
      const file = path.join(directory, item.name);
      if (item.isSymbolicLink()) throw new Error(`Unexpected symlink in fixture: ${file}`);
      if (item.isDirectory()) await walk(file);
      else if (item.isFile() && item.name !== "benchmark-endpoints.json") {
        result[path.relative(root, file)] = createHash("sha256").update(await readFile(file)).digest("hex");
      }
    }
  }
  await walk(root);
  return result;
}

export function unchanged(before: Record<string, string>, after: Record<string, string>) {
  return Object.entries(before).every(([file, digest]) => after[file] === digest);
}

export function stagedConfig(config: Variant, environment: EnvironmentConfig): Variant {
  return config.kind === "compose"
    ? { ...config, lifecycle: environment.files?.some(file => file.dest === "scripts") ? undefined : "manual" }
    : config;
}

export async function prepare(application: string, variant: string, plan?: ResolvedRunPlan): Promise<Run> {
  const start = performance.now();
  const catalog = await registry();
  const config = catalog.applications[application]?.variants[variant];
  if (!config) throw new Error(`Unknown application/variant: ${application}/${variant}`);
  const { experiment, planEnvironment } = await import("./experiment.js");
  const selected = plan ?? (await experiment(application, catalog.applications[application].scenarios[0]))
    .plans.find(item => item.variant === variant);
  if (!selected || selected.variant !== variant) throw new Error("Missing matching native experiment plan");
  const environment = planEnvironment(selected);
  // macOS Unix sockets have a 104-byte limit; its default per-user temp path is
  // already too long once Aspire appends its backchannel socket directories.
  const root = await realpath(await mkdtemp(path.join(
    process.platform === "darwin" ? "/tmp" : tmpdir(), "aspirebench-")));
  const workDir = path.join(root, "app");
  const home = path.join(root, "home");
  const id = `aspirebench-${randomBytes(8).toString("hex")}`;
  await mkdir(workDir);
  const { applyGitPatch, patchPaths, patchRecords } = await import("./patch.js");
  let patches: PatchRecord[];
  try {
    await applyEnvironment({ ...environment, commands: undefined }, workDir, path.dirname(selected.evalFile));
    patches = await patchRecords(patchPaths(environment.commands));
    for (const patch of patches) await applyGitPatch(workDir, patch);
  } catch (error) {
    try { await rm(root, { recursive: true }); }
    catch (cleanupError) { throw new AggregateError([error, cleanupError], "Patch preparation and cleanup failed"); }
    throw error;
  }
  await mkdir(home, { recursive: true, mode: 0o700 });
  await mkdir(path.join(home, ".copilot"), { mode: 0o700 });
  const env: Record<string, string> = {
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(home, ".config"),
    XDG_DATA_HOME: path.join(home, ".local/share"),
    COPILOT_HOME: path.join(home, ".copilot"),
    DOTNET_CLI_HOME: home,
    DOTNET_CLI_TELEMETRY_OPTOUT: "1",
    DOTNET_GENERATE_ASPNET_CERTIFICATE: "false",
    ASPIRE_HOME: path.join(home, ".aspire"),
    ASPIRE_CLI_TELEMETRY_OPTOUT: "1",
    ASPIRE_CLI_GENERATE_HTTPS_CERTIFICATE: "false",
    VALLY_TELEMETRY_OPTOUT: "1",
    EVALUATE_USE_HOST_COPILOT_HOME: "0",
    COMPOSE_PROJECT_NAME: id,
    BENCH_RUN_ID: id,
    CONTAINER_RUNTIME: "docker",
    Authentication__AdminPassword: "Benchmark1!",
    Parameters__admin_password: "Benchmark1!",
    ASPNETCORE_ENVIRONMENT: "Development",
    DOTNET_ENVIRONMENT: "Development",
    POSTGRES_PORT: await port(), REDIS_PORT: await port(),
    ADMIN_PORT: await port(), FRONTEND_PORT: await port(),
  };
  if (new Set([env.POSTGRES_PORT, env.REDIS_PORT, env.ADMIN_PORT, env.FRONTEND_PORT]).size !== 4) {
    throw new Error("Port allocation collided; retry preparation");
  }
  const run: Run = {
    id, root, workDir, home, variant, application, adapter: catalog.applications[application].adapter,
    config: stagedConfig(config, environment), env,
    baselineHashes: await hashes(workDir), initialPids: [], setupMs: performance.now() - start,
    environment, skillNames: (environment.skills ?? []).map(src => path.basename(src)).sort(),
    patches,
  };
  await writeFile(path.join(root, "ownership.json"), JSON.stringify(run, null, 2), { mode: 0o600 });
  return run;
}

export function isolatedEnv(run: Run, ambient: NodeJS.ProcessEnv = process.env) {
  const env: Record<string, string> = {};
  // Deliberately exclude all host Copilot settings, feature flags, providers, and credentials
  // except the explicitly supported authentication variables.
  for (const key of ["PATH", "SystemRoot", "TEMP", "TMP", "TMPDIR", "LANG",
    "DOTNET_ROOT", "DOCKER_HOST", "DOCKER_CONTEXT", "GH_TOKEN", "GITHUB_TOKEN",
    "COPILOT_GITHUB_TOKEN", "SSL_CERT_FILE", "NODE_EXTRA_CA_CERTS"]) {
    if (ambient[key]) env[key] = ambient[key]!;
  }
  return { ...env, ...run.env };
}
