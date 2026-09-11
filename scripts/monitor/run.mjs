import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { FIELDS, VERSION, hash, extract, validQuotes, aggregate } from "./core.mjs";
import { RequestUsage, retrieve, modelExtract } from "./providers.mjs";
import { archiveCapture, saveJson, uploadDirectory } from "./archive.mjs";
import { baselineScope, pagePurpose } from "./state-core.mjs";

const root = process.cwd();
const read = (path, fallback) => existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
const write = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
const observedAt = new Date().toISOString();
const runId = `${observedAt.replace(/[:.]/g, "-")}-${process.env.GITHUB_RUN_ID || "local"}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`;
const output = join(root, ".monitor", runId);
mkdirSync(output, { recursive: true });
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `capture_path=${output}\n`);
const manifest = { schemaVersion: 1, runId, scope: baselineScope(), startedAt: observedAt, captures: [], sources: [] };
saveJson(output, "manifest.json", manifest);
mkdirSync("data/monitor/runs", { recursive: true });
const operators = read("src/_data/operators.json", []);
const previous = read(process.env.MONITOR_PREVIOUS_STATE || "src/_data/monitor.json", { operators: [], sources: {}, spending: [], runs: [] });
const config = read("data/monitor/config.json", {});
saveJson(output, "operators-config.json", operators);
saveJson(output, "sources-config.json", config);
const usage = new RequestUsage();
const sourceCache = { ...(previous.sources || {}) };
const records = [];
const events = [];
const metrics = { attempted: 0, readable: 0, failed: 0, deterministicFields: 0, modelFields: 0, cached: 0 };
let count = 0;

for (const operator of operators) {
  const sources = [];
  for (const source of [...operator.sources, ...(config.additionalSources || []).filter(item => item.operatorId === operator.slug)]) {
    if (count >= 50) break;
    count++;
    metrics.attempted++;
    const url = config.sourceOverrides?.[source.id] || source.url;
    if (!/^https:\/\//.test(url)) throw new Error(`Invalid source URL: ${source.id}`);
    const attempts = [];
    let result;
    let readableResult;
    let provider;
    const options = ["direct"];
    if (process.env.FIRECRAWL_API_KEY) options.push("firecrawl");
    if (process.env.FIRECRAWL_API_KEY && config.sourceOptions?.[source.id]?.retryFullContent) options.push("firecrawl_full");
    if (process.env.BRIGHTDATA_API_KEY && process.env.BRIGHTDATA_ZONE) options.push("brightdata");
    for (const attemptProvider of options) {
      provider = attemptProvider === "firecrawl_full" ? "firecrawl" : attemptProvider;
      if (!usage.reserve(provider)) {
        attempts.push({ provider, status: "request_limit" });
        continue;
      }
      saveJson(output, "usage.json", usage);
      try {
        result = await retrieve(url, provider, process.env, {
          ...config.sourceOptions?.[source.id], ...(attemptProvider === "firecrawl_full" ? { onlyMainContent: false } : {}),
        });
        usage.record(provider, result);
        if (result.status === "ok") readableResult = result;
        // Preserve public source text, including dotted terms-clause numbers.
        // Request headers and credentials are never added to the capture.
        attempts.push({ provider, status: result.status });
        writeFileSync(join(output, `${source.id}-${provider}.txt`), result.text);
        writeFileSync(join(output, `${source.id}-${provider}.source.txt`), result.body);
      } catch (error) {
        attempts.push({ provider, status: "error", error: error.name === "TimeoutError" ? "timeout" :
          /^[a-z_]+\d*$/.test(error.message) ? error.message : "request_failed" });
        result = undefined;
        continue;
      }
      // Storage failure is fatal: do not extract or publish uncaptured evidence.
      const capture = archiveCapture(output, { id: source.id, operatorId: operator.slug, url, purpose: source.purpose || pagePurpose(source) }, provider, result);
      manifest.captures.push(capture);
      saveJson(output, "manifest.json", manifest);
      const omitted = config.sourceOptions?.[source.id]?.retryFullContent &&
        result.status === "ok" && !/\b(?:\d+(?:\.\d+)?\s*(?:SC|coins|%)|bonus|offer)\b/i.test(result.text);
      if ((result.status === "ok" && !omitted) || result.status === "login_required") break;
    }
    result = readableResult || result;
    const record = { id: source.id, url, finalUrl: result?.finalUrl || url, checkedAt: observedAt,
      purpose: source.purpose || pagePurpose(source), discoveredFrom: source.discoveredFrom || null,
      offerCoverage: "not_established_by_readability",
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
        if (process.env.MONITOR_USE_PASSAGE_MODEL === "true" && process.env.MONITOR_MODEL_URL &&
            process.env.MONITOR_MODEL_KEY && process.env.MONITOR_MODEL &&
            Object.values(record.fields).filter(quotes => quotes.length).length < 2 &&
            usage.reserve("model")) {
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
    manifest.sources.push({ operatorId: operator.slug, ...record });
    saveJson(output, "manifest.json", manifest);
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
  providerCalls: usage.calls,
  firecrawlCreditsReported: usage.firecrawlResponsesWithCredits ? usage.firecrawlCreditsReported : null,
  firecrawlResponsesWithCredits: usage.firecrawlResponsesWithCredits,
};
const latest = {
  schemaVersion: 1, lastAttemptedAt: observedAt,
  lastReadableRunAt: metrics.readable ? observedAt : previous.lastReadableRunAt || null,
  summary, operators: records, sources: sourceCache, spending: previous.spending || [],
  events: [...events, ...(previous.events || [])].slice(0, 500),
  runs: [summary, ...(previous.runs || [])].slice(0, 90),
};
// Collection only stages private results. publish.mjs is the sole public writer.
write(join(output, "summary.json"), summary);
write(join(output, "monitor.json"), latest);
saveJson(output, "usage.json", usage);
saveJson(output, "manifest.json", { ...manifest, completedAt: new Date().toISOString() });
const report = [
  "# Daily operator collection", "",
  `Run: ${observedAt}`,
  `Readable sources: ${metrics.readable}/${metrics.attempted}`,
  `Fields with source passages: ${summary.coveredFields}/${summary.totalFields}`,
  `Baseline observations: ${summary.baselines}; source-wording changes: ${summary.changes}`,
  `Requests: ${JSON.stringify(usage.calls)}. Reported Firecrawl credits: ${summary.firecrawlCreditsReported ?? "unavailable"} (not an invoice).`, "",
  "| Operator | Readable sources | Fields with passages |",
  "| --- | ---: | ---: |",
  ...records.map(record => `| ${record.name} | ${record.sources.filter(source => source.status === "ok").length}/${record.sources.length} | ${Object.values(record.fields).filter(field => ["observed", "partial"].includes(field.status)).length}/${Object.keys(FIELDS).length} |`),
  ...manifest.sources.filter(source => source.status !== "ok").map(source =>
    `- ${source.operatorId}/${source.id}: ${source.status}; attempts: ${JSON.stringify(source.attempts)}`),
  "", "Extraction coverage is not factual accuracy. Source passages are not independently verified outcomes.",
  "Full source captures are stored in the private S3 archive. They are not published as site pages or public Actions artifacts.",
];
writeFileSync(join(output, "evaluation.md"), report.join("\n") + "\n");
uploadDirectory(output);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report.join("\n") + "\n");
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `capture_path=${output}\nreadable=${metrics.readable}\n`);
console.log(JSON.stringify(summary, null, 2));
