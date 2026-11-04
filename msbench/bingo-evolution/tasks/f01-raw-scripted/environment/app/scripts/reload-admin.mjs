import { spawn } from "node:child_process";
import { openSync, closeSync, writeFileSync } from "node:fs";
const log = openSync(".script-state/admin.log", "a", 0o600);
try {
    const child = spawn("dotnet", ["bin/Debug/net10.0/BingoBoard.Admin.dll"], {
        cwd: "src/BingoBoard.Admin", detached: true, stdio: ["ignore", log, log],
    });
    await new Promise((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
    });
    writeFileSync(".script-state/admin.pid", String(child.pid));
    child.unref();
} finally {
    closeSync(log);
}
