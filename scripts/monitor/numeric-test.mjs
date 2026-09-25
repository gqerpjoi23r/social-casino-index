import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readableText } from "./core.mjs";
import { archiveCapture, readCapture, uploadFile } from "./archive.mjs";
import { deterministicExtract, checkExtraction, comparableOffer, changeSignals, retainUnconfirmed, mergeDailyCandidates } from "./numeric-core.mjs";
import { firecrawlOptions, supportedContent } from "./providers.mjs";
import { retryFullContent, discover } from "./discovery.mjs";
import { baselineKey, usableRun } from "./state-core.mjs";
import { emptyExtraction } from "./schema.mjs";

const pages = text => [{ sourceId: "faq", text }];
test("extraction preserves post-approval delivery as transfer rather than processing", () => {
  const base = deterministicExtract(pages("The minimum redemption is 50 SC for eligible players.")).facts[0];
  const quote = "Processing time after approval: IBT / ACH takes 1-5 business days.";
  const item = { ...base, field: "redemption_time", value: 1, upperValue: 5,
    unit: "business_days", comparison: "range", stage: "processing", method: "bank",
    basis: "IBT / ACH redemption after approval", quote, conditions: [] };
  const result = checkExtraction({ ...emptyExtraction(), facts: [item] }, pages(quote));
  assert.equal(result.accepted.facts[0].stage, "transfer");
  assert.equal(result.recovered[0].reason, "post_approval_transfer");
  assert.equal(item.stage, "processing");
  const retained = { ...item, stage: "end_to_end",
    basis: "IBT / ACH delivery after the redemption request is approved" };
  const qualified = checkExtraction({ ...emptyExtraction(), facts: [retained] }, pages(quote));
  assert.equal(qualified.accepted.facts[0].stage, "transfer");
  assert.equal(retained.stage, "end_to_end");
});
test("recover explicit first-day and instant-delivery allocations without inventing totals", () => {
  const quote = "Welcome reward SC 8. Day 1: 100,000 Gold Coins + SC 3 Day 2: SC 5";
  const base = deterministicExtract(pages("Buy 30 SC for $9.99.")).offers[0];
  const input = { ...base, kind: "signup", quote, priceUsd: null, immediateSc: null,
    totalSc: 8, purchaseRequired: false, conditions: [quote] };
  const run = item => checkExtraction({ ...emptyExtraction(), offers: [item] }, pages(item.quote));
  const output = run(input);
  assert.equal(output.accepted.offers[0].immediateSc, 3);
  assert.equal(output.recovered[0].field, "immediateSc");
  assert.equal(input.immediateSc, null);
  for (const changed of ["Welcome reward SC 8.", "Welcome reward SC 8. Day 1: 100 Gold Coins.",
    "Welcome reward SC 8. Day 1: Up to SC 3."])
    assert.equal(run({ ...input, quote: changed, conditions: [changed] }).accepted.offers[0].immediateSc, null);
  const paid = "First purchase: 30 SC for $9.99 (normally $29.99). Instant coin delivery.";
  const purchase = { ...base, kind: "first_purchase", quote: paid, immediateSc: null, conditions: [paid] };
  assert.equal(run(purchase).accepted.offers[0].immediateSc, 30);
  assert.equal(run({ ...purchase, quote: `${paid} Remaining rewards over 7 days.` }).accepted.offers[0].immediateSc, null);
  assert.equal(run({ ...purchase, quote: `${paid} Plus SC 10.` }).accepted.offers[0].immediateSc, null);
  assert.equal(run({ ...purchase, quote: paid.replace("Instant coin delivery.", "") }).accepted.offers[0].immediateSc, null);
  assert.equal(run({ ...input, immediateSc: 5 }).accepted.offers[0].immediateSc, 5);
  assert.equal(checkExtraction({ ...emptyExtraction(), offers: [input] }, pages("Unrelated page.")).accepted.offers.length, 0);
});
test("a generic sign-up banner does not establish a no-purchase immediate reward", () => {
  const quote = "Sign up now to get GC 100K + FREE SC 40 + Chance to Win 200 FREE SC";
  const base = deterministicExtract(pages("Buy 40 SC for $20.")).offers[0];
  const input = { ...base, quote, kind: "signup", priceUsd: null, purchaseRequired: false, conditions: [quote] };
  const run = item => checkExtraction({ ...emptyExtraction(), offers: [item] }, pages(item.quote)).accepted.offers[0];
  assert.equal(run(input).kind, "promotion");
  assert.equal(run(input).purchaseRequired, null);
  assert.equal(run(input).immediateSc, null);
  assert.equal(run(input).totalSc, 40);
  assert.equal(run({ ...input, quote: `${quote}. No purchase necessary.` }).kind, "signup");
  const reward = "Register to claim your welcome reward of FREE SC 40.";
  assert.equal(run({ ...input, quote: reward, conditions: [reward] }).kind, "signup");
});
test("collection excludes binary assets and reserves full rendering for evidence-backed sources", () => {
  assert.equal(supportedContent(Buffer.from("PK\u0003\u0004\u0000"), "application/zip"), false);
  assert.equal(supportedContent(Buffer.from("hello\u0000world"), "text/html"), false);
  assert.equal(supportedContent(Buffer.from("%PDF-1.7"), "application/octet-stream"), true);
  assert.equal(supportedContent(Buffer.from("<p>1 SC daily</p>"), "text/html"), true);
  assert.deepEqual(discover(["https://example.com/promotion.zip", "https://example.com/rules.pdf"],
    { id: "home", depth: 0 }, "a", ["example.com"]).map(s => s.url), ["https://example.com/rules.pdf"]);
  assert.equal(retryFullContent({ status: "ok" }), false);
  assert.equal(retryFullContent({ status: "ok" }, { retryFullContent: true }), true);
  for (const status of ["blocked", "region_notice", "login_required", "unsupported_content"])
    assert.equal(retryFullContent({ status }, { retryFullContent: true }), false);
});
test("recover an explicit purchase allocation without keeping an invented staged total", () => {
  const input = pages("A $20 purchase gives 40 SC now plus 25 SC credited over 8 days.");
  const extraction = deterministicExtract(pages("Buy 40 SC for $20."));
  extraction.offers[0] = { ...extraction.offers[0], quote: input[0].text, totalSc: 65,
    durationDays: 8, conditions: ["25 SC credited over 8 days."] };
  const original = JSON.stringify(extraction);
  const result = checkExtraction(extraction, input);
  assert.equal(result.accepted.offers[0].priceUsd, 20);
  assert.equal(result.accepted.offers[0].immediateSc, 40);
  assert.equal(result.accepted.offers[0].totalSc, null);
  assert.equal(result.accepted.offers[0].durationDays, 8);
  assert.equal(result.recovered[0].field, "totalSc");
  assert.equal(JSON.stringify(extraction), original);
  extraction.offers[0].immediateSc = 41;
  assert.equal(checkExtraction(extraction, input).accepted.offers.length, 0);
  extraction.offers[0].immediateSc = 40;
  extraction.offers[0].quote = "Invented $20 purchase of 40 SC and 25 SC over 8 days.";
  assert.equal(checkExtraction(extraction, input).accepted.offers.length, 0);
});
test("request frequency is rejected as a duration without discarding genuine processing estimates", () => {
  const quote = "Only one Prize redemption request is processed per Customer Account in any 24-hour period.";
  const extraction = emptyExtraction();
  extraction.facts.push({ sourceId: "faq", quote, field: "redemption_time", value: 24, upperValue: null,
    unit: "hours", comparison: "exact", method: "unspecified", stage: "processing", states: [],
    basis: "one Prize redemption request per Customer Account", conditions: [quote] });
  assert.equal(checkExtraction(extraction, pages(quote)).rejected[0].reason, "request_frequency_not_duration");
  const actual = "A redemption request is typically processed within 24 hours.";
  extraction.facts[0] = { ...extraction.facts[0], quote: actual, basis: "Processing time", conditions: [actual] };
  assert.equal(checkExtraction(extraction, pages(actual)).accepted.facts.length, 1);
});
test("daily free amounts survive deterministic extraction and numeric qualification", () => {
  for (const text of [
    "Claim 1 free SC as your daily bonus.",
    "Claim SC 1 as your daily bonus. No purchase necessary.",
    "Claim 1 SC as your daily bonus. No purchase required.",
    "Claim 1 SC as your daily bonus. No purchase is required.",
    "Claim 0.5 Sweepstakes Coins every day as a free reward.",
    "Claim 1 free SC once per day on your first daily login.",
    "Claim 1 free SC on your first login each day.",
    "Claim 0.5 free SC on your first log-in of every day.",
  ]) {
    const result = checkExtraction(deterministicExtract(pages(text)), pages(text));
    assert.equal(result.rejected.length, 0);
    assert.equal(result.accepted.offers[0].purchaseRequired, false);
    assert.ok(result.accepted.offers[0].immediateSc > 0);
  }
});
test("daily parser never turns paid, capped, staged or GC-only claims into fixed free SC", () => {
  for (const text of [
    "Claim up to 50 free SC as your daily bonus.",
    "Claim 1 free SC on the first daily claim.",
    "Claim 10,000 free Gold Coins as your daily bonus.",
    "Claim 1 SC daily with a purchase.",
    "Claim 1 free SC as your daily VIP bonus.",
    "Claim 1 free SC on your first daily claim only. Log in every day.",
    "Claim 1 free SC on your first daily claim only, then log in every day.",
    "Claim 1 free SC once per day on your first daily login during the first 7 days.",
    "Claim up to 5 free SC once per day on your first daily login.",
    "Claim 1 free SC once per day on your first daily login with a purchase.",
  ]) assert.equal(deterministicExtract(pages(text)).offers.filter(o =>
    o.kind === "recurring_daily" && o.purchaseRequired === false).length, 0);
  const unknown = deterministicExtract(pages("Claim 1 SC as your daily bonus."));
  assert.equal(unknown.offers[0].purchaseRequired, null);
});
test("explicit free price can be zero without allowing invented zero rewards", () => {
  const input = pages("Claim 1 free SC as your daily bonus.");
  const data = deterministicExtract(input);
  data.offers[0].priceUsd = 0;
  assert.equal(checkExtraction(data, input).accepted.offers.length, 1);
  data.offers[0].immediateSc = 0;
  assert.equal(checkExtraction(data, input).rejected[0].reason, "number_not_in_quote");
});
test("validated fallback daily values survive model omissions, not model conflicts", () => {
  const input = pages("Claim 1 free SC as your daily bonus.");
  const deterministic = checkExtraction(deterministicExtract(input), input);
  const empty = { accepted: { offers: [], facts: [], statements: [] }, rejected: [] };
  assert.equal(mergeDailyCandidates(empty, deterministic).accepted.offers[0].immediateSc, 1);
  const conflict = { ...empty, accepted: { ...empty.accepted, offers: [{ ...deterministic.accepted.offers[0], immediateSc: 2 }] } };
  assert.equal(mergeDailyCandidates(conflict, deterministic).accepted.offers.length, 1);
});
test("schema supports explicit processing without relabelling as transfer", () => {
  const input = pages("The minimum redemption is 50 SC for eligible players.");
  const data = deterministicExtract(input);
  Object.assign(data.facts[0], { field: "redemption_time", value: 3, unit: "business_days", stage: "processing",
    quote: "Cash redemption processing takes up to 3 business days." });
  assert.equal(checkExtraction(data, pages(data.facts[0].quote)).accepted.facts[0].stage, "processing");
});
test("numeric extraction survives HTML wrapper changes", () => {
  const text = "Buy this package for $20 and receive 40 SC.";
  const a = deterministicExtract(pages(readableText(`<main><p>${text}</p></main>`)));
  const b = deterministicExtract(pages(readableText(`<article class="new"><div>${text}</div></article>`)));
  assert.deepEqual(a, b);
  assert.equal(a.offers[0].priceUsd, 20);
  assert.equal(a.offers[0].immediateSc, 40);
  assert.equal(checkExtraction(a, pages(text)).rejected.length, 0);
});
test("paid staged total cannot be used as immediate daily reward", () => {
  const data = deterministicExtract(pages("$44 purchase provides 144 SC over 30 days."));
  assert.equal(data.offers[0].totalSc, 144);
  assert.equal(data.offers[0].immediateSc, null);
  assert.equal(comparableOffer(data.offers[0]), false);
});

