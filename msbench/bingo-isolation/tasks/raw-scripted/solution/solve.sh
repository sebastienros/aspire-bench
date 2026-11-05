#!/usr/bin/env bash
set -euo pipefail
node /solution/negative.mjs
node --input-type=module <<'JS'
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { containers, redis, restoreWrites, stateFile, verify } from "/opt/benchmark/bingo-isolation/common/isolation.mjs";
const state = JSON.parse(await readFile(stateFile, "utf8"));
const target = (await containers()).find(row => row.Id === state.instances[0].cache);
assert.equal(await redis(target, restoreWrites), "OK");
await verify();
JS
