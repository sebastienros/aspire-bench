import { isIP } from "node:net";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function upstreamDns(source) {
    const external = value => isIP(value) && value !== "::1" && !value.startsWith("127.");
    const nameservers = [...source.matchAll(/^nameserver\s+(\S+)/gm)]
        .map(match => match[1]).filter(external);
    if (nameservers.length) return [...new Set(nameservers)];
    const dockerUpstream = source.match(/^#\s*ExtServers:\s*\[([^\]]*)\]/m)?.[1] ?? "";
    const inherited = dockerUpstream.split(/[,\s]+/)
        .map(value => value.replace(/^host\((.*)\)$/, "$1")).filter(external);
    if (!inherited.length) {
        throw new Error("No non-loopback upstream DNS found in resolv.conf or Docker ExtServers metadata; private Docker cannot safely inherit DNS.");
    }
    return [...new Set(inherited)];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    console.log(upstreamDns(readFileSync("/etc/resolv.conf", "utf8")).join("\n"));
}
