import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { endpoints, verifyHttp } from "../dist/verify.js";
import { ApplicationReadyGrader } from "../dist/plugin.js";
import { resourceEndpoints } from "../dist/aspire.js";

test("Aspire describe parsing uses displayName and normalizes named links", () => {
  assert.deepEqual(resourceEndpoints({ resources: [
    { name: "boardadmin-random", displayName: "boardadmin",
      urls: [{ name: "http", url: "http://localhost:1234/squares-management" }] },
    { name: "bingoboard-random", displayName: "bingoboard",
      urls: [{ name: "http", url: "http://localhost:5678/" }] },
  ] }), { admin: "http://localhost:1234", frontend: "http://localhost:5678" });
  assert.throws(() => resourceEndpoints([]));
  assert.throws(() => resourceEndpoints({ resources: [] }));
});

test("endpoint contract rejects remote, credentialed and malformed URLs", () => {
  const good = { admin: "http://localhost:1234", frontend: "http://127.0.0.1:5678" };
  assert.deepEqual(endpoints(good), good);
  for (const invalid of [
    { ...good, admin: "http://example.com:1234" },
    { ...good, admin: "https://localhost:1234" },
    { ...good, admin: "http://user:password@localhost:1234" },
    { ...good, frontend: good.admin },
    { ...good, admin: "http://localhost:1234/path" },
    { ...good, extra: "http://localhost:4321" },
    { admin: true, frontend: good.frontend },
  ]) assert.throws(() => endpoints(invalid));
});

async function fakeApp(mode = "healthy") {
  let called = [];
  const server = createServer(async (request, response) => {
    const route = request.url;
    if (mode === "unavailable") { response.writeHead(503).end("unavailable"); return; }
    response.setHeader("content-type", "application/json");
    if (route === "/login") { response.end('<html><input type="password"></html>'); return; }
    if (route === "/") { response.end('<html><div id="app"></div><script></script></html>'); return; }
    if (route === "/api/version-info") { response.end('{"dotNetVersion":"10.0.12"}'); return; }
    if (route.startsWith("/bingohub")) {
      response.end(mode === "broken-signalr" ? "{}" :
        '{"connectionToken":"probe","availableTransports":[{"transport":"WebSockets"}]}'); return;
    }
    if (route === "/api/demo/producer/squares/import") {
      let body = "";
      for await (const chunk of request) body += chunk;
      server.square = JSON.parse(body)[0].id;
      response.end('{"added":1}'); return;
    }
    if (route.endsWith("/state/true")) { called = [server.square]; response.end('{"isChecked":true}'); return; }
    if (route.endsWith("/state/false")) { called = []; response.end('{"isChecked":false}'); return; }
    if (route === "/api/demo/producer/status") {
      response.end(JSON.stringify({ calledSquares: mode === "broken-state" ? [] : called })); return;
    }
    response.writeHead(404).end("{}");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

test("shared workflow accepts live contract and rejects unavailable/proxy/state failures", async () => {
  for (const mode of ["healthy", "unavailable", "broken-signalr", "broken-state"]) {
    const { server, url } = await fakeApp(mode);
    try {
      if (mode === "healthy") await verifyHttp({ admin: url, frontend: url });
      else await assert.rejects(verifyHttp({ admin: url, frontend: url }));
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
});

test("grader cannot accept agent self-report or missing host proof", async () => {
  await assert.rejects(new ApplicationReadyGrader().grade({
    trajectory: { id: "invented", output: "Everything works!" },
  }), /Missing host-side/);
});
