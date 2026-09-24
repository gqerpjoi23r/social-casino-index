import { buildBenchmarks, latestRecords } from "./benchmarks.mjs";

export function comparisonCoverage(numeric, registry, evaluation = null) {
  const { toplist } = buildBenchmarks(numeric, registry);
  const operators = toplist.rows.filter(row => row.productMode !== "entertainment_only").map(row => ({
    slug: row.slug, comparable: row.knownAttributeCount, total: toplist.attributeCount,
    missing: row.missingAttributes,
    diagnostics: row.missingAttributes.map(field => {
      const snapshot = numeric.operators.find(operator => operator.slug === row.slug);
      const relevant = record => field === "welcome" ? ["signup", "first_purchase", "purchase_package"].includes(record.kind) :
        field === "daily" ? record.kind === "recurring_daily" :
          record.field === (field === "cash" ? "redemption_minimum" : "redemption_time");
      const rejections = (evaluation?.rejected || []).filter(rejection => rejection.operator === row.slug && relevant(rejection.item));
      const records = latestRecords(snapshot?.records || [], relevant);
      return { field, reason: rejections.length ? "extraction_rejected" : records.length ? "evidence_not_comparable" :
        snapshot?.coverage?.some(source => source.status === "ok") ? "no_accepted_record" : "source_unavailable",
        rejected: rejections.map(rejection => ({ sourceId: rejection.item.sourceId, reason: rejection.reason })),
        sourceFailures: (snapshot?.coverage || []).filter(source => source.status !== "ok").map(source =>
          ({ sourceId: source.id, status: source.status })) };
    }),
  }));
  return { status: operators.every(row => !row.missing.length) ? "complete" : "incomplete",
    fields: toplist.coverage, operators };
}
