#!/usr/bin/env bash
set -euo pipefail
node /solution/mcp-probe.mjs
node /solution/negative.mjs
# Only the external reference solution can use protected setup identity.
node --input-type=module <<'JS'
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { containers, redis, stateFile, verify } from "/opt/benchmark/diagnostics.mjs";
const state = JSON.parse(await readFile(stateFile, "utf8"));
const target = (await containers()).find(row => row.Id === state.target);
assert.equal(await redis(target, ["CLIENT", "UNPAUSE"]), "OK");
await verify();
JS
