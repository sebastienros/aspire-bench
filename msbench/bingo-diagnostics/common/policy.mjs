import assert from "node:assert/strict";

export const pauseDurationMs = 1_800_000;

export function verifyFaultWindow(expiresAt, now = Date.now()) {
    assert(Number.isSafeInteger(expiresAt) && now < expiresAt,
        "Fault duration elapsed or invalid: automatic expiry must not count as repair");
}

export async function verifyRedisWrites(execute, key, value) {
    assert.equal(await execute(["SET", key, value, "PX", "30000"]), "OK",
        "Fresh functional Redis write required");
    assert.equal(await execute(["GET", key]), value, "Fresh Redis value must round-trip");
    assert.equal(await execute(["DEL", key]), "1", "Fresh Redis write must be clearable");
}

export function snapshot(row) {
    return {
        id: row.Id, name: row.Name, image: row.Image,
        startedAt: row.State.StartedAt, restarts: row.RestartCount,
        running: row.State.Running, paused: row.State.Paused,
        labels: row.Config.Labels, mounts: row.Mounts,
        ports: row.HostConfig.PortBindings,
    };
}

export function verifyContainers(before, after) {
    assert.deepEqual(after.map(row => row.id).sort(), before.map(row => row.id).sort(),
        "Container inventory changed: no replacement or broad reset permitted");
    for (const original of before) {
        const current = after.find(row => row.id === original.id);
        assert.deepEqual(current, original,
            `Container changed during protocol recovery: ${original.name}`);
    }
}

export function verifyEvents(events, target) {
    for (const event of events) {
        const description = event.Action ?? event.status;
        const action = description.split(":")[0];
        if (["exec_create", "exec_start", "exec_die", "attach", "detach", "health_status"].includes(action)) {
            if (/\bCLIENT\s+(?:PAUSE|UNPAUSE)\b/i.test(description)) {
                assert.equal(event.Actor?.ID ?? event.id, target,
                    "Wrong-target Redis control command on neighboring workload");
            }
            continue;
        }
        assert.fail(`Forbidden Docker action on target or neighboring workload: ${action} ${event.Actor?.ID ?? event.id}`);
    }
}
