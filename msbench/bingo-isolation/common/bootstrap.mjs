import assert from "node:assert/strict";
import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { command } from "../../bingo-diagnostics/common/process.mjs";

export const instances = [
    { root: "/app", run: "willow29", postgres: 54320, redis: 63790, admin: 18080, frontend: 15173 },
    { root: "/neighbor-app", run: "willow92", postgres: 54321, redis: 63791, admin: 18081, frontend: 15174 },
];

export function instanceEnvironment(instance, environment = process.env) {
    return {
        ...environment, BENCH_RUN_ID: instance.run, COMPOSE_PROJECT_NAME: instance.run,
        POSTGRES_PORT: String(instance.postgres), REDIS_PORT: String(instance.redis),
        ADMIN_PORT: String(instance.admin), FRONTEND_PORT: String(instance.frontend),
    };
}

export function copyWorkspaceEntry(source) {
    const relative = path.relative("/app", source);
    return !relative.split(path.sep).some(part => [".aspire", ".script-state", ".git"].includes(part))
        && relative !== "benchmark-endpoints.json";
}

async function start(instance) {
    const env = instanceEnvironment(instance);
    if (process.env.BENCH_APP_KIND === "compose") {
        await command("bash", ["scripts/start.sh"], { cwd: instance.root, env, timeout: 900_000 });
        await writeFile(`${instance.root}/benchmark-endpoints.json`, JSON.stringify({
            admin: `http://localhost:${instance.admin}`, frontend: `http://localhost:${instance.frontend}`,
        }));
        return;
    }
    assert.equal(process.env.BENCH_APP_KIND, "aspire");
    const apphost = `${instance.root}/apphost.cs`;
    await command("aspire", ["start", "--apphost", apphost, "--launch-profile", "http",
        "--non-interactive", "--isolated", "--format", "Json", "--nologo"],
    { cwd: instance.root, env, timeout: 900_000 });
    for (const resource of ["usher", "parquet"]) {
        await command("aspire", ["wait", resource, "--apphost", apphost,
            "--non-interactive", "--timeout", "600", "--nologo"],
        { cwd: instance.root, env, timeout: 650_000 });
    }
    const { resources } = JSON.parse((await command("aspire", ["describe", "--apphost", apphost,
        "--format", "Json", "--non-interactive", "--nologo"], { cwd: instance.root, env })).stdout);
    const origin = name => {
        const found = resources.filter(resource => resource.displayName === name);
        assert.equal(found.length, 1, `Unique ${instance.run} ${name} required`);
        const url = found[0].urls?.find(endpoint => endpoint.url.startsWith("http://"));
        assert(url, `Missing ${instance.run} ${name} HTTP origin`);
        return new URL(url.url).origin;
    };
    await writeFile(`${instance.root}/benchmark-endpoints.json`,
        JSON.stringify({ admin: origin("usher"), frontend: origin("parquet") }));
}

async function bootstrap() {
    await start(instances[0]);
    // Reuse compiled binaries, restored packages and node_modules, not live session state.
    await cp("/app", "/neighbor-app", { recursive: true, errorOnExist: true, force: false,
        filter: copyWorkspaceEntry });
    await start(instances[1]);
    const endpointPairs = await Promise.all(instances.map(async instance =>
        JSON.parse(await readFile(`${instance.root}/benchmark-endpoints.json`, "utf8"))));
    assert.equal(new Set(endpointPairs.flatMap(Object.values)).size, 4,
        "Two real admin/player instances must have four distinct HTTP origins");
    console.log("Two independent Bingo app directories started with distinct namespaces and origins.");
}

if (process.argv[1]?.endsWith("/bootstrap.mjs")) {
    bootstrap().catch(error => { console.error(error); process.exitCode = 1; });
}
