import test from "node:test";
import assert from "node:assert/strict";
import { readableText, accessStatus, extract, validQuotes, aggregate } from "./core.mjs";
import { RequestUsage } from "./providers.mjs";

const operator = { slug: "fixture", name: "Fixture", playerValue: { productMode: "sweepstakes" } };
const text = "The minimum redemption is 50 SC for eligible players.\nClaim your daily reward of 0.5 SC every day.\nIdentity verification requires government photo identification.";
const source = { id: "rules", url: "https://example.com/rules", status: "ok", fields: extract(text) };
test("semantic passages survive changed wrappers and classes", () => {
  const a = readableText(`<main><p>${text.replaceAll("\n", "</p><p>")}</p></main>`);
  const b = readableText(`<article class="changed"><div>${text.replaceAll("\n", "</div><div>")}</div></article>`);
  assert.deepEqual(extract(a), extract(b));
  assert.ok(extract(a).minimum.length);
  assert.ok(extract(a).verification.length);
});
test("welcome rewards are not recurring daily rewards", () => {
  assert.equal(extract("Welcome reward: claim 1 SC daily for the first three days.").daily.length, 0);
});
test("timing, statement and purchase text do not become unrelated facts", () => {
  assert.equal(extract("Prize redemption may take up to 72 hours to process.").minimum.length, 0);
  assert.equal(extract("This statement restricts our liability for purchases.").restrictions.length, 0);
  assert.equal(extract("Purchase payment processing takes 24 hours.").timing.length, 0);
  assert.equal(extract("Discover your real identity with exciting games.").verification.length, 0);
  assert.equal(extract("What documents are required for identity verification?").verification.length, 0);
  assert.equal(extract("They earn every month they play, not just once.").playthrough.length, 0);
  assert.equal(extract("The maximum Gold Coin purchase is USD $9,000 per day.").purchase.length, 0);
  assert.ok(extract("The minimum redemption amount for cash prize is SC 50.").minimum.length);
});
test("staged signup instructions do not become daily rewards", () => {
  assert.equal(extract("Sign-Up Bonus - How It Works\nClaim your daily reward of 0.5 SC every day.").daily.length, 0);
});
test("sentence splitting preserves decimal amounts", () => {
  const result = extract(`${"Unrelated content. ".repeat(40)}The minimum redemption is 50.5 SC for eligible players.`);
  assert.ok(result.minimum.some(quote => quote.includes("50.5 SC")));
});
test("untrusted model output must be an exact source passage", () => {
  assert.equal(validQuotes(text, { minimum: ["The minimum redemption is 100 SC for eligible players."] }).minimum.length, 0);
});
test("block pages and login redirects are not observations", () => {
  assert.equal(accessStatus("Please verify you are human"), "blocked");
  assert.equal(accessStatus(text, "https://example.com/login"), "login_required");
  assert.equal(accessStatus(text, "", 500), "http_error");
});
test("baseline, repeat, change and failed-source retention", () => {
  const first = aggregate(operator, [source], null, "2026-09-10T01:00:00Z");
  assert.ok(first.events.every(e => e.type === "baseline"));
  assert.equal(aggregate(operator, [source], first.record, "2026-09-10T02:00:00Z").events.length, 0);
  const changed = { ...source, fields: extract(text.replace("50 SC", "100 SC")) };
  assert.ok(aggregate(operator, [changed], first.record, "2026-09-10T03:00:00Z").events.some(e => e.type === "source_wording_changed"));
  const failed = aggregate(operator, [{ ...source, status: "blocked" }], first.record, "2026-09-10T04:00:00Z");
  assert.equal(failed.record.fields.minimum.status, "stale");
  assert.deepEqual(failed.record.fields.minimum.quotes, first.record.fields.minimum.quotes);
  assert.equal(failed.events.length, 0);
});
test("request caps remain, dollar ledger is not enforced", () => {
  const usage = new RequestUsage([{ amount: 999999 }], "2026-09-10");
  for (let i = 0; i < 45; i++) assert.equal(usage.reserve("firecrawl"), true);
  assert.equal(usage.reserve("firecrawl"), false);
  assert.equal(usage.reserve("model"), true);
  usage.record("firecrawl", { metadata: { creditsUsed: 2 } });
  assert.equal(usage.firecrawlCreditsReported, 2);
});
