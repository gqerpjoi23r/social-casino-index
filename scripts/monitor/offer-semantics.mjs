const text = value => String(value || "").replace(/[*_\\]/g, "").replace(/\s+/g, " ").trim();
const amounts = value => [...text(value).matchAll(/\bSC\s*(\d[\d,]*(?:\.\d+)?)\b|\b(\d[\d,]*(?:\.\d+)?)\s*(?:FREE\s+)?SC\b/gi)]
  .map(match => Number((match[1] || match[2]).replaceAll(",", "")));

export function qualifySignupBanner(record) {
  if (record.kind !== "signup") return record;
  const evidence = text([record.quote, ...(record.conditions || [])].filter(Boolean).join(" "));
  // "FREE SC" can describe coins bundled with a purchase, not free registration.
  if (/\bsign up now to get\b/i.test(evidence) && /\bchance to win\b/i.test(evidence) &&
      !/\bno purchase (?:is )?(?:necessary|required|needed)\b|\bfree (?:sign.?up|registration) (?:bonus|reward)\b/i.test(evidence)) {
    return { ...record, kind: "promotion", immediateSc: null,
      purchaseRequired: record.purchaseRequired === true ? true : null };
  }
  return record;
}

export function recoverOfferSemantics(record) {
  const result = qualifySignupBanner(record);
  if (result.immediateSc !== null || !result.quote) return result;
  const quote = text(result.quote);
  if (result.kind === "signup") {
    const firstDay = quote.match(/\bday\s+1\s*:\s*(.*?)(?=\bday\s+\d+\s*:|$)/i)?.[1];
    const values = amounts(firstDay);
    if (values.length === 1 && !/\bup to\b|\bchance\b|\brandom\b|\bvaries\b/i.test(firstDay) &&
        result.totalSc !== null && values[0] <= result.totalSc) {
      return { ...result, immediateSc: values[0] };
    }
  }
  if (["first_purchase", "purchase_package"].includes(result.kind) && result.purchaseRequired === true &&
      result.priceUsd > 0 && result.durationDays === null && /\binstant coin delivery\b/i.test(quote) &&
      !/\bover \d+ days\b|\bstaged\b|\bremaining\b|\bup to\b|\brandom\b/i.test(quote)) {
    const values = amounts(quote);
    if (values.length === 1 && values[0] === result.totalSc) return { ...result, immediateSc: values[0] };
  }
  return result;
}
