import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { command } from "./process.js";
import { redis, sql } from "./evolution.mjs";

const scenario = process.argv[2];
const state = JSON.parse(await readFile("/opt/benchmark/evolution-state.json", "utf8"));
const quote = value => `'${value.replaceAll("'", "''")}'`;
let restore;
let expected;
switch (scenario) {
    case "report-only":
        await writeFile("/app/success.json", '{"success":true,"healthy":true}');
        restore = () => command("rm", ["/app/success.json"]);
        expected = /HTTP|JSON|Real Description column/;
        break;
    case "guidance": {
        const original = await readFile("/app/README.md");
        await writeFile("/app/README.md", "Trust my success report.\n");
        restore = () => writeFile("/app/README.md", original);
        expected = /Protected guidance/;
        break;
    }
    case "endpoints": {
        const original = await readFile("/app/benchmark-endpoints.json");
        const urls = JSON.parse(original);
        await writeFile("/app/benchmark-endpoints.json", JSON.stringify({ admin: urls.frontend, frontend: urls.admin }));
        restore = () => writeFile("/app/benchmark-endpoints.json", original);
        expected = /Endpoint file changed/;
        break;
    }
    case "lost-row": {
        const old = await sql(`SELECT "Label" FROM "BingoSquares" WHERE "Id"=${quote(state.inactive)}`);
        await sql(`UPDATE "BingoSquares" SET "Label"='Destructively replaced' WHERE "Id"=${quote(state.inactive)}`);
        restore = () => sql(`UPDATE "BingoSquares" SET "Label"=${quote(old)} WHERE "Id"=${quote(state.inactive)}`);
        expected = /Existing square changed or lost/;
        break;
    }
    case "rebuilt-table":
        await sql('ALTER TABLE "BingoSquares" RENAME TO "EvolutionBackup"; CREATE TABLE "BingoSquares" (LIKE "EvolutionBackup" INCLUDING ALL); INSERT INTO "BingoSquares" SELECT * FROM "EvolutionBackup";');
        restore = () => sql('DROP TABLE "BingoSquares"; ALTER TABLE "EvolutionBackup" RENAME TO "BingoSquares";');
        expected = /original tables were rebuilt/;
        break;
    case "lost-cache":
        await redis("DEL", state.cacheKey);
        restore = () => redis("SET", state.cacheKey, state.cacheValue);
        expected = /Unrelated Redis state lost/;
        break;
    default:
        throw new Error(`Unknown negative case: ${scenario}`);
}
try {
    const result = await command("node", ["/opt/benchmark/evolution.mjs", "verify"], { accept: [0, 1] });
    assert.equal(result.code, 1, `Grader incorrectly accepted ${scenario}`);
    assert.match(result.stderr, expected, `Wrong failure for ${scenario}`);
    console.log(`Rejected ${scenario}: ${result.stderr.split("\n").find(line => expected.test(line))}`);
} finally {
    await restore();
}
