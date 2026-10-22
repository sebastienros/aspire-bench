import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashes } from "../bingo/tasks/aspire/tests/hashes.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const original = path.join(root, "../bingo/tasks/aspire");
const task = arm => path.join(root, "tasks", arm);
const read = file => readFile(file, "utf8");
const candidates = {
    services: "aspire-service-health",
    database: "aspire-postgres-health",
    redis: "aspire-redis-health",
};

test("health comparison preserves prompts, app, limits, general skills and verifiers", async () => {
    const shared = await hashes(path.join(root, "../bingo/common/aspire-app"));
    delete shared[".github/mcp.json"];
    const generalSkills = Object.fromEntries(Object.entries(
        await hashes(path.join(original, "environment/skills")))
        .map(([file, digest]) => [`.github/skills/${file}`, digest]));
    for (const arm of ["general", "specific"]) {
        const config = await read(path.join(task(arm), "task.toml"));
        assert.equal(config, (await read(path.join(original, "task.toml")))
            .replace('variant = "aspire"', `variant = "${arm}"`)
            .replace(/\[\[environment\.mcp_servers\]\][\s\S]*?(?=\[\[steps\]\])/, ""));
        assert.doesNotMatch(config, /mcp_servers/);
        for (const step of ["startup", ...Object.keys(candidates)]) {
            assert.equal(await read(path.join(task(arm), `steps/${step}/instruction.md`)),
                await read(path.join(original, `steps/${step}/instruction.md`)));
            assert.equal(await read(path.join(task(arm), `steps/${step}/tests/test.sh`)),
                await read(path.join(original, `steps/${step}/tests/test.sh`)));
        }
        assert.deepEqual(await hashes(path.join(task(arm), "tests")),
            await hashes(path.join(original, "tests")));
        assert.equal(await read(path.join(task(arm), "environment/app/README.md")),
            await read(path.join(original, "environment/app/README.md")));
        const dockerfile = await read(path.join(task(arm), "environment/Dockerfile"));
        assert.equal(dockerfile, (await read(path.join(original, "environment/Dockerfile")))
            .replace("COPY app/ /app/\n", "COPY app/ /app/\nRUN rm /app/.github/mcp.json\n"
                + "COPY --from=aspire-skills / /opt/aspire-skills/\n"
                + "COPY --from=aspire-skills / /app/.github/skills/\n"));
        const compose = await read(path.join(task(arm), "environment/docker-compose.yaml"));
        assert.match(compose, /#1fcca7e91c89716f0e4a8bf7324da13a39f70c66:msbench\/bingo\/tasks\/aspire\/environment\/skills/);
        assert.match(compose, /#baacba3e17181491c9a4d419db7d0e6763c3d363:msbench\/bingo\/common\/aspire-app/);
        assert.doesNotMatch(compose, /volumes:|ports:/);
        const added = Object.fromEntries(Object.entries(
            await hashes(path.join(task(arm), "environment/skills")))
            .map(([file, digest]) => [`.github/skills/${file}`, digest]));
        assert.deepEqual(JSON.parse(await read(path.join(task(arm), "environment/input-hashes.json"))),
            { ...shared, ...await hashes(path.join(task(arm), "environment/app")), ...generalSkills, ...added });
    }
    assert.equal(await read(path.join(task("general"), "environment/Dockerfile")),
        await read(path.join(task("specific"), "environment/Dockerfile")));
    const startup = "environment/skills/aspire-startup/SKILL.md";
    assert.equal(await read(path.join(task("general"), startup)),
        await read(path.join(root, "../aspire-startup/tasks/startup-skill", startup)));
    assert.equal(await read(path.join(task("general"), startup)),
        await read(path.join(task("specific"), startup)));
});

test("specific skills contain only focused self-contained read-only health recipes", async () => {
    assert.deepEqual((await readdir(path.join(task("general"), "environment/skills"))).sort(),
        ["aspire-startup"]);
    assert.deepEqual((await readdir(path.join(task("specific"), "environment/skills"))).sort(),
        [...Object.values(candidates), "aspire-startup"].sort());
    for (const [step, skill] of Object.entries(candidates)) {
        const document = await read(path.join(task("specific"), `environment/skills/${skill}/SKILL.md`));
        assert.match(document, new RegExp(`^---\\nname: ${skill}\\ndescription: .+\\n---\\n`));
        assert.doesNotMatch(document, /TODO|references\/|aspire start|docker run|docker restart/);
        const recipe = document.match(/```bash\n([\s\S]*?)```/)[1];
        assert.match(recipe, /^set -euo pipefail\n/);
        assert.equal(await read(path.join(task("specific"), `steps/${step}/solution/solve.sh`)),
            `#!/usr/bin/env bash\n${recipe}`);
        if (step === "database") assert.match(recipe, /ON_ERROR_STOP=1/);
        if (step === "redis") {
            assert.match(recipe, /--tls --cacert \/usr\/lib\/ssl\/aspire\/cert.pem/);
            assert.doesNotMatch(recipe, /--insecure/);
        }
    }
});
