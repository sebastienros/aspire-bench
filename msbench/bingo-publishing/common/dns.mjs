import { isIP } from "node:net";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function configuredDns(source) {
    return [...new Set([...source.matchAll(/^nameserver\s+(\S+)/gm)]
        .map(match => match[1]).filter(value => isIP(value)))];
}

export function upstreamDns(source) {
    const external = value => isIP(value) && value !== "::1" && !value.startsWith("127.");
    const nameservers = configuredDns(source).filter(external);
    if (nameservers.length) return [...new Set(nameservers)];
    const dockerUpstream = source.match(/^#\s*ExtServers:\s*\[([^\]]*)\]/m)?.[1] ?? "";
    const inherited = dockerUpstream.split(/[,\s]+/)
        .map(value => value.replace(/^host\((.*)\)$/, "$1")).filter(external);
    if (!inherited.length) {
        throw new Error("No non-loopback upstream DNS found in resolv.conf or Docker ExtServers metadata; private Docker cannot safely inherit DNS.");
    }
    return [...new Set(inherited)];
}

function ipv4(value) {
    if (isIP(value) !== 4) throw new Error(`Invalid IPv4 route address: ${value}`);
    return value.split(".").reduce((number, octet) => number * 256 + Number(octet), 0);
}

function range(cidr) {
    const [address, prefixText = "32"] = cidr.split("/");
    const prefix = Number(prefixText);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error("Invalid route prefix");
    const size = 2 ** (32 - prefix);
    const start = Math.floor(ipv4(address) / size) * size;
    return { start, end: start + size - 1 };
}

export function privateBridgePlan(routes, addresses, resolvers) {
    const occupied = [];
    for (const route of routes) {
        if (route.dst && route.dst !== "default" && route.dst !== "0.0.0.0/0") occupied.push(range(route.dst));
    }
    for (const link of addresses) {
        for (const address of link.addr_info ?? []) {
            if (address.family === "inet") occupied.push(range(`${address.local}/${address.prefixlen}`));
        }
    }
    for (const address of resolvers) if (isIP(address) === 4) occupied.push(range(address));
    const selected = [];
    for (const [first, secondStart, secondEnd] of [[172, 16, 31], [192, 168, 168], [10, 0, 255]]) {
        for (let second = secondStart; second <= secondEnd; second++) {
            for (let third = 0; third <= 255; third++) {
                const cidr = `${first}.${second}.${third}.0/24`;
                const candidate = range(cidr);
                if (occupied.some(item => candidate.start <= item.end && item.start <= candidate.end)) continue;
                selected.push(cidr);
                occupied.push(candidate);
                if (selected.length === 2) {
                    return { bip: selected[0].replace(".0/24", ".1/24"),
                        gateway: selected[0].replace(".0/24", ".1"), pool: selected[1] };
                }
            }
        }
    }
    throw new Error("No nonoverlapping private /24 networks available for private Docker DNS relay");
}

export function dnsPlan(source, routes = [], addresses = []) {
    try {
        return { mode: "direct", configured: configuredDns(source), servers: upstreamDns(source) };
    } catch (error) {
        const resolvers = configuredDns(source);
        if (!resolvers.length || !resolvers.every(value => value === "::1" || value.startsWith("127."))) throw error;
        const bridge = privateBridgePlan(routes, addresses, resolvers);
        return { mode: "loopback-relay", configured: resolvers, upstreams: resolvers,
            servers: [bridge.gateway], bridge };
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const source = readFileSync("/etc/resolv.conf", "utf8");
    console.error(`[P01 DNS discovery] ${JSON.stringify({ configured: configuredDns(source),
        dockerUpstreamMetadataPresent: /^#\s*ExtServers:/m.test(source) })}`);
    let plan;
    try {
        plan = dnsPlan(source);
        if (plan.mode === "loopback-relay") {
            const query = args => JSON.parse(execFileSync("ip", args, { encoding: "utf8", timeout: 10_000 }));
            plan = dnsPlan(source, query(["-j", "-4", "route", "show", "table", "all"]),
                query(["-j", "-4", "address", "show"]));
        }
    } catch (error) {
        console.error(`[P01 DNS planning failed] ${error.message}`);
        process.exitCode = 1;
    }
    if (plan) {
        console.error(`[P01 DNS plan] ${JSON.stringify(plan)}`);
        console.log(JSON.stringify(plan));
    }
}
