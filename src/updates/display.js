const words = value => String(value || "").replaceAll("_", " ");
const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
export function displayRecord(record) {
  const parts = [];
  if (record.recordType === "offers") {
    for (const [key, label] of [["priceUsd", "USD"], ["immediateSc", "immediate SC"],
      ["totalSc", "total SC"], ["goldCoins", "entertainment coins"],
      ["advertisedExtraPercent", "% extra coins"], ["advertisedDiscountPercent", "% price discount"],
      ["durationDays", "days"], ["intervalHours", "hour interval"]]) {
      if (record[key] !== null && record[key] !== undefined) parts.push(`${key === "advertisedExtraPercent" && record.extraPercentComparison === "at_least" ? "at least " : ""}${number(record[key])} ${label}`);
    }
  } else if (record.recordType === "facts") {
    parts.push(`${words(record.comparison)} ${number(record.value)}${record.upperValue != null ? ` to ${number(record.upperValue)}` : ""} ${words(record.unit)}`.trim());
  } else parts.push(record.summary || "Operator statement");
  const scope = [record.method, record.scope, record.timing, record.stage, record.basis]
    .filter(value => value && value !== "unspecified").map(words);
  return { ...record, label: words(record.field || record.kind), valueText: parts.join("; ") || "Unknown",
    scopeText: [...scope, ...(record.states || []), ...(record.conditions || []),
      ...(record.promoCode ? [`Code: ${record.promoCode}`] : [])].join("; "),
    reviewLabel: words(record.reviewStatus), freshnessLabel: words(record.freshness) };
}
