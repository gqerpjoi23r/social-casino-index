import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readableText } from "./core.mjs";
import { archiveCapture, readCapture, uploadFile } from "./archive.mjs";
import { deterministicExtract, checkExtraction, comparableOffer, changeSignals, retainUnconfirmed } from "./numeric-core.mjs";
import { firecrawlOptions } from "./providers.mjs";
import { baselineKey, usableRun } from "./state-core.mjs";

const pages = text => [{ sourceId: "faq", text }];
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
  assert.notEqual(baselineKey({ GITHUB_REF: "refs/heads/codex/a" }), baselineKey({ GITHUB_REF: "refs/heads/codex/b" }));
  const manifest = { completedAt: "now", sources: [{ status: "ok" }] };
  const evaluation = { schemaValid: true, modelErrors: [], replayEvents: 0 };
  const replay = { unsupportedQuotes: 0, identicalReplayEvents: 0 };
  assert.equal(usableRun(manifest, evaluation, replay), true);
  assert.equal(usableRun({}, evaluation, replay), false);
  assert.equal(usableRun(manifest, { ...evaluation, modelErrors: ["timeout"] }, replay), false);
  assert.equal(usableRun(manifest, evaluation, { ...replay, unsupportedQuotes: 1 }), false);
});
