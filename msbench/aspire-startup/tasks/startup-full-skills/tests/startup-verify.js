import assert from "node:assert/strict";
import { access, mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { endpoints } from "./http.js";
import { hashes, unchanged } from "./hashes.js";
import { command } from "./process.js";

export async function verifyStartup(workDir = "/app", baselineFile = "/opt/benchmark/input-hashes.json") {
    const treatment = process.env.BENCH_STARTUP_TREATMENT;
    assert(["startup-full-skills"].includes(treatment), "Startup treatment required");
    for (const directory of [`${workDir}/.github/skills`, "/opt/aspire-skills"]) {
        if (treatment === "startup-full-skills")
            await access(directory);
        else
            await assert.rejects(access(directory), { code: "ENOENT" });
    }
    const mcpFile = `${workDir}/.github/mcp.json`;
    if (treatment.includes("mcp"))
        await access(mcpFile);
    else
        await assert.rejects(access(mcpFile), { code: "ENOENT" });
    const baseline = JSON.parse(await readFile(baselineFile, "utf8"));
    assert(unchanged(baseline, await hashes(workDir)), "Application inputs or guidance changed");
    const timing = JSON.parse(await readFile(`${workDir}/benchmark-startup-timings.json`, "utf8"));
    validateTiming(timing);
    const urls = endpoints(JSON.parse(await readFile(`${workDir}/benchmark-endpoints.json`, "utf8")));
    for (const [name, origin] of Object.entries(urls)) {
        const listeners = (await command("lsof", ["-nP", `-iTCP:${new URL(origin).port}`,
            "-sTCP:LISTEN", "-Fp"])).stdout.split("\n").filter(line => /^p\d+$/.test(line));
        assert(listeners.length, `${name}: endpoint listener required`);
        for (const line of listeners) {
            const directory = await readlink(`/proc/${line.slice(1)}/cwd`);
            assert(directory === workDir || directory.startsWith(`${workDir}/`),
                `${name}: listener must belong to the application workspace`);
        }
        const route = name === "admin" ? "/login" : "/";
        const response = await fetch(new URL(route, origin), {
            redirect: "manual", signal: AbortSignal.timeout(10_000),
        });
        assert.equal(response.status, 200, `${name}: HTTP 200 required`);
        const html = await response.text();
        if (name === "admin")
            assert(/password/i.test(html) && /<html|<!doctype/i.test(html), "Admin login page required");
        else
            assert(html.includes('id="app"') && html.includes("script"), "Player frontend required");
    }
}

export function validateTiming(timing, now = Date.now()) {
    const fields = ["launch_started_ms", "launch_returned_ms", "ready_ms", "endpoints_written_ms"];
    assert(timing && typeof timing === "object" && !Array.isArray(timing), "Timing object required");
    assert.deepEqual(Object.keys(timing).sort(), [...fields].sort());
    const values = fields.map(field => timing[field]);
    assert(values.every(Number.isSafeInteger), "Integer epoch milliseconds required");
    assert(values.every((value, index) => index === 0 || value >= values[index - 1]),
        "Timing boundaries must be ordered");
    assert(values[0] >= now - 1_200_000 && values.at(-1) <= now + 5_000,
        "Timing boundaries must belong to the current trial");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await mkdir("/logs/verifier", { recursive: true });
    await writeFile("/logs/verifier/reward.txt", "0\n");
    await verifyStartup();
    await writeFile("/logs/verifier/reward.txt", "1\n");
}
