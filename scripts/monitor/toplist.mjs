import { orderToplist, SORTS } from "../../src/assets/toplist-order.js";
import { isRequestFrequency, qualifyRedemptionTiming } from "./redemption-semantics.mjs";
import { dailyQualifierText } from "./daily-semantics.mjs";

const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const dated = record => record.lastConfirmedAt || record.capturedAt;
const text = record => [record.name, record.basis, ...(record.conditions || [])].filter(Boolean).join(" ");
const newest = records => [...records].sort((a, b) =>
  Date.parse(dated(b)) - Date.parse(dated(a)) || a.sourceUrl.localeCompare(b.sourceUrl));
const amount = value => Number.isFinite(value) && value > 0;
export const BENEFIT_KEYS = ["signup", "purchase", "daily", "redemption", "minimum"];

export function evidence(record, label, note, snapshot = {}) {
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
    record.purchaseRequired !== true));
  const initialClaims = candidates.filter(record => record.immediateSc != null &&
    /first daily|first (?:day|login|claim)|day (?:one|1)/i.test(
      [record.name, record.basis, ...(record.conditions || [])].filter(Boolean).map(dailyQualifierText).join(" ")));
  const initial = new Set(initialClaims.map(record => record.immediateSc)).size === 1 ? initialClaims[0] : null;
  if (initial) return { ...evidence(initial, `${number(initial.immediateSc)} SC first claim`,
    "Later daily amounts unverified", snapshot), comparable: false };
  const increasingReward = /increas|grows|progressive|streak|better.{0,50}more days|more days.{0,50}better/i;
  const variable = candidates.find(record => increasingReward.test(text(record)) ||
    /varies|variable|surprise|random/i.test(text(record)));
  if (variable) {
    const increasing = increasingReward.test(text(variable));
    return { ...evidence(variable, increasing ? "Increasing daily reward" : "Variable daily reward",
      "Fixed daily SC not established", snapshot), comparable: false };
  }
  const recurring = candidates.find(record => !/gold coins?/i.test(text(record)) ||
    /sweeps?(?:takes)? coins?|\bSC\b|stake cash/i.test(text(record))) || candidates[0];
  if (!recurring) return null;
  const goldOnly = /gold coins?/i.test(text(recurring)) &&
    !/sweeps?(?:takes)? coins?|\bSC\b|stake cash/i.test(text(recurring));
  return { ...evidence(recurring, goldOnly ? "Daily Gold Coins" : "Daily login reward",
    goldOnly ? "Entertainment credits" : "Amount not stated", snapshot), comparable: false,
    unit: goldOnly ? "GC" : null,
    rewardType: goldOnly ? "Entertainment credits" : null };
}

export function redemptionTime(snapshot, records, { display = false } = {}) {
  const units = { hours: "hours", business_days: "business days", calendar_days: "calendar days",
    days_unspecified: "days (type unspecified)", ...(display ? { months: "months" } : {}) };
  const stages = { processing: "Processing", approval: "Approval",
    end_to_end: "Request to receipt", ...(display ? { transfer: "Delivery after approval", unspecified: "Stage unspecified" } : {}) };
  const methods = { cash: "cash", bank: "bank", debit_card: "debit card",
    general: "method varies", unspecified: "method unspecified",
    ...(display ? { gift_card: "gift card", crypto: "cryptocurrency", virtual_card: "virtual card" } : {}) };
  // Some extracted records leave stage unspecified despite an explicit processing basis.
  const classified = records.map(qualifyRedemptionTiming).map(record => record.stage === "unspecified" &&
    /\bprocessing\b/i.test(record.basis || "") &&
    !/\bdelivery\b|\btransfer\b/i.test(record.basis || "") ?
    { ...record, stage: "processing" } : record);
  const candidates = newest(classified.filter(record => record.field === "redemption_time" &&
    Number.isFinite(record.value) && units[record.unit] && methods[record.method] && stages[record.stage] &&
    ["exact", "up_to", "range", "at_least", "typical"].includes(record.comparison) &&
    !isRequestFrequency(record) &&
    (record.upperValue == null || (Number.isFinite(record.upperValue) && record.upperValue >= record.value)) &&
    (record.comparison !== "range" || (Number.isFinite(record.upperValue) && record.upperValue >= record.value)) &&
    !/verification process|provide requested|complete required|automatically declined/i.test(record.basis || "") &&
    (!/VIP|account tier|membership tier/i.test(text(record)) || /\bstandard\b|\bVIP\s*0\b|\bRising\b/i.test(text(record)))));
  const priorities = ["processing", "approval", "end_to_end", "transfer", "unspecified"];
  candidates.sort((a, b) => priorities.indexOf(a.stage) - priorities.indexOf(b.stage) ||
    (a.method === "unspecified" || a.method === "general") - (b.method === "unspecified" || b.method === "general"));
  const record = candidates[0];
  if (!record) return null;
  const value = (record.comparison === "typical" ? "Typically " : "") + (record.upperValue != null ? `${number(record.value)}-${number(record.upperValue)}` :
    `${record.comparison === "up_to" ? "Up to " : record.comparison === "at_least" ? "At least " : ""}${number(record.value)}`);
  const tier = /\bRising\b/i.test(text(record)) && /\bSilver\b/i.test(text(record)) ? "Rising-Silver tiers" :
    /\bstandard\b/i.test(text(record)) ? "standard tier" : methods[record.method];
  const unit = record.unit === "hours" && /\bbusiness hours\b/i.test(text(record)) ? "business hours" : units[record.unit];
  const result = evidence(record, `${value} ${unit}`, `${stages[record.stage]}; ${tier}`, snapshot);
  // Sort only a bounded processing/approval estimate, never a delivery time or minimum wait.
  result.sortHours = !display && ["processing", "approval"].includes(record.stage) &&
    !["at_least", "greater_than"].includes(record.comparison) && record.unit !== "days_unspecified" &&
    unit !== "business hours" ?
    (record.upperValue ?? record.value) * (record.unit === "hours" ? 1 : 24) : null;
  return result;
}

