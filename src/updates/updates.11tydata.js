import { displayRecord } from "./display.js";
import { defaultOrder, eligibleSorts } from "../assets/comparison-order.js";

const MAX_AGE = 36 * 60 * 60 * 1000;
const amount = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const distinct = values => [...new Set(values)];
const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const words = value => String(value || "").replaceAll("_", " ");
const conflicted = record => Boolean(record.conflict) || record.reviewStatus === "unresolved";

export function confirmationTime(record) {
  if (record.freshness === "reconfirmed") return Date.parse(record.lastConfirmedAt);
  if (record.freshness === "captured_unreviewed") return Date.parse(record.capturedAt);
  return NaN;
}

export function currentRecord(record, now) {
  const time = confirmationTime(record);
  return Number.isFinite(time) && time <= now && now - time <= MAX_AGE;
}

function dateLabel(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit",
    minute: "2-digit", hour12: false, timeZone: "UTC",
  }).format(time) + " UTC";
}

function summary(text, records = [], sortValue = null, notes = []) {
  return {
    text, sortValue, notes: distinct(notes.filter(Boolean)),
    validUntil: records.length ? Math.min(...records.map(confirmationTime)) + MAX_AGE : null,
  };
}

function unknown(explanation, records = [], notes = []) {
  return { ...summary("?", records, null, notes), symbol: "?", explanation };
}

function unavailable(records) {
  return unknown(records.length ? "Not currently confirmed. Retained or dated values are in sources." : "Unknown. No supported amount is available.");
}

function general(record) {
  return !record.states?.length && (!record.scope || record.scope === "general");
}

function offerNotes(records) {
  return records.flatMap(record => [
    stagedNote(record),
    record.promoCode ? `Code: ${record.promoCode}` : "",
    record.purchaseRequired === true ? "Purchase required" : "",
    ...(record.conditions || []),
  ]);
}

function stagedNote(record) {
  if (!amount(record.totalSc) || record.totalSc === record.immediateSc) return "";
  return `${number(record.totalSc)} SC total${record.durationDays ? ` over ${number(record.durationDays)} days` : "; delivery timing unspecified"} (not all immediate)`;
}

function signupSummary(all, now) {
  const matching = all.filter(record => record.recordType === "offers" && record.kind === "signup");
  const current = matching.filter(record => currentRecord(record, now));
  const records = current;
  if (!current.length) return unavailable(matching);
  const values = distinct(records.map(record => record.immediateSc).filter(amount));
  if (records.some(conflicted) || values.length > 1) {
    return unknown("Conflicting signup terms. Immediate SC is unresolved.", records, offerNotes(records));
  }
  if (!values.length) return unknown("Immediate signup SC is unknown.", current, offerNotes(records));
  // A total-only record cannot establish an immediate reward, even alongside another offer.
  const unambiguous = records.every(record => amount(record.immediateSc)) &&
    records.every(record => general(record) && record.purchaseRequired !== true);
  if (!unambiguous) return unknown("Signup amount or eligibility scope is not comparable.", records, offerNotes(records));
  return { ...summary(`${number(values[0])} SC immediate`, records, values[0], offerNotes(records)), unit: "SC" };
}

function minimumSummary(all, method, now) {
  const matching = all.filter(record => record.recordType === "facts" &&
    record.field === "redemption_minimum" && record.method === method);
  const records = matching.filter(record => currentRecord(record, now));
  if (!records.length) return unavailable(matching);
  const terms = distinct(records.map(record => JSON.stringify([
    record.value, record.upperValue ?? null, record.unit, record.comparison,
    record.scope || "general", record.states || [],
  ])));
  if (records.some(conflicted) || terms.length > 1) {
    return unknown("Conflicting or scoped redemption terms.", records);
  }
  const record = records[0];
  const explicit = amount(record.value) && ["SC", "USD"].includes(record.unit) &&
    ["exact", "at_least"].includes(record.comparison) && record.upperValue == null &&
    general(record);
  if (!explicit) return unknown("No current, comparable minimum for this method and unit.", records);
  const result = summary(`${number(record.value)} ${record.unit}`, records, record.value);
  result.unit = record.unit;
  return result;
}

