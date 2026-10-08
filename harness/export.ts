import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { isStimulusGradeResult } from "@microsoft/vally";

type Json = Record<string, unknown>;
function object(value: unknown): Json {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}
function text(value: unknown, fallback = "unknown") {
  return typeof value === "string" && value.length ? value : fallback;
}
function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function variantName(value: unknown): string {
  assert(typeof value === "string" && /^[a-z][a-z0-9-]*$/.test(value), "Invalid recorded variant name");
  return value;
}
function repetition(value: unknown): number {
  assert(Number.isSafeInteger(value) && Number(value) > 0, "Invalid recorded repetition");
  return Number(value);
}

async function safeFile(root: string, relative: string): Promise<string | undefined> {
  const file = path.resolve(root, relative);
  assert(file.startsWith(root + path.sep), "Artifact path escapes the run");
  try {
    assert((await lstat(file)).isFile(), `Artifact is not a regular file: ${relative}`);
    assert.equal(await realpath(file), file, `Artifact traverses a symlink: ${relative}`);
    return file;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
async function json(root: string, relative: string): Promise<unknown> {
  const file = await safeFile(root, relative);
  if (!file) return undefined;
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { throw new Error(`Cannot parse ${relative}`, { cause: error }); }
}
async function exitCode(root: string, relative: string): Promise<number | undefined> {
  const file = await safeFile(root, relative);
  if (!file) return undefined;
  const value = (await readFile(file, "utf8")).trim();
  assert(/^\d+$/.test(value), `Invalid lifecycle marker: ${relative}`);
  return Number(value);
}
async function nativeRecord(root: string, trial: string): Promise<Json | undefined> {
  const direct = await safeFile(root, `${trial}/results.jsonl`);
  const files = direct ? [direct] : [];
  for (const entry of await readdir(path.join(root, trial), { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "session-logs") continue;
    const file = await safeFile(root, `${trial}/${entry.name}/results.jsonl`);
    if (file) files.push(file);
  }
  assert(files.length <= 1, `Multiple native result files in ${trial}`);
  if (!files.length) return undefined;
  const records: Json[] = [];
  for (const line of (await readFile(files[0], "utf8")).split("\n").filter(line => line.trim())) {
    let value: unknown;
    try { value = JSON.parse(line); }
    catch (error) { throw new Error(`Malformed native results in ${trial}`, { cause: error }); }
    const item = object(value);
    if (item.type === "trial-result" || (!item.type && item.status)) records.push(item);
  }
  assert(records.length <= 1, `Multiple native trials in ${trial}`);
  return records[0];
}

export interface ExportInput {
  metadata: Json;
  variant: string;
  repetition: number;
  native?: Json;
  proof?: Json;
  agent?: Json;
  workspace?: Json;
  plan?: Json;
  legacy?: Json;
  exitCode?: number;
  cleanupExitCode?: number;
}

export function compatibleOutcome(input: ExportInput): Json {
  const { metadata, variant, repetition: index } = input;
  variantName(variant);
  repetition(index);
  const original = input.native ?? {};
  assert(!input.native || ["success", "error", "skipped"].includes(text(original.status)),
    "Invalid native outcome status");
  const trajectory = Object.keys(object(original.trajectory)).length ? object(original.trajectory) : null;
  const rawGrade = original.gradeResult ?? original.grade;
  assert(rawGrade == null || isStimulusGradeResult(rawGrade), "Invalid native grading result");
  const nativeGrade = object(rawGrade);
  const proof = input.proof ?? {};
  const scripted = metadata.lifecycle === "scripts";
  if (input.legacy) {
    assert(typeof input.legacy.success === "boolean", "Invalid recorded legacy verdict");
  }
  let outcome: string;
  if (!scripted) {
    outcome = input.legacy?.success === true ? "pass"
      : original.status === "error" || input.legacy?.status === "error" ? "execution-error"
      : input.legacy ? "objective-fail" : "incomplete";
  } else if ((input.cleanupExitCode !== undefined && input.cleanupExitCode !== 0) || proof.cleanupError) {
    outcome = "cleanup-fail";
  } else if (original.status === "error" || (input.exitCode !== undefined && input.exitCode !== 0 && !rawGrade)) {
    outcome = "execution-error";
  } else if (input.exitCode === undefined || input.cleanupExitCode === undefined || !rawGrade
    || typeof proof.passed !== "boolean") {
    outcome = "incomplete";
  } else if (input.exitCode === 0 && nativeGrade.passed === true && proof.passed === true) {
    outcome = "pass";
  } else {
    outcome = "objective-fail";
  }
  const passed = outcome === "pass";
  const sourceGrade = isStimulusGradeResult(rawGrade) ? rawGrade : undefined;
  const scenario = text(metadata.scenario, "launch-and-verify");
  const model = text(object(trajectory?.metadata).model, text(original.model, text(metadata.model)));
  const cohort = variant.endsWith("-bugs") ? "bugs" : "healthy";
  const baseline = text(metadata.baseline, "raw");
  const effectiveBaseline = cohort === "bugs" && !baseline.endsWith("-bugs") ? `${baseline}-bugs` : baseline;
  const metrics = object(trajectory?.metrics);
  const missingMetrics = [
    ["agent time", metrics.wallTimeMs], ["tokens", object(metrics.tokenUsage).totalTokens],
    ["tool calls", metrics.toolCallCount], ["turns", metrics.turnCount],
  ].filter(([, value]) => typeof value !== "number" || !Number.isFinite(value)).map(([name]) => name);
  const evidence = [
    `Recorded harness outcome: ${outcome}.`,
    scripted ? `Trial exit=${input.exitCode ?? "missing"}; cleanup exit=${input.cleanupExitCode ?? "missing"}.`
      : "Historical verdict preserved from paired.json; no modern lifecycle markers inferred.",
    `Provenance: model=${model}; harness commit=${text(metadata.commit)}; cohort=${cohort}.`,
    typeof metadata.model === "string" && metadata.model !== model
      ? `Declared model ${metadata.model} differs from native model ${model}; native identity is used.` : "",
    object(metadata.variantDefinitions)[variant]
      ? `Recorded variant definition: ${JSON.stringify(object(metadata.variantDefinitions)[variant])}.`
      : "No variant definition recorded; interpret raw using this run's original commit, not today's registry.",
    missingMetrics.length ? `Unavailable metrics: ${missingMetrics.join(", ")}. Vally 0.18 charts may display these as zero; they are NOT zero-cost measurements.` : "",
  ].filter(Boolean).join(" ");
  const details = [...(sourceGrade?.details ?? []), {
    name: "harness-lifecycle", kind: "code", status: "success", graderType: "program",
    passed, score: passed ? 1 : 0, evidence,
  }];
  const sourceError = original.error ?? proof.error ?? input.legacy?.error;
  return {
    ...original,
    type: "trial-result",
    itemId: `${variant}__trial-${index - 1}`,
    variant, trialIndex: index - 1, model,
    evalName: `${scenario} [${cohort}; ${model}; ${text(metadata.commit).slice(0, 12)}]`,
    evalFilePath: `scenarios/${scenario}.yaml`,
    stimulus: text(original.stimulus, text(object(trajectory?.stimulus).name, scenario)),
    status: ["execution-error", "incomplete"].includes(outcome) ? "error" : "success",
    ...(passed ? {} : { error: text(sourceError, evidence) }),
    trajectory,
    gradeResult: {
      name: "harness-objective-and-lifecycle", kind: "code", passed, score: passed ? 1 : 0,
      evidence, details, stimulusName: scenario, trajectoryId: text(trajectory?.id, `missing-${variant}-${index}`),
      timestamp: text(metadata.startedAt),
    },
    experiment: {
      name: `aspire-bench/${text(metadata.app, "bingo")}/${scenario}/${cohort}/${model}/${text(metadata.commit).slice(0, 12)}`,
      runId: "", variant, baseline: effectiveBaseline,
      evalFile: text(input.plan?.relativeEvalFile, `scenarios/${scenario}.yaml`),
      evalHash: text(input.plan?.evalHash, digest({ scenario, model, commit: metadata.commit })),
      configHash: text(input.plan?.configHash, digest({ definition: object(metadata.variantDefinitions)[variant],
        versions: metadata.versions, model, commit: metadata.commit, patches: input.workspace?.patches })),
    },
    harness: {
      exportVersion: 1, outcome, cohort, repetition: index,
      nativeStatus: original.status ?? null, nativePassed: nativeGrade.passed ?? null,
      declaredModel: metadata.model ?? null,
      objectivePassed: proof.objectivePassed ?? proof.passed ?? null,
      checks: Array.isArray(proof.checks) ? proof.checks : [],
      exitCode: input.exitCode ?? null, cleanupExitCode: input.cleanupExitCode ?? null,
      missingMetrics,
      setupMs: input.agent?.setupMs ?? input.legacy?.setupMs ?? null,
      verificationMs: proof.verificationMs ?? input.legacy?.verificationMs ?? null,
      variantDefinition: object(metadata.variantDefinitions)[variant] ?? null,
      patches: input.workspace?.patches ?? [],
    },
  };
}

export async function exportVally(directory: string): Promise<string> {
  const root = await realpath(directory);
  const metadataValue = await json(root, "metadata.json");
  assert(metadataValue && !Array.isArray(metadataValue) && typeof metadataValue === "object",
    "A harness run folder with metadata.json is required");
  const metadata = object(metadataValue);
  const legacyValue = metadata.lifecycle !== "scripts" ? await json(root, "paired.json") : undefined;
  assert(legacyValue === undefined || Array.isArray(legacyValue), "Invalid legacy paired.json");
  const legacy = Array.isArray(legacyValue) ? legacyValue.map(object) : [];
  if (metadata.lifecycle !== "scripts") {
    assert(legacy.length, "Legacy export requires original paired.json verdicts; native grades alone are insufficient");
  }
  const trials = new Map<string, { variant: string; repetition: number; directory?: string; legacy?: Json }>();
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const match = /^(\d+)-([a-z][a-z0-9-]*)$/.exec(entry.name);
    if (!match) continue;
    assert(entry.isDirectory() && !entry.isSymbolicLink(), "Trial input must be a real directory");
    const workspace = object(await json(root, `${entry.name}/workspace.json`));
    const variant = variantName(workspace.variant ?? match[2]);
    const index = repetition(workspace.repetition ?? Number(match[1]));
    assert.equal(entry.name, `${index}-${variant}`, "Trial identity disagrees with workspace.json");
    trials.set(entry.name, { variant, repetition: index, directory: entry.name });
  }
  for (const trial of legacy) {
    const variant = variantName(trial.variant), index = repetition(trial.trial);
    const key = `${index}-${variant}`;
    trials.set(key, { ...trials.get(key), variant, repetition: index, legacy: trial });
  }
  if (Array.isArray(metadata.variants) && Number.isSafeInteger(metadata.pairs) && Number(metadata.pairs) > 0) {
    assert(Number(metadata.pairs) <= 10_000, "Too many recorded repetitions");
    for (const name of metadata.variants) for (let index = 1; index <= Number(metadata.pairs); index++) {
      const variant = variantName(name), key = `${index}-${variant}`;
      if (!trials.has(key)) trials.set(key, { variant, repetition: index });
    }
  }
  assert(trials.size, "No harness trials found");
  const records: Json[] = [];
  for (const trial of trials.values()) {
    const base = trial.directory;
    records.push(compatibleOutcome({
      metadata, variant: trial.variant, repetition: trial.repetition, legacy: trial.legacy,
      ...(base ? {
        native: await nativeRecord(root, base),
        proof: object(await json(root, `${base}/proof.json`)),
        agent: object(await json(root, `${base}/agent.json`)),
        workspace: object(await json(root, `${base}/workspace.json`)),
        plan: object(await json(root, `${base}/plan.json`)),
        exitCode: await exitCode(root, `${base}/exit-code`),
        cleanupExitCode: await exitCode(root, `${base}/cleanup-exit-code`),
      } : {}),
    }));
  }
  records.sort((a, b) => String(a.variant).localeCompare(String(b.variant)) || Number(a.trialIndex) - Number(b.trialIndex));
  const revision = digest({ metadata, records });
  const destination = path.join(root, "vally-export", revision.slice(0, 16));
  const manifest = {
    format: "aspire-bench-vally-export", version: 1, revision,
    model: metadata.model, commit: metadata.commit, versions: metadata.versions,
    startedAt: metadata.startedAt, scenario: metadata.scenario,
    variantDefinitions: metadata.variantDefinitions ?? null,
    warnings: [
      "Derived export; original native results and recorded legacy verdicts remain unchanged.",
      "Healthy and bugs use separate experiment identities and matching baseline names.",
      "Never pool historical raw meanings, models or harness versions without inspecting recorded provenance.",
      "Vally 0.18 displays some unavailable metrics as zero. Consult harness.missingMetrics and lifecycle grader evidence.",
      "Trajectories contain original local output and may contain secrets. Do not publish or expose externally.",
    ],
  };
  for (const record of records) {
    const exp = object(record.experiment);
    exp.runId = `aspire-bench-${revision.slice(0, 24)}-${text(object(record.harness).cohort)}`;
    record.runId = exp.runId;
  }
  const existing = await json(root, path.relative(root, path.join(destination, "export.json")));
  if (existing !== undefined) {
    assert.equal(object(existing).revision, revision, "Existing export snapshot does not match");
    for (const variant of new Set(records.map(record => variantName(record.variant)))) {
      const file = await safeFile(root, path.relative(root, path.join(destination, variant, "results.jsonl")));
      assert(file, "Existing export snapshot is incomplete");
      assert.equal(await readFile(file, "utf8"), encoded(records.filter(record => record.variant === variant)),
        "Existing export snapshot was modified");
    }
    return destination;
  }
  const parent = path.dirname(destination);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  assert.equal(await realpath(parent), parent, "Export directory must not traverse a symlink");
  const staging = await mkdtemp(path.join(parent, ".staging-"));
  try {
    for (const variant of new Set(records.map(record => variantName(record.variant)))) {
      const dir = path.join(staging, variant);
      await mkdir(dir, { mode: 0o700 });
      await writeFile(path.join(dir, "results.jsonl"),
        encoded(records.filter(record => record.variant === variant)), { mode: 0o600 });
    }
    await writeFile(path.join(staging, "export.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
    await rename(staging, destination);
  } catch (error) {
    try { await rm(staging, { recursive: true }); }
    catch (cleanupError) { throw new AggregateError([error, cleanupError], "Export and staging cleanup failed"); }
    throw error;
  }
  return destination;
}

function encoded(records: Json[]) {
  return records.sort((a, b) => Number(a.trialIndex) - Number(b.trialIndex))
    .map(record => JSON.stringify(record)).join("\n") + "\n";
}
