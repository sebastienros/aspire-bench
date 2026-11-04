#!/usr/bin/env bash
set -euo pipefail
cd /app
node /opt/benchmark/negative.mjs report-only
node --input-type=module <<'JS'
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const program = "src/BingoBoard.Admin/Program.cs";
const source = readFileSync(program, "utf8");
assert(source.includes("app.MapProducerEndpoints();"));
writeFileSync(program, source.replace("app.MapProducerEndpoints();",
    "app.MapProducerEndpoints();\n    app.MapCatalogEndpoints();"));
const vite = "src/bingo-board/vite.config.js";
writeFileSync(vite, readFileSync(vite, "utf8").replace("'/api/version-info':", "'/api':"));
JS
cp /solution/CatalogEndpoints.cs src/BingoBoard.Admin/Endpoints/
cp src/BingoBoard.Admin/Endpoints/CatalogEndpoints.cs /tmp/catalog-correct.cs
sed -i 's/return Results.Ok(result);/return Results.Ok(new object[0]);/' src/BingoBoard.Admin/Endpoints/CatalogEndpoints.cs
bash /solution/reload.sh
if node /opt/benchmark/evolution.mjs verify >/tmp/stub.log 2>&1; then
    echo "Grader accepted hardcoded empty catalog" >&2; exit 1
fi
grep -q 'Catalog must reflect live PostgreSQL/Redis' /tmp/stub.log
echo "Rejected hardcoded empty catalog"
cp /tmp/catalog-correct.cs src/BingoBoard.Admin/Endpoints/CatalogEndpoints.cs
bash /solution/reload.sh
for negative in guidance endpoints lost-row rebuilt-table lost-cache; do
    node /opt/benchmark/negative.mjs "$negative"
done
node /opt/benchmark/evolution.mjs verify
