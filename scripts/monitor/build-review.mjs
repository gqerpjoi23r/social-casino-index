import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { hash } from "./core.mjs";
import { evaluateRecords, numericFields, semanticKey } from "./review-core.mjs";

const [originalDirectory, correctedDirectory, outputDirectory] = process.argv.slice(2);
if (!outputDirectory) throw new Error("Usage: build-review.mjs original corrected output");
const read = path => JSON.parse(readFileSync(path, "utf8"));
const original = read(join(originalDirectory, "numeric.json"));
const corrected = read(join(correctedDirectory, "numeric.json"));
const captures = readdirSync(join(correctedDirectory, "captures")).filter(name => name.endsWith(".json.gz"))
  .map(name => JSON.parse(gunzipSync(readFileSync(join(correctedDirectory, "captures", name)))));
const rows = operator => ["offers", "facts"].flatMap(recordType =>
  (operator?.[recordType] || []).filter(record => numericFields(record).length).map(record => ({ ...record, recordType })));
const overrides = {
  "2c981bb9162ec5c0b6b9": {
    completePackage: true,
    conditions: ["First purchase only.", "Register and enter WOWBONUS2026.", "Normally $29.99.", "Instant coin delivery."],
  },
  a35519efaaed4773afb8: { comparison: "at_least" },
  c8abcce14b7d83789a79: { comparison: "at_least" },
  "033adfae8fc248e21670": { immediateSc: null, totalSc: 2 },
  "4e35823ced33ee201d22": { stage: "processing" },
};
const reference = {
  schemaVersion: 1, runId: corrected.runId, reviewedAt: new Date().toISOString(),
  sourceRuns: [original.runId, corrected.runId],
  reviewMethod: "Bounded review of saved captures with explicit corrections; not a live offer guarantee.",
  operators: corrected.operators.map(operator => {
    const records = rows(operator).map(record => {
      const changes = overrides[record.id];
      return { ...record, ...changes,
        ...(record.id === "033adfae8fc248e21670" ? {
          conditions: [...record.conditions, "At least 2 SC per valid request; the company may determine another amount."],
        } : {}),
        ...(operator.slug === "stake-us" && record.field === "playthrough" ? {
          conflict: "Help-page purchase-only scope differs from the terms scope.",
        } : {}),
        originalId: record.id, runId: corrected.runId,
        reviewStatus: "reviewed", completePackage: changes?.completePackage || false,
        ...(changes ? { overrides: changes } : {}) };
    });
    if (operator.slug === "yay-casino") {
      const recovered = rows(original.operators.find(item => item.slug === operator.slug))
        .find(record => record.id === "1a0d5e52d2de86fedafa");
      if (!recovered) throw new Error("missing_yay_recovery");
      records.push({ ...recovered, originalId: recovered.id, runId: original.runId, reviewStatus: "reviewed" });
      for (const record of records) {
        if (record.kind === "signup" && [8, 12].includes(record.totalSc)) record.conflict = "Conflicting signup offers in saved sources.";
      }
    }
    return { slug: operator.slug, name: operator.name, records,
      supportingPages: [...new Map(records.map(record =>
        [record.sourceId, { sourceId: record.sourceId, textHash: record.textHash }])).values()],
      unknowns: operator.missing || [],
    };
  }),
};

const stakePage = captures.find(page => page.sourceId === "stake-terms" && page.status === "ok");
if (!stakePage) throw new Error("missing_stake_terms_capture");
const stake = reference.operators.find(operator => operator.slug === "stake-us");
const stakeClaims = [
  {
    quote: "n) For each Request Card a Customer submits in accordance with the above requirements, the Customer will receive 5 Stake Cash.",
    recordType: "offers", name: "Mail-in Stake Cash request", kind: "promotion",
    immediateSc: null, totalSc: 5, purchaseRequired: false,
    conditions: ["Submit a compliant Request Card with a valid unique postcard code.", "Mail-in allocation is not immediate."],
  },
  {
    quote: "b) In Florida, the maximum redemption value of Stake Cash won on any Game or play, via a Customer’s participation in the Sweepstakes, is USD $5,000 (five thousand US dollars) per day. Any redemption of a Prize valued in excess of USD $5,000 (five thousand US dollars) per day will not be allocated or paid.",
    recordType: "facts", field: "redemption_cap", value: 5000, upperValue: null, unit: "USD",
    comparison: "up_to", method: "general", stage: "not_applicable", states: ["Florida"],
    basis: "Daily redemption value of Stake Cash won through Sweepstakes participation.",
    conditions: ["Amounts above USD 5,000 per day will not be allocated or paid."],
  },
  {
    quote: "c) With the exception of Stake Cash won through Promotional Play, all Customers are required to play their Stake Cash three (3) times before it is eligible to be redeemed for Prizes.",
    recordType: "facts", field: "playthrough", value: 3, upperValue: null, unit: "multiplier",
    comparison: "exact", method: "general", stage: "not_applicable", states: [],
    basis: "All Stake Cash except Stake Cash won through Promotional Play.",
    conditions: ["Stake Cash won through Promotional Play is excepted."],
    conflict: "Terms scope differs from the help-page purchase-only scope.",
  },
];
for (const record of stakeClaims) {
  stake.records.push({ ...record, id: `review-${hash(record.quote).slice(0, 20)}`,
    sourceId: stakePage.sourceId, sourceUrl: stakePage.requestedUrl, capturedAt: stakePage.capturedAt,
    captureId: stakePage.id, textHash: stakePage.textHash, runId: corrected.runId,
    reviewStatus: "reviewed", extractor: "saved-source-review" });
}
stake.unknowns = stake.unknowns.filter(field => !["offers", "redemption_cap"].includes(field));

