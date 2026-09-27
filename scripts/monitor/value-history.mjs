const observed = record => record.lastConfirmedAt || record.capturedAt;
const group = record => JSON.stringify([record.sourceId, record.recordType, record.field || record.kind]);
const keys = ["value", "upperValue", "unit", "scope", "priceUsd", "immediateSc", "goldCoins",
  "totalSc", "intervalHours", "durationDays", "method", "stage", "comparison",
  "purchaseRequired", "promoCode", "offerStatus", "expiresAt",
  "advertisedExtraPercent", "advertisedDiscountPercent", "extraPercentComparison"];
const signature = record => JSON.stringify([
  ...keys.map(key => record[key] ?? null),
  [...(record.states || [])].sort(),
  [...(record.conditions || [])].sort(),
]);
// Only structured value changes earn public badges; prose history stays intact.
const valueSignature = record => JSON.stringify([
  ...keys.map(key => record[key] ?? null), [...(record.states || [])].sort(),
]);

// Compare the previous source snapshot, not an arbitrary older matching amount.
export function stampValueHistory(records, previous = []) {
  const groups = new Map();
  for (const record of previous) {
    const id = group(record);
    const at = Date.parse(observed(record));
    const current = groups.get(id);
    if (!current || at > current.at) groups.set(id, { at, records: [record] });
    else if (at === current.at) current.records.push(record);
  }
  return records.map(record => {
    const old = previous.find(old => old.id === record.id);
    if (record.freshness === "not_reconfirmed") {
      return { ...record, firstObservedAt: old?.firstObservedAt || record.firstObservedAt || record.capturedAt,
        lastChangedAt: old?.lastChangedAt || record.lastChangedAt || null,
        valueChangedAt: old?.valueChangedAt || record.valueChangedAt || null };
    }
    const prior = groups.get(group(record))?.records || [];
    const same = prior.find(old => signature(old) === signature(record));
    const sameValue = prior.find(old => valueSignature(old) === valueSignature(record));
    const comparable = prior.filter(old => old.method === record.method && old.stage === record.stage &&
      old.kind === record.kind);
    return { ...record,
      firstObservedAt: same?.firstObservedAt || same?.capturedAt || record.capturedAt,
      lastChangedAt: same ? same.lastChangedAt || null : prior.length ? observed(record) : null,
      valueChangedAt: sameValue ? sameValue.valueChangedAt || null :
        comparable.length === 1 ? observed(record) : null };
  });
}
