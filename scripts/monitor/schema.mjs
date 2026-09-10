import Ajv from "ajv";

export const NUMERIC_VERSION = "2.0.0";
const nullableNumber = { type: ["number", "null"], minimum: 0 };
const nullableString = { type: ["string", "null"] };
const strings = { type: "array", items: { type: "string" } };
const object = properties => ({
  type: "object", additionalProperties: false, properties, required: Object.keys(properties),
});
const evidence = {
  sourceId: { type: "string" },
  quote: { type: "string", minLength: 15, maxLength: 6000 },
};
export const EXTRACTION_SCHEMA = object({
  offers: { type: "array", items: object({
    ...evidence,
    name: { type: "string" },
    kind: { enum: ["signup", "first_purchase", "purchase_package", "recurring_daily", "paid_pass", "promotion", "unknown"] },
    priceUsd: nullableNumber,
    immediateSc: nullableNumber,
    totalSc: nullableNumber,
    goldCoins: nullableNumber,
    advertisedExtraPercent: nullableNumber,
    durationDays: nullableNumber,
    intervalHours: nullableNumber,
    purchaseRequired: { type: ["boolean", "null"] },
    promoCode: nullableString,
    conditions: strings,
  }) },
  facts: { type: "array", items: object({
    ...evidence,
    field: { enum: ["redemption_minimum", "redemption_cap", "redemption_time", "playthrough", "minimum_age"] },
    value: { type: "number", minimum: 0 },
    upperValue: nullableNumber,
    unit: { enum: ["SC", "USD", "hours", "business_days", "calendar_days", "days_unspecified", "multiplier", "years"] },
    comparison: { enum: ["exact", "at_least", "up_to", "range", "typical"] },
    method: { enum: ["bank", "gift_card", "crypto", "debit_card", "general", "unspecified"] },
    stage: { enum: ["approval", "transfer", "end_to_end", "unspecified", "not_applicable"] },
    states: strings,
    basis: { type: "string" },
    conditions: strings,
  }) },
  statements: { type: "array", items: object({
    ...evidence,
    field: { enum: ["verification", "restrictions", "account_closure", "offer_conditions", "other"] },
    summary: { type: "string" },
  }) },
});
export const validateExtraction = new Ajv({ allErrors: true }).compile(EXTRACTION_SCHEMA);
export const emptyExtraction = () => ({ offers: [], facts: [], statements: [] });
