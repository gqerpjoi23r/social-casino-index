import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { archiveCapture, saveJson } from "./archive.mjs";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/monitor/import-legacy.mjs <existing capture directory>");
const monitor = JSON.parse(readFileSync(join(input, "monitor.json"), "utf8"));
const directory = resolve(".monitor", `${monitor.summary.id}-archived-replay`);
mkdirSync(directory, { recursive: true });
const manifest = { schemaVersion: 1, runId: directory.split("/").at(-1),
  startedAt: monitor.summary.observedAt, origin: "legacy_capture_import",
  limitations: "Original Firecrawl capture contained Markdown only. Original HTML cannot be recovered without fetching again.",
  captures: [], sources: [] };
for (const operator of monitor.operators) for (const source of operator.sources) {
  const provider = source.provider;
  const path = join(input, `${source.id}-${provider}.txt`);
  if (!provider || !existsSync(path)) continue;
  const body = readFileSync(join(input, `${source.id}-${provider}.source.txt`), "utf8");
  const html = /^\s*<!doctype html|^\s*<html/i.test(body);
  const result = { text: readFileSync(path, "utf8"), body, finalUrl: source.finalUrl,
    status: source.status, contentType: html ? "text/html" : "text/plain",
    capturedAt: source.checkedAt, html: html ? body : null,
    markdown: provider === "firecrawl" ? body : null,
    metadata: { importedAt: new Date().toISOString(), legacyCapture: true } };
  manifest.captures.push(archiveCapture(directory, { id: source.id, operatorId: operator.slug, url: source.url }, provider, result));
  manifest.sources.push({ operatorId: operator.slug, ...source });
}
saveJson(directory, "manifest.json", manifest);
console.log(directory);
