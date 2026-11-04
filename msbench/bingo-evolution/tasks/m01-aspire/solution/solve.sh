#!/usr/bin/env bash
set -euo pipefail
cd /app
node /opt/benchmark/negative.mjs report-only
cp /solution/DescriptionEndpoints.cs src/BingoBoard.Admin/Endpoints/
cp /solution/AddSquareDescription.cs src/BingoBoard.Data/Migrations/20261104000000_AddSquareDescription.cs
node --input-type=module <<'JS'
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const entity = "src/BingoBoard.Data/BingoSquareEntity.cs";
const source = readFileSync(entity, "utf8");
assert(source.includes("public class BingoSquareEntity\n{"));
writeFileSync(entity, source.replace("public class BingoSquareEntity\n{",
    'public class BingoSquareEntity\n{\n    [MaxLength(280)]\n    public string Description { get; set; } = string.Empty;\n'));
const context = "src/BingoBoard.Data/ApplicationDbContext.cs";
writeFileSync(context, readFileSync(context, "utf8").replace("entity.HasIndex(e => e.IsActive);",
    'entity.Property(e => e.Description).HasDefaultValue("");\n            entity.HasIndex(e => e.IsActive);'));
const snapshot = "src/BingoBoard.Data/Migrations/ApplicationDbContextModelSnapshot.cs";
const before = readFileSync(snapshot, "utf8");
const anchor = '                    b.Property<int>("DisplayOrder")';
assert(before.includes(anchor));
const after = before.replace(anchor, '                    b.Property<string>("Description")\n'
    + '                        .IsRequired()\n                        .ValueGeneratedOnAdd()\n'
    + '                        .HasMaxLength(280)\n                        .HasColumnType("character varying(280)")\n'
    + '                        .HasDefaultValue("");\n\n' + anchor);
writeFileSync(snapshot, after);
// Preserve a real target model as well as the current snapshot.
writeFileSync("src/BingoBoard.Data/Migrations/20261104000000_AddSquareDescription.Designer.cs",
    after.replace("partial class ApplicationDbContextModelSnapshot : ModelSnapshot",
        "partial class AddSquareDescription").replace("BuildModel(ModelBuilder modelBuilder)",
        "BuildTargetModel(ModelBuilder modelBuilder)"));
const program = "src/BingoBoard.Admin/Program.cs";
writeFileSync(program, readFileSync(program, "utf8").replace("app.MapProducerEndpoints();",
    "app.MapProducerEndpoints();\n    app.MapDescriptionEndpoints();"));
const vite = "src/bingo-board/vite.config.js";
writeFileSync(vite, readFileSync(vite, "utf8").replace("'/api/version-info':", "'/api':"));
JS
cp src/BingoBoard.Admin/Endpoints/DescriptionEndpoints.cs /tmp/description-correct.cs
sed -i 's/square.Description = input.Description;/square.Description = "";/' src/BingoBoard.Admin/Endpoints/DescriptionEndpoints.cs
bash /solution/reload.sh
if node /opt/benchmark/evolution.mjs verify >/tmp/stub.log 2>&1; then
    echo "Grader accepted migration with hardcoded empty descriptions" >&2; exit 1
fi
grep -q 'Description response must reflect the persisted value' /tmp/stub.log
echo "Rejected applied migration with hardcoded empty descriptions"
cp /tmp/description-correct.cs src/BingoBoard.Admin/Endpoints/DescriptionEndpoints.cs
bash /solution/reload.sh
for negative in guidance endpoints lost-row rebuilt-table lost-cache; do
    node /opt/benchmark/negative.mjs "$negative"
done
node /opt/benchmark/evolution.mjs verify
