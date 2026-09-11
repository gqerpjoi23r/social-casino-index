import { displayRecord } from "./display.js";

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
    automated: records.some(record => record.reviewStatus === "automated_unreviewed"),
    validUntil: records.length ? Math.min(...records.map(confirmationTime)) + MAX_AGE : null,
  };
}

function unavailable(records) {
  return summary(records.length ? "Not currently confirmed" : "Unknown");
}

function stagedNote(record) {
  if (!amount(record.totalSc) || record.totalSc === record.immediateSc) return "";
  return `${number(record.totalSc)} SC total${record.durationDays ? ` over ${number(record.durationDays)} days` : "; delivery timing unspecified"} (not all immediate)${record.promoCode ? `; code: ${record.promoCode}` : ""}`;
}

function signupSummary(all, now) {
  const matching = all.filter(record => record.recordType === "offers" && record.kind === "signup");
  const current = matching.filter(record => currentRecord(record, now));
  const records = current.filter(record => amount(record.immediateSc) || amount(record.totalSc) || conflicted(record));
  if (!current.length) return unavailable(matching);
  const values = distinct(records.map(record => record.immediateSc).filter(amount));
  if (records.some(conflicted) || values.length > 1) {
    return summary("Conflicting terms", records, null, ["Immediate SC is unresolved; see public claims."]);
  }
  const staged = records.map(stagedNote);
  if (!values.length) return summary("Immediate SC unknown", current, null, staged);
  // A total-only record cannot establish an immediate reward, even alongside another offer.
  const unambiguous = records.every(record => amount(record.immediateSc)) &&
    records.every(record => !record.states?.length && (!record.scope || record.scope === "general"));
  return summary(`${number(values[0])} SC immediate`, records, unambiguous ? values[0] : null,
    [...staged, ...distinct(records.map(record => record.promoCode).filter(Boolean)).map(code => `Code: ${code}`)]);
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
    return summary("Conflicting or scoped terms", records);
  }
  const record = records[0];
  const explicit = amount(record.value) && ["SC", "USD"].includes(record.unit) &&
    ["exact", "at_least"].includes(record.comparison) && record.upperValue == null &&
    !record.states?.length && (!record.scope || record.scope === "general");
  const result = summary(displayRecord(record).valueText, records, explicit ? record.value : null);
  result.unit = record.unit;
  return result;
}

function purchaseSummary(all, now) {
  const matching = all.filter(record => record.recordType === "offers" && record.kind === "first_purchase");
  const records = matching.filter(record => currentRecord(record, now));
  if (!records.length) return unavailable(matching);
  if (records.some(conflicted)) return summary("Conflicting terms", records);
  // Include conditions and code in identity: equal prices do not imply the same package.
  const packages = distinct(records.map(record => JSON.stringify([
    record.priceUsd, record.immediateSc, record.totalSc, record.goldCoins,
    record.durationDays, record.intervalHours, record.promoCode, record.purchaseRequired,
    record.advertisedExtraPercent, record.advertisedDiscountPercent,
    [...(record.conditions || [])].sort(),
  ])));
  if (packages.length > 1) return summary("Multiple offers", records, null, ["Package prices and conditions in full terms."]);
  const record = records[0];
  const price = amount(record.priceUsd) ? `$${number(record.priceUsd)} USD` : "Price unknown";
  const reward = amount(record.immediateSc) ? `${number(record.immediateSc)} SC immediate` : "immediate SC unknown";
  return summary(`${price} / ${reward}`, records, amount(record.priceUsd) ? record.priceUsd : null,
    [stagedNote(record), ...(record.promoCode ? [`Code: ${record.promoCode}`] : []), ...(record.conditions || [])]);
}

export function comparisonRows(numeric, monitor = {}, now = Date.now()) {
  const rows = (numeric?.operators || []).map(operator => {
    const records = operator.records || [];
    const signup = signupSummary(records, now);
    const cash = minimumSummary(records, "cash", now);
    const gift = minimumSummary(records, "gift_card", now);
    const purchase = purchaseSummary(records, now);
    if (operator.productMode === "entertainment_only") {
      Object.assign(signup, summary("No redeemable SC"));
      Object.assign(cash, summary("Not applicable"));
      Object.assign(gift, summary("Not applicable"));
      Object.assign(purchase, summary("Entertainment coins only"));
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
  // Never treat USD and SC as interchangeable numeric amounts.
  const cashUnits = distinct(rows.filter(row => row.cash.sortValue !== null).map(row => row.cash.unit));
  if (cashUnits.length > 1) {
    for (const row of rows.filter(row => row.cash.sortValue !== null)) {
      row.cash.sortValue = null;
      row.cash.notes.push("Different published units; not numerically comparable.");
    }
  }
  // Eleventy's dependency-discovery pass supplies sparse proxy arrays.
  for (const row of rows.filter(Boolean)) {
    row.sortData = JSON.stringify(Object.fromEntries([
      ["name", row.name],
      ...["signup", "cash", "purchase", "checked"].map(key => [key, {
        sortValue: row[key].sortValue, validUntil: row[key].validUntil,
      }]),
    ]));
  }
  return rows;
}

export const eleventyComputed = {
  updatedAt: data => [data.numeric?.lastSuccessfulRefresh, "2026-09-11"].filter(Boolean).sort().at(-1),
  numericRows: data => comparisonRows(data.numeric, data.monitor),
  refreshStale: data => !data.numeric?.lastSuccessfulRefresh ||
    Date.now() - Date.parse(data.numeric.lastSuccessfulRefresh) > MAX_AGE,
};
