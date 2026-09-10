import { normalize, hash, extract } from "./core.mjs";
import { emptyExtraction, validateExtraction } from "./schema.mjs";

const number = text => Number(text.replace(/,/g, ""));
const decimal = "(\\d[\\d,]*(?:\\.\\d+)?)";
const blankOffer = {
  priceUsd: null, immediateSc: null, totalSc: null, goldCoins: null,
  advertisedExtraPercent: null, durationDays: null, intervalHours: null,
  advertisedDiscountPercent: null, extraPercentComparison: null,
  purchaseRequired: null, promoCode: null, conditions: [],
};

// Conservative candidates from semantic sentences, never CSS selectors.
// Ambiguous packages and multi-number policies are left to model/review.
export function deterministicExtract(pages) {
  const result = emptyExtraction();
  for (const page of pages) {
    const passages = [...new Set(page.text.split("\n").flatMap(line =>
      line.length <= 1500 ? [line] : line.split(/(?<=[.!?])\s+(?=[A-Z])/)).map(normalize))];
    for (const quote of passages) {
      if (quote.length < 15 || quote.length > 1500 || /\?$/u.test(quote) ||
          /for example|testimonial|trustpilot|rated|review by/i.test(quote)) continue;
      const source = { sourceId: page.sourceId, quote };
      const sc = [...quote.matchAll(new RegExp(`${decimal}\\s*(?:free\\s+)?(?:SC\\b|Sweeps? Coins?\\b|Stake Cash\\b)`, "gi"))];
      const dollars = [...quote.matchAll(new RegExp(`\\$\\s*${decimal}`, "g"))];
      if (sc.length === 1 && dollars.length === 1 && /purchas|package|buy/i.test(quote) &&
          !/maximum|minimum|redeem|redemption|example/i.test(quote)) {
        const staged = /over\s+\d+\s+days|distributed|credited daily|remaining|scratch cards/i.test(quote);
        result.offers.push({ ...blankOffer, ...source, name: "Public purchase package",
          kind: staged ? "unknown" : /first|welcome/i.test(quote) ? "first_purchase" : "purchase_package",
          priceUsd: number(dollars[0][1]), immediateSc: staged ? null : number(sc[0][1]),
          totalSc: number(sc[0][1]), purchaseRequired: true,
          durationDays: Number(quote.match(/over\s+(\d+)\s+days/i)?.[1]) || null,
          conditions: [quote],
        });
      }
      // A redemption cap on a page mentioning "daily" is not a daily reward.
      if (sc.length === 1 && !dollars.length && /daily|every 24 hours/i.test(quote) &&
          /claim|bonus|reward/i.test(quote) && !/redeem|redemption|limit|maximum|purchase|welcome|sign.up|first|streak/i.test(quote)) {
        result.offers.push({ ...blankOffer, ...source, name: "Recurring daily claim", kind: "recurring_daily",
          immediateSc: number(sc[0][1]), totalSc: number(sc[0][1]), intervalHours: 24, conditions: [quote] });
      }
      const amount = sc.length === 1 && !dollars.length ? [number(sc[0][1]), "SC"] :
        dollars.length === 1 && !sc.length ? [number(dollars[0][1]), "USD"] : null;
      if (amount && /redemption|redeem/i.test(quote) && /minimum|at least/i.test(quote) &&
          !/maximum|example|cap|up to/i.test(quote)) {
        result.facts.push({ ...source, field: "redemption_minimum", value: amount[0], upperValue: null,
          unit: amount[1], comparison: "at_least", method: /gift card/i.test(quote) ? "gift_card" :
            /bank/i.test(quote) ? "bank" : "unspecified", stage: "not_applicable", states: [],
          basis: "Operator-published minimum; see conditions", conditions: [quote] });
      }
      const multi = quote.match(/(?:played|play[\s-]?through|roll[\s-]?over|wager)[^.]{0,80}?\b(once|twice|three times|[1-9]\d*(?:\.\d+)?\s*(?:x|times))\b/i);
      if (multi && !/example|deposit|withdrawal of|for every/i.test(quote)) {
        const value = { once: 1, twice: 2, "three times": 3 }[multi[1].toLowerCase()] ?? parseFloat(multi[1]);
        result.facts.push({ ...source, field: "playthrough", value, upperValue: null, unit: "multiplier",
          comparison: /at least|minimum/i.test(quote) ? "at_least" : "exact", method: "unspecified",
          stage: "not_applicable", states: [], basis: quote, conditions: [quote] });
      }
    }
    const passagesByField = extract(page.text);
    for (const field of ["verification", "restrictions"]) {
      for (const quote of passagesByField[field]) result.statements.push({ sourceId: page.sourceId, quote, field, summary: quote });
    }
  }
  return result;
}

