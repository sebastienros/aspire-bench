#!/usr/bin/env bash
set -euo pipefail
cd /app
aspire describe --apphost /app/apphost.cs --format table --non-interactive --nologo \
    > /tmp/aspire-health-table.txt
cat /tmp/aspire-health-table.txt
node --input-type=module - services boardadmin bingoboard <<'JS'
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const [step, ...targets] = process.argv.slice(2);
const rows = readFileSync("/tmp/aspire-health-table.txt", "utf8").split("\n")
    .map(line => line.split("\u2502").slice(1, -1).map(cell => cell.trim()))
    .filter(cells => cells.length === 5 && cells[0] && cells[2] && cells[0] !== "Name");
const evidence = targets.map(name => {
    const matches = rows.filter(cells => cells[0].split(/[\s(]/)[0] === name);
    assert.equal(matches.length, 1, `Expected exactly one row for ${name}`);
    assert.equal(matches[0][2], "Running", `${name} must be Running`);
    assert.equal(matches[0][3], "Healthy", `${name} must be Healthy`);
    return `${name}: Running/Healthy`;
}).join("; ");
writeFileSync(`benchmark-${step}-health.json`, JSON.stringify({
    [step === "services" ? "running" : "ready"]: true,
    healthy: true, evidence: `Aspire describe table reports ${evidence}.`,
}));
JS
