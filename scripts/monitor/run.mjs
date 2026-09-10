import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { FIELDS, VERSION, hash, extract, validQuotes, aggregate } from "./core.mjs";
import { Budget, retrieve, modelExtract } from "./providers.mjs";

const root = process.cwd();
const read = (path, fallback) => existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
const write = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
const observedAt = new Date().toISOString();
const runId = `${observedAt.replace(/[:.]/g, "-")}-${process.env.GITHUB_RUN_ID || "local"}`;
const output = join(root, ".monitor", runId);
mkdirSync(output, { recursive: true });
mkdirSync("data/monitor/runs", { recursive: true });
const operators = read("src/_data/operators.json", []);
const previous = read("src/_data/monitor.json", { operators: [], sources: {}, spending: [], runs: [] });
const budget = new Budget(previous.spending, observedAt.slice(0, 10));
const sourceCache = { ...(previous.sources || {}) };
const records = [];
const events = [];
const metrics = { attempted: 0, readable: 0, failed: 0, deterministicFields: 0, modelFields: 0, cached: 0 };
const config = read("data/monitor/config.json", {});
let count = 0;

for (const operator of operators) {
  const sources = [];
  for (const source of operator.sources) {
    if (count >= 50) break;
    count++;
    metrics.attempted++;
    const url = config.sourceOverrides?.[source.id] || source.url;
    if (!/^https:\/\//.test(url)) throw new Error(`Invalid source URL: ${source.id}`);
    const attempts = [];
    let result;
    let provider;
    const options = ["direct"];
    if (process.env.FIRECRAWL_API_KEY) options.push("firecrawl");
    if (process.env.BRIGHTDATA_API_KEY && process.env.BRIGHTDATA_ZONE) options.push("brightdata");
    for (provider of options) {
      if (provider !== "direct" && !budget.reserve(provider, config.costUpperBounds?.[provider])) {
        attempts.push({ provider, status: "budget_or_price_limit" });
        continue;
      }
      try {
        result = await retrieve(url, provider);
        // Never publish request headers, cookies or provider credentials.
        result.body = result.body.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP redacted]");
        result.text = result.text.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP redacted]");
        attempts.push({ provider, status: result.status });
        writeFileSync(join(output, `${source.id}-${provider}.txt`), result.text);
        writeFileSync(join(output, `${source.id}-${provider}.source.txt`), result.body);
        if (result.status === "ok" || result.status === "login_required") break;
      } catch (error) {
        attempts.push({ provider, status: "error", error: error.name === "TimeoutError" ? "timeout" :
          /^[a-z_]+\d*$/.test(error.message) ? error.message : "request_failed" });
      }
    }
    const record = { id: source.id, url, finalUrl: result?.finalUrl || url, checkedAt: observedAt,
      status: result?.status || "failed", provider: attempts.findLast(attempt => attempt.status === "ok")?.provider || null, attempts };
    if (result?.status === "ok") {
      metrics.readable++;
      record.textHash = hash(result.text);
      const cached = previous.sources?.[source.id];
      if (cached?.textHash === record.textHash && cached.extractorVersion === VERSION) {
        record.fields = cached.fields;
        record.extractor = cached.extractor;
        metrics.cached++;
      } else {
        record.fields = validQuotes(result.text, extract(result.text));
        record.extractor = "deterministic";
        metrics.deterministicFields += Object.values(record.fields).filter(quotes => quotes.length).length;
        if (process.env.MONITOR_USE_MODEL === "true" && process.env.MONITOR_MODEL_URL &&
            process.env.MONITOR_MODEL_KEY && process.env.MONITOR_MODEL &&
            Object.values(record.fields).filter(quotes => quotes.length).length < 2 &&
            budget.reserve("model", config.costUpperBounds?.model)) {
          try {
            const model = validQuotes(result.text, await modelExtract(result.text, FIELDS));
            for (const key of Object.keys(FIELDS)) {
              if (!record.fields[key].length && model[key].length) {
                record.fields[key] = model[key];
                metrics.modelFields++;
                record.extractor = "deterministic+model";
              }
            }
          } catch { record.modelError = "model_extraction_failed"; }
        }
      }
      sourceCache[source.id] = { textHash: record.textHash, fields: record.fields,
        extractor: record.extractor, extractorVersion: VERSION };
    } else { metrics.failed++; }
    sources.push(record);
    console.log(`${operator.slug} ${source.id}: ${record.status} (${record.provider || "no readable response"})`);
  }
  const result = aggregate(operator, sources, previous.operators.find(record => record.slug === operator.slug), observedAt);
  records.push(result.record);
  events.push(...result.events);
}

const summary = {
  id: runId, observedAt, extractorVersion: VERSION,
  githubRunUrl: process.env.GITHUB_RUN_ID ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null,
  metrics, operators: records.length,
  coveredFields: records.reduce((sum, record) => sum + Object.values(record.fields).filter(field => ["observed", "partial"].includes(field.status)).length, 0),
  totalFields: records.length * Object.keys(FIELDS).length,
  changes: events.filter(event => event.type !== "baseline").length,
  baselines: events.filter(event => event.type === "baseline").length,
  spendingReservedUsd: budget.entries.filter(entry => entry.date === observedAt.slice(0, 10)).reduce((sum, entry) => sum + entry.reservedUsd, 0),
  providerCalls: budget.calls,
};
const latest = {
  schemaVersion: 1, lastAttemptedAt: observedAt,
  lastReadableRunAt: metrics.readable ? observedAt : previous.lastReadableRunAt || null,
  summary, operators: records, sources: sourceCache, spending: budget.entries,
  events: [...events, ...(previous.events || [])].slice(0, 500),
  runs: [summary, ...(previous.runs || [])].slice(0, 90),
};
write("src/_data/monitor.json", latest);
write(`data/monitor/runs/${runId}.json`, { summary, events, operators: records });
write(join(output, "summary.json"), summary);
if (!metrics.readable) process.exitCode = 1;
const report = [
  "# Daily operator collection", "",
  `Run: ${observedAt}`,
  `Readable sources: ${metrics.readable}/${metrics.attempted}`,
  `Fields with source passages: ${summary.coveredFields}/${summary.totalFields}`,
  `Baseline observations: ${summary.baselines}; source-wording changes: ${summary.changes}`,
  `Reserved paid-service allowance today: $${summary.spendingReservedUsd.toFixed(2)} (not an invoice)`, "",
  "| Operator | Readable sources | Fields with passages |",
  "| --- | ---: | ---: |",
  ...records.map(record => `| ${record.name} | ${record.sources.filter(source => source.status === "ok").length}/${record.sources.length} | ${Object.values(record.fields).filter(field => ["observed", "partial"].includes(field.status)).length}/${Object.keys(FIELDS).length} |`),
  "", "Extraction coverage is not factual accuracy. Source passages are not independently verified outcomes.",
  "Full source captures are Actions artifacts, accessible according to repository permissions. They are not published as site pages.",
];
writeFileSync(join(output, "evaluation.md"), report.join("\n") + "\n");
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report.join("\n") + "\n");
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `capture_path=${output}\nreadable=${metrics.readable}\n`);
console.log(JSON.stringify(summary, null, 2));
