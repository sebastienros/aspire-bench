#!/usr/bin/env bash
set -euo pipefail
node /solution/mcp-probe.mjs
node /solution/negative.mjs
node --input-type=module <<'JS'
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { containers, redis, restoreWrites, stateFile, verify } from "/opt/benchmark/bingo-transfer/common/transfer.mjs";
const state = JSON.parse(await readFile(stateFile, "utf8"));
const target = (await containers()).find(row => row.Id === state.target);
assert.equal(await redis(target, restoreWrites), "OK");
await verify();
JS
