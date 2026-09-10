import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalize, aggregate } from "./core.mjs";

const directory = process.argv[2];
if (!directory) throw new Error("Usage: node scripts/monitor/evaluate.mjs <downloaded capture directory>");
const data = JSON.parse(readFileSync(join(directory, "monitor.json"), "utf8"));
const files = readdirSync(directory, { recursive: true }).map(file => join(directory, file));
let quotes = 0;
let unsupported = 0;
let replayEvents = 0;
const rows = [];
for (const operator of data.operators) {
  const sources = operator.sources.map(source => {
    const fields = Object.fromEntries(Object.entries(operator.fields).map(([key, field]) =>
      [key, field.quotes.filter(quote => quote.sourceId === source.id && quote.observedAt === operator.checkedAt).map(quote => quote.quote)]));
    if (source.status === "ok") {
      const path = files.find(file => file.endsWith(`/${source.id}-${source.provider}.txt`));
      if (!path || !existsSync(path)) throw new Error(`Missing capture: ${source.id}`);
      const text = normalize(readFileSync(path, "utf8"));
      for (const passages of Object.values(fields)) for (const passage of passages) {
        quotes++;
        if (!text.includes(normalize(passage))) unsupported++;
      }
    }
    return { ...source, fields };
  });
  const replay = aggregate({ ...operator, playerValue: { productMode: operator.productMode } }, sources, operator, operator.checkedAt);
  replayEvents += replay.events.length;
  rows.push({
    operator: operator.name,
    readable: sources.filter(source => source.status === "ok").length,
    sources: sources.length,
    fields: Object.values(operator.fields).filter(field => ["observed", "partial"].includes(field.status)).length,
    missing: Object.entries(operator.fields).filter(([, field]) => field.status === "unavailable").map(([key]) => key),
  });
}
const result = { runId: data.summary.id, checkedQuotes: quotes, unsupportedQuotes: unsupported, identicalReplayEvents: replayEvents, operators: rows,
  limitation: "Exact-match evidence and replay checks do not measure semantic correctness or multi-day reliability." };
console.log(JSON.stringify(result, null, 2));
writeFileSync(join(directory, "replay-evaluation.json"), JSON.stringify(result, null, 2) + "\n");
if (unsupported || replayEvents) process.exitCode = 1;
