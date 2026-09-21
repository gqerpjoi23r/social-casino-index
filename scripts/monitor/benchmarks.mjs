export const METHODOLOGY_VERSION = "published-benefits-1";
const amount = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const date = record => record.lastConfirmedAt || record.capturedAt;
const total = record => amount(record.totalSc) ? record.totalSc : record.immediateSc;
const usable = record => !record.states?.length && (!record.scope || record.scope === "general") &&
  !["withdrawn", "expired"].includes(record.offerStatus);

// Select snapshots before checking amounts: a new unknown must supersede old certainty.
export function latestRecords(records, predicate, now = Date.now()) {
  const matching = records.filter(record => predicate(record) && /^https:\/\//.test(record.sourceUrl || "") &&
    Number.isFinite(Date.parse(date(record))) && Date.parse(date(record)) <= now);
  const newest = new Map();
  for (const record of matching) newest.set(record.sourceId || record.sourceUrl,
    Math.max(newest.get(record.sourceId || record.sourceUrl) || 0, Date.parse(date(record))));
  return matching.filter(record => newest.get(record.sourceId || record.sourceUrl) === Date.parse(date(record)) &&
    usable(record) && (!record.expiresAt || Date.parse(record.expiresAt) > now));
}

function fact(record, metric, value, label, note = "") {
  return {
    metric, value, label, note, recordId: record.id, sourceUrl: record.sourceUrl,
    observedAt: date(record), status: record.freshness === "not_reconfirmed" ? "retained" : "published",
    conditions: record.conditions || [], promoCode: record.promoCode,
    priceUsd: record.priceUsd ?? null, immediateSc: record.immediateSc ?? null,
    totalSc: total(record) ?? null, durationDays: record.durationDays ?? null,
    purchaseRequired: record.purchaseRequired, kind: record.kind || null,
  };
}

export const BENCHMARKS = [
  { id: "signup", slug: "no-purchase-signup-bonuses", title: "No-purchase signup bonuses", question: "Which casinos offer the most immediate signup Sweeps Coins without a purchase?", label: "Immediate free SC", icon: "gift", direction: "desc",
    explanation: "Ranked by immediate signup SC where the operator explicitly states that no purchase is required. Staged rewards are compared separately." },
  { id: "staged", slug: "staged-welcome-bonuses", title: "Staged welcome bonuses", question: "Which casinos offer the largest staged welcome reward?", label: "Total free SC", icon: "calendar", direction: "desc",
    explanation: "Ranked by the stated total of no-purchase welcome SC released in stages. Claim schedules and immediate amounts remain visible; totals are not immediate rewards." },
  { id: "purchase", slug: "purchase-value", title: "Purchase value", question: "Which published coin package includes the most immediate SC per dollar?", label: "SC per $1", icon: "coins", direction: "desc",
    explanation: "Ranked by immediate SC divided by the full package price, with no budget limit. Ordinary and first-purchase packages are labelled separately. This is a coin ratio, not a cash return." },
  { id: "purchase10", slug: "bonuses-under-10-dollars", title: "Purchase bonuses at $10 or less", question: "Which coin packages offer the most SC per dollar for $10 or less?", label: "SC per $1", icon: "coins", direction: "desc",
    explanation: "Complete packages costing $10 or less, ranked by immediate SC per dollar. More expensive packages cannot qualify through a prorated price." },
  { id: "purchase20", slug: "bonuses-under-20-dollars", title: "Purchase bonuses at $20 or less", question: "Which coin packages offer the most SC per dollar for $20 or less?", label: "SC per $1", icon: "coins", direction: "desc",
    explanation: "Complete packages costing $20 or less, ranked by immediate SC per dollar. The full purchase price and any first-purchase restriction are shown." },
  { id: "daily", slug: "daily-free-rewards", title: "Daily free rewards", question: "Which casinos publish the largest recurring daily free SC reward?", label: "Daily free SC", icon: "sun", direction: "desc",
    explanation: "Ranked by an explicitly recurring no-purchase daily SC allocation. A first-login reward or a staged welcome bonus is not counted as an every-day reward." },
  { id: "cash", slug: "cash-redemption-minimums", title: "Cash redemption minimums", question: "Which casinos publish the lowest cash redemption minimum?", label: "Minimum SC", icon: "bank", direction: "asc",
    explanation: "Ranked by published cash redemption minimum in SC, lowest first. Gift cards and thresholds without an explicit cash connection are separate. This does not rank payout speed." },
];