// Recovery records require exact saved-source quotes and explicit provenance.
const recoveryPath = join(outputDirectory, "recoveries.json");
let recoveries = [];
try { recoveries = read(recoveryPath); } catch (error) { if (error.code !== "ENOENT") throw error; }
for (const { slug, record } of recoveries) {
  const operator = reference.operators.find(item => item.slug === slug);
  if (!operator) throw new Error(`unknown_recovery_operator:${slug}`);
  operator.records.push({ ...record, originalId: record.id, runId: corrected.runId, reviewStatus: "reviewed" });
}
const normalized = text => String(text || "").replace(/\s+/g, " ").trim();
for (const operator of reference.operators) {
  for (const record of operator.records) {
    const page = captures.find(page => page.sourceId === record.sourceId && page.textHash === record.textHash);
    if (!page || !normalized(page.text || page.markdown || page.normalizedText).includes(normalized(record.quote))) {
      throw new Error(`ungrounded_review_record:${operator.slug}:${record.id}`);
    }
    record.supportingPages ||= [{ sourceId: record.sourceId, textHash: record.textHash }];
  }
  operator.records = [...new Map(operator.records.map(record =>
    [JSON.stringify([semanticKey(record), numericFields(record).map(field => [field, record[field]])]), record])).values()];
  operator.supportingPages = [...new Map(operator.records.flatMap(record => record.supportingPages)
    .map(page => [page.sourceId, page])).values()];
}
const evaluation = {
  sourceRuns: reference.sourceRuns,
  replay: {
    corrected: "Passed with network disabled, zero new scrapes and zero model calls.",
    original: "Current extractor cannot identically replay the older prompt/schema cache. The original archive remains unchanged.",
  },
  limitations: [
    "Only the saved captures were inspected. Unknown and inaccessible sources are not accuracy successes.",
    "Semantic identity includes conditions, scope, timing and units. Equivalent wording is not automatically credited.",
    "The reviewed reference starts from corrected extraction with explicit saved-evidence corrections; this is not an independent blinded benchmark.",
    "The WOW package is not a cross-operator benchmark. Multi-day reliability is unproven.",
  ],
  operators: reference.operators.map(operator => {
    const deterministic = read(join(correctedDirectory, "extractions", `${operator.slug}-deterministic.json`));
    const deterministicRows = rows(deterministic.accepted || deterministic);
    const manifest = read(join(correctedDirectory, "manifest.json"));
    const sources = manifest.sources.filter(source => source.operatorId === operator.slug);
    return { slug: operator.slug, actualValues: operator.records,
      coverage: { attempted: sources.length, readable: sources.filter(source =>
        captures.some(page => page.sourceId === source.id && page.status === "ok")).length },
      unknowns: operator.unknowns,
      completePackages: operator.records.filter(record => record.completePackage).map(record => record.id),
      conflicts: operator.records.filter(record => record.conflict).map(record => record.id),
      deterministic: evaluateRecords(deterministicRows, operator.records),
      originalTerra: evaluateRecords(rows(original.operators.find(item => item.slug === operator.slug)), operator.records),
      correctedTerra: evaluateRecords(rows(corrected.operators.find(item => item.slug === operator.slug)), operator.records),
    };
  }),
};
mkdirSync(outputDirectory, { recursive: true });
for (const [name, value] of [["reviewed.json", reference], ["evaluation.json", evaluation]]) {
  writeFileSync(join(outputDirectory, name), JSON.stringify(value, null, 2) + "\n");
}
const table = ["# Saved-capture evaluation", "", ...evaluation.limitations.map(text => `- ${text}`), "",
  "| Operator | Extractor | Correct | Incorrect | Omitted | Precision | Recall |",
  "| --- | --- | ---: | ---: | ---: | ---: | ---: |"];
for (const operator of evaluation.operators) for (const kind of ["deterministic", "originalTerra", "correctedTerra"]) {
  const result = operator[kind];
  table.push(`| ${operator.slug} | ${kind} | ${result.correct.length} | ${result.incorrect.length} | ${result.omissions.length} | ${result.precision ?? "n/a"} | ${result.recall ?? "n/a"} |`);
}
table.push("", "## Coverage and reviewed values", "",
  "| Operator | Readable / attempted | Reviewed numeric values | Conflicts | Complete packages | Unknowns |",
  "| --- | --- | --- | ---: | ---: | --- |");
for (const operator of evaluation.operators) {
  const values = operator.actualValues.map(record => {
    const label = record.name || record.field || record.kind;
    const numbers = numericFields(record).map(field => `${field}=${record[field]}`).join(", ");
    const context = [record.unit, record.method, record.stage, record.basis,
      ...(record.conditions || [])].filter(Boolean).join("; ");
    return `${label}: ${numbers} (${context})`;
  }).join("<br>").replaceAll("|", "\\|").replaceAll("\n", " ");
  table.push(`| ${operator.slug} | ${operator.coverage.readable} / ${operator.coverage.attempted} | ${values || "Unknown"} | ${operator.conflicts.length} | ${operator.completePackages.length} | ${operator.unknowns.join(", ")} |`);
}
table.push("", "## Offline replay", "", evaluation.replay.corrected, "", evaluation.replay.original);
writeFileSync(join(outputDirectory, "evaluation.md"), table.join("\n") + "\n");
console.log(JSON.stringify({ operators: reference.operators.length, records: reference.operators.reduce((sum, operator) => sum + operator.records.length, 0),
  sha256: hash(readFileSync(join(outputDirectory, "reviewed.json"))) }));
