// Local server for testing: node mcp/dev.mjs, then POST to http://localhost:8787/mcp
import { createServer } from "node:http";
import { handle } from "./server.mjs";

const port = Number(process.env.PORT || 8787);
createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const response = await handle(new Request(`http://localhost:${port}${req.url}`, {
    method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body }));
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`Social Casino Index MCP on http://localhost:${port}/mcp`));
