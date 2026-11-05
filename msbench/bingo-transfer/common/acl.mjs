import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const digest = value => createHash("sha256").update(value).digest("hex");
export const denyWrites = ["ACL", "SETUSER", "default", "-@write"];
export const restoreWrites = ["ACL", "SETUSER", "default", "+@write"];

export function normalizeAcl(lines) {
    assert(Array.isArray(lines) && lines.every(line => typeof line === "string"),
        "Actual Redis ACL LIST required");
    return [...lines].sort();
}

export function defaultAcl(lines) {
    const matches = normalizeAcl(lines).filter(line => line.startsWith("user default "));
    assert.equal(matches.length, 1, "Exactly one existing default Redis user required");
    const tokens = matches[0].split(" ");
    return {
        commands: tokens.filter(token => /^[+-]/.test(token)),
        credentials: tokens.filter(token => token.startsWith("#")),
        properties: tokens.filter(token => !/^[+-]/.test(token)),
    };
}

export function verifyInjectedAcl(before, after) {
    const original = defaultAcl(before);
    const denied = defaultAcl(after);
    assert.deepEqual(original.commands, ["+@all"], "Fixture must inherit the unrestricted default command grant");
    assert.deepEqual(denied.commands, ["+@all", "-@write"], "Only Redis write-category denial may be injected");
    assert.deepEqual(denied.properties, original.properties, "Fault must preserve users, keys, channels and credentials");
    assert.deepEqual(normalizeAcl(after).filter(line => !line.startsWith("user default ")),
        normalizeAcl(before).filter(line => !line.startsWith("user default ")),
        "Fault must not modify other Redis users");
}

export function verifyCredentials(acl, connection, config, containerEnv) {
    const fields = Object.fromEntries(connection.split(",").slice(1).map(part => {
        const split = part.indexOf("=");
        return [part.slice(0, split).trim().toLowerCase(), part.slice(split + 1).trim()];
    }));
    assert(!fields.user || fields.user === "default", "Fault must affect the backend's actual Redis user");
    const user = defaultAcl(acl);
    assert(user.properties.includes("on"), "Original Redis user must be enabled");
    if (fields.password) {
        assert(!user.properties.includes("nopass"), "Authenticated Redis must not be converted to nopass");
        assert(user.credentials.includes(`#${digest(fields.password)}`), "Actual backend password must match existing ACL");
        const password = containerEnv.find(entry => entry.startsWith("REDIS_PASSWORD="))?.slice(15);
        assert(password && digest(password) === digest(fields.password),
            "Native probes must use the existing container/backend credential");
    } else {
        assert(user.properties.includes("nopass") && user.credentials.length === 0,
            "Unauthenticated raw baseline must remain its original nopass configuration");
    }
    assert.equal(fields.ssl?.toLowerCase() === "true", Number(config["tls-port"]) > 0,
        "Backend TLS must match the actual Redis server configuration");
}

export function verifyAclRecovery(before, after) {
    assert.deepEqual(normalizeAcl(after), normalizeAcl(before),
        "Original Redis ACL/credentials must be restored exactly; no credential reset or broad permission change");
}

export function verifyTransferEvents(events, target) {
    for (const event of events) {
        const description = event.Action ?? event.status;
        assert.equal(typeof description, "string", "Docker event action required");
        const action = description.split(":")[0];
        assert(["exec_create", "exec_start", "exec_die", "attach", "detach", "health_status"].includes(action),
            `Forbidden Docker lifecycle action: ${action}`);
        assert(!/\b(?:CONFIG\s+SET|ACL\s+(?:DELUSER|LOAD)|resetpass|nopass|reset)\b/i.test(description),
            "Credential reset or broad Redis configuration mutation");
        if (/\b(?:ACL\s+(?:SETUSER|DELUSER|LOAD)|CONFIG\s+SET|CLIENT\s+(?:PAUSE|UNPAUSE))\b/i.test(description)) {
            assert.equal(event.Actor?.ID ?? event.id, target, "Wrong-neighbor Redis mutation");
        }
    }
}