function purchaseSummary(all, now) {
  const matching = all.filter(record => record.recordType === "offers" && record.kind === "first_purchase");
  const records = matching.filter(record => currentRecord(record, now));
  if (!records.length) return unavailable(matching);
  if (records.some(conflicted)) return unknown("Conflicting purchase terms.", records, offerNotes(records));
  if (!records.every(general)) return unknown("Purchase eligibility scope is not comparable.", records, offerNotes(records));
  // Include conditions and code in identity: equal prices do not imply the same package.
  const packages = distinct(records.map(record => JSON.stringify([
    record.priceUsd, record.immediateSc, record.totalSc, record.goldCoins,
    record.durationDays, record.intervalHours, record.promoCode, record.purchaseRequired,
    record.advertisedExtraPercent, record.advertisedDiscountPercent,
    [...(record.conditions || [])].sort(),
  ])));
  if (packages.length > 1) return summary("Multiple offers", records, null, offerNotes(records));
  const record = records[0];
  if (!amount(record.priceUsd) && !amount(record.immediateSc)) {
    return unknown("Purchase price and immediate SC are unknown.", records, offerNotes(records));
  }
  const result = summary("", records, null, offerNotes(records));
  result.parts = [
    amount(record.priceUsd) ? { text: `$${number(record.priceUsd)} USD` } :
      { symbol: "?", explanation: "Purchase price is unknown." },
    { text: " / " },
    amount(record.immediateSc) ? { text: `${number(record.immediateSc)} SC immediate` } :
      { symbol: "?", explanation: "Immediate SC is unknown." },
  ];
  result.text = result.parts.map(part => part.text || part.symbol).join("");
  return result;
}

export function comparisonRows(numeric, monitor = {}, now = Date.now()) {
  const rows = (numeric?.operators || []).map(operator => {
    const records = operator.records || [];
    const signup = signupSummary(records, now);
    const cash = minimumSummary(records, "cash", now);
    const gift = minimumSummary(records, "gift_card", now);
    const purchase = purchaseSummary(records, now);
    if (operator.productMode === "entertainment_only") {
      for (const item of [signup, cash, gift, purchase]) {
        Object.assign(item, summary("Not applicable"), {
          symbol: "cross", explanation: "Not applicable. Entertainment coins are not redeemable SC.", parts: null,
        });
      }
    }
    const capture = Date.parse(operator.lastSuccessfulCapture);
    const checked = {
      ...summary(dateLabel(operator.lastSuccessfulCapture)),
      sortValue: Number.isFinite(capture) && capture <= now && now - capture <= MAX_AGE ? capture : null,
      validUntil: Number.isFinite(capture) ? capture + MAX_AGE : null,
      stale: Number.isFinite(capture) && now - capture > MAX_AGE,
    };
    return {
      ...operator, signup, cash, gift, purchase, checked,
      publicRecords: JSON.stringify(records, null, 2),
      unspecifiedMinimum: records.some(record => record.field === "redemption_minimum" &&
        !["cash", "gift_card"].includes(record.method) && currentRecord(record, now)),
      history: (monitor.events || []).filter(event => event.operator === operator.slug).map(event => ({
        ...event, typeLabel: words(event.type), dateLabel: dateLabel(event.observedAt),
        beforeText: JSON.stringify(event.before), afterText: JSON.stringify(event.after),
      })),
      records: records.map(record => ({
        ...displayRecord(record),
        current: currentRecord(record, now),
        freshnessLabel: !currentRecord(record, now) ? `Retained / dated: ${words(record.freshness)}` : words(record.freshness),
      })),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "en"));
  // Each method is its own comparison. Never silently equate USD with SC.
  for (const key of ["cash", "gift"]) {
    const units = distinct(rows.filter(row => row[key].sortValue !== null).map(row => row[key].unit));
    if (units.length > 1) {
      for (const row of rows.filter(row => row[key].sortValue !== null)) {
        row[key] = unknown("Different published units; not numerically comparable.");
      }
    }
  }
  // Eleventy's dependency-discovery pass supplies sparse proxy arrays.
  for (const row of rows.filter(Boolean)) {
    row.sortData = JSON.stringify(Object.fromEntries([
      ["name", row.name],
      ...["signup", "gift", "cash"].map(key => [key, {
        sortValue: row[key].sortValue, validUntil: row[key].validUntil, unit: row[key].unit,
      }]),
    ]));
  }
  return defaultOrder(rows, now);
}

export const eleventyComputed = {
  updatedAt: data => [data.numeric?.lastSuccessfulRefresh, "2026-09-11"].filter(Boolean).sort().at(-1),
  numericRows: data => comparisonRows(data.numeric, data.monitor),
  comparisonSorts: data => eligibleSorts(comparisonRows(data.numeric, data.monitor)),
  refreshStale: data => !data.numeric?.lastSuccessfulRefresh ||
    Date.now() - Date.parse(data.numeric.lastSuccessfulRefresh) > MAX_AGE,
};
