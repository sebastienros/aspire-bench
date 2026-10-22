import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
export async function hashes(root) {
    const result = {};
    async function walk(directory) {
        for (const item of await readdir(directory, { withFileTypes: true })) {
            if (["node_modules", "bin", "obj", ".aspire", ".script-state", ".git"].includes(item.name))
                continue;
            const file = path.join(directory, item.name);
            if (item.isSymbolicLink())
                throw new Error(`Unexpected symlink in fixture: ${file}`);
            if (item.isDirectory())
                await walk(file);
            else if (item.isFile() && item.name !== "benchmark-endpoints.json") {
                result[path.relative(root, file)] = createHash("sha256").update(await readFile(file)).digest("hex");
            }
        }
    }
    await walk(root);
    return result;
}
export function unchanged(before, after) {
    return Object.entries(before).every(([file, digest]) => after[file] === digest);
}
