import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hashes, unchanged } from "./hashes.js";
import { verifyHttp } from "./http.js";
import { command } from "./process.js";
import { redisPingArgs } from "./redis.js";
import { preservesPackageConfiguration, databaseFromConnectionString } from "./package-contract.mjs";

const state = "/opt/benchmark/adoption-inputs.json";
const mode = process.argv[2];
if (mode === "setup") {
    await assert.rejects(readFile("/app/apphost.cs"), { code: "ENOENT" });
    await writeFile(state, JSON.stringify({
        hashes: await hashes("/app"),
        packages: await readFile("/app/Directory.Packages.props", "utf8"),
    }));
} else {
    assert.equal(mode, "verify");
    const before = JSON.parse(await readFile(state, "utf8"));
    const protectedHashes = { ...before.hashes };
    delete protectedHashes["Directory.Packages.props"];
    assert(unchanged(protectedHashes, await hashes("/app")), "Existing application or supplied guidance changed");
    assert(preservesPackageConfiguration(before.packages,
        await readFile("/app/Directory.Packages.props", "utf8")),
    "Existing package configuration changed beyond compatible Aspire orchestration additions");
    const result = await command("aspire", ["describe", "--apphost", "/app/apphost.cs",
        "--format", "Json", "--non-interactive", "--nologo"]);
    const { resources } = JSON.parse(result.stdout);
    const origin = name => {
        const resource = resources.find(item => item.displayName === name);
        assert(resource?.state === "Running", `${name} must be running under Aspire`);
        const endpoint = resource.urls?.find(item => item.url?.startsWith("http://"));
        assert(endpoint, `Missing allocated endpoint for ${name}`);
        return new URL(endpoint.url).origin;
    };
    const urls = { admin: origin("boardadmin"), frontend: origin("bingoboard") };
    assert.notEqual(urls.admin, urls.frontend);
    for (const url of Object.values(urls)) {
        assert(![process.env.ADMIN_PORT, process.env.FRONTEND_PORT].includes(new URL(url).port),
            "Allocate application ports rather than reuse raw fixed ports");
    }
    const apphost = await readFile("/app/apphost.cs", "utf8");
    const password = process.env.Parameters__admin_password;
    assert(password && !apphost.includes(password), "AppHost must reference the supplied secret, not embed its value");
    await verifyHttp(urls);
    const id = process.env.BENCH_RUN_ID;
    assert(id);
    const ids = (await command("docker", ["ps", "-q", "--filter",
        `name=^/${id}-(postgres|redis)$`])).stdout.trim().split(/\s+/).filter(Boolean);
    assert.equal(ids.length, 2, "Two owned dependency containers required");
    const owned = JSON.parse((await command("docker", ["inspect", ...ids])).stdout);
    const postgres = owned.find(item => item.Name === `/${id}-postgres`);
    const redis = owned.find(item => item.Name === `/${id}-redis`);
    assert(postgres?.State.Running && redis?.State.Running);
    const listeners = (await command("lsof", ["-t", `-iTCP:${new URL(urls.admin).port}`, "-sTCP:LISTEN"]))
        .stdout.trim().split(/\s+/);
    const backendPid = [...new Set(listeners)];
    assert.equal(backendPid.length, 1, "Exactly one actual backend listener required");
    const environment = Object.fromEntries((await readFile(`/proc/${backendPid[0]}/environ`, "utf8"))
        .split("\0").filter(Boolean).map(entry => {
            const split = entry.indexOf("=");
            return [entry.slice(0, split), entry.slice(split + 1)];
        }));
    assert(environment.ConnectionStrings__db, "Actual backend database connection required");
    const database = databaseFromConnectionString(environment.ConnectionStrings__db);
    const seeded = await command("docker", ["exec", postgres.Id, "sh", "-c",
        'PGPASSWORD="$POSTGRES_PASSWORD" psql "$@"', "psql", "-U", "postgres", "-d", database,
        "-At", "-v", "ON_ERROR_STOP=1", "-c",
        `SELECT EXISTS (SELECT 1 FROM "AspNetUsers" WHERE "UserName" = 'admin') AND EXISTS (SELECT 1 FROM "BingoSquares");`]);
    assert.equal(seeded.stdout.trim(), "t", "Actual migrated and seeded database required");
    const pong = await command("docker", ["exec", redis.Id, "sh", "-c",
        'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli "$@" ping', "redis-cli", ...redisPingArgs(redis.Config)]);
    assert.equal(pong.stdout.trim(), "PONG");
    await mkdir("/logs/verifier", { recursive: true });
    await writeFile("/app/benchmark-endpoints.json", JSON.stringify(urls));
    console.log("Verified real Aspire-orchestrated raw Bingo, functional SQL/Redis roundtrip and unchanged source.");
}
