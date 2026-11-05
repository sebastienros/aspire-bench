import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compileFunction } from "node:vm";
import { createHash } from "node:crypto";

test("F01 v2 preserves the original grader-invalid cloud result and exact model patch", async () => {
    const read = file => readFile(new URL(`./${file}`, import.meta.url), "utf8");
    const correction = JSON.parse(await read("evidence/f01-grader-v2.json"));
    assert.equal(correction.exact_replacements.length, 2);
    assert.equal(correction.original_cloud_attempt.original_native_reward, 0);
    assert.equal(correction.original_cloud_attempt.grading_validity, "invalid-extra-frontend-write-requirement");
    assert.equal(correction.replay.new_model_runs, 0);
    assert.equal(correction.replay.reference_application_solution_used, false);
    for (const [file, hash] of Object.entries(correction.original_cloud_attempt.native_evidence)) {
        assert.equal(createHash("sha256").update(await read(`evidence/${file}`)).digest("hex"), hash);
    }
    const original = JSON.parse(await read("evidence/f01-aspire-original-cloud-result.json"));
    assert.equal(original.verifier_result.rewards.reward, 0);
    assert.equal(original.exception_info, null);
    assert.match(await read("evidence/f01-aspire-original-cloud-verifier.txt"),
        /\/api\/demo\/producer\/squares\/import: HTTP 404/);
    const patch = await read("evidence/f01-aspire-original-model-source.patch");
    assert.equal((patch.match(/^diff --git /gm) ?? []).length, 4);
    assert(patch.includes("'/api/demo/producer/catalog':"));
    assert(!patch.includes("'/api':"));
});

test("F01 accepts a catalog-only player proxy while checking legacy admin errors", async () => {
    const source = await readFile(new URL("./common/evolution.mjs", import.meta.url), "utf8");
    const body = source.split("export async function verifyFeature(urls) {\n")[1]
        .split("\n}\n\nconst descriptionRoute")[0];
    const urls = { admin: "http://admin.example", frontend: "http://player.example" };
    const squares = new Map();
    const called = new Set();
    const calls = [];
    let counter = 0;
    const scope = {
        assert,
        nonce: () => String(++counter).padStart(24, "0"),
        root: "/api/demo/producer",
        literal: value => `'${value.replaceAll("'", "''")}'`,
        json: value => ({ method: "POST", body: value }),
        console: { log() {} },
        async rows() {
            return [...squares.values()].map(({ id, label, type, isActive }) => ({
                Id: id, Label: label, Type: type, IsActive: isActive,
            }));
        },
        async sql(query) {
            const id = query.match(/WHERE "Id"='([^']+)'/)[1];
            return squares.get(id).label;
        },
        async redis(operation, key, field) {
            assert.equal(operation, "HGET");
            assert.equal(field, "data");
            return called.has(key.slice("global_square_".length)) ? "True" : "False";
        },
        async catalog(origin, type) {
            assert([urls.frontend, urls.admin].includes(origin));
            calls.push({ origin, route: "/api/demo/producer/catalog", method: "GET" });
            return [...squares.values()].filter(item => item.isActive && (type === undefined || item.type === type))
                .sort((a, b) => a.id.localeCompare(b.id))
                .map(({ id, label, type }) => ({ id, label, type, isChecked: called.has(id) }));
        },
        checkCatalog(actual, expected) {
            assert.deepEqual(actual, expected);
        },
        async request(origin, route, init, expected = 200) {
            const method = init?.method ?? "GET";
            calls.push({ origin, route, method, expected });
            // The baseline player does not proxy producer writes; only catalog was requested.
            if (origin === urls.frontend && method !== "GET") {
                assert.equal(404, expected, "F01 must not require adding a producer write proxy");
                return;
            }
            assert.equal(origin, urls.admin, "Existing producer mutations stay on their original origin");
            if (route.endsWith("/squares/import")) {
                if (!init.body.length) {
                    assert.equal(expected, 400);
                    return;
                }
                for (const item of init.body) squares.set(item.id, { ...item });
            } else if (route.endsWith("/status")) {
                return { json: async () => ({ calledSquares: [...called] }) };
            } else {
                const match = route.match(/\/squares\/([^/]+)\/state\/(true|false)$/);
                assert(match);
                if (!squares.has(match[1])) {
                    assert.equal(expected, 404);
                    return;
                }
                if (match[2] === "true") called.add(match[1]);
                else called.delete(match[1]);
            }
            assert.equal(expected, 200);
        },
    };
    const verify = compileFunction(`return (async () => {\n${body}\n})();`, ["urls"], {
        contextExtensions: [scope],
    });
    await verify(urls);
    const negativeCalls = calls.filter(call => call.expected === 400 || call.expected === 404);
    assert.deepEqual(negativeCalls.map(call => ({ origin: call.origin, status: call.expected })), [
        { origin: urls.admin, status: 400 },
        { origin: urls.admin, status: 404 },
    ]);
    assert(calls.some(call => call.origin === urls.frontend && call.route.endsWith("/catalog")));
    assert(calls.filter(call => call.method !== "GET").every(call => call.origin === urls.admin));
    const oldBody = body
        .replace("request(urls.admin, `${root}/squares/import`, json([]), 400)",
            "request(urls.frontend, `${root}/squares/import`, json([]), 400)")
        .replace('request(urls.admin, `${root}/squares/missing-${nonce()}/state/true`, { method: "POST" }, 404)',
            'request(urls.frontend, `${root}/squares/missing-${nonce()}/state/true`, { method: "POST" }, 404)');
    assert.notEqual(oldBody, body);
    const oldVerify = compileFunction(`return (async () => {\n${oldBody}\n})();`, ["urls"], {
        contextExtensions: [scope],
    });
    await assert.rejects(oldVerify(urls), /F01 must not require adding a producer write proxy/);
});
