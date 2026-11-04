import assert from "node:assert/strict";

export function snapshot(row) {
    return {
        id: row.Id, name: row.Name, image: row.Image,
        startedAt: row.State.StartedAt, restarts: row.RestartCount,
        running: row.State.Running, paused: row.State.Paused,
        labels: row.Config.Labels, mounts: row.Mounts,
        ports: row.HostConfig.PortBindings,
    };
}

export function verifyContainers(before, after, target) {
    assert.deepEqual(after.map(row => row.id).sort(), before.map(row => row.id).sort(),
        "Container inventory changed: no replacement or broad reset permitted");
    for (const original of before) {
        const current = after.find(row => row.id === original.id);
        assert.deepEqual(current, { ...original, paused: original.id === target ? false : original.paused },
            `Container changed outside targeted recovery: ${original.name}`);
    }
}

export function verifyEvents(events, target) {
    let recoveries = 0;
    for (const event of events) {
        const action = (event.Action ?? event.status).split(":")[0];
        if (["exec_create", "exec_start", "exec_die", "attach", "detach", "health_status"].includes(action))
            continue;
        if (action === "unpause" && (event.Actor?.ID ?? event.id) === target) {
            recoveries++;
            continue;
        }
        assert.fail(`Forbidden Docker action on target or neighboring workload: ${action} ${event.Actor?.ID ?? event.id}`);
    }
    assert.equal(recoveries, 1, "Exactly one in-place recovery of the owned target required");
}