function offerDisplay(snapshot, offers, kind) {
  const candidates = newest(offers.filter(record => kind === "signup" ? record.kind === "signup" :
    ["first_purchase", "purchase_package", "paid_pass"].includes(record.kind)));
  for (const record of candidates) {
    const foreignReward = !amount(record.totalSc) && !amount(record.immediateSc) &&
      [record.name, ...(record.conditions || [])].filter(Boolean).map(value =>
        value.match(/\b\d[\d,]*(?:\.\d+)?\s*(?:FC|Fortune Coins?)\b/i)?.[0]).find(Boolean);
    const rewards = foreignReward ? [foreignReward] : [amount(record.totalSc) ? `${number(record.totalSc)} SC total` :
      amount(record.immediateSc) ? `${number(record.immediateSc)} SC` : null,
    amount(record.goldCoins) ? `${number(record.goldCoins)} Gold Coins` : null].filter(Boolean);
    if (!rewards.length && amount(record.advertisedExtraPercent))
      rewards.push(`${record.extraPercentComparison === "up_to" ? "Up to " : ""}${number(record.advertisedExtraPercent)}% extra coins`);
    // A named offer alone is advertising, not a concrete player benefit.
    if (!rewards.length) {
      for (const description of [record.name, ...(record.conditions || [])].filter(Boolean)) {
        const reward = description.match(/\b(?:\d[\d,]*(?:\.\d+)?\s*(?:FC|Fortune Coins?|credits?|tokens?|reward points?|spins?)|free spins?|daily spins?|coinback|cashback)\b/i);
        if (reward && !/\b(?:no|not|without)\s+(?:any\s+)?$/i.test(description.slice(0, reward.index))) {
          rewards.push(reward[0]); break;
        }
      }
    }
    if (!rewards.length) continue;
    const note = [kind === "purchase" ? "See purchase and claim conditions" :
      record.purchaseRequired === false ? "No purchase required; see claim conditions" :
        record.purchaseRequired === true ? "Purchase required" : "Purchase requirement unconfirmed",
    /\bup to\b/i.test(text(record)) ? "Advertised maximum; conditions apply" : null].filter(Boolean).join(". ");
    return { ...evidence(record, `${rewards.join(" + ")}${amount(record.priceUsd) ? ` for $${number(record.priceUsd)}` : ""}`, note, snapshot),
      kind: record.kind, purchaseRequired: record.purchaseRequired, promoCode: record.promoCode,
      priceUsd: record.priceUsd, immediateSc: record.immediateSc, totalSc: record.totalSc,
      goldCoins: record.goldCoins, comparable: false,
      unit: foreignReward ? "FC" : amount(record.totalSc) || amount(record.immediateSc) ? "SC" : amount(record.goldCoins) ? "GC" : null,
      rewardType: amount(record.goldCoins) && !foreignReward && !amount(record.totalSc) && !amount(record.immediateSc) ? "Entertainment credits" : null };
  }
  return null;
}

function minimumDisplay(snapshot, facts, metrics) {
  const values = [metrics.cash, metrics.gift, metrics.general].filter(Boolean);
  // Preserve currencies and methods that cannot join the SC-only cash benchmark.
  const candidates = newest(facts.filter(record => record.field === "redemption_minimum" &&
    amount(record.value) && record.upperValue == null && ["SC", "USD"].includes(record.unit) &&
    (record.unit === "USD" || !values.length) && ["exact", "at_least"].includes(record.comparison)));
  const seen = new Set();
  for (const record of candidates) {
    const key = `${record.unit}:${record.method}`;
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(evidence(record, `${number(record.value)} ${record.unit}`,
      `${({ gift_card: "Gift-card", bank: "Bank", cash: "Cash", crypto: "Cryptocurrency",
        virtual_card: "Virtual-card" })[record.method] || "Method unspecified"} minimum; see conditions`, snapshot));
  }
  return values;
}