export function checkExtraction(data, pages) {
  if (!validateExtraction(data)) throw new Error(`invalid_extraction_schema:${JSON.stringify(validateExtraction.errors)}`);
  const accepted = emptyExtraction();
  const rejected = [];
  for (const kind of Object.keys(accepted)) for (const item of data[kind]) {
    const page = pages.find(page => page.sourceId === item.sourceId);
    let reason = !page ? "unknown_source" : !normalize(page.text).includes(normalize(item.quote)) ? "unsupported_quote" : null;
    if (kind === "offers" && item.immediateSc !== null && item.totalSc !== null && item.immediateSc > item.totalSc) reason = "immediate_exceeds_total";
    if (kind === "offers" && item.priceUsd === 0 && item.purchaseRequired === true) reason = "purchase_with_zero_price";
    if (kind === "offers" && /over\s+\d+\s+days|first\s+\d+\s+days/i.test(item.quote) &&
        item.kind === "recurring_daily") reason = "staged_is_not_recurring";
    if (kind === "offers" && /eligible|verification|new players|new customers|first purchase/i.test(item.quote) &&
        !item.conditions.length) reason = "missing_offer_qualifiers";
    if (kind === "facts" && item.upperValue !== null && item.upperValue < item.value) reason = "invalid_range";
    const units = { redemption_minimum: ["SC", "USD"], redemption_cap: ["SC", "USD"],
      redemption_time: ["hours", "business_days", "calendar_days", "days_unspecified", "months"], playthrough: ["multiplier"], minimum_age: ["years"] };
    if (kind === "facts" && !units[item.field].includes(item.unit)) reason = "wrong_unit";
    // This is a grounding check, not a semantic accuracy claim.
    const numericValues = kind === "offers" ?
      ["priceUsd", "immediateSc", "totalSc", "goldCoins", "advertisedExtraPercent", "advertisedDiscountPercent", "durationDays", "intervalHours"].map(key => item[key]) :
      kind === "facts" ? [item.value, item.upperValue] : [];
    const normalizedQuote = normalize(item.quote).replace(/(\d),(?=\d)/g, "$1")
      .replace(/\bonce\b|\bone time\b/gi, "1").replace(/\btwice\b/gi, "2").replace(/\bthree times\b/gi, "3");
    const supportedNumbers = [...normalizedQuote.matchAll(/\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    for (const match of normalizedQuote.matchAll(/(\d+(?:\.\d+)?)\s*(million|thousand)\b/gi)) {
      supportedNumbers.push(Number(match[1]) * (match[2].toLowerCase() === "million" ? 1000000 : 1000));
    }
    if (numericValues.some(value => value !== null && !supportedNumbers.includes(value) &&
        !(kind === "offers" && value === 24 && item.intervalHours === 24 && /daily|every day/i.test(item.quote)))) {
      reason = "number_not_in_quote";
    }
    // A price discount is not extra coin allocation, even when its number matches.
    if (kind === "offers" && item.advertisedExtraPercent !== null) {
      const discounts = [...item.quote.matchAll(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:discount|off)\b/gi)];
      if (discounts.some(match => Number(match[1]) === item.advertisedExtraPercent)) {
        reason = "discount_is_not_extra_coins";
      }
    }
    if (kind === "facts" && item.field === "minimum_age" && /you are over|over (?:twenty|eighteen|\d)/i.test(item.quote) &&
        item.comparison !== "greater_than") reason = "strict_age_boundary";
    if (kind === "facts" && item.field === "redemption_time" && /\bmonth\b/i.test(item.quote) &&
        !/\bdays?\b|\bhours?\b/i.test(item.quote) && item.unit !== "months") reason = "month_unit_mismatch";
    if (kind === "offers" && /handwritten|by mail|mail code/i.test(item.quote) && item.immediateSc !== null) {
      reason = "mail_credit_not_immediate";
    }
    if (reason) rejected.push({ kind, item, reason });
    else accepted[kind].push({ ...item, quote: normalize(item.quote) });
  }
  return { accepted, rejected };
}

export function attachProvenance(data, pages, extractor) {
  return Object.fromEntries(Object.entries(data).map(([kind, items]) => [kind, items.map(item => {
    const page = pages.find(page => page.sourceId === item.sourceId);
    return { ...item, id: hash(JSON.stringify([kind, item])).slice(0, 20),
      sourceUrl: page.finalUrl, capturedAt: page.capturedAt, captureId: page.id,
      archiveKey: page.archiveKey, textHash: page.textHash, extractor,
      reviewStatus: "unreviewed", extractedAt: new Date().toISOString(),
    };
  })]));
}

export function comparableOffer(offer) {
  return ["first_purchase", "purchase_package"].includes(offer.kind) && offer.purchaseRequired === true &&
    offer.priceUsd > 0 && offer.immediateSc !== null && offer.immediateSc === offer.totalSc &&
    offer.durationDays === null;
}

export function changeSignals(previous, current) {
  const events = [];
  const canonical = value => Array.isArray(value) ? value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) :
    value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) :
      typeof value === "string" ? normalize(value) : value;
  const serialize = value => JSON.stringify(canonical(value));
  const metadata = ["id", "sourceUrl", "capturedAt", "captureId", "archiveKey", "textHash", "extractor", "reviewStatus", "extractedAt", "reconfirmationStatus"];
  const stable = items => items.map(item => Object.fromEntries(Object.entries(item).filter(([key]) => !metadata.includes(key))));
  const substantive = items => stable(items).map(item => Object.fromEntries(Object.entries(item)
    .filter(([key]) => !["quote", "summary", "name"].includes(key))));
  for (const operator of current.operators) {
    const old = previous?.operators?.find(item => item.slug === operator.slug);
    for (const kind of ["offers", "facts", "statements"]) {
      const before = old?.[kind] || [];
      const after = operator[kind];
      const identity = item => serialize([item.sourceId, item.field || item.kind, item.method, item.stage, item.promoCode]);
      for (const key of new Set([...before, ...after].map(identity))) {
        const a = before.filter(item => identity(item) === key);
        const b = after.filter(item => identity(item) === key);
        if (serialize(stable(a)) === serialize(stable(b))) continue;
        const sourceId = (b[0] || a[0]).sourceId;
        const sourceFailed = operator.readableSources && !operator.readableSources.some(source => source.sourceId === sourceId);
        const versionChanged = old && previous.extractorVersion !== current.extractorVersion;
        events.push({
          operator: operator.slug, kind, sourceId,
          type: !old ? "baseline" : sourceFailed || !b.length ? "not_reconfirmed" :
            versionChanged ? "extractor_change" : serialize(substantive(a)) === serialize(substantive(b)) ?
              "wording_only_change" : "numeric_or_condition_change",
          before: a, after: b, requiresReview: true,
        });
      }
    }
  }
  return events;
}

export function retainUnconfirmed(previous, current) {
  for (const operator of current.operators) {
    const old = previous?.operators?.find(item => item.slug === operator.slug);
    if (!old) continue;
    const readable = new Set(operator.readableSources.map(source => source.sourceId));
    for (const kind of ["offers", "facts", "statements"]) {
      operator[kind].push(...old[kind].filter(item => !readable.has(item.sourceId))
        .map(item => ({ ...item, reconfirmationStatus: "not_reconfirmed" })));
    }
  }
}
