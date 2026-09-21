import { buildBenchmarks } from "../../scripts/monitor/benchmarks.mjs";
const amount = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

export function comparisonSections(numeric, now = Date.now(), purchaseBudget = Infinity) {
  const welcome = [], purchase = [], cash = [], gift = [];
  const model = buildBenchmarks(numeric, [], now, purchaseBudget);
  const entry = (operator, row) => ({ ...row, slug: operator.slug, name: operator.name, amount: row.value, value: row.label });
  for (const operator of model.operators.toSorted((a, b) => a.name.localeCompare(b.name, "en"))) {
    const signup = operator.metrics.signup || operator.metrics.welcome;
    if (signup) {
      const staged = amount(signup.immediateSc) && signup.totalSc > signup.immediateSc;
      const timing = staged ? `${number(signup.immediateSc)} SC immediate${signup.durationDays > 0 ? `; total over ${number(signup.durationDays)} days` : "; remainder in stages"}` :
        amount(signup.immediateSc) && signup.totalSc === signup.immediateSc ? "Immediate" : "Advertised total";
      const eligibility = signup.purchaseRequired === false ? "No purchase needed" : signup.purchaseRequired === true ? "Purchase required" : "";
      welcome.push({ ...entry(operator, signup),
        value: `${number(signup.totalSc)} SC${staged ? signup.durationDays > 0 ? ` over ${number(signup.durationDays)} days` : " in stages" : ""}`,
        note: [timing, eligibility].filter(Boolean).join(". "), timing });
    }
    if (operator.metrics.purchase) purchase.push(entry(operator, operator.metrics.purchase));
    for (const [key, rows] of [["cash", cash], ["gift", gift]]) {
      if (operator.metrics[key]) rows.push(entry(operator, operator.metrics[key]));
    }
  }
  return [
    { id: "welcome", title: "Signup bonuses", icon: "gift", groups: [{ rows: welcome }] },
    { id: "purchase", title: "Purchase offers", icon: "coins", groups: [{ rows: purchase }] },
    { id: "redemption", title: "Redemption minimums", icon: "bank", groups: [{ title: "Cash", rows: cash }, { title: "Gift card", rows: gift }] },
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
    { id: "purchase-value", title: "Purchase packages: $10 or less and SC per dollar", rows: [
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
