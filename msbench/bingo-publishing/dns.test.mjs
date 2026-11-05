import test from "node:test";
import assert from "node:assert/strict";
import { createSocket } from "node:dgram";
import { createConnection, createServer } from "node:net";
import { once } from "node:events";
import { dnsPlan, privateBridgePlan } from "./common/dns.mjs";
import { startDnsRelay } from "./common/dns-relay.mjs";

const query = Buffer.from("123401000001000000000000076578616d706c6503636f6d0000010001", "hex");
const response = Buffer.concat([Buffer.from(query), Buffer.from("c00c000100010000003c0004c0000201", "hex")]);
response.writeUInt16BE(0x8180, 2);
response.writeUInt16BE(1, 6);

function frame(message) {
    const header = Buffer.alloc(2);
    header.writeUInt16BE(message.length);
    return Buffer.concat([header, message]);
}
async function udpQuery(port, message = query, host = "127.0.0.1") {
    const socket = createSocket("udp4");
    try {
        const result = once(socket, "message", { signal: AbortSignal.timeout(2000) });
        socket.send(message, port, host);
        return (await result)[0];
    } finally { socket.close(); }
}
async function tcpQuery(port) {
    const socket = createConnection({ host: "127.0.0.1", port });
    try {
        await once(socket, "connect", { signal: AbortSignal.timeout(2000) });
        const data = frame(query);
        socket.write(data.subarray(0, 1));
        socket.write(data.subarray(1, 9));
        socket.write(data.subarray(9));
        return await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("TCP test timeout")), 2000);
            let buffer = Buffer.alloc(0);
            socket.on("error", error => { clearTimeout(timer); reject(error); });
            socket.on("data", chunk => {
                buffer = Buffer.concat([buffer, chunk]);
                if (buffer.length >= 2 && buffer.length >= 2 + buffer.readUInt16BE(0)) {
                    clearTimeout(timer);
                    resolve(buffer.subarray(2, 2 + buffer.readUInt16BE(0)));
                }
            });
        });
    } finally { socket.destroy(); }
}
async function mockResolver({ answer = true } = {}) {
    const messages = [];
    const connections = new Set();
    const udp = createSocket("udp4");
    udp.bind(0, "127.0.0.1");
    await once(udp, "listening");
    const port = udp.address().port;
    udp.on("message", (message, peer) => {
        messages.push({ transport: "udp", message });
        if (answer) udp.send(response, peer.port, peer.address);
    });
    const tcp = createServer(socket => {
        connections.add(socket);
        socket.on("close", () => connections.delete(socket));
        let buffer = Buffer.alloc(0);
        socket.on("data", chunk => {
            buffer = Buffer.concat([buffer, chunk]);
            if (buffer.length >= 2 && buffer.length >= buffer.readUInt16BE(0) + 2) {
                messages.push({ transport: "tcp", message: buffer.subarray(2) });
                if (answer) {
                    const reply = frame(response);
                    socket.write(reply.subarray(0, 1));
                    setTimeout(() => { if (!socket.destroyed) socket.end(reply.subarray(1)); }, 5);
                }
            }
        });
    });
    tcp.listen(port, "127.0.0.1");
    await once(tcp, "listening");
    return { port, messages, async close() {
        for (const socket of connections) socket.destroy();
        await Promise.all([new Promise(resolve => udp.close(resolve)),
            new Promise(resolve => tcp.close(resolve))]);
    } };
}

test("DNS plan preserves direct upstream behavior and relays only explicitly configured stubs", () => {
    assert.deepEqual(dnsPlan("nameserver 10.1.2.3\n"), {
        mode: "direct", configured: ["10.1.2.3"], servers: ["10.1.2.3"],
    });
    assert.deepEqual(dnsPlan("nameserver 127.0.0.11\n# ExtServers: [host(10.2.3.4)]").servers, ["10.2.3.4"]);
    const plan = dnsPlan("nameserver 127.0.0.11\nnameserver ::1\n", [
        { dst: "default", gateway: "172.16.0.1" }, { dst: "0.0.0.0/0" }, { dst: "172.16.0.0/16" },
        { dst: "172.17.0.0/24" },
    ], [{ addr_info: [{ family: "inet", local: "172.18.9.4", prefixlen: 16 }] }]);
    assert.equal(plan.mode, "loopback-relay");
    assert.deepEqual(plan.upstreams, ["127.0.0.11", "::1"]);
    assert.equal(plan.bridge.bip, "172.17.1.1/24");
    assert.equal(plan.bridge.pool, "172.17.2.0/24");
    assert.deepEqual(plan.servers, ["172.17.1.1"]);
    assert.throws(() => dnsPlan("search private.invalid\n"), /No non-loopback upstream/);
    assert.throws(() => dnsPlan("nameserver not-a-server\n"), /No non-loopback upstream/);
});

