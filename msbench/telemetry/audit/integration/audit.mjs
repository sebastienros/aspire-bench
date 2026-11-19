// PLAN T4.1 integration discoverability audit. Runs inside the suite's app-aspire image (pin CLI,
// private dockerd) with this folder mounted at /audit and the evidence folder at /out.
//   node audit.mjs row <row>      start that row's AppHost, score Q1-Q6, stop it, write /out/<row>/
//   node audit.mjs matrix         read /out/*/score.json and write /out/matrix.md and matrix.json
// The scoring follows PLAN.md "T4.1 scoring, as computed"; the recipes are in rows.json.
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, cpSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const aspire = "/usr/local/aspire/aspire";
const rows = JSON.parse(readFileSync("/audit/rows.json", "utf8")).rows;
const out = "/out";
let transcript = [];

// Every command is recorded with its exit code, duration and (masked) output.
async function sh(cmd, args, { timeout = 60_000, record = true, mask = [] } = {}) {
    const started = Date.now();
    let code = 0, stdout = "", stderr = "";
    try {
        ({ stdout, stderr } = await run(cmd, args, { timeout, maxBuffer: 64 << 20 }));
    } catch (error) {
        code = typeof error.code === "number" ? error.code : (error.killed ? "timeout" : String(error.code ?? "error"));
        stdout = error.stdout ?? ""; stderr = error.stderr ?? String(error.message);
    }
    const hide = text => mask.filter(Boolean).reduce((t, secret) => t.split(secret).join("<secret>"), text);
    const entry = { cmd: hide([cmd, ...args].join(" ")), code, seconds: (Date.now() - started) / 1000,
        stdout: hide(stdout).slice(0, 4000), stderr: hide(stderr).slice(0, 2000) };
    if (record) transcript.push(entry);
    return { code, stdout, stderr };
}

// Every command names the row's AppHost (docker exec starts in /app, which holds Bingo's).
let apphost = "";
const A = (...args) => sh(aspire, [...args, "--apphost", apphost, "--non-interactive", "--nologo"], { timeout: 900_000 });

async function describe(resource) {
    const { stdout } = await sh(aspire, ["describe", resource, "--format", "Json", "--apphost", apphost, "--non-interactive", "--nologo"], { record: false });
    try {
        const parsed = JSON.parse(stdout.slice(stdout.indexOf("{")));
        return (parsed.resources ?? []).find(r => r.displayName === resource || r.name === resource) ?? null;
    } catch { return null; }
}

function healthText(r) {
    if (!r) return "no resource";
    const reports = Object.entries(r.healthReports ?? {}).map(([key, value]) =>
        `${key}=${value.status}${value.description ? ` (${value.description})` : ""}${value.exceptionText ? ` [${value.exceptionText.split("\n")[0].slice(0, 200)}]` : ""}`);
    return `state=${r.state} health=${r.healthStatus ?? "none"} ${reports.join("; ")}`.trim();
}

async function waitFor(resource, predicate, seconds) {
    const until = Date.now() + seconds * 1000;
    let last = null;
    while (Date.now() < until) {
        last = await describe(resource);
        if (last && predicate(last)) return { ok: true, r: last };
        await sleep(3000);
    }
    return { ok: false, r: last };
}
const healthy = r => r.state === "Running" && (!r.healthReports || Object.keys(r.healthReports).length === 0 || r.healthStatus === "Healthy");

// Placeholders in recipes: {id}, {port:N} (host port for container port N), {env:NAME}, {arg:--flag}.
async function expand(command, ctx) {
    let text = command.replaceAll("{id}", ctx.id);
    for (const [, port] of text.matchAll(/\{port:(\d+)\}/g)) {
        const { stdout } = await sh("docker", ["port", ctx.id, `${port}/tcp`], { record: false });
        text = text.replaceAll(`{port:${port}}`, (stdout.split("\n")[0] ?? "").split(":").pop() || "NOPORT");
    }
    for (const [, name] of text.matchAll(/\{env:([A-Za-z0-9_]+)\}/g)) text = text.replaceAll(`{env:${name}}`, ctx.env[name] ?? "");
    for (const [, flag] of text.matchAll(/\{arg:(--[a-z]+)\}/g)) {
        const i = ctx.args.indexOf(flag);
        text = text.replaceAll(`{arg:${flag}}`, i >= 0 ? ctx.args[i + 1] : "");
    }
    return text;
}

async function attempt(command, expect, ctx) {
    const host = command.startsWith("host: ");
    const text = await expand(host ? command.slice(6) : command, ctx);
    const result = host
        ? await sh("bash", ["-c", text], { timeout: 60_000, mask: ctx.secrets })
        : await sh("docker", ["exec", ctx.id, "sh", "-c", text], { timeout: 20_000, mask: ctx.secrets });
    const ok = result.code === 0 && (!expect || result.stdout.includes(expect));
    return { command, where: host ? "host" : "container", ok, code: result.code,
        output: (result.stdout + result.stderr).split(ctx.secrets.filter(Boolean)[0] ?? "\u0000").join("<secret>").trim().slice(0, 300) };
}