test("withdrawal and expiry metadata need explicit source support", () => {
  const input = pages("Buy this package for $20 and receive 40 SC.");
  const data = deterministicExtract(input);
  data.offers[0].offerStatus = "withdrawn";
  assert.equal(checkExtraction(data, input).rejected[0].reason, "unsupported_offer_withdrawal");
  data.offers[0].offerStatus = "unknown";
  data.offers[0].expiresAt = "2026-09-20T00:00:00Z";
  assert.equal(checkExtraction(data, input).rejected[0].reason, "unsupported_offer_expiry");
  data.offers[0].quote += " This offer expired at 2026-09-20T00:00:00Z.";
  data.offers[0].offerStatus = "expired";
  assert.equal(checkExtraction(data, pages(data.offers[0].quote)).accepted.offers.length, 1);
});
test("staged classification and omitted offer qualifiers are rejected", () => {
  const input = pages("$44 purchase provides 144 SC over 30 days.");
  const data = deterministicExtract(input);
  data.offers[0].kind = "recurring_daily";
  assert.equal(checkExtraction(data, input).rejected[0].reason, "staged_is_not_recurring");
  const qualified = pages("Buy this package for $20 and receive 40 SC for new players after verification.");
  const omitted = deterministicExtract(qualified);
  omitted.offers[0].conditions = [];
  assert.equal(checkExtraction(omitted, qualified).rejected[0].reason, "missing_offer_qualifiers");
});
test("cap is not a daily bonus and multi-amount welcome is not flattened", () => {
  assert.equal(deterministicExtract(pages("Daily redemption rewards have a maximum limit of 9,550 SC.")).offers.length, 0);
  assert.equal(deterministicExtract(pages("Your welcome offer: $20 purchase = 40 SC plus 25 SC over 8 days.")).offers.length, 0);
});
test("grounding rejects invented numeric values even when quote matches", () => {
  const input = pages("The minimum redemption is 50 SC for eligible players.");
  const data = deterministicExtract(input);
  data.facts[0].value = 100;
  const result = checkExtraction(data, input);
  assert.equal(result.accepted.facts.length, 0);
  assert.equal(result.rejected[0].reason, "number_not_in_quote");
});
test("playthrough written as one time supports a numeric multiplier", () => {
  const input = pages("Sweeps Coins must be played once before redemption.");
  const data = deterministicExtract(input);
  const quote = "Sweeps Coins must be played one time before redemption.";
  data.facts[0].quote = quote;
  assert.equal(checkExtraction(data, pages(quote)).accepted.facts[0].value, 1);
});
test("price discounts cannot be classified as extra coin percentages", () => {
  for (const suffix of ["67% discount on first purchase.", "67 percent off."]) {
    const input = pages(`Buy this package for $9.99 and receive 30 SC. ${suffix}`);
    const data = deterministicExtract(input);
    data.offers[0].advertisedExtraPercent = 67;
    assert.equal(checkExtraction(data, input).rejected[0].reason, "discount_is_not_extra_coins");
    assert.equal(checkExtraction(data, input).accepted.offers.length, 0);
  }
  const input = pages("Buy this package for $9.99 and receive 30 SC with 67% extra coins.");
  const data = deterministicExtract(input);
  data.offers[0].advertisedExtraPercent = 67;
  assert.equal(checkExtraction(data, input).accepted.offers.length, 1);
});
test("schema rejects invented fields and wrong unit/field combinations", () => {
  const input = pages("The minimum redemption is 50 SC for eligible players.");
  const data = deterministicExtract(input);
  data.facts[0].unit = "hours";
  assert.equal(checkExtraction(data, input).rejected[0].reason, "wrong_unit");
  data.facts[0].invented = true;
  assert.throws(() => checkExtraction(data, input), /invalid_extraction_schema/);
});
test("schema accepts explicit cash without changing ambiguous redemption methods", () => {
  const input = pages("The minimum redemption for cash prizes is 50 SC.");
  const data = deterministicExtract(input);
  data.facts[0].method = "cash";
  assert.equal(checkExtraction(data, input).accepted.facts[0].method, "cash");
  for (const method of ["general", "unspecified", "gift_card"]) {
    data.facts[0].method = method;
    assert.equal(checkExtraction(data, input).accepted.facts[0].method, method);
  }
  data.facts[0].method = "invented";
  assert.throws(() => checkExtraction(data, input), /invalid_extraction_schema/);
});
test("explicit million amounts are grounded without inventing arithmetic", () => {
  const input = pages("Buy this package for $9.99 and receive 30 SC plus 1.5 million Gold Coins.");
  const data = deterministicExtract(input);
  data.offers[0].goldCoins = 1500000;
  assert.equal(checkExtraction(data, input).accepted.offers.length, 1);
  data.offers[0].goldCoins = 1500001;
  assert.equal(checkExtraction(data, input).rejected[0].reason, "number_not_in_quote");
});
test("abbreviated coin quantities do not discard a complete priced SC offer", () => {
  for (const [quantity, amount] of [["10M", 10000000], ["120K", 120000], ["1.5M", 1500000]]) {
    const input = pages(`Buy this package for $10 and receive SC30 plus GC${quantity}.`);
    const data = deterministicExtract(input);
    data.offers[0].goldCoins = amount;
    const result = checkExtraction(data, input);
    assert.equal(result.rejected.length, 0);
    assert.equal(result.accepted.offers[0].priceUsd, 10);
    assert.equal(result.accepted.offers[0].immediateSc, 30);
    data.offers[0].goldCoins = amount + 1;
    assert.equal(checkExtraction(data, input).rejected[0].reason, "number_not_in_quote");
  }
});
test("months and strict ages cannot pass as days and inclusive ages", () => {
  const data = deterministicExtract(pages("The minimum redemption is 50 SC for eligible players."));
  const fact = data.facts[0];
  Object.assign(fact, { field: "redemption_time", value: 1, unit: "days_unspecified",
    quote: "Our verification process may take up to one (1) month." });
  assert.equal(checkExtraction(data, pages(fact.quote)).rejected[0].reason, "month_unit_mismatch");
  fact.unit = "months";
  assert.equal(checkExtraction(data, pages(fact.quote)).accepted.facts.length, 1);
  Object.assign(fact, { field: "minimum_age", value: 21, unit: "years",
    quote: "You are over twenty-one (21) years of age." });
  assert.equal(checkExtraction(data, pages(fact.quote)).rejected[0].reason, "strict_age_boundary");
  fact.comparison = "greater_than";
  assert.equal(checkExtraction(data, pages(fact.quote)).accepted.facts.length, 1);
});
test("archive retains HTML and Markdown and detects corruption", () => {
  const directory = mkdtempSync(join(tmpdir(), "sci-test-"));
  try {
    const entry = archiveCapture(directory, { id: "faq", operatorId: "example", url: "https://example.com" }, "firecrawl",
      { text: "Content", body: "Content", html: "<main>Content</main>", rawHtml: "<body>Content</body>",
        markdown: "Content", status: "ok", capturedAt: "2026-09-01T00:00:00Z" }, {});
    const capture = readCapture(directory, entry);
    assert.equal(capture.html, "<main>Content</main>");
    assert.equal(capture.markdown, "Content");
    assert.equal(capture.capturedAt, "2026-09-01T00:00:00Z");
    writeFileSync(join(directory, entry.path), "corrupted");
    assert.throws(() => readCapture(directory, entry), /capture_hash_mismatch/);
    assert.throws(() => uploadFile(directory, join(directory, entry.path), { CI: "true" }), /archive_bucket_required/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test("Firecrawl returns both replayable original HTML and main-content Markdown", () => {
  assert.deepEqual(firecrawlOptions("https://example.com").formats, ["markdown", "html", "rawHtml", "links"]);
  assert.equal(firecrawlOptions("https://example.com").onlyMainContent, true);
  assert.equal(firecrawlOptions("https://example.com", false).onlyMainContent, false);
  assert.equal(firecrawlOptions("https://example.com").maxAge, 0);
});
test("identical replay ignores extraction timestamps; missing is not expired", () => {
  const current = { operators: [{ slug: "example", offers: [{ name: "offer", capturedAt: "old" }], facts: [], statements: [] }] };
  const next = structuredClone(current);
  next.operators[0].offers[0].capturedAt = "new";
  assert.deepEqual(changeSignals(current, next), []);
  next.operators[0].offers = [];
  assert.equal(changeSignals(current, next)[0].type, "not_reconfirmed");
});
test("record ordering and wording do not become numeric changes", () => {
  const a = { sourceId: "faq", field: "redemption_minimum", value: 50, quote: "At least 50 SC", conditions: ["Verified", "US"] };
  const b = { ...a, value: 100, sourceId: "rules" };
  const run = { extractorVersion: "v1", operators: [{ slug: "x", offers: [], facts: [a, b], statements: [] }] };
  const next = structuredClone(run);
  next.operators[0].facts.reverse();
  next.operators[0].facts[1].conditions.reverse();
  assert.deepEqual(changeSignals(run, next), []);
  next.operators[0].facts[1].quote = "Redeem a minimum of 50 SC";
  assert.equal(changeSignals(run, next)[0].type, "wording_only_change");
  next.operators[0].facts[1].value = 60;
  assert.equal(changeSignals(run, next)[0].type, "numeric_or_condition_change");
  next.extractorVersion = "v2";
  assert.equal(changeSignals(run, next)[0].type, "extractor_change");
});
test("conflicting source claims stay separate and failed pages retain old values", () => {
  const run = { operators: [{ slug: "x", offers: [], facts: [{ sourceId: "faq", value: 50 }, { sourceId: "rules", value: 100 }], statements: [] }] };
  const next = { operators: [{ slug: "x", readableSources: [{ sourceId: "faq" }], offers: [], facts: [{ sourceId: "faq", value: 50 }], statements: [] }] };
  assert.equal(changeSignals(run, next)[0].type, "not_reconfirmed");
  retainUnconfirmed(run, next);
  assert.equal(next.operators[0].facts[1].value, 100);
  assert.equal(next.operators[0].facts[1].reconfirmationStatus, "not_reconfirmed");
});
test("trial pointers are separate and model failures cannot advance baselines", () => {
  assert.notEqual(baselineKey({ GITHUB_REF: "refs/heads/main" }), baselineKey({ GITHUB_REF: "refs/heads/codex/trial" }));
  assert.notEqual(baselineKey({ GITHUB_REF: "refs/heads/main" }),
    baselineKey({ GITHUB_REF: "refs/heads/main", MONITOR_OPERATORS_FILE: "data/monitor/candidates.json" }));
  assert.notEqual(baselineKey({ GITHUB_REF: "refs/heads/codex/a" }), baselineKey({ GITHUB_REF: "refs/heads/codex/b" }));
  const manifest = { completedAt: "now", sources: [{ status: "ok" }] };
  const evaluation = { schemaValid: true, modelErrors: [], replayEvents: 0 };
  const replay = { unsupportedQuotes: 0, identicalReplayEvents: 0 };
  assert.equal(usableRun(manifest, evaluation, replay), true);
  assert.equal(usableRun({}, evaluation, replay), false);
  assert.equal(usableRun(manifest, { ...evaluation, modelErrors: ["timeout"] }, replay), false);
  assert.equal(usableRun(manifest, evaluation, { ...replay, unsupportedQuotes: 1 }), false);
});