function choose(records, metric, score, label, note = () => "", ascending = false) {
  const sorted = records.filter(record => amount(score(record))).sort((a, b) =>
    (ascending ? 1 : -1) * (score(a) - score(b)) ||
    (a.priceUsd || 0) - (b.priceUsd || 0) ||
    Date.parse(date(b)) - Date.parse(date(a)) ||
    a.sourceUrl.localeCompare(b.sourceUrl));
  return sorted.length ? fact(sorted[0], metric, score(sorted[0]), label(sorted[0]), note(sorted[0])) : null;
}

function operatorMetrics(operator, now, purchaseBudget) {
  const records = operator.records || [];
  const currentOffers = latestRecords(records, r => r.recordType === "offers", now);
  const offers = kind => currentOffers.filter(r => r.kind === kind);
  const signup = offers("signup").filter(r => !amount(r.immediateSc) || !amount(total(r)) || total(r) >= r.immediateSc);
  const packs = ["first_purchase", "purchase_package"].flatMap(offers)
    .filter(r => amount(r.priceUsd) && r.priceUsd > 0 && amount(r.immediateSc));
  const minima = latestRecords(records, r => r.recordType === "facts" && r.field === "redemption_minimum", now)
    .filter(r => r.unit === "SC" && amount(r.value) && ["exact", "at_least"].includes(r.comparison) && r.upperValue == null);
  const cash = minima.filter(r => ["cash", "bank", "debit_card"].includes(r.method) ||
    (r.method === "general" && /\b(?:cash prizes?|bank transfer)\b/i.test([r.basis, ...(r.conditions || [])].join(" ")) &&
      !/\b(?:not|excluding|except)\b/i.test([r.basis, ...(r.conditions || [])].join(" "))));
  const metrics = {
    signup: choose(signup.filter(r => r.purchaseRequired === false), "signup", r => r.immediateSc,
      r => `${number(r.immediateSc)} SC`, r => total(r) > r.immediateSc ? `${number(total(r))} SC total${r.durationDays ? ` over ${number(r.durationDays)} days` : " in stages"}.` : "Immediate. No purchase needed."),
    welcome: choose(signup, "welcome", total, r => `${number(total(r))} SC`,
      r => r.purchaseRequired === false ? "No purchase needed." : r.purchaseRequired === true ? "Purchase required." : "Purchase requirement not confirmed."),
    staged: choose(signup.filter(r => r.purchaseRequired === false && amount(r.totalSc) &&
      amount(r.immediateSc) && r.totalSc > r.immediateSc), "staged", r => r.totalSc,
    r => `${number(r.totalSc)} SC`, r => `${number(r.immediateSc)} SC immediate; ${r.durationDays ? `total over ${number(r.durationDays)} days` : "remainder in stages"}.`),
    cash: choose(cash, "cash", r => r.value, r => `${number(r.value)} SC`, () => "Cash redemption minimum.", true),
    general: choose(minima.filter(r => ["general", "unspecified"].includes(r.method)), "general", r => r.value,
      r => `${number(r.value)} SC`, () => "General redemption minimum; cash method not established.", true),
    gift: choose(minima.filter(r => r.method === "gift_card"), "gift", r => r.value,
      r => `${number(r.value)} SC`, () => "Gift-card redemption minimum.", true),
    daily: choose(offers("recurring_daily").filter(r => r.purchaseRequired === false &&
      (!r.intervalHours || r.intervalHours === 24) &&
      !/\bfirst daily\b|\bfirst (?:day|login|claim)\b|\bday (?:one|1)\b|\bincreas|\bgrows\b/i.test((r.conditions || []).join(" "))),
    "daily", r => r.immediateSc, r => `${number(r.immediateSc)} SC`, () => "Recurring daily reward. No purchase needed."),
  };
  for (const [key, budget] of [["purchase", purchaseBudget], ["purchase10", 10], ["purchase20", 20]]) {
    metrics[key] = choose(packs.filter(r => r.priceUsd <= budget), key, r => r.immediateSc / r.priceUsd,
      r => `${number(r.immediateSc)} SC for $${number(r.priceUsd)}`,
      r => `${number(r.immediateSc / r.priceUsd)} SC per $1. ${r.kind === "first_purchase" ? "First purchase only." : "Purchase package."}`);
  }
  return metrics;
}

