#!/usr/bin/env bash
set -euo pipefail
cd /app
expect_failure() {
    if node /opt/benchmark/iteration.mjs verify > /tmp/negative-check.log 2>&1; then
        echo "Grader incorrectly accepted $1" >&2
        exit 1
    fi
    grep -Eq "$2" /tmp/negative-check.log || { cat /tmp/negative-check.log >&2; exit 1; }
    echo "Rejected $1"
}
expect_failure "unchanged routing" 'HTTP|JSON'
node --input-type=module <<'JS'
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const file = "src/bingo-board/vite.config.js";
const source = readFileSync(file, "utf8");
assert(source.includes("'/api/version-info':"));
writeFileSync(file, source.replace("'/api/version-info':", "'/api':"));
JS
# Vite reloads its config asynchronously; bounded retries cover that transition.
for attempt in {1..30}; do
    if node /opt/benchmark/iteration.mjs verify; then break; fi
    if [[ "$attempt" == 30 ]]; then
        echo "Live producer routing did not become correct after the frontend config change." >&2
        exit 1
    fi
    sleep 1
done
cp README.md /tmp/original-readme
printf '\nUnrelated modification\n' >> README.md
expect_failure "out-of-scope change" 'Only the frontend config may change'
cp /tmp/original-readme README.md
cp benchmark-endpoints.json /tmp/original-endpoints
printf '{}\n' > benchmark-endpoints.json
expect_failure "invalid endpoints" 'Expected values'
cp /tmp/original-endpoints benchmark-endpoints.json
node --input-type=module <<'JS'
import { readFileSync } from "node:fs";
const { admin } = JSON.parse(readFileSync("benchmark-endpoints.json", "utf8"));
const { sentinel } = JSON.parse(readFileSync("/opt/benchmark/iteration-state.json", "utf8"));
const response = await fetch(`${admin}/api/demo/producer/squares/${sentinel}/state/false`, { method: "POST" });
if (!response.ok) throw new Error(`Sentinel setup: HTTP ${response.status}`);
JS
expect_failure "lost preexisting state" 'Preexisting called-square state must survive'
node --input-type=module <<'JS'
import { readFileSync } from "node:fs";
const { admin } = JSON.parse(readFileSync("benchmark-endpoints.json", "utf8"));
const { sentinel } = JSON.parse(readFileSync("/opt/benchmark/iteration-state.json", "utf8"));
const response = await fetch(`${admin}/api/demo/producer/squares/${sentinel}/state/true`, { method: "POST" });
if (!response.ok) throw new Error(`Sentinel restore: HTTP ${response.status}`);
JS
node /opt/benchmark/iteration.mjs verify
