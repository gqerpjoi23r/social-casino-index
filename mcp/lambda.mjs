// AWS Lambda Function URL adapter for the Social Casino Index MCP server.
import { handle } from "./server.mjs";

export async function handler(event) {
  const http = event.requestContext?.http || {};
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const url = `https://${event.headers?.host || "localhost"}${event.rawPath || "/"}${query}`;
  const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body) : undefined;
  const method = http.method || "GET";
  const request = new Request(url, { method, headers: event.headers || {}, body: ["GET", "HEAD"].includes(method) ? undefined : body });
  const response = await handle(request);
  return { statusCode: response.status, headers: Object.fromEntries(response.headers), body: await response.text() };
}
