import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { prepare, isolatedEnv, inside, hashes, unchanged } from "../dist/workspace.js";
import { sessionConfig, clientConfig } from "../dist/agent.js";
import { ownsContainer } from "../dist/ownership.js";

test("raw and treatment are distinct copies with isolated configuration", async () => {
  const raw = await prepare("bingo", "raw");
  const treatment = await prepare("bingo", "aspire");
  try {
    assert.notEqual(raw.root, treatment.root);
    assert.notEqual(raw.id, treatment.id);
    assert.notEqual(raw.env.COMPOSE_PROJECT_NAME, treatment.env.COMPOSE_PROJECT_NAME);
    await assert.rejects(access(path.join(raw.workDir, "apphost.cs")));
    await assert.rejects(access(path.join(raw.workDir, ".agents")));
    await assert.rejects(access(path.join(raw.workDir, "src/BingoBoard.ServiceDefaults")));
    await access(path.join(treatment.workDir, ".agents/skills/aspire-orchestration/references/app-commands.md"));
    assert.match(await readFile(path.join(treatment.workDir, "apphost.cs"), "utf8"), /#:project src\//);
    const rawConfig = sessionConfig(raw, { onPermissionRequest: () => ({ kind: "approved" }) });
    const treatmentConfig = sessionConfig(treatment, { onPermissionRequest: () => ({ kind: "approved" }) });
    assert.equal(rawConfig.enableConfigDiscovery, false);
    assert.equal(rawConfig.enableSkills, false);
    assert.deepEqual(rawConfig.mcpServers, {});
    assert.equal(treatmentConfig.enableConfigDiscovery, false);
    assert.deepEqual(Object.keys(treatmentConfig.mcpServers), ["aspire"]);
    assert.equal(treatmentConfig.mcpServers.aspire.workingDirectory, treatment.workDir);
    assert.deepEqual(treatmentConfig.includedBuiltinSkills, []);
    assert.deepEqual(rawConfig.availableTools, treatmentConfig.availableTools);
    assert.equal(treatmentConfig.requestExtensions, false);
    assert.equal(treatmentConfig.enableSessionStore, false);
    const env = isolatedEnv(raw, {
      PATH: "/usr/bin", HOME: "/private/user", GH_TOKEN: "test-only",
      COPILOT_HOME: "/private/config", COPILOT_HOME_SETTINGS_JSON: '{"bad":true}',
      COPILOT_PROVIDER_BASE_URL: "http://uncontrolled", EVALUATE_USE_HOST_COPILOT_HOME: "1",
    });
    assert.equal(env.HOME, raw.home);
    assert.equal(env.GH_TOKEN, "test-only");
    assert.equal(env.EVALUATE_USE_HOST_COPILOT_HOME, "0");
    assert.equal(env.COPILOT_HOME_SETTINGS_JSON, undefined);
    assert.equal(env.COPILOT_PROVIDER_BASE_URL, undefined);
    const auth = clientConfig(raw, {}, { GH_TOKEN: "test-gh",
      COPILOT_GITHUB_TOKEN: "test-copilot", GITHUB_TOKEN: "test-github" });
    assert.equal(auth.gitHubToken, "test-copilot");
    assert.equal(auth.useLoggedInUser, false);
    assert.equal(auth.baseDirectory, raw.env.COPILOT_HOME);
    assert.equal(clientConfig(raw, {}, { GH_TOKEN: "test-gh" }).gitHubToken, "test-gh");
    assert.equal(clientConfig(raw, {}, { GITHUB_TOKEN: "test-github" }).gitHubToken, "test-github");
    assert.equal(clientConfig(raw, {}, {}).gitHubToken, undefined);
    assert(unchanged(raw.baselineHashes, await hashes(raw.workDir)));
    assert(!unchanged({ source: "original" }, { source: "edited" }));
  } finally {
    await rm(raw.root, { recursive: true });
    await rm(treatment.root, { recursive: true });
  }
});

test("path and container ownership reject neighboring and unrelated resources", () => {
  assert(inside("/tmp/run/app", "/tmp/run/app/src/file.cs"));
  assert(!inside("/tmp/run/app", "/tmp/run/application/file.cs"));
  assert(!inside("/tmp/run/app", "/tmp/other"));
  assert(!inside("/tmp/run/app", "/tmp/run/app"));
  const run = { id: "aspirebench-a", config: { kind: "compose" } };
  const container = { Name: "/anything", Config: { Labels: { "com.docker.compose.project": "aspirebench-a" } } };
  assert(ownsContainer(run, container));
  assert(!ownsContainer({ ...run, id: "aspirebench-b" }, container));
  const treatment = { ...run, config: { kind: "aspire" } };
  assert(ownsContainer(treatment, { ...container, Name: "/aspirebench-a-postgres" }));
  assert(!ownsContainer(treatment, { ...container, Name: "/aspirebench-a-postgres-unrelated" }));
});
