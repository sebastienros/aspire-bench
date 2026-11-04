#!/usr/bin/env bash
set -euo pipefail
cd /app
aspire start --apphost /app/apphost.cs --launch-profile http \
    --non-interactive --isolated --format Json --nologo
aspire wait boardadmin --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo
aspire wait bingoboard --apphost /app/apphost.cs --non-interactive --timeout 600 --nologo
aspire describe --apphost /app/apphost.cs --format Json --non-interactive --nologo >/tmp/bingo-resources.json
node --input-type=module <<'JS'
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const { resources } = JSON.parse(readFileSync("/tmp/bingo-resources.json", "utf8"));
const url = name => {
    const resource = resources.find(item => item.displayName === name);
    const endpoint = resource?.urls?.find(item => item.url?.startsWith("http://"));
    assert(endpoint, `Missing HTTP endpoint for ${name}`);
    return new URL(endpoint.url).origin;
};
writeFileSync("benchmark-endpoints.json",
    JSON.stringify({ admin: url("boardadmin"), frontend: url("bingoboard") }));
JS