test("private bridge selection excludes outer connected routes, interface subnets and DNS addresses", () => {
    const result = privateBridgePlan([{ dst: "172.16.0.0/12" }, { dst: "10.0.0.0/8" }],
        [{ addr_info: [{ family: "inet", local: "192.168.0.5", prefixlen: 24 }] }],
        ["192.168.1.53"]);
    assert.deepEqual(result, { bip: "192.168.2.1/24", gateway: "192.168.2.1", pool: "192.168.3.0/24" });
    assert.throws(() => privateBridgePlan([{ dst: "172.16.0.0/12" },
        { dst: "10.0.0.0/8" }, { dst: "192.168.0.0/16" }], [], []), /No nonoverlapping/);
    assert.throws(() => privateBridgePlan([{ dst: "garbage" }], [], []), /Invalid IPv4/);
});

test("DNS relay forwards exact binary UDP/TCP queries and responses including fragmented TCP frames", async () => {
    const resolver = await mockResolver();
    const logs = [];
    const relay = await startDnsRelay({ host: "127.0.0.1", port: 0,
        upstreams: [{ address: "127.0.0.1", port: resolver.port }], report: message => logs.push(message) });
    try {
        assert.deepEqual(await udpQuery(relay.port), response);
        assert.deepEqual(await tcpQuery(relay.port), response);
        assert.deepEqual(resolver.messages, [{ transport: "udp", message: query },
            { transport: "tcp", message: query }]);
        assert.equal(logs.length, 2);
        assert(logs[0].includes("udp: forwarded"));
        assert(logs[1].includes("tcp: forwarded"));
        assert(logs.every(message => !message.includes("example.com")));
    } finally { await relay.close(); await resolver.close(); }
});

test("DNS relay logs upstream timeouts and returns explicit SERVFAIL over UDP and TCP", async () => {
    const resolver = await mockResolver({ answer: false });
    const logs = [];
    const relay = await startDnsRelay({ host: "127.0.0.1", port: 0, timeoutMs: 40,
        upstreams: [{ address: "127.0.0.1", port: resolver.port }], report: message => logs.push(message) });
    try {
        for (const reply of [await udpQuery(relay.port), await tcpQuery(relay.port)]) {
            assert.equal(reply.readUInt16BE(0), query.readUInt16BE(0));
            assert.equal(reply.readUInt16BE(2) & 15, 2);
            assert(reply.readUInt16BE(2) & 0x8000);
        }
        assert(logs.some(message => message.includes("udp:") && message.includes("upstream timeout")));
        assert(logs.some(message => message.includes("tcp:") && message.includes("upstream timeout")));
        assert.equal(logs.filter(message => message.includes("SERVFAIL")).length, 2);
        assert(logs.every(message => !message.includes("example.com")));
    } finally { await relay.close(); await resolver.close(); }
});

test("DNS relay refuses forwarding loops and arbitrary upstreams", async () => {
    await assert.rejects(startDnsRelay({ host: "127.0.0.1", port: 5353,
        upstreams: [{ address: "127.0.0.1", port: 5353 }] }), /loop refused/);
    await assert.rejects(startDnsRelay({ host: "127.0.0.1", port: 0,
        upstreams: [{ address: "8.8.8.8" }] }), /explicitly configured loopback/);
});

test("DNS relay retries only supplied loopback upstreams and reports failures before success", async () => {
    const silent = await mockResolver({ answer: false });
    const working = await mockResolver();
    const logs = [];
    const relay = await startDnsRelay({ host: "127.0.0.1", port: 0, timeoutMs: 40,
        upstreams: [{ address: "127.0.0.1", port: silent.port },
            { address: "127.0.0.1", port: working.port }], report: message => logs.push(message) });
    try {
        assert.deepEqual(await udpQuery(relay.port), response);
        assert(logs[0].includes("upstream timeout"));
        assert(logs[1].includes(`upstream=127.0.0.1:${working.port}`));
        assert(!logs.some(message => message.includes("SERVFAIL")));
    } finally { await relay.close(); await silent.close(); await working.close(); }
});

test("DNS relay overload produces explicit failure without querying an upstream", async () => {
    const resolver = await mockResolver();
    const logs = [];
    const relay = await startDnsRelay({ host: "127.0.0.1", port: 0, maxPending: 0,
        upstreams: [{ address: "127.0.0.1", port: resolver.port }], report: message => logs.push(message) });
    try {
        const reply = await udpQuery(relay.port);
        assert.equal(reply.readUInt16BE(2) & 15, 2);
        assert(logs[0].includes("capacity exceeded"));
        assert.equal(resolver.messages.length, 0);
    } finally { await relay.close(); await resolver.close(); }
});
