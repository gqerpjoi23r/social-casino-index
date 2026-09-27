import { buildBenchmarks, latestRecords } from "./benchmarks.mjs";

const fields = ["welcome", "daily", "redemption", "cash"];
const relevant = (record, field) => field === "welcome" ?
  ["signup", "first_purchase", "purchase_package"].includes(record.kind) :
  field === "daily" ? record.kind === "recurring_daily" :
    record.field === (field === "cash" ? "redemption_minimum" : "redemption_time");
const sourceRelevant = (source, field) => {
  const topic = `${source.purpose || ""} ${source.url}`;
  return /rules|terms/.test(topic) || (field === "welcome" ? /home|signup|welcome|offer|promo/.test(topic) :
    field === "daily" ? /daily|reward|promo|home/.test(topic) : /redeem|redemption|cash|processing/.test(topic));
};

export function candidateReport(extracted, registry, manifest, evaluation) {
  const numeric = { operators: extracted.operators.map(operator => ({
    ...operator,
    records: ["offers", "facts", "statements"].flatMap(kind =>
      (operator[kind] || []).map(record => ({ ...record, recordType: kind }))),
  })) };
  const rows = buildBenchmarks(numeric, registry).toplist.rows;
  return { runId: manifest.runId, note: "Category qualification is provisional. Product identity and source conflicts require human review.",
    operators: rows.map(row => {
      const snapshot = numeric.operators.find(operator => operator.slug === row.slug);
      const configured = registry.find(operator => operator.slug === row.slug)?.sources || [];
      const sources = manifest.sources.filter(source => source.operatorId === row.slug);
      return { slug: row.slug, name: row.name, productMode: row.productMode, comparable: row.knownAttributeCount,
        homepageEligible: row.homepageEligible,
        benefitCount: row.benefitCount, missingBenefits: row.missingBenefits,
        benefits: Object.entries(row.labels).map(([key, label]) => ({ key, label,
          evidence: key === "minimum" ? row.minima : row[key] ? [row[key]] : [] })),
        fields: fields.map(field => {
          const records = latestRecords(snapshot.records, record => relevant(record, field));
          const attempts = sources.filter(source => sourceRelevant(source, field));
          const rejected = (evaluation.rejected || []).filter(item => item.operator === row.slug && relevant(item.item, field));
          const values = [...new Set(records.map(record => field === "welcome" || field === "daily" ?
            record.immediateSc : record.value).filter(value => value != null))];
          const reasons = [];
          if (row.sortValues[field] != null) reasons.push("qualifying_field");
          else if (records.length) {
            if (field === "cash") reasons.push("cash_method_unit_or_scope_not_established");
            else if (field === "redemption") reasons.push("processing_stage_units_or_bound_not_eligible");
            else if (field === "daily") reasons.push("fixed_recurring_no_purchase_amount_not_established");
            else reasons.push("free_immediate_signup_or_complete_package_not_established");
          } else if (rejected.length) reasons.push("extraction_rejected");
          else if (!configured.some(source => sourceRelevant(source, field))) reasons.push("source_not_configured");
          else if (!attempts.length) reasons.push("configured_source_not_attempted");
          else if (!attempts.some(source => source.status === "ok")) reasons.push("source_unavailable");
          else reasons.push("not_found_in_checked_sources_or_extraction_omission");
          if (values.length > 1) reasons.push("different_values_require_scope_and_conflict_review");
          return { field, value: row.sortValues[field], reasons,
            sources: attempts.map(source => ({ id: source.id, url: source.url, status: source.status })),
            records: records.map(record => ({ sourceId: record.sourceId, sourceUrl: record.sourceUrl,
              value: record.value, immediateSc: record.immediateSc, totalSc: record.totalSc, priceUsd: record.priceUsd,
              method: record.method, unit: record.unit, stage: record.stage, comparison: record.comparison,
              purchaseRequired: record.purchaseRequired, conditions: record.conditions, basis: record.basis })),
            rejected: rejected.map(item => ({ sourceId: item.item.sourceId, reason: item.reason })) };
        }) };
    }) };
}

export function candidateMarkdown(report) {
  const display = (operator, key) => (operator.benefits.find(benefit => benefit.key === key)?.evidence || [])
    .map(value => `${value.label} (${value.note || "See conditions"})`.replaceAll("|", "/")).join("; ") || "Not established";
  return ["## Candidate benefit decisions", "", report.note, "",
    "| Operator | Welcome | Purchase | Daily | Timing | Minimum | Listing |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.operators.map(operator =>
      `| ${operator.name || operator.slug} | ${["signup", "purchase", "daily", "redemption", "minimum"].map(key => display(operator, key)).join(" | ")} | ${operator.homepageEligible ? "Two useful areas established" : `Only ${operator.benefitCount} useful area(s) established`} |`),
    "", "See candidate-decisions.json for source URLs, capture statuses, extracted values and rejection reasons.",
    "Not found in checked sources is not a finding of operator nondisclosure.", ""].join("\n");
}
