import { latestRecords } from "../../scripts/monitor/benchmarks.mjs";

export const eleventyComputed = {
  current: data => data.benchmarks.operators.find(op => op.slug === data.operator?.slug),
  publishedPolicies: data => {
    const operator = data.numeric.operators.find(op => op.slug === data.operator?.slug);
    return ["playthrough", "redemption_time", "redemption_cap"].flatMap(field =>
      latestRecords(operator?.records || [], r => r.recordType === "facts" && r.field === field)
        .map(r => ({ ...r, label: field.replaceAll("_", " "), observedAt: r.lastConfirmedAt || r.capturedAt })));
  },
};