function absence(operator, metric) {
  const review = operator.disclosureReviews?.[metric];
  return review && ["not_disclosed", "not_offered"].includes(review.status) &&
    review.reviewedAt && review.sources?.length && review.valid === true ? review : null;
}

export function buildBenchmarks(numeric, registry = [], now = Date.now(), purchaseBudget = Infinity) {
  const registryBySlug = new Map(registry.map(op => [op.slug, op]));
  const snapshotBySlug = new Map((numeric?.operators || []).filter(Boolean).map(op => [op.slug, op]));
  const slugs = [...new Set([...registryBySlug.keys(), ...snapshotBySlug.keys()])];
  const operators = slugs.map(slug => {
    const metadata = registryBySlug.get(slug) || {};
    const snapshot = snapshotBySlug.get(slug) || { slug, name: metadata.name, records: [] };
    const mode = snapshot.productMode || metadata.playerValue?.productMode || "unverified";
    const metrics = mode === "entertainment_only" ? {} : operatorMetrics(snapshot, now, purchaseBudget);
    return { slug, name: metadata.name || snapshot.name, productMode: mode,
      favicon: metadata.faviconExt ? `/assets/favicons/${slug}${metadata.faviconExt}` : null,
      url: `/redemption-times/${slug}/`, metrics,
      absences: Object.fromEntries(["signup", "purchase", "cash"].map(key => [key, absence(snapshot, key)])),
      collectionStatus: snapshot.collectionStatus || "pending", score: null, rank: null,
      benefitCount: ["signup", "welcome", "purchase", "cash", "general", "gift", "daily"].filter(key => metrics[key]).length };
  });
  const benchmarks = BENCHMARKS.map(definition => {
    const rows = operators.filter(op => op.metrics[definition.id]).map(op => ({
      slug: op.slug, name: op.name, url: op.url, favicon: op.favicon, ...op.metrics[definition.id],
    })).sort((a, b) => (definition.direction === "asc" ? 1 : -1) * (a.value - b.value) || a.name.localeCompare(b.name, "en"));
    rows.forEach((row, index) => { row.rank = index && row.value === rows[index - 1].value ? rows[index - 1].rank : index + 1; });
    return { ...definition, anchor: definition.id === "signup" ? "welcome" : definition.id === "cash" ? "redemption" : definition.id,
      url: `/bonuses/${definition.slug}/`, rows,
      updatedAt: rows.map(row => row.observedAt).sort().at(-1) || numeric?.lastSuccessfulRefresh || null };
  });
  for (const op of operators) {
    const components = ["signup", "purchase", "cash"];
    op.componentScores = {};
    op.disclosureCount = components.filter(key => op.metrics[key] || op.absences[key]?.status === "not_offered").length;
    if (op.productMode !== "entertainment_only" && components.every(key => op.metrics[key] || op.absences[key])) {
      for (const key of components) {
        const value = op.metrics[key]?.value;
        const peers = benchmarks.find(b => b.id === key).rows;
        op.componentScores[key] = value == null || (key !== "cash" && value === 0) ? 0 :
          100 * peers.filter(row => key === "cash" ? row.value >= value : row.value <= value).length / peers.length;
      }
      if (components.some(key => op.metrics[key])) op.score = components.reduce((sum, key) => sum + op.componentScores[key], 0) / 3;
    }
    op.status = op.productMode === "entertainment_only" ? "Entertainment-only product" :
      op.score !== null ? "Ranked on published offers" :
        op.benefitCount ? "Overall comparison incomplete" : "Offer evidence being checked";
  }
  operators.sort((a, b) => (b.score !== null) - (a.score !== null) ||
    (b.score ?? 0) - (a.score ?? 0) || b.disclosureCount - a.disclosureCount ||
    b.benefitCount - a.benefitCount || a.name.localeCompare(b.name, "en"));
  let rank = 0;
  for (const op of operators) if (op.score !== null) op.rank = ++rank;
  return { schemaVersion: 1, methodologyVersion: METHODOLOGY_VERSION,
    generatedAt: numeric?.lastSuccessfulRefresh || null, operators, benchmarks,
    ranked: operators.filter(op => op.rank !== null), incomplete: operators.filter(op => op.rank === null) };
}
