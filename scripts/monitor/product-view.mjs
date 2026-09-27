import { evidence, redemptionTime, offerDisplay } from "./toplist.mjs";
import { isRequestFrequency } from "./redemption-semantics.mjs";
import { offerExpiry, expiryTime } from "./offer-expiry.mjs";

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
    const offers = latestRecords(snapshot.records || [], record => record.recordType === "offers", now);
    const selected = new Set([row.signup?.recordId, row.purchase?.recordId, row.daily?.recordId]);
    const additionalOffers = offers.filter(record => !selected.has(record.id) &&
      ["signup", "first_purchase", "purchase_package", "paid_pass"].includes(record.kind))
      .map(record => offerDisplay(snapshot, [record], record.kind === "signup" ? "signup" : "purchase")).filter(Boolean);
    const statements = latestRecords(snapshot.records || [], record => record.recordType === "statements", now);
    const summary = [
      row.signup && `${operator.name} advertises ${row.signup.label}${row.signup.note ? ` (${row.signup.note})` : ""}.`,
      row.purchase && `${row.signup ? "Its purchase offer includes" : `${operator.name} advertises`} ${row.purchase.label}${row.purchase.note ? ` (${row.purchase.note})` : ""}.`,
      row.cash && `Cash redemptions start at ${row.cash.label}${row.gift ? `; gift cards start at ${row.gift.label}` : ""}.`,
      !row.cash && row.minimum && `Its published redemption threshold is ${row.minimum.label} (${row.minimum.note}).`,
      row.redemption && `The published timing is ${row.redemption.label} (${row.redemption.note}).`,
    ].filter(Boolean);
    const faqs = [
      row.signup && { question: `What welcome reward does ${operator.name} offer?`, answer: `${row.signup.label}. ${row.signup.note || ""}`, value: row.signup },
      row.cash && { question: `What is the ${operator.name} cash-out minimum?`, answer: `${row.cash.label} for cash redemption.${row.gift ? ` Gift cards start at ${row.gift.label}.` : ""}`, value: row.cash },
      row.redemption && { question: `How long does ${operator.name} say redemption takes?`, answer: `${row.redemption.label}. ${row.redemption.note}. This is a published estimate, not our measured payout time.`, value: row.redemption },
    ].filter(Boolean);
    operator.product = {
      signup: row.signup, purchase: row.purchase, daily: row.daily, redemption: row.redemption,
      cash: row.cash, gift: operator.metrics.gift || null,
      minimum: row.minimum, minima: row.minima, rewardTypes: row.rewardTypes,
      labels: row.labels, benefitCount: row.benefitCount,
      summary: summary.slice(0, 3).join(" ") || `${operator.name}'s published benefits are shown below where we have supporting evidence.`,
      additionalOffers, faqs,
      fees: statements.filter(record => /\bfees?\b/i.test(record.summary)).map(record => evidence(record, record.summary, "", snapshot)),
      history: [...new Map((snapshot.records || []).filter(record => record.valueChangedAt)
        .map(record => [`${record.sourceId}:${record.valueChangedAt}:${record.field || record.kind}`,
          { at: record.valueChangedAt, field: record.field || record.kind, sourceUrl: record.sourceUrl }])).values()]
        .sort((a, b) => b.at.localeCompare(a.at)),
      expiredOffers: [...new Map((snapshot.records || []).filter(record => record.recordType === "offers" &&
        offerExpiry(record) && expiryTime(offerExpiry(record)) <= now && !record.conflict)
        .map(record => [record.name, { name: record.name, ended: offerExpiry(record), sourceUrl: record.sourceUrl }])).values()],
      lastCheckedAt: snapshot.lastAttempt || null,
      sources: snapshot.coverage || [],
      methods: [...new Set(facts.filter(record => ["redemption_time", "redemption_minimum"].includes(record.field) &&
        !isRequestFrequency(record)).map(record => methodNames[record.method]).filter(Boolean))],
      verification: verification.map(record => evidence(record, record.summary, "", snapshot)),
      policies: facts.filter(record => ["playthrough", "redemption_cap"].includes(record.field) ||
        record.field === "redemption_minimum" && !row.minima.some(value => value.recordId === record.id) ||
        record.field === "redemption_time" && redemptionTime(snapshot, [record], { display: true })).map(record => {
        if (record.field === "redemption_time") return { field: record.field, ...redemptionTime(snapshot, [record], { display: true }) };
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
  const rows = model.operators.flatMap(operator => {
    const values = ["signup", "purchase", "daily", "redemption"].map(key => [key, operator.product[key]]);
    for (const value of operator.product.minima) {
      const key = ["cash", "gift"].find(key => operator.product[key]?.recordId === value.recordId) || "minimum";
      values.push([key, value]);
    }
    return values.filter(([, value]) => value).map(([key, value]) =>
      [operator.name, key, value.label, value.note || "", value.sourceUrl,
        value.observedAt, value.status, value.recordId, (value.conditions || []).join(" | ")]);
  });
  const escape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns, ...rows].map(row => row.map(escape).join(",")).join("\n") + "\n";
}
