import test from "node:test";
import assert from "node:assert/strict";
import { readableText, accessStatus, extract, validQuotes, aggregate } from "./core.mjs";
import { RequestUsage, monitorLimits } from "./providers.mjs";
import { sourceQueues, discover, needsRendering } from "./discovery.mjs";
import { candidateReport } from "./candidate-report.mjs";

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
test("location notices and missing article bodies are not captured articles", () => {
  const options = { expectedHeading: "How do I redeem?" };
  assert.equal(accessStatus("We can't detect your location\n" + text), "region_notice");
  assert.equal(accessStatus(text, "https://example.com/geoblock"), "region_notice");
  assert.equal(needsRendering({ status: "region_notice" }, { id: "home" }), true);
  assert.equal(accessStatus("Help Center\n" + "Copyright and footer links. ".repeat(20), "", 200, options), "article_missing");
  assert.equal(accessStatus("How do I redeem?\nRelated Articles\n" + text, "", 200, options), "article_missing");
  assert.equal(accessStatus("How do I redeem?\n" + text, "", 200, options), "ok");
  const noAmounts = "How do I redeem?\nOpen the rewards section in your account and follow the instructions. The available methods depend on the account and will be displayed before you submit.";
  assert.equal(accessStatus(noAmounts, "", 200, options), "ok");
  assert.equal(accessStatus(text, "", 403, options), "blocked");
});
test("curated help and PDF seeds run without opening arbitrary API discovery", () => {
  const sources = [
    { id: "pdf", url: "https://example.com/api/Document/rules.pdf" },
    { id: "help", url: "https://help.example.com/redeem" },
  ];
  const [queue] = sourceQueues([{ ...operator, sources }], { comparisonSources: { fixture: ["pdf", "help"] } });
  assert.equal(queue.queue.length, 2);
  assert.deepEqual(queue.hosts, ["example.com", "help.example.com"]);
  assert.equal(discover([sources[0].url], sources[1], "fixture", queue.hosts).length, 0);
  assert.equal(discover(["https://unapproved.example/help"], sources[1], "fixture", queue.hosts).length, 0);
  assert.equal(discover(["https://example.com/promotions"], { ...sources[0], discoverLinks: false }, "fixture", queue.hosts).length, 0);
});
test("candidate decisions distinguish absent capture from field exclusion", () => {
  const registry = [{ ...operator, sources: [{ id: "rules", url: "https://example.com/rules", purpose: "sweepstakes_rules" }] }];
  const extracted = { operators: [{ slug: "fixture", offers: [], statements: [], facts: [{
    id: "minimum", field: "redemption_minimum", value: 50, unit: "SC", method: "general",
    comparison: "exact", sourceId: "rules", sourceUrl: "https://example.com/rules", capturedAt: "2026-09-01T00:00:00Z",
  }] }] };
  const report = candidateReport(extracted, registry, { runId: "test", sources: [{
    operatorId: "fixture", id: "rules", url: "https://example.com/rules", status: "article_missing",
  }] }, { rejected: [] });
  const fields = report.operators[0].fields;
  assert.ok(fields.find(field => field.field === "cash").reasons.includes("cash_method_unit_or_scope_not_established"));
  assert.ok(fields.find(field => field.field === "daily").reasons.includes("source_unavailable"));
});
test("embedded reCAPTCHA notices preserve substantive public evidence", () => {
  const widget = "Log-in Sign-up\nreCAPTCHA\nRecaptcha requires verification.\nprotected by **reCAPTCHA**\n";
  const page = widget + text;
  assert.equal(accessStatus(page), "ok");
  assert.deepEqual(extract(page).minimum, extract(text).minimum);
  assert.equal(accessStatus(widget), "blocked");
  assert.equal(accessStatus(page, "", 403), "blocked");
  assert.equal(accessStatus(page, "", 429), "blocked");
  assert.equal(accessStatus(page, "https://example.com/login"), "login_required");
  assert.equal(accessStatus(page, "", 500), "http_error");
});
test("substantial challenge pages and non-widget captcha instructions remain blocked", () => {
  for (const notice of ["Please verify you are human", "Just a moment", "Checking your browser",
    "Access denied", "Please complete the CAPTCHA to continue", "reCAPTCHA verification failed"]) {
    assert.equal(accessStatus(`${notice}\n${text.repeat(30)}`), "blocked");
  }
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
  const usage = new RequestUsage([{ amount: 999999 }]);
  for (let i = 0; i < 45; i++) assert.equal(usage.reserve("firecrawl"), true);
  assert.equal(usage.reserve("firecrawl"), false);
  assert.equal(usage.reserve("model"), true);
  usage.record("firecrawl", { metadata: { creditsUsed: 2 } });
  assert.equal(usage.firecrawlCreditsReported, 2);
});
test("expanded roster gets bounded collection and one model call per operator plus one repair", () => {
  assert.deepEqual(monitorLimits(11), { direct: 50, firecrawl: 45, brightdata: 10, model: 12 });
  assert.deepEqual(monitorLimits(17), { direct: 80, firecrawl: 75, brightdata: 10, model: 18 });
  const usage = new RequestUsage({}, 17);
  for (let i = 0; i < 18; i++) assert.equal(usage.reserve("model"), true);
  assert.equal(usage.reserve("model"), false);
  const resumed = new RequestUsage({ model: 17, firecrawl: 74 }, 17);
  assert.equal(resumed.reserve("model"), true);
  assert.equal(resumed.reserve("model"), false);
  assert.equal(resumed.reserve("firecrawl"), true);
  assert.equal(resumed.reserve("firecrawl"), false);
  for (const count of [0, -1, 1.5, 25, NaN]) assert.throws(() => monitorLimits(count));
});
