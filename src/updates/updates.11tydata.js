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
    amount: record.value, immediateSc: record.immediateSc, totalSc: total(record),
    priceUsd: record.priceUsd, purchaseRequired: record.purchaseRequired,
  };
}

export function comparisonSections(numeric, now = Date.now(), purchaseBudget = Infinity) {
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
      welcome.push({ ...entry(operator, signup, `${number(total(signup))} SC${staged ? " total" : ""}`,
        [timing, eligibility].filter(Boolean).join(". ")), timing });
    }
    const pack = latest(records, record => record.recordType === "offers" && record.kind === "first_purchase", now)
      .filter(record => amount(record.priceUsd) && record.priceUsd > 0 && record.priceUsd <= purchaseBudget && amount(record.immediateSc))
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

export function playerAnswers(numeric, now = Date.now()) {
  const [welcome, purchase, redemption] = comparisonSections(numeric, now);
  const signup = welcome.groups[0].rows.filter(row => row.purchaseRequired === false);
  const packs = purchase.groups[0].rows;
  const [cash, gift] = redemption.groups.map(group => group.rows);
  const answer = (row, text) => ({ ...row, text });
  const minimum = Math.min(...cash.map(row => row.amount));
  const cashRows = cash.filter(row => row.amount === minimum);
  const budget = comparisonSections(numeric, now, 10)[1].groups[0].rows;
  const pairs = [];
  for (const [other, rows, label] of [
    ["mcluck", signup, "Free signup Sweeps Coins"],
    ["chumba", cash, "Cash redemption minimum"],
  ]) {
    const pair = ["wow-vegas", other].map(slug => rows.find(row => row.slug === slug));
    if (pair.every(Boolean)) pairs.push({
      title: `${pair[0].name} vs ${pair[1].name}`,
      rows: pair.map(row => answer(row, `${row.name} ${label.toLowerCase()}: ${row.value}.${row.note ? ` ${row.note}.` : ""}`)),
    });
  }
  return [
    { id: "low-redemption", title: "Low redemption minimums", rows: [
      ...cashRows.map(row => answer(row, `${row.name} has a ${row.value} cash redemption minimum, the lowest cash threshold in this comparison.`)),
      ...gift.filter(row => row.amount < 50).map(row => answer(row, `${row.name} starts gift-card redemption at ${row.value}. This is a gift-card threshold, not a cash threshold.`)),
    ] },
    { id: "free-signup", title: "Free signup coins: immediate and staged", rows: signup.map(row =>
      answer(row, `${row.name} advertises ${row.value} without a purchase. ${row.timing}.`)) },
    { id: "purchase-value", title: "First-purchase packages: $10 or less and SC per dollar", rows: [
      ...budget.map(row => answer(row, `${row.name}: $${number(row.priceUsd)} includes ${number(row.immediateSc)} immediate SC, within a $10 budget.`)),
      ...packs.map(row => answer(row, `${row.name}: ${number(row.immediateSc / row.priceUsd)} immediate SC per dollar on its $${number(row.priceUsd)} package. This is a coin ratio, not a cash return.`)),
    ] },
    ...pairs.map(pair => ({ ...pair, id: `compare-${pair.rows[1].slug}` })),
  ].filter(group => group.rows.length);
}

export const eleventyComputed = {
  updatedAt: data => [data.numeric?.lastSuccessfulRefresh, "2026-09-16"].filter(Boolean).sort().at(-1),
  comparisonSections: data => comparisonSections(data.numeric),
  playerAnswers: data => playerAnswers(data.numeric),
};
