import { createSocket } from "node:dgram";
import { createConnection, createServer, isIP } from "node:net";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

function failureReply(query) {
    const reply = Buffer.from(query);
    reply.writeUInt16BE((query.readUInt16BE(2) | 0x8000) & 0xfff0 | 2, 2);
    reply.writeUInt16BE(0, 6);
    reply.writeUInt16BE(0, 8);
    return reply;
}

function validReply(reply, query) {
    if (reply.length < 12 || reply.readUInt16BE(0) !== query.readUInt16BE(0)
        || !(reply.readUInt16BE(2) & 0x8000)) throw new Error("Invalid upstream DNS response");
    return reply;
}

export async function startDnsRelay({ host, port = 53, upstreams, timeoutMs = 3000,
    maxPending = 128, report = message => console.error(`[P01 DNS relay] ${message}`) }) {
    if (!isIP(host) || !upstreams.length) throw new Error("Explicit relay listener and upstream required");
    for (const upstream of upstreams) {
        if (!isIP(upstream.address) || !(upstream.address === "::1" || upstream.address.startsWith("127."))) {
            throw new Error("Relay upstream must be an explicitly configured loopback resolver");
        }
        if (upstream.address === host && (upstream.port ?? 53) === port) throw new Error("DNS relay loop refused");
    }
    const sockets = new Map();
    const udp = createSocket(isIP(host) === 6 ? "udp6" : "udp4");
    let pending = 0;
    let closing = false;
    function exchange(query, upstream, transport) {
        return new Promise((resolve, reject) => {
            const address = upstream.address;
            const socket = transport === "udp"
                ? createSocket(isIP(address) === 6 ? "udp6" : "udp4")
                : createConnection({ host: address, port: upstream.port ?? 53 });
            let finished = false;
            let buffer = Buffer.alloc(0);
            const timer = setTimeout(() => finish(new Error("upstream timeout")), timeoutMs);
            sockets.set(socket, () => finish(new Error("relay shutdown")));
            function finish(error, reply) {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                sockets.delete(socket);
                if (transport === "udp") socket.close();
                else socket.destroy();
                if (error) reject(error);
                else {
                    try { resolve(validReply(reply, query)); }
                    catch (validationError) { reject(validationError); }
                }
            }
            socket.once("error", error => finish(error));
            if (transport === "udp") {
                socket.once("message", reply => finish(null, reply));
                socket.connect(upstream.port ?? 53, address, () => {
                    socket.send(query, error => { if (error) finish(error); });
                });
            } else {
                socket.once("connect", () => {
                    const prefix = Buffer.alloc(2);
                    prefix.writeUInt16BE(query.length);
                    socket.write(Buffer.concat([prefix, query]));
                });
                socket.on("data", data => {
                    buffer = Buffer.concat([buffer, data]);
                    if (buffer.length > 65_537) return finish(new Error("upstream TCP frame too large"));
                    if (buffer.length >= 2 && buffer.length >= 2 + buffer.readUInt16BE(0)) {
                        finish(null, buffer.subarray(2, 2 + buffer.readUInt16BE(0)));
                    }
                });
                socket.once("end", () => finish(new Error("upstream TCP closed before complete response")));
            }
        });
    }
    async function forward(query, transport) {
        if (query.length < 12 || query.readUInt16BE(2) & 0x8000) {
            report(`${transport}: invalid query rejected`);
            return null;
        }
        if (pending >= maxPending || closing) {
            report(`${transport}: relay capacity exceeded or closing`);
            return failureReply(query);
        }
        pending++;
        try {
            for (const upstream of upstreams) {
                try {
                    const reply = await exchange(query, upstream, transport);
                    report(`${transport}: forwarded upstream=${upstream.address}:${upstream.port ?? 53} bytes=${reply.length}`);
                    return reply;
                }
                catch (error) {
                    report(`${transport}: upstream=${upstream.address}:${upstream.port ?? 53} failure=${error.code ?? error.message}`);
                }
            }
            report(`${transport}: all configured upstreams failed; returning SERVFAIL`);
            return failureReply(query);
        } finally {
            pending--;
        }
    }
    udp.on("message", (query, peer) => {
        forward(query, "udp").then(reply => {
            if (reply && !closing) udp.send(reply, peer.port, peer.address,
                error => { if (error) report(`udp: response send failure=${error.code}`); });
        }).catch(error => report(`udp: relay failure=${error.code ?? error.message}`));
    });
    const tcp = createServer(client => {
        sockets.set(client, () => client.destroy());
        client.on("close", () => sockets.delete(client));
        client.on("error", error => report(`tcp: client failure=${error.code}`));
        client.setTimeout(timeoutMs * (upstreams.length + 1), () => client.destroy());
        let buffer = Buffer.alloc(0);
        client.on("data", data => {
            buffer = Buffer.concat([buffer, data]);
            if (buffer.length > 65_537) {
                report("tcp: oversized query frame rejected");
                client.destroy();
                return;
            }
            while (buffer.length >= 2 && buffer.length >= 2 + buffer.readUInt16BE(0)) {
                const size = buffer.readUInt16BE(0);
                const query = buffer.subarray(2, size + 2);
                buffer = buffer.subarray(size + 2);
                forward(query, "tcp").then(reply => {
                    if (!reply || client.destroyed) return;
                    const prefix = Buffer.alloc(2);
                    prefix.writeUInt16BE(reply.length);
                    client.write(Buffer.concat([prefix, reply]));
                }).catch(error => {
                    report(`tcp: relay failure=${error.code ?? error.message}`);
                    client.destroy();
                });
            }
        });
    });
    try {
        await new Promise((resolve, reject) => {
            udp.once("error", reject);
            udp.bind(port, host, resolve);
        });
        const actualPort = udp.address().port;
        if (upstreams.some(upstream => upstream.address === host && (upstream.port ?? 53) === actualPort)) {
            throw new Error("DNS relay loop refused");
        }
        await new Promise((resolve, reject) => {
            tcp.once("error", reject);
            tcp.listen(actualPort, host, resolve);
        });
        udp.on("error", error => report(`udp listener failure=${error.code}`));
        tcp.on("error", error => report(`tcp listener failure=${error.code}`));
        return { host, port: actualPort, async close() {
            closing = true;
            for (const cancel of sockets.values()) cancel();
            await Promise.all([
                new Promise(resolve => udp.close(resolve)),
                new Promise(resolve => tcp.close(resolve)),
            ]);
        } };
    } catch (error) {
        try { udp.close(); } catch (closeError) {
            if (closeError.code !== "ERR_SOCKET_DGRAM_NOT_RUNNING") throw closeError;
        }
        if (tcp.listening) tcp.close();
        throw error;
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const plan = JSON.parse(readFileSync(process.argv[2], "utf8"));
    const relay = await startDnsRelay({ host: plan.bridge.gateway,
        upstreams: plan.upstreams.map(address => ({ address })) });
    console.error(`[P01 DNS relay ready] ${JSON.stringify({ host: relay.host, port: relay.port, upstreams: plan.upstreams })}`);
    writeFileSync(process.argv[3], JSON.stringify({ host: relay.host, port: relay.port }));
    for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
        relay.close().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
    });
}
