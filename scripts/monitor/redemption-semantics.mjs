export function isRequestFrequency(record) {
  const text = [record.basis, record.quote, ...(record.conditions || [])].filter(Boolean).join(" ");
  return /\bonly (?:one|1|a single)\s+(?:prize\s+)?redemption request\b[\s\S]{0,160}\b(?:per|every|any|in a)\b[\s\S]{0,40}\b(?:hours?|days?)\b/i.test(text) ||
    /\b(?:one|1)\s+(?:prize\s+)?redemption request\b[\s\S]{0,100}\bonce (?:every|per)\b/i.test(text);
}
export function qualifyRedemptionTiming(record) {
  const afterApproval = /\b(?:after|following)\s+(?:(?:the\s+)?(?:redemption\s+)?request\s+)?approval\b|\bafter\s+(?:the\s+)?(?:redemption\s+)?request\s+(?:is|has been)\s+approved\b/i;
  if (record.field === "redemption_time" && ["processing", "unspecified", "end_to_end"].includes(record.stage) &&
      afterApproval.test(record.basis || "")) {
    return { ...record, stage: "transfer" };
  }
  return record;
}
