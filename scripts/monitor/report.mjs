import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const directory = process.argv[2];
if (!directory) throw new Error("Usage: node scripts/monitor/report.mjs <capture directory>");
const read = name => JSON.parse(readFileSync(join(directory, name), "utf8"));
const manifest = read("manifest.json");
if (!existsSync(join(directory, "numeric.json")) || !existsSync(join(directory, "numeric-evaluation.json"))) {
  const lines = [
    "# Operator Monitor: Incomplete Run", "",
    `Run: ${manifest.runId}. Started: ${manifest.startedAt}.`,
    `Collection completed: ${manifest.completedAt || "no"}.`,
    `Archived captures: ${manifest.captures.length}.`,
    "Numeric extraction did not complete. No numeric results are approved for publication.",
    "Successful partial captures remain available for recovery and model re-extraction.", "",
    ...manifest.sources.map(source => `- ${source.operatorId}: ${source.id}: ${source.status}`),
  ];
  writeFileSync(join(directory, "results.md"), lines.join("\n") + "\n");
  console.log(join(directory, "results.md"));
  process.exit(0);
}
const numeric = read("numeric.json");
const evaluation = read("numeric-evaluation.json");
const summary = read("summary.json");
const cell = value => String(value ?? "unknown").replace(/\|/g, "\\|").replace(/\s+/g, " ");
const numberFields = ["priceUsd", "immediateSc", "totalSc", "goldCoins", "advertisedExtraPercent", "durationDays", "intervalHours"];
const totals = key => numeric.operators.reduce((sum, operator) => sum + operator[key].length, 0);
const models = [...new Set(numeric.operators.flatMap(operator => {
  const path = join(directory, `model/${operator.slug}-response.json`);
  return existsSync(path) ? [JSON.parse(readFileSync(path, "utf8")).response.model] : [];
}))];
const rejectedReasons = evaluation.rejected.reduce((counts, record) => {
  counts[record.reason] = (counts[record.reason] || 0) + 1;
  return counts;
}, {});
const lines = [
  "# Operator Monitor: Numeric Results", "",
  `Run: ${numeric.runId}. Capture start: ${manifest.startedAt}. Capture end: ${manifest.completedAt}.`,
  `Extraction time: ${numeric.extractedAt}. Status: STAGED; every accepted record still needs semantic review.`, "",
  "## What This Run Produced", "",
  `- ${manifest.sources.length} configured URLs; ${manifest.sources.filter(source => source.status === "ok").length} readable; ${manifest.captures.length} compressed capture archives.`,
  `- ${totals("offers")} offer records, ${totals("facts")} numeric policy records, ${totals("statements")} natural-language statements.`,
  `- ${evaluation.checkedNumbers} non-null numeric fields passed grounding checks. These include ages, intervals and repeated amounts, not just bonus values.`,
  `- ${totals("derived")} complete immediate-purchase packages eligible for the current SC-per-USD calculation.`,
  `- ${evaluation.rejected.length} rejected records: ${Object.entries(rejectedReasons).map(([reason, count]) => `${count} ${reason}`).join("; ")}.`,
  `- ${evaluation.modelErrors.length} model errors; ${evaluation.replayEvents} change events when replaying identical numeric records.`,
  `- Original collection: ${summary.providerCalls.firecrawl} Firecrawl calls. Cached model response files: ${numeric.operators.filter(operator => existsSync(join(directory, `model/${operator.slug}-response.json`))).length}. This extraction pass made ${evaluation.modelCalls} new model calls.`,
  `- Model deployment: ${numeric.model}; returned model: ${models.join(", ")}.`,
  "", "These are operator-published claims, not measured payouts, legal conclusions, or verified player entitlements.",
  "Source capture time is not the offer's start date. A readable page is not proof that it contains a current offer.",
  "", "## Coverage", "",
  "| Operator | Readable / configured | Offers | Policies | Statements | Numeric fields | Rejected |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
];
for (const operator of numeric.operators) {
  const row = evaluation.operators.find(item => item.operator === operator.slug);
  const configured = manifest.sources.filter(source => source.operatorId === operator.slug).length;
  lines.push(`| ${cell(operator.name)} | ${row.readableSources}/${configured} | ${row.offers} | ${row.facts} | ${row.statements} | ${row.numericFields} | ${row.rejected} |`);
}
lines.push("", "## Evaluation And Limits", "",
  "Grounding checks validate the JSON schema, verify each quote against its captured page, check that numbers occur in the quote, and reject some incompatible units and interpretations. They do not prove that a number belongs to the right offer, that all qualifiers were retained, or that the source is current.",
  `Deterministic-only output: ${evaluation.operators.reduce((sum, row) => sum + row.deterministicOffers, 0)} offers and ${evaluation.operators.reduce((sum, row) => sum + row.deterministicFacts, 0)} policies. This is insufficient for a purchase-value benchmark.`,
  "The model broadens coverage but still produces unsupported quotes and classification mistakes. A rejected record may contain recoverable information; it is retained below instead of silently repaired.",
  totals("derived") === 0 ? "No complete immediate-purchase package passed the current comparison checks." :
    "Eligible purchase ratios are provisional arithmetic on unreviewed records, not a published benchmark.",
  "Recover rejected records through review or revised extraction from saved captures. A price discount is not an extra-coins percentage. Keep conflicting claims, immediate grants and staged totals separate. Do not compare entertainment-only coins with redeemable SC.",
  "Only configured public operator URLs were checked. Discovery is not automated; captured links can support later URL review. Login-only, personalized, email, and in-app offers are outside this run.",
  "First numeric observations are baselines. Changes require review; not reconfirmed does not mean expired. Identical replay is a stability test, not a multi-day reliability test.",
  "", "## All Source URLs", "",
  "| Operator | Source ID | Requested URL | Final URL | Status | Provider |",
  "| --- | --- | --- | --- | --- | --- |");
