import { appendFileSync, closeSync, mkdirSync, openSync, readSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

export function redactDiagnosticText(text) {
    return text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
        .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "")
        .split("\n").map(line => {
            if (/password|passwd|authorization|connectionstrings|api[_-]?key|access[_-]?key|private[_ -]?key|token|secret|credential|\bpwd\b/i.test(line)) {
                return "[REDACTED sensitive log line]";
            }
            return line.replace(/LocalDatabase1!|LocalAdmin1!/g, "[REDACTED]")
                .replace(/https?:\/\/[^\s"'<>]+/gi, value => {
                    try {
                        const url = new URL(value);
                        if (url.username || url.password) {
                            url.username = "REDACTED";
                            url.password = "REDACTED";
                        }
                        if (url.search) url.search = "?REDACTED";
                        if (url.hash) url.hash = "#REDACTED";
                        return url.href;
                    } catch {
                        return "[REDACTED URL]";
                    }
                });
        }).join("\n");
}

function logTail(path) {
    let fd;
    try {
        const size = statSync(path).size;
        const count = Math.min(size, 16_384);
        const start = size - count;
        const buffer = Buffer.alloc(count);
        fd = openSync(path, "r");
        const bytes = readSync(fd, buffer, 0, count, start);
        const lines = buffer.subarray(0, bytes).toString("utf8").split("\n");
        if (start > 0) lines.shift();
        return redactDiagnosticText(lines.slice(-60).join("\n"));
    } catch (error) {
        return `[log unavailable: ${error.code ?? "read-error"}]`;
    } finally {
        if (fd !== undefined) closeSync(fd);
    }
}

export function reportSetupFailure({ phase, status, line, source, privateDirectory, outputDirectory }) {
    const failure = {
        timestamp: new Date().toISOString(),
        phase, status: Number(status), source: basename(source), line: Number(line),
        platform: process.platform, architecture: process.arch,
    };
    const logs = ["setup.log", "docker.log", "docker-info.log"]
        .map(name => `--- ${name}: sanitized tail ---\n${logTail(join(privateDirectory, name))}`)
        .join("\n");
    const text = `[P01 setup failure] ${JSON.stringify(failure)}\n${logs}\n`;
    mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
    appendFileSync(join(outputDirectory, "failures.jsonl"), JSON.stringify(failure) + "\n", { mode: 0o600 });
    appendFileSync(join(outputDirectory, "setup-diagnostics.log"), text, { mode: 0o600 });
    process.stderr.write(text);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [phase, status, line, source, privateDirectory, outputDirectory] = process.argv.slice(2);
    reportSetupFailure({ phase, status, line, source, privateDirectory, outputDirectory });
}
