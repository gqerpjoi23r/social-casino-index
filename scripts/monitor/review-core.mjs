const numericKeys = ["value", "upperValue", "priceUsd", "immediateSc", "totalSc",
  "goldCoins", "advertisedExtraPercent", "advertisedDiscountPercent", "durationDays", "intervalHours"];

export function numericFields(record) {
  return numericKeys.filter(key => typeof record[key] === "number");
}

export function semanticKey(record) {
  return JSON.stringify([
    record.recordType, record.kind || record.field, record.unit, record.method,
    record.stage, record.timing, record.scope, record.basis, record.comparison,
    record.purchaseRequired, record.promoCode, record.extraPercentComparison,
    [...(record.states || [])].sort(), [...(record.conditions || [])].sort(),
  ]);
}

export function evaluateRecords(records, reference, equivalents = {}) {
  const fields = rows => [...new Map(rows.flatMap(record => numericFields(record).map(field => {
    const identity = equivalents[record.id] || semanticKey(record);
    const key = JSON.stringify([identity, field, record[field]]);
    return [key, { key, id: record.id, field, value: record[field] }];
  }))).values()];
  const emitted = fields(records);
  const expected = fields(reference);
  const correct = emitted.filter(field => expected.some(item => item.key === field.key));
  const incorrect = emitted.filter(field => !expected.some(item => item.key === field.key));
  const omissions = expected.filter(field => !emitted.some(item => item.key === field.key));
  return { emitted: emitted.length, reference: expected.length, correct, incorrect, omissions,
    precision: emitted.length ? correct.length / emitted.length : null,
    recall: expected.length ? (expected.length - omissions.length) / expected.length : null };
}
