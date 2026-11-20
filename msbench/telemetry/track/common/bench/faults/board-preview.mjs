// Board preview server run by the events team (PLAN T3.1 port-conflict fixture). It is not part of the
// Bingo application and belongs to someone else. It answers only its own page; every other path is 404.
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 5039);
const page = `<!doctype html><title>Board preview</title><h1>Board preview</h1><p>Events team: next season's board layout.</p>\n`;
const server = host => createServer((request, response) => {
    if (request.method === "GET" && request.url === "/") {
        response.writeHead(200, { "content-type": "text/html" }).end(page);
    } else {
        response.writeHead(404, { "content-type": "text/plain" }).end("Not found\n");
    }
}).listen(port, host);
server("127.0.0.1");
// IPv6 loopback when the host has it, so neither address family reaches another service on this port.
server("::1").on("error", error => console.error(`board preview: ::1 not available (${error.code})`));
console.log(`board preview listening on ${port}`);
