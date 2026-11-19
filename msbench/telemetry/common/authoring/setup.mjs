// Scenario setup for the authoring scenarios: keeps a copy of the workspace as it was handed to the
// agent (the verifier checks that existing files only gained lines) and, for add-dependency, the data
// the running application holds before the agent starts.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const sh = async (command, args) => (await run(command, args, { maxBuffer: 64 << 20, timeout: 300_000 })).stdout.trim();
const scenario = process.env.BENCH_FAULT;
const state = { scenario, preparedAt: new Date().toISOString() };

await sh("bash", ["-c", "rm -rf /opt/benchmark/authoring-original && mkdir -p /opt/benchmark/authoring-original && cd /app && tar -c --exclude=node_modules --exclude=bin --exclude=obj --exclude=.github --exclude=.aspire --exclude=.script-state . | tar -x -C /opt/benchmark/authoring-original"]);
if (scenario === "adoption") {
    assert(!existsSync("/app/apphost.cs") && !existsSync("/app/aspire.config.json"), "The adoption workspace must have no AppHost");
} else if (scenario === "add-dependency") {
    const { resources } = JSON.parse(await sh("/usr/local/aspire/aspire", ["describe", "--apphost", "/app/apphost.cs", "--format", "Json", "--non-interactive", "--nologo"]));
    const admin = resources.find(r => r.displayName === "boardadmin");
    const origin = new URL(admin.urls.find(u => u.url.startsWith("http://")).url).origin;
    const live = ["live-01", "live-02", "live-03"].map(id => ({ id, label: `Live ${id}`, type: "benchmark", isActive: true }));
    const seeded = await fetch(new URL("/api/demo/producer/squares/import", origin), {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(live),
    });
    assert.equal(seeded.status, 200, `Healthy application required: HTTP ${seeded.status}`);
    const containers = (await sh("docker", ["ps", "--format", "{{.ID}}\t{{.Image}}"])).split("\n").map(l => l.split("\t"));
    assert(!containers.some(([, image]) => /(^|\/)redis:/.test(image)), "No Redis may run before the agent adds it");
    const pg = containers.filter(([, image]) => /(^|\/)postgres:/.test(image));
    assert.equal(pg.length, 1);
    state.squares = JSON.parse(await sh("docker", ["exec", pg[0][0], "sh", "-c",
        'PGPASSWORD="$POSTGRES_PASSWORD" psql -U postgres -d db -At -c "SELECT coalesce(json_agg(s.\\"Id\\" ORDER BY s.\\"Id\\"), \'[]\') FROM \\"BingoSquares\\" s;"']));
    assert(state.squares.length >= 10, "Seeded squares required");
} else {
    assert.equal(scenario, "greenfield", `Unknown authoring scenario ${scenario}`);
}
await writeFile("/opt/benchmark/authoring-state.json", JSON.stringify(state));
console.log(`setup complete: ${JSON.stringify({ scenario, squares: state.squares?.length })}`);