async function scoreRow(def) {
    const dir = `${out}/${def.row}`;
    mkdirSync(dir, { recursive: true });
    transcript = [];
    const score = { row: def.row, hosting: `Aspire.Hosting.${def.hosting}`, resource: def.resource, notes: [] };
    cpSync("/audit", "/work", { recursive: true });
    apphost = `/work/apphosts/${def.row}/apphost.cs`;
    const started = Date.now();
    const start = await A("start", "--isolated");
    score.startSeconds = (Date.now() - started) / 1000;
    if (start.code !== 0) { score.skipped = `aspire start failed (exit ${start.code})`; return finish(dir, score); }
    const up = await waitFor(def.resource, healthy, 600);
    writeFileSync(`${dir}/describe-up.json`, JSON.stringify(up.r, null, 2));
    if (!up.ok) {
        score.skipped = `cannot run here: ${def.resource} not Running/Healthy in 600 s (${healthText(up.r)})`;
        await sh("docker", ["ps", "-a", "--format", "{{.Names}} {{.Image}} {{.Status}}"]);
        await A("logs", def.resource, "-n", "40");
        return finish(dir, score);
    }
    await waitFor("audit-client", r => r.state === "Running", 300);
    const upAt = Date.now();
    const r = up.r;

    // Q1 container
    const id = r.properties?.["container.id"] ?? null;
    const ps = id ? await sh("docker", ["ps", "-q", "--no-trunc", "--filter", `id=${id}`]) : { stdout: "" };
    score.q1 = { pass: Boolean(id) && ps.stdout.trim() === id, containerId: id ? id.slice(0, 12) : null,
        image: r.properties?.["container.image"] ?? r.source ?? null };

    // Q2 credentials. Values are never written out; only names and whether describe has a value.
    const inspect = JSON.parse((await sh("docker", ["inspect", id], { record: false })).stdout || "[{}]")[0] ?? {};
    const env = Object.fromEntries((inspect.Config?.Env ?? []).map(line => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]));
    const args = inspect.Args ?? [];
    const credentialNames = Object.keys(env).filter(k => /PASS|SECRET|KEY|USER|AUTH|TOKEN/i.test(k) && !/^(SSL_|GPG_|PATH$)/.test(k));
    const secrets = credentialNames.filter(k => /PASS|SECRET|KEY|AUTH|TOKEN/i.test(k)).map(k => env[k]).filter(v => v && v.length > 3);
    for (const flag of ["--pass", "--requirepass", "--password"]) { const i = args.indexOf(flag); if (i >= 0 && args[i + 1]) secrets.push(args[i + 1]); }
    const ctx = { id, env, args, secrets };
    const describeEnv = r.environment ?? {};
    const describeValues = Object.entries(describeEnv).filter(([k, v]) => credentialNames.includes(k) && v !== null).map(([k]) => k);
    const connectionString = r.properties?.["resource.connectionString"] ?? null;
    const argCredentials = args.some(a => ["--pass", "--requirepass", "--password"].includes(a));
    score.q2 = {
        containerEnv: credentialNames,
        credentialArgs: argCredentials,
        describeEnvNames: Object.keys(describeEnv).filter(k => credentialNames.includes(k)),
        describeValues,
        describeConnectionString: connectionString !== null,
    };
    score.q2.noAuth = credentialNames.length === 0 && !argCredentials;
    score.q2.pass = score.q2.noAuth || credentialNames.length > 0 || describeValues.length > 0 || score.q2.describeConnectionString;

    // Q3 generic recipe, then alternatives in order.
    const shell = await sh("docker", ["exec", id, "sh", "-c", "true"]);
    const toolCheck = shell.code === 0 ? await sh("docker", ["exec", id, "sh", "-c", `command -v ${def.tool} || test -x ${def.tool}`]) : { code: 1 };
    const generic = shell.code === 0 ? await attempt(def.generic, def.expect, ctx) : { command: def.generic, ok: false, code: "no shell", output: shell.stderr.trim().slice(0, 200) };
    const alternatives = [];
    if (!generic.ok) {
        for (const alt of def.alternatives ?? []) {
            const result = await attempt(alt, def.expect, ctx);
            alternatives.push(result);
            if (result.ok) break;
        }
    }
    const urls = r.urls ?? [];
    score.q3 = { pass: generic.ok, shell: shell.code === 0, toolInImage: toolCheck.code === 0, generic, alternatives,
        works: generic.ok ? generic.command : (alternatives.find(a => a.ok)?.command ?? null),
        endpoints: urls.map(u => `${u.name}=${u.url.replace(/\/\/[^@/]*@/, "//")}`),
        tlsPrimary: urls.some(u => /^(rediss|https|amqps|tls):/.test(u.url) && /^(tcp|https|http|primary)$/.test(u.name)) };

    // Q4 client span: the client has run at least 30 s.
    const waitSpan = 30_000 - (Date.now() - upAt);
    if (waitSpan > 0) await sleep(waitSpan);
    if (def.row === "seq") {
        score.q4 = { pass: null, na: "telemetry sink, no client call to trace" };
    } else {
        const spans = await sh(aspire, ["otel", "spans", "audit-client", "--format", "Json", "-n", "200", "--apphost", apphost, "--non-interactive", "--nologo"], { timeout: 120_000, record: false });
        writeFileSync(`${dir}/spans.json`, spans.stdout);
        score.q4 = scoreSpans(spans.stdout, def);
    }

    // Q5 hung, then down.
    score.q5 = { refusing: "not induced" };
    score.q5.healthy = healthText(await describe(def.resource));
    score.q5.hasReport = Object.keys((await describe(def.resource))?.healthReports ?? {}).length > 0;
    await sh("docker", ["pause", id]);
    const hung = await waitFor(def.resource, x => x.healthStatus !== "Healthy", 60);
    score.q5.hung = healthText(hung.r);
    score.q5.hungLeftHealthy = hung.ok;
    await sh("docker", ["unpause", id]);
    const back = await waitFor(def.resource, healthy, 180);
    score.q5.recoveredAfterHung = back.ok;
    await sh("docker", ["kill", id]);
    await sleep(15_000);
    score.q5.down = healthText(await describe(def.resource));
    await A("resource", def.resource, "start");
    const restarted = await waitFor(def.resource, healthy, 300);
    score.q5.recoveredAfterDown = restarted.ok;
    score.q5.startReplacedContainer = Boolean(restarted.r?.properties?.["container.id"] && restarted.r.properties["container.id"] !== id);
    score.q5.pass = score.q5.hasReport && score.q5.hungLeftHealthy && score.q5.hung !== score.q5.down;

    // Q6 restart.
    const before = await describe(def.resource);
    const commands = before?.commands ?? {};
    score.q6 = { commands: Object.keys(commands), restartEnabled: commands.restart?.state === "Enabled",
        extraCommands: Object.keys(commands).filter(c => !["start", "stop", "restart", "rebuild"].includes(c)) };
    const idBefore = before?.properties?.["container.id"];
    // Marker written just before the restart (not gating), on the container that is running now.
    if (def.marker && idBefore) score.marker = { written: (await attempt(def.marker.write, "", { ...ctx, id: idBefore })).ok };
    const restart = await A("resource", def.resource, "restart");
    const after = await waitFor(def.resource, healthy, 120);
    score.q6.restartExit = restart.code;
    score.q6.backHealthy = after.ok;
    const idAfter = after.r?.properties?.["container.id"];
    score.q6.containerReplaced = Boolean(idBefore && idAfter && idBefore !== idAfter);
    score.q6.pass = score.q6.restartEnabled && restart.code === 0 && after.ok;
    if (def.marker && score.marker?.written && idAfter) {
        const readCtx = { ...ctx, id: idAfter };
        score.marker.kept = (await attempt(def.marker.read, "kept", readCtx)).ok;
    }
    writeFileSync(`${dir}/describe-end.json`, JSON.stringify(after.r, null, 2));
    return finish(dir, score);
}

