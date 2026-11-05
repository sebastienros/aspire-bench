import assert from "node:assert/strict";
import { readFile, readdir, readlink } from "node:fs/promises";
import { digest } from "../../bingo-transfer/common/acl.mjs";

export async function processesFor(root) {
    assert(["/app", "/neighbor-app"].includes(root), "Known instance directory required");
    const rows = [];
    for (const pid of (await readdir("/proc")).filter(name => /^\d+$/.test(name))) {
        try {
            const cwd = await readlink(`/proc/${pid}/cwd`);
            if (!cwd.startsWith(`${root}/`)) continue;
            const args = (await readFile(`/proc/${pid}/cmdline`, "utf8")).split("\0").filter(Boolean);
            const backend = args.some(arg => /(?:^|\/)BingoBoard\.Admin(?:\.dll)?$/.test(arg));
            const frontend = cwd.startsWith(`${root}/src/bingo-board`)
                && args.some(arg => /(?:\/vite(?:\.js)?|\/vite\/bin\/vite\.js)$/.test(arg));
            if (!backend && !frontend) continue;
            const stat = await readFile(`/proc/${pid}/stat`, "utf8");
            rows.push({
                role: backend ? "backend" : "frontend", pid,
                startedAt: stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19],
                environment: digest(await readFile(`/proc/${pid}/environ`)), args,
            });
        } catch (error) {
            if (["ENOENT", "ESRCH"].includes(error.code)) continue;
            throw error;
        }
    }
    for (const role of ["backend", "frontend"]) {
        assert.equal(rows.filter(row => row.role === role).length, 1,
            `Exactly one actual ${root} ${role} process required`);
    }
    return rows.sort((a, b) => a.role.localeCompare(b.role));
}
