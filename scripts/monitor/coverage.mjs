import { buildBenchmarks } from "./benchmarks.mjs";

export function comparisonCoverage(numeric, registry) {
  const { toplist } = buildBenchmarks(numeric, registry);
  const operators = toplist.rows.filter(row => row.productMode !== "entertainment_only").map(row => ({
    slug: row.slug, comparable: row.knownAttributeCount, total: toplist.attributeCount,
    missing: row.missingAttributes,
  }));
  return { status: operators.every(row => !row.missing.length) ? "complete" : "incomplete",
    fields: toplist.coverage, operators };
}