// A client span to the dependency: kind client/producer from audit-client, other than the audit.op
// parent and the OTLP export itself, and whether it carries the statement / command / destination.
function scoreSpans(text, def) {
    let data;
    try { data = JSON.parse(text.slice(Math.max(0, text.search(/[[{]/)))); } catch { return { pass: false, error: "unparsable spans output", bytes: text.length }; }
    const spans = Array.isArray(data) ? data : (data.spans ?? data.items ?? data.data ?? []);
    const flat = spans.flatMap(s => s.spans ?? [s]);
    const attrs = s => Object.fromEntries((s.attributes ?? s.tags ?? []).map?.(a => [a.key ?? a.name, a.value]) ?? Object.entries(s.attributes ?? {}));
    const dependency = flat.filter(s => {
        const name = s.name ?? s.displayName ?? "";
        if (name === "audit.op") return false;
        const a = attrs(s);
        const kind = String(s.kind ?? s.spanKind ?? "").toLowerCase();
        const external = ["client", "producer"].some(k => kind.includes(k)) || a["db.system"] || a["db.system.name"] || a["messaging.system"];
        const otlp = /\/v1\/(traces|logs|metrics)|opentelemetry/i.test(JSON.stringify(a));
        return external && !otlp;
    });
    const statementKeys = ["db.query.text", "db.statement", "db.operation.name", "db.operation", "messaging.destination.name", "messaging.operation.name", "url.full", "http.url", "db.collection.name"];
    const withStatement = dependency.filter(s => statementKeys.some(k => attrs(s)[k]));
    const sample = (withStatement[0] ?? dependency[0]) ?? null;
    return {
        pass: withStatement.length > 0,
        spanNoStatement: dependency.length > 0 && withStatement.length === 0,
        totalSpans: flat.length,
        dependencySpans: dependency.length,
        sample: sample ? { name: sample.name ?? sample.displayName, kind: sample.kind ?? sample.spanKind,
            attributes: Object.fromEntries(Object.entries(attrs(sample)).filter(([k]) => /^(db|messaging|server|url|http|rpc|net|peer|az|cosmos)/.test(k)).slice(0, 12)) } : null,
        names: [...new Set(flat.map(s => s.name ?? s.displayName))].slice(0, 15),
    };
}

async function finish(dir, score) {
    await A("stop");
    await sleep(5000);
    await sh("bash", ["-c", "docker ps -aq | xargs -r docker rm -f; docker volume prune -af; docker network prune -f; docker image prune -af"], { record: false });
    writeFileSync(`${dir}/score.json`, JSON.stringify(score, null, 2));
    writeFileSync(`${dir}/commands.json`, JSON.stringify(transcript, null, 2));
    console.log(JSON.stringify(score, null, 2));
    return score;
}

const mark = v => v === true ? "pass" : v === false ? "FAIL" : v ?? "n/a";
function matrix() {
    const scored = rows.map(def => def.skip ? { row: def.row, skipped: def.skip }
        : existsSync(`${out}/${def.row}/score.json`) ? JSON.parse(readFileSync(`${out}/${def.row}/score.json`, "utf8")) : { row: def.row, skipped: "not run" });
    writeFileSync(`${out}/matrix.json`, JSON.stringify(scored, null, 2));
    const head = "| Row | Q1 container | Q2 credentials | Q3 generic recipe | Tool in image | TLS on primary | Works instead | Q4 client span | Q5 health text | Q6 restart | Restart replaces container / data kept |\n|---|---|---|---|---|---|---|---|---|---|---|";
    const lines = scored.map(s => {
        if (s.skipped) return `| ${s.row} | ${s.skipped} ||||||||||`;
        const cred = s.q2.noAuth ? "n/a (no auth)" : `${mark(s.q2.pass)}: env ${s.q2.containerEnv.join(", ") || "none"}${s.q2.credentialArgs ? "; args" : ""}; describe ${s.q2.describeValues.length ? "values" : s.q2.describeConnectionString ? "connection string" : "names only"}`;
        const span = s.q4.na ? `n/a (${s.q4.na})` : s.q4.pass ? `pass: ${s.q4.sample?.name}` : s.q4.spanNoStatement ? `FAIL: span, no statement (${s.q4.sample?.name})` : `FAIL: none (${s.q4.dependencySpans} of ${s.q4.totalSpans})`;
        const works = s.q3.pass ? "" : s.q3.works ? `\`${s.q3.works}\`` : "nothing listed worked";
        return `| ${s.row} | ${mark(s.q1.pass)} | ${cred} | ${mark(s.q3.pass)} | ${s.q3.toolInImage ? "yes" : s.q3.shell ? "no" : "no (no shell)"} | ${s.q3.tlsPrimary ? "yes" : "no"} | ${works} | ${span} | ${mark(s.q5.pass)} | ${mark(s.q6.pass)} | ${s.q6.containerReplaced ? "replaced" : "same"} / ${s.marker ? (s.marker.kept ? "kept" : s.marker.written ? "lost" : "not written") : "n/a"} |`;
    });
    const health = scored.filter(s => !s.skipped).map(s => `| ${s.row} | ${s.q5.healthy} | ${s.q5.hung} | ${s.q5.down} |`);
    writeFileSync(`${out}/matrix.md`, `${head}\n${lines.join("\n")}\n\nHealth text read from \`describe\` (Q5; refusing writes not induced):\n\n| Row | Healthy | Hung (docker pause) | Down (docker kill, +15 s) |\n|---|---|---|---|\n${health.join("\n")}\n`);
    console.log(readFileSync(`${out}/matrix.md`, "utf8"));
}

const [mode, name] = process.argv.slice(2);
if (mode === "row") {
    const def = rows.find(r => r.row === name);
    if (!def || def.skip) throw new Error(`No runnable row ${name}`);
    await scoreRow(def);
} else if (mode === "matrix") matrix();
else throw new Error("Usage: audit.mjs row <row> | matrix");
