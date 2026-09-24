import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readCapture, verifyArchive } from "./archive.mjs";
import { buildBenchmarks, latestRecords } from "./benchmarks.mjs";
import { checkExtraction } from "./numeric-core.mjs";
import { retryFullContent } from "./discovery.mjs";
import { supportedContent } from "./providers.mjs";
import { isRequestFrequency } from "./redemption-semantics.mjs";

const [directory, output = ".monitor/collection-recovery-report"] = process.argv.slice(2);
if (!directory) throw new Error("Usage: node scripts/monitor/collection-audit.mjs <archive-directory> [output-directory]");
const read = path => JSON.parse(readFileSync(path, "utf8"));
verifyArchive(directory);
const manifest = read(join(directory, "manifest.json"));
const numeric = read("src/_data/numeric.json");
const registry = read("src/_data/operators.json");
const config = read("data/monitor/config.json");
const before = read("docs/updates/leaderboard.json");
const after = buildBenchmarks(numeric, registry);
const captures = manifest.captures.map(entry => readCapture(directory, entry));
const relevant = (record, field) => field === "welcome" ? record.recordType === "offers" &&
  ["signup", "first_purchase", "purchase_package"].includes(record.kind) :
  field === "daily" ? record.kind === "recurring_daily" :
    record.field === (field === "cash" ? "redemption_minimum" : "redemption_time");
const operators = after.toplist.rows.map(row => {
  const snapshot = numeric.operators.find(operator => operator.slug === row.slug);
  const sources = manifest.sources.filter(source => source.operatorId === row.slug);
  const cachedPath = join(directory, `model/${row.slug}-response.json`);
  let replay = null;
  if (existsSync(cachedPath)) {
    const pages = [...new Map(captures.filter(capture => capture.operatorId === row.slug && capture.status === "ok" &&
      supportedContent(Buffer.from(capture.text), "text/plain")).map(capture => [capture.sourceId, capture])).values()];
    const cached = read(cachedPath);
    replay = checkExtraction(JSON.parse(cached.response.choices[0].message.content), pages);
  }
  return {
    slug: row.slug, productMode: row.productMode,
    sources: sources.map(source => ({ id: source.id, url: source.url, status: source.status, attempts: source.attempts })),
    replay: replay && {
      accepted: Object.fromEntries(Object.entries(replay.accepted).map(([kind, records]) => [kind, records.length])),
      rejected: replay.rejected.map(({ item, reason }) => ({ sourceId: item.sourceId, kind: item.kind || item.field, reason })),
      recovered: replay.recovered.map(({ item, field, reason }) => ({ sourceId: item.sourceId, field, reason })),
    },
    attributes: ["welcome", "daily", "redemption", "cash"].map(field => {
      const records = latestRecords(snapshot.records || [], record => relevant(record, field));
      const supported = Number.isFinite(row.sortValues[field]);
      const reason = row.productMode === "entertainment_only" ? "product_mode_excluded" :
        supported ? "comparable" :
          records.some(isRequestFrequency) && field === "redemption" ? "request_frequency_not_duration" :
            !records.length ? sources.some(source => source.status === "ok") ? "no_eligible_record_in_saved_sources" : "collection_unavailable" :
              field === "daily" && records.every(record => record.immediateSc == null) ? "daily_amount_not_established" :
                field === "cash" ? "cash_method_or_unit_not_established" : "scope_or_comparison_not_eligible";
      return { field, reason, before: before.toplist.rows.find(old => old.slug === row.slug)?.sortValues[field] ?? null,
        after: row.sortValues[field], label: row[field]?.label || null,
        records: records.map(record => ({ id: record.id, sourceId: record.sourceId, method: record.method,
          stage: record.stage, unit: record.unit, comparison: record.comparison, value: record.value,
          immediateSc: record.immediateSc, totalSc: record.totalSc, purchaseRequired: record.purchaseRequired,
          basis: record.basis, conditions: record.conditions })) };
    }),
  };
});
const fullRetries = manifest.sources.flatMap(source => {
  const rendered = captures.filter(capture => capture.sourceId === source.id && capture.provider === "firecrawl");
  return rendered.length > 1 && !retryFullContent(rendered[0], config.sourceOptions?.[source.id]) ? [source.id] : [];
});
const report = {
  runId: manifest.runId, auditedAt: new Date().toISOString(), modelCalls: 0, scrapeCalls: 0,
  beforeCoverage: before.toplist.coverage, afterCoverage: after.toplist.coverage,
  avoidedFullRetriesOnReplay: fullRetries,
  unsupportedCaptures: captures.filter(capture => capture.status === "ok" &&
    !supportedContent(Buffer.from(capture.text), "text/plain")).map(capture => capture.sourceId),
  operators,
};
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "audit.json"), JSON.stringify(report, null, 2) + "\n");
const lines = ["# Collection recovery audit", "", `Archive: ${manifest.runId}. No new model or collection calls.`,
  `Coverage before: ${JSON.stringify(report.beforeCoverage)}. After display corrections: ${JSON.stringify(report.afterCoverage)}.`,
  `Full rendering retries avoided on the same attempt trace: ${fullRetries.length}. This is a replay estimate, not a live saving.`,
  "", "| Operator | Attribute | Diagnosis | Before | After |", "| --- | --- | --- | --- | --- |",
  ...operators.flatMap(operator => operator.attributes.map(attribute =>
    `| ${operator.slug} | ${attribute.field} | ${attribute.reason} | ${attribute.before ?? "-"} | ${attribute.after ?? "-"} |`)),
  "", "Missing records are not findings of operator nondisclosure. Inspect source attempts, replay rejections and record qualifiers in audit.json.",
];
writeFileSync(join(output, "audit.md"), lines.join("\n") + "\n");
console.log(lines.slice(0, 5).join("\n"));
console.log(`All ${operators.length * 4} attribute traces written to ${output}.`);
