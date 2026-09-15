const amount = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const observed = record => record.lastConfirmedAt || record.capturedAt;
const total = record => amount(record.totalSc) ? record.totalSc : record.immediateSc;

function latest(records, matches, now) {
  const matching = records.filter(record => matches(record) &&
    /^https:\/\//.test(record.sourceUrl || "") && Date.parse(observed(record)) <= now);
  const dates = new Map();
  for (const record of matching) {
    dates.set(record.sourceUrl, Math.max(dates.get(record.sourceUrl) || 0, Date.parse(observed(record))));
  }
  // Pick the latest snapshot before filtering usable values, so older offers cannot resurface.
  return matching.filter(record => Date.parse(observed(record)) === dates.get(record.sourceUrl) &&
    !record.states?.length && (!record.scope || record.scope === "general"))
    .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt) || a.sourceUrl.localeCompare(b.sourceUrl));
}

function entry(operator, record, value, note = "") {
  return {
    slug: operator.slug, name: operator.name, value, note,
    sourceUrl: record.sourceUrl, observedAt: observed(record),
    conditions: record.conditions || [], promoCode: record.promoCode,
  };
}

export function comparisonSections(numeric, now = Date.now()) {
  const welcome = [], purchase = [], cash = [], gift = [];
  for (const operator of (numeric?.operators || []).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    if (operator.productMode === "entertainment_only") continue;
    const records = operator.records || [];
    const signup = latest(records, record => record.recordType === "offers" && record.kind === "signup", now)
      .filter(record => amount(total(record)) && (!amount(record.immediateSc) || total(record) >= record.immediateSc))
      .sort((a, b) => total(b) - total(a))[0];
    if (signup) {
      const staged = amount(signup.immediateSc) && total(signup) > signup.immediateSc;
      const timing = staged ? `${number(signup.immediateSc)} SC immediate${signup.durationDays > 0 ? `; total over ${number(signup.durationDays)} days` : "; remainder in stages"}` :
        amount(signup.immediateSc) && total(signup) === signup.immediateSc ? "Immediate" : "Advertised total";
      const eligibility = signup.purchaseRequired === false ? "No purchase needed" : signup.purchaseRequired === true ? "Purchase required" : "";
      welcome.push(entry(operator, signup, `${number(total(signup))} SC${staged ? " total" : ""}`, [timing, eligibility].filter(Boolean).join(". ")));
    }
    const pack = latest(records, record => record.recordType === "offers" && record.kind === "first_purchase", now)
      .filter(record => amount(record.priceUsd) && record.priceUsd > 0 && amount(record.immediateSc))
      .sort((a, b) => b.immediateSc / b.priceUsd - a.immediateSc / a.priceUsd || a.priceUsd - b.priceUsd)[0];
    if (pack) purchase.push(entry(operator, pack, `$${number(pack.priceUsd)} / ${number(pack.immediateSc)} SC`,
      `${number(pack.immediateSc / pack.priceUsd)} SC per $1. Immediate coins.`));
    const minimums = latest(records, record => record.recordType === "facts" && record.field === "redemption_minimum", now);
    for (const [method, rows] of [["cash", cash], ["gift_card", gift]]) {
      const minimum = minimums.filter(record => record.method === method && record.unit === "SC" &&
        amount(record.value) && ["exact", "at_least"].includes(record.comparison) && record.upperValue == null)
        .sort((a, b) => a.value - b.value)[0];
      if (minimum) rows.push(entry(operator, minimum, `${number(minimum.value)} SC`));
    }
  }
  return [
    { id: "welcome", title: "Welcome SC", icon: "gift", groups: [{ rows: welcome }] },
    { id: "purchase", title: "First purchase", icon: "coins", groups: [{ rows: purchase }] },
    { id: "redemption", title: "Redemption minimum", icon: "bank", groups: [{ title: "Cash", rows: cash }, { title: "Gift card", rows: gift }] },
  ];
}

export const eleventyComputed = {
  updatedAt: data => [data.numeric?.lastSuccessfulRefresh, "2026-09-15"].filter(Boolean).sort().at(-1),
  comparisonSections: data => comparisonSections(data.numeric),
};
