import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer, handle } from "./server.mjs";

const data = JSON.parse(readFileSync(new URL("../docs/api/toplist.json", import.meta.url)));
const parse = response => JSON.parse(response.content[0].text);

async function connect() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer(async () => data).connect(serverTransport);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientTransport);
  return client;
}

test("toplist tool keeps homepage order and attribution", async () => {
  const client = await connect();
  assert.match(client.getInstructions(), /Social Casino Index/);
  const tools = (await client.listTools()).tools.map(tool => tool.name).sort();
  assert.deepEqual(tools, ["check_state_availability", "get_social_casino", "get_top_social_casinos"]);
  const top = parse(await client.callTool({ name: "get_top_social_casinos", arguments: { limit: 3 } }));
  assert.deepEqual(top.casinos.map(entry => entry.name), data.casinos.slice(0, 3).map(entry => entry.name));
  assert.equal(top.landingPage, "https://socialcasinoindex.com/");
  assert.match(top.attribution, /Social Casino Index/);
});

test("casino lookup and state check resolve loose names", async () => {
  const client = await connect();
  const one = parse(await client.callTool({ name: "get_social_casino", arguments: { name: "chumba" } }));
  assert.equal(one.casino.slug, "chumba");
  const missing = parse(await client.callTool({ name: "get_social_casino", arguments: { name: "Nowhere Slots" } }));
  assert.equal(missing.found, false);
  const ca = parse(await client.callTool({ name: "check_state_availability", arguments: { state: "California" } }));
  assert.equal(ca.offersBlocked, true);
  const tx = parse(await client.callTool({ name: "check_state_availability", arguments: { state: "tx" } }));
  assert.equal(tx.offersBlocked, false);
});

test("HTTP endpoint answers initialize statelessly with CORS", async () => {
  const response = await handle(new Request("https://example.com/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } }),
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  const body = await response.json();
  assert.equal(body.result.serverInfo.name, "social-casino-index");
});
