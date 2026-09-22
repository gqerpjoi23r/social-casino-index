import { orderToplist } from "../../src/assets/toplist-order.js";

const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const dated = record => record.lastConfirmedAt || record.capturedAt;
const text = record => [record.name, record.basis, ...(record.conditions || [])].filter(Boolean).join(" ");
const newest = records => [...records].sort((a, b) =>
  Date.parse(dated(b)) - Date.parse(dated(a)) || a.sourceUrl.localeCompare(b.sourceUrl));

function evidence(record, label, note, snapshot) {
  const source = snapshot.coverage?.find(source => source.id === record.sourceId);
  return {
    label, note, sourceUrl: record.sourceUrl, recordId: record.id,
    value: record.value ?? record.immediateSc ?? null,
    upperValue: record.upperValue ?? null, unit: record.unit || "SC",
    stage: record.stage || null, comparison: record.comparison || null,
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
      note: "No purchase required", comparable: true };
  }
  const candidates = newest(offers.filter(record => record.kind === "recurring_daily" &&
    record.purchaseRequired === false));
  const initial = candidates.find(record => record.immediateSc != null &&
    /first daily|first (?:day|login|claim)|day (?:one|1)/i.test(text(record)));
  if (initial) return { ...evidence(initial, `${number(initial.immediateSc)} SC first claim`,
    "Later daily amounts unverified", snapshot), comparable: false };
  const recurring = candidates[0];
  if (!recurring) return null;
  return { ...evidence(recurring, "Amount not verified", "", snapshot), comparable: false };
}

function redemptionTime(snapshot, records) {
  const units = { hours: "hours", business_days: "business days", calendar_days: "calendar days",
    days_unspecified: "days (type unspecified)" };
  const stages = { processing: "Processing", approval: "Approval",
    end_to_end: "Request to receipt" };
  const methods = { cash: "cash", bank: "bank", debit_card: "debit card",
    general: "method varies", unspecified: "method unspecified" };
  // Some extracted records leave stage unspecified despite an explicit processing basis.
  const classified = records.map(record => record.stage === "unspecified" &&
    /\bprocessing\b/i.test(record.basis || "") &&
    !/\bdelivery\b|\btransfer\b/i.test(record.basis || "") ?
    { ...record, stage: "processing" } : record);
  const candidates = newest(classified.filter(record => record.field === "redemption_time" &&
    Number.isFinite(record.value) && units[record.unit] && methods[record.method] && stages[record.stage] &&
    ["exact", "up_to", "range", "at_least"].includes(record.comparison) &&
    (record.comparison !== "range" || (Number.isFinite(record.upperValue) && record.upperValue >= record.value)) &&
    !/verification process|provide requested|complete required|automatically declined/i.test(record.basis || "") &&
    (!/VIP|account tier|membership tier/i.test(text(record)) || /\bstandard\b|\bVIP\s*0\b|\bRising\b/i.test(text(record)))));
  const priorities = ["processing", "approval", "end_to_end"];
  candidates.sort((a, b) => priorities.indexOf(a.stage) - priorities.indexOf(b.stage) ||
    (a.method === "unspecified" || a.method === "general") - (b.method === "unspecified" || b.method === "general"));
  const record = candidates[0];
  if (!record) return null;
  const value = record.upperValue != null ? `${number(record.value)}-${number(record.upperValue)}` :
    `${record.comparison === "up_to" ? "Up to " : record.comparison === "at_least" ? "At least " : ""}${number(record.value)}`;
  const tier = /\bRising\b/i.test(text(record)) && /\bSilver\b/i.test(text(record)) ? "Rising-Silver tiers" :
    /\bstandard\b/i.test(text(record)) ? "standard tier" : methods[record.method];
  const unit = record.unit === "hours" && /\bbusiness hours\b/i.test(text(record)) ? "business hours" : units[record.unit];
  const result = evidence(record, `${value} ${unit}`, `${stages[record.stage]}; ${tier}`, snapshot);
  // Sort only a bounded processing/approval estimate, never a delivery time or minimum wait.
  result.sortHours = ["processing", "approval"].includes(record.stage) &&
    !["at_least", "greater_than"].includes(record.comparison) && record.unit !== "days_unspecified" &&
    unit !== "business hours" ?
    (record.upperValue ?? record.value) * (record.unit === "hours" ? 1 : 24) : null;
  return result;
}

export function buildToplist(operators, numeric, latestRecords, now) {
  const snapshots = new Map((numeric?.operators || []).filter(Boolean).map(operator => [operator.slug, operator]));
  const rows = operators.map(operator => {
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
    const row = { slug: operator.slug, name: operator.name, favicon: operator.favicon,
      url: operator.url, visitUrl: `/go/${operator.slug}/`,
      productMode: operator.productMode, welcome,
      daily: dailyReward(operator, snapshot, offers),
      redemption: operator.productMode === "entertainment_only" ? null :
        redemptionTime(snapshot, latestRecords(records, record =>
          record.recordType === "facts" && record.field === "redemption_time", now)),
      cash: operator.metrics.cash || null, generalMinimum: operator.metrics.general || null,
      lastCheckedAt: snapshot.lastAttempt || null };
    row.welcomeGroup = signup ? 0 : purchase ? 1 : 2;
    row.sortValues = {
      welcome: signup?.value ?? purchase?.value ?? null,
      daily: row.daily?.comparable ? row.daily.value : null,
      redemption: row.redemption?.sortHours ?? null,
      cash: row.cash?.value ?? null,
    };
    row.knownAttributeCount = Object.values(row.sortValues).filter(value => Number.isFinite(value)).length;
    row.missingAttributes = Object.keys(row.sortValues).filter(key => row.sortValues[key] === null);
    return row;
  });
  const ordered = orderToplist(rows);
  ordered.forEach((row, index) => { row.position = index + 1; });
  return { version: "single-toplist-2", attributeCount: 4,
    lastCheckedAt: numeric?.lastAttemptedAt || null, rows: ordered,
    coverage: Object.fromEntries(["welcome", "daily", "redemption", "cash"].map(key =>
      [key, rows.filter(row => row.sortValues[key] !== null).length])) };
}
