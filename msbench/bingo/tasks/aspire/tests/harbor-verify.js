import assert from "node:assert/strict";
import { mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { endpoints, verifyHttp } from "./http.js";
import { hashes, unchanged } from "./hashes.js";
import { command } from "./process.js";
import { redisPingArgs } from "./redis.js";
export const harborSteps = ["startup", "services", "database", "redis"];
const outputs = [
    "benchmark-endpoints.json", "benchmark-services-health.json",
    "benchmark-database-health.json", "benchmark-redis-health.json",
];
export function healthReport(value, step) {
    assert(value && typeof value === "object" && !Array.isArray(value), "Health object required");
    const record = value;
    for (const field of step === "services" ? ["running", "healthy"] : ["ready", "healthy"]) {
        assert.equal(record[field], true, `${step}.${field} must be true`);
    }
    assert.equal(typeof record.evidence, "string", `${step}.evidence must be a string`);
    assert(/\S/.test(record.evidence), `${step}.evidence must contain observed checks`);
}
export async function verifyHarbor(step, workDir = "/app", stateDir = "/logs/verifier", baselineFile = "/opt/benchmark/input-hashes.json") {
    const index = harborSteps.indexOf(step);
    assert(index >= 0, `Unknown Harbor step: ${step}`);
    const baseline = JSON.parse(await readFile(baselineFile, "utf8"));
    assert(unchanged(baseline, await hashes(workDir)), "Application inputs or guidance changed");
    const savedFile = path.join(stateDir, "output-hashes.json");
    const saved = index === 0 ? {}
        : JSON.parse(await readFile(savedFile, "utf8"));
    const current = {};
    for (const [i, file] of outputs.entries()) {
        if (i > index)
            break;
        const text = await readFile(path.join(workDir, file), "utf8");
        current[file] = createHash("sha256").update(text).digest("hex");
        if (i < index)
            assert.equal(current[file], saved[file], `Prior output changed: ${file}`);
        const value = JSON.parse(text);
        if (i === 0)
            endpoints(value);
        else
            healthReport(value, harborSteps[i]);
    }
    if (step === "redis") {
        const kind = process.env.BENCH_APP_KIND;
        assert(kind === "compose" || kind === "aspire", "BENCH_APP_KIND must be compose or aspire");
        const id = process.env.BENCH_RUN_ID;
        assert(id, "BENCH_RUN_ID required");
        const args = kind === "compose"
            ? ["--filter", `label=com.docker.compose.project=${id}`]
            : ["--filter", `name=^/${id}-(postgres|redis)$`];
        const ids = (await command("docker", ["ps", "-aq", ...args])).stdout.trim().split(/\s+/).filter(Boolean);
        assert.equal(ids.length, 2, "Exactly two owned dependency containers required");
        const owned = JSON.parse((await command("docker", ["inspect", ...ids])).stdout);
        const dependency = (name) => {
            const matches = owned.filter(item => kind === "compose"
                ? item.Config.Labels?.["com.docker.compose.service"] === name
                : item.Name === `/${id}-${name}`);
            assert.equal(matches.length, 1, `Exactly one owned ${name} required`);
            assert(matches[0].State.Running, `${name} is not running`);
            return matches[0];
        };
        const postgres = dependency("postgres");
        const redis = dependency("redis");
        await command("docker", ["exec", postgres.Id, "pg_isready", "-U", "postgres"]);
        const seeded = await command("docker", ["exec", postgres.Id, "sh", "-c",
            'PGPASSWORD="$POSTGRES_PASSWORD" psql "$@"', "psql", "-U", "postgres",
            "-d", kind === "compose" ? "bingo" : "db", "-At", "-v", "ON_ERROR_STOP=1", "-c",
            `SELECT EXISTS (SELECT 1 FROM "AspNetUsers" WHERE "UserName" = 'admin') AND EXISTS (SELECT 1 FROM "BingoSquares");`]);
        assert.equal(seeded.stdout.trim(), "t", "Migrations and seed data must exist");
        assert.equal((await command("docker", ["exec", redis.Id, "sh", "-c",
            'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli "$@" ping', "redis-cli",
            ...redisPingArgs(redis.Config)])).stdout.trim(), "PONG");
        const urls = endpoints(JSON.parse(await readFile(path.join(workDir, outputs[0]), "utf8")));
        // The daemon has no host socket or published host ports; all listeners are in this task.
        for (const url of [urls.admin, urls.frontend]) {
            const listeners = (await command("lsof", ["-nP", `-iTCP:${new URL(url).port}`,
                "-sTCP:LISTEN", "-Fp"])).stdout.split("\n").filter(line => /^p\d+$/.test(line));
            assert(listeners.length, "Endpoint listener required");
            for (const line of listeners) {
                const directory = await readlink(`/proc/${line.slice(1)}/cwd`);
                assert(directory === workDir || directory.startsWith(`${workDir}/`), "Endpoint must belong to this task's application workspace");
            }
        }
        await verifyHttp(urls);
    }
    await mkdir(stateDir, { recursive: true });
    await writeFile(savedFile, JSON.stringify(current));
}
async function main() {
    const step = process.argv[2];
    assert(harborSteps.some(value => value === step), `Unknown Harbor step: ${step}`);
    const directory = "/logs/verifier";
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "reward.txt"), "0\n");
    await verifyHarbor(step, "/app", "/opt/benchmark/checkpoints");
    await writeFile(path.join(directory, "reward.txt"), "1\n");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => { console.error(error); process.exitCode = 1; });
}
