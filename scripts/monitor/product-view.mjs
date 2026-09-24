import { evidence, redemptionTime } from "./toplist.mjs";
import { isRequestFrequency } from "./redemption-semantics.mjs";

const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const methodNames = { cash: "Cash", bank: "Bank transfer", gift_card: "Gift card",
  crypto: "Cryptocurrency", debit_card: "Debit card", virtual_card: "Virtual card" };

export function attachProductViews(operators, numeric, toplist, latestRecords, now) {
  for (const operator of operators) {
    const snapshot = numeric?.operators?.find(item => item.slug === operator.slug) || {};
    const row = toplist.rows.find(item => item.slug === operator.slug);
    const facts = latestRecords(snapshot.records || [], record => record.recordType === "facts", now);
    const verification = latestRecords(snapshot.records || [],
      record => record.recordType === "statements" && record.field === "verification", now);
    operator.product = {
      signup: row.signup, purchase: row.purchase, daily: row.daily, redemption: row.redemption,
      cash: row.cash, gift: operator.metrics.gift || null,
      lastCheckedAt: snapshot.lastAttempt || null,
      sources: snapshot.coverage || [],
      methods: [...new Set(facts.filter(record => ["redemption_time", "redemption_minimum"].includes(record.field) &&
        !isRequestFrequency(record)).map(record => methodNames[record.method]).filter(Boolean))],
      verification: verification.map(record => evidence(record, record.summary, "", snapshot)),
      policies: facts.filter(record => ["playthrough", "redemption_cap"].includes(record.field) ||
        record.field === "redemption_time" && redemptionTime(snapshot, [record])).map(record => {
        if (record.field === "redemption_time") return { field: record.field, ...redemptionTime(snapshot, [record]) };
        const prefix = { up_to: "Up to ", at_least: "At least ", greater_than: "Over ", typical: "Typically " }[record.comparison] || "";
        return { field: record.field, ...evidence(record,
          `${prefix}${number(record.value)}${record.upperValue != null ? `-${number(record.upperValue)}` : ""} ${record.unit.replaceAll("_", " ")}`,
          [record.basis, methodNames[record.method]].filter(Boolean).join("; "), snapshot) };
      }),
    };
  }
}

export function comparisonCsv(model) {
  const columns = ["operator", "attribute", "label", "note", "source_url", "observed_at", "status", "record_id", "conditions"];
  const rows = model.operators.flatMap(operator => ["signup", "purchase", "daily", "redemption", "cash", "gift"].flatMap(key => {
    const value = operator.product[key];
    return value ? [[operator.name, key, value.label, value.note || "", value.sourceUrl,
      value.observedAt, value.status, value.recordId, (value.conditions || []).join(" | ")]] : [];
  }));
  const escape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns, ...rows].map(row => row.map(escape).join(",")).join("\n") + "\n";
}
