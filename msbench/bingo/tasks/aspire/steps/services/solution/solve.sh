#!/usr/bin/env bash
set -euo pipefail
cd /app
node --input-type=module <<'JS'
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const urls = JSON.parse(readFileSync("benchmark-endpoints.json", "utf8"));
for (const url of [`${urls.admin}/login`, `${urls.frontend}/`, `${urls.frontend}/api/version-info`]) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
}
writeFileSync("benchmark-services-health.json", JSON.stringify({
    running: true, healthy: true, evidence: "Admin login, player frontend and frontend API returned HTTP 200.",
}));
JS