export function buildToplist(operators, numeric, latestRecords, now) {
  const snapshots = new Map((numeric?.operators || []).filter(Boolean).map(operator => [operator.slug, operator]));
  const rows = operators.map(operator => {
    const snapshot = snapshots.get(operator.slug) || {};
    const records = snapshot.records || [];
    const offers = latestRecords(records, record => record.recordType === "offers", now);
    const facts = latestRecords(records, record => record.recordType === "facts", now);
    const signup = operator.metrics.signup;
    const purchase = operator.metrics.purchase;
    const welcome = signup ? {
      ...signup,
      label: `${signup.label} free`,
      note: signup.totalSc > signup.immediateSc ?
        /\bspins\b|\btasks\b|opt.in/i.test((signup.conditions || []).join(" ")) ?
          `Up to ${number(signup.totalSc)} SC with ${signup.durationDays ? `${number(signup.durationDays)}-day ` : ""}tasks` :
          `${number(signup.totalSc)} SC total${signup.durationDays ? ` over ${number(signup.durationDays)} days` : " in stages"}` :
        "On signup; no purchase",
    } : purchase ? { ...purchase, note: purchase.kind === "first_purchase" ? "First purchase" : "Regular purchase package" } : null;
    if (signup && /\bopt.in\b|consent to receive/i.test((signup.conditions || []).join(" "))) {
      welcome.note += signup.totalSc > signup.immediateSc ?
        "; opt-in needed for full reward" : "; marketing opt-in required";
    }
    const row = { slug: operator.slug, name: operator.name, favicon: operator.favicon,
      url: operator.url, visitUrl: operator.partner ? `/go/${operator.slug}/` : null,
      productMode: operator.productMode, welcome, signup: signup ? { ...welcome } : offerDisplay(snapshot, offers, "signup"),
      purchase: purchase || offerDisplay(snapshot, offers, "purchase"),
      daily: dailyReward(operator, snapshot, offers),
      redemption: redemptionTime(snapshot, facts),
      cash: operator.metrics.cash || null, generalMinimum: operator.metrics.general || null,
      lastCheckedAt: snapshot.lastAttempt || null };
    row.welcomeGroup = signup ? 0 : purchase ? 1 : 2;
    row.sortValues = {
      welcome: signup?.value ?? null,
      purchase: purchase?.value ?? null,
      daily: row.daily?.comparable ? row.daily.value : null,
      redemption: row.redemption?.sortHours ?? null,
      cash: row.cash?.value ?? null,
    };
    row.redemption ||= redemptionTime(snapshot, facts, { display: true });
    row.minima = minimumDisplay(snapshot, facts, operator.metrics);
    row.minimum = row.minima[0] || null;
    row.gift = operator.metrics.gift || null;
    row.rewardTypes = [...new Set([
      row.cash ? "Cash prizes" : null, row.gift ? "Gift cards" : null,
      ...["signup", "purchase", "daily"].map(key => row[key]?.rewardType),
    ].filter(Boolean))];
    row.labels = { signup: signup ? "Free signup" : "Welcome offer", purchase: "Purchase deal",
      daily: "Daily reward", redemption: ["transfer", "end_to_end", "unspecified"].includes(row.redemption?.stage) ?
        "Redemption timing" : "Published processing", minimum: "Redemption minimum" };
    // Numeric coverage is diagnostic only; listing uses the five visible benefits.
    const comparable = { welcome: Boolean(signup || purchase), daily: row.sortValues.daily !== null,
      redemption: row.sortValues.redemption !== null, cash: row.sortValues.cash !== null };
    row.knownAttributeCount = Object.values(comparable).filter(Boolean).length;
    row.missingAttributes = Object.keys(comparable).filter(key => !comparable[key]);
    const benefits = BENEFIT_KEYS.filter(key => row[key]);
    row.benefitCount = benefits.length;
    row.missingBenefits = BENEFIT_KEYS.filter(key => !row[key]);
    row.homepageEligible = row.benefitCount >= 2;
    return row;
  });
  const ordered = orderToplist(rows);
  ordered.forEach((row, index) => { row.position = index + 1; });
  const homepageRows = ordered.filter(row => row.homepageEligible).map((row, index) => ({ ...row, position: index + 1 }));
  return { version: "useful-benefits-1", attributeCount: 4, benefitAreaCount: 5, defaultSort: "welcome",
    lastCheckedAt: numeric?.lastAttemptedAt || null, rows: ordered, homepageRows,
    sorts: Object.entries(SORTS).map(([key, sort]) => ({ key, ...sort,
      available: homepageRows.some(row => Number.isFinite(row.sortValues[key])) })),
    coverage: Object.fromEntries(["welcome", "daily", "redemption", "cash"].map(key =>
      [key, rows.filter(row => !row.missingAttributes.includes(key)).length])) };
}
