const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const dated = record => record.lastConfirmedAt || record.capturedAt;
const text = record => [record.name, record.basis, ...(record.conditions || [])].filter(Boolean).join(" ");
const newest = records => [...records].sort((a, b) =>
  Date.parse(dated(b)) - Date.parse(dated(a)) || a.sourceUrl.localeCompare(b.sourceUrl));

function evidence(record, label, note, snapshot) {
  const source = snapshot.coverage?.find(source => source.id === record.sourceId);
  return {
    label, note, sourceUrl: record.sourceUrl, recordId: record.id,
    observedAt: dated(record), conditions: record.conditions || [],
    status: record.freshness === "not_reconfirmed" ? "retained" : "published",
    lastCheckedAt: source?.checkedAt || (source ? snapshot.lastAttempt : null),
    firstObservedAt: record.firstObservedAt || record.capturedAt,
    lastChangedAt: record.lastChangedAt || null,
  };
}

function dailyReward(operator, snapshot, offers) {
  if (operator.metrics.daily) {
    return { ...operator.metrics.daily, label: `${operator.metrics.daily.label} daily`,
      note: "No purchase required" };
  }
  const candidates = newest(offers.filter(record => record.kind === "recurring_daily" &&
    record.purchaseRequired === false));
  const initial = candidates.find(record => record.immediateSc != null &&
    /first daily|first (?:day|login|claim)|day (?:one|1)/i.test(text(record)));
  if (initial) return evidence(initial, `${number(initial.immediateSc)} SC first claim`,
    "Later daily amounts unverified", snapshot);
  const recurring = candidates[0];
  if (!recurring) return null;
  return evidence(recurring, /\bGold Coins?\b/i.test(text(recurring)) &&
    !/\bSC\b|Sweeps(?:takes)? Coins?|Stake Cash/i.test(text(recurring)) ? "Daily Gold Coins" : "Daily reward",
  "Amount unverified", snapshot);
}

function redemptionTime(snapshot, records) {
  const units = { hours: "hours", business_days: "business days", calendar_days: "calendar days",
    days_unspecified: "days (type unspecified)" };
  const stages = { processing: "Processing", approval: "Approval", transfer: "Payment delivery",
    end_to_end: "Request to receipt" };
  const methods = { cash: "cash", bank: "bank", debit_card: "debit card",
    general: "method varies", unspecified: "method unspecified" };
  const candidates = newest(records.filter(record => record.field === "redemption_time" &&
    Number.isFinite(record.value) && units[record.unit] && methods[record.method] && stages[record.stage] &&
    ["exact", "up_to", "range", "at_least"].includes(record.comparison) &&
    (record.comparison !== "range" || (Number.isFinite(record.upperValue) && record.upperValue >= record.value)) &&
    !/verification process|provide requested|complete required|automatically declined/i.test(record.basis || "") &&
    (!/VIP|account tier|membership tier/i.test(text(record)) || /\bstandard\b|\bVIP\s*0\b/i.test(text(record)))));
  const priorities = ["processing", "approval", "end_to_end", "transfer"];
  candidates.sort((a, b) => priorities.indexOf(a.stage) - priorities.indexOf(b.stage));
  const record = candidates[0];
  if (!record) return null;
  const value = record.upperValue != null ? `${number(record.value)}-${number(record.upperValue)}` :
    `${record.comparison === "up_to" ? "Up to " : record.comparison === "at_least" ? "At least " : ""}${number(record.value)}`;
  const tier = /\bstandard\b/i.test(text(record)) ? "standard tier" : methods[record.method];
  return evidence(record, `${value} ${units[record.unit]}`, `${stages[record.stage]}; ${tier}`, snapshot);
}

export function buildToplist(operators, numeric, latestRecords, now) {
  const snapshots = new Map((numeric?.operators || []).filter(Boolean).map(operator => [operator.slug, operator]));
  const rows = [...operators].sort((a, b) =>
    (b.score !== null) - (a.score !== null) || (b.score ?? 0) - (a.score ?? 0) ||
    (a.productMode === "entertainment_only") - (b.productMode === "entertainment_only") ||
    (b.metrics.signup?.value ?? -1) - (a.metrics.signup?.value ?? -1) ||
    (b.metrics.purchase20?.value ?? b.metrics.purchase?.value ?? -1) -
      (a.metrics.purchase20?.value ?? a.metrics.purchase?.value ?? -1) ||
    a.name.localeCompare(b.name, "en")).map((operator, index) => {
    const snapshot = snapshots.get(operator.slug) || {};
    const records = snapshot.records || [];
    const offers = latestRecords(records, record => record.recordType === "offers", now);
    const signup = operator.metrics.signup;
    const purchase = operator.metrics.purchase20 || operator.metrics.purchase;
    const welcome = signup ? {
      ...signup,
      label: `${signup.label} free`,
      note: signup.totalSc > signup.immediateSc ?
        /\bspins\b|\btasks\b|opt.in/i.test((signup.conditions || []).join(" ")) ?
          `Up to ${number(signup.totalSc)} SC with ${signup.durationDays ? `${number(signup.durationDays)}-day ` : ""}tasks` :
          `${number(signup.totalSc)} SC total${signup.durationDays ? ` over ${number(signup.durationDays)} days` : " in stages"}` :
        "On signup; no purchase",
    } : purchase ? { ...purchase, note: purchase.kind === "first_purchase" ? "First purchase" : "Regular purchase package" } : null;
    return { slug: operator.slug, name: operator.name, favicon: operator.favicon,
      url: operator.url, visitUrl: `/go/${operator.slug}/`, position: index + 1,
      productMode: operator.productMode, welcome,
      daily: dailyReward(operator, snapshot, offers),
      redemption: operator.productMode === "entertainment_only" ? null :
        redemptionTime(snapshot, latestRecords(records, record =>
          record.recordType === "facts" && record.field === "redemption_time", now)),
      cash: operator.metrics.cash || null, generalMinimum: operator.metrics.general || null,
      lastCheckedAt: snapshot.lastAttempt || null };
  });
  return { version: "single-toplist-1", lastCheckedAt: numeric?.lastAttemptedAt || null, rows };
}