for (const source of manifest.sources) {
  lines.push(`| ${[source.operatorId, source.id, source.url, source.finalUrl, source.status, source.provider].map(cell).join(" | ")} |`);
}
for (const operator of numeric.operators) {
  lines.push("", `## ${operator.name}`, "",
    `Product mode: ${operator.productMode}. Missing categories: ${operator.missing.join(", ") || "none"}.`,
    "Category presence does not imply all numeric fields are filled.", "");
  for (const kind of ["offers", "facts", "statements"]) {
    lines.push(`### ${kind[0].toUpperCase()}${kind.slice(1)}`, "");
    if (!operator[kind].length) lines.push("None accepted.", "");
    for (const item of operator[kind]) {
      lines.push(`#### ${cell(item.name || item.field)}`, "");
      if (kind === "offers") {
        lines.push(`Kind: ${item.kind}. ${numberFields.map(key => `${key}: ${item[key] ?? "unknown"}`).join("; ")}.`,
          `Purchase required: ${item.purchaseRequired ?? "unknown"}. Promo code: ${item.promoCode ?? "unknown"}.`);
      } else if (kind === "facts") {
        lines.push(`Value: ${item.value}${item.upperValue === null ? "" : ` to ${item.upperValue}`} ${item.unit}; comparison: ${item.comparison}; method: ${item.method}; stage: ${item.stage}.`,
          `States: ${item.states.join(", ") || "not specified"}. Basis: ${item.basis}`);
      } else {
        lines.push(`Summary: ${item.summary}`);
      }
      if (item.conditions?.length) lines.push(`Conditions: ${item.conditions.join(" | ")}`);
      lines.push(`Source: ${item.sourceUrl}`, `Captured: ${item.capturedAt}; capture ID: ${item.captureId}.`,
        `Archive key: ${item.archiveKey ?? "see manifest"}.`, "", `> ${cell(item.quote)}`, "");
    }
  }
}
lines.push("## Rejected Records", "",
  "These records are NOT accepted results. Quotes may be unsupported. Retained in full for correction from saved captures.", "");
for (const record of evaluation.rejected) {
  lines.push(`### ${record.operator}: ${record.reason}`, "", "```json", JSON.stringify(record, null, 2), "```", "");
}
lines.push("## Files", "",
  "- `manifest.json`: URLs, statuses, capture hashes and archive keys.",
  "- `captures/*.json.gz`: source text, Markdown and HTML/rawHtml when returned; PDF bytes where captured directly.",
  "- `model/*-request.json` and `model/*-response.json`: replay inputs, model output and token usage; no API keys.",
  "- `numeric.json`: staged normalized records, provenance and candidate changes.",
  "- `numeric-evaluation.json`: coverage, rejection details, model errors and numeric replay results.",
  "- `usage.json`: bounded request counts and available provider credits, not an invoice.",
  "- `evaluation.md` and `replay-evaluation.json`: passage coverage and evidence checks.", "");
const path = join(directory, "results.md");
writeFileSync(path, lines.join("\n"));
console.log(path);
