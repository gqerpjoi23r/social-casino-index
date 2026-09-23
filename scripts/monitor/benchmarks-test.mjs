import "./no-network.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildBenchmarks } from "./benchmarks.mjs";
import { cashMinimumAnswers } from "./cash-answers.mjs";
import nunjucks from "nunjucks";
import { safeUrl, publicAddress, checkDestination, discover, needsRendering, sourceQueues } from "./discovery.mjs";

const now = Date.parse("2026-09-21T22:00:00Z");
const record = fields => ({ id: "record", recordType: "offers", kind: "signup",
  capturedAt: "2026-09-20T12:00:00Z", sourceUrl: "https://example.com/offers",
  immediateSc: 5, totalSc: 5, purchaseRequired: false, conditions: [], ...fields });
const op = (slug, records, fields = {}) => ({ slug, name: slug, productMode: "sweepstakes", records, ...fields });
const complete = (slug, signup, ratio, cash) => op(slug, [
  record({ immediateSc: signup, totalSc: signup }),
  record({ id: "purchase", kind: "purchase_package", immediateSc: ratio * 10, totalSc: ratio * 10, priceUsd: 10 }),
  record({ id: "cash", recordType: "facts", field: "redemption_minimum", method: "cash", comparison: "at_least", value: cash, unit: "SC" }),
]);
const model = operators => buildBenchmarks({ operators }, [], now);
const templates = new nunjucks.Environment(new nunjucks.FileSystemLoader("src/_includes"));
templates.addFilter("readableDate", value => value);
const answerHtml = result => templates.renderString(
  '{% from "cash-minimum-answers.njk" import lowestAnswer, followupAnswers %}{{ lowestAnswer(answers) }}{{ followupAnswers(answers) }}',
  { answers: cashMinimumAnswers(result) });

test("cash answers include all minimum ties and do not change the exported model", () => {
  const result = model([complete("z", 2, 2, 50), complete("a", 2, 2, 50), complete("b", 2, 2, 100)]);
  const before = JSON.stringify(result);
  const answers = cashMinimumAnswers(result);
  assert.deepEqual(answers.lowest.map(row => row.slug), ["a", "z"]);
  assert.deepEqual(answers.cashBelow50, []);
  const html = answerHtml(result);
  assert.match(html, /lowest published cash redemption minimum.*<strong>50 SC<\/strong>/);
  for (const slug of ["a", "z"]) assert.ok(html.includes(`href="/redemption-times/${slug}/"`));
  assert.match(html, /None of the cash minimums in this comparison is below 50 SC/);
  assert.equal(JSON.stringify(result), before);
});

test("below 50 is strict and gift/general minima never become cash answers", () => {
  const minimum = (method, value) => record({ recordType: "facts", field: "redemption_minimum",
    method, value, comparison: "exact", unit: "SC" });
  const result = model([
    op("under", [minimum("cash", 49)]),
    op("boundary", [minimum("cash", 50)]),
    op("gift", [minimum("gift_card", 10)]),
    op("gift-boundary", [minimum("gift_card", 50)]),
    op("general", [minimum("general", 5)]),
    op("usd", [{ ...minimum("cash", 1), unit: "USD" }]),
  ]);
  const answers = cashMinimumAnswers(result);
  assert.deepEqual(answers.cashBelow50.map(row => row.slug), ["under"]);
  assert.deepEqual(answers.giftBelow50.map(row => row.slug), ["gift"]);
  assert.deepEqual(answers.lowest.map(row => row.slug), ["under"]);
  const html = answerHtml(result);
  assert.match(html, /Cash:<\/strong> Yes/);
  assert.match(html, /data-gift-operator="gift"/);
  assert.doesNotMatch(html, /data-gift-operator="gift-boundary"/);
  assert.match(html, /They are not cash redemption minimums/);
});

test("cash pair answers follow changing amounts, ties and missing operators", () => {
  for (const [wow, chumba, winner] of [[50, 100, "wow-vegas"], [100, 50, "chumba"], [50, 50, null]]) {
    const result = model([complete("wow-vegas", 2, 2, wow), complete("chumba", 2, 2, chumba)]);
    const answers = cashMinimumAnswers(result);
    assert.equal(answers.pairComplete, true);
    assert.equal(answers.pairWinner?.slug || null, winner);
    assert.match(answerHtml(result), winner ? new RegExp(`<strong>${winner}</strong> has the lower`) : /Both have the same/);
  }
  for (const operators of [[], [complete("wow-vegas", 2, 2, 50)], [complete("chumba", 2, 2, 100)]]) {
    const result = model(operators);
    assert.equal(cashMinimumAnswers(result).pairComplete, false);
    assert.match(answerHtml(result), /We need a published cash minimum for both/);
    assert.doesNotMatch(answerHtml(result), /<\/strong> has the lower|Both have the same|undefined|null/);
  }
  const empty = answerHtml(model([]));
  assert.match(empty, /No cash minimum has been established/);
  assert.match(empty, /We have not established a gift-card minimum below 50 SC/);
});

test("cash and gift evidence retain dates and markers outside collapsed terms", () => {
  const input = complete("wow-vegas", 2, 2, 50);
  input.records.push(record({ id: "gift", recordType: "facts", field: "redemption_minimum",
    method: "gift_card", value: 10, comparison: "exact", unit: "SC", conditions: ["Gift cards only."] }));
  input.records.forEach(r => { r.freshness = "not_reconfirmed"; });
  input.records.find(r => r.id === "cash").conditions = ["Cash terms."];
  const result = model([input]);
  const benchmark = result.benchmarks.find(b => b.id === "cash");
  const html = templates.renderString(
    '{% from "benefit-row.njk" import benchmarkTable %}{{ benchmarkTable(benchmark, true) }}', { benchmark });
  assert.match(html, /class="benefit-source">[\s\S]*2026-09-20T12:00:00Z[\s\S]*Previous observation<\/p>[\s\S]*<details/);
  assert.match(html, /href="https:\/\/example.com\/offers"/);
  assert.match(html, /Cash terms/);
  assert.match(answerHtml(result), /previous observation/);
  assert.match(answerHtml(result), /Previous observation<\/p>/);
  const unchanged = templates.renderString(
    '{% from "benefit-row.njk" import evidence %}{{ evidence(row) }}', { row: benchmark.rows[0] });
  assert.doesNotMatch(unchanged, /class="benefit-source"/);
  assert.match(unchanged, /<details[\s\S]*Previous observation[\s\S]*2026-09-20T12:00:00Z/);
});

test("equal-weight rank uses three percentiles and never affiliate status", () => {
  const input = [complete("a", 10, 2, 50), complete("b", 5, 3, 100)];
  const first = model(input);
  assert.equal(first.ranked[0].slug, "a");
  assert.ok(Math.abs(first.ranked[0].score - 250 / 3) < 1e-10);
  input[0].partner = false;
  input[1].partner = true;
  assert.deepEqual(model(input), first);
});
test("component and score ties are deterministic", () => {
  const extra = complete("z", 2, 2, 50);
  extra.records.push(record({ kind: "recurring_daily", intervalHours: 24 }));
  const result = model([extra, complete("a", 2, 2, 50)]);
  assert.deepEqual(result.ranked.map(op => op.slug), ["a", "z"]);
  assert.deepEqual(result.benchmarks[0].rows.map(row => row.rank), [1, 1]);
});
test("signup benchmarks do not require redemption evidence", () => {
  const result = model([op("bonus-only", [record({})])]);
  assert.equal(result.ranked.length, 0);
  assert.equal(result.benchmarks.find(b => b.id === "signup").rows.length, 1);
  assert.equal(result.incomplete[0].metrics.signup.value, 5);
});
test("documented disclosure gaps score zero without inventing a zero offer", () => {
  const reviews = Object.fromEntries(["purchase", "cash"].map(metric =>
    [metric, { valid: true, status: "not_disclosed", reviewedAt: "2026-09-20", sources: [{ url: "https://example.com/terms" }] }]));
  const result = model([op("partial", [record({})], { disclosureReviews: reviews })]);
  assert.equal(result.ranked.length, 1);
  assert.equal(result.ranked[0].componentScores.cash, 0);
  assert.equal(result.ranked[0].metrics.cash, null);
  reviews.cash.valid = false;
  assert.equal(model([op("partial", [record({})], { disclosureReviews: reviews })]).ranked.length, 0);
});
test("failed collection retains dated terms without a score penalty", () => {
  const input = complete("a", 5, 3, 50);
  input.records.forEach(r => { r.freshness = "not_reconfirmed"; });
  input.collectionStatus = "unavailable";
  const result = model([input]);
  assert.equal(result.ranked[0].score, 100);
  assert.equal(result.ranked[0].metrics.signup.status, "retained");
  assert.equal(result.ranked[0].metrics.signup.observedAt, "2026-09-20T12:00:00Z");
});
test("new unknown, scoped, withdrawn and expired offers supersede old free claims", () => {
  for (const change of [{ purchaseRequired: null }, { states: ["FL"] }, { offerStatus: "withdrawn" },
    { expiresAt: "2026-09-21T00:00:00Z" }]) {
    const result = model([op("a", [record({}), record({ capturedAt: "2026-09-21T12:00:00Z", ...change })])]);
    assert.equal(result.benchmarks[0].rows.length, 0);
  }
});
test("offer reclassification does not revive an old first-purchase package", () => {
  const result = model([op("a", [
    record({ kind: "first_purchase", priceUsd: 10, immediateSc: 100 }),
    record({ kind: "purchase_package", capturedAt: "2026-09-21T12:00:00Z", priceUsd: 10, immediateSc: 20 }),
  ])]);
  assert.equal(result.operators[0].metrics.purchase.value, 2);
});
test("budgets use whole packages, ordinary packages qualify, and stages stay distinct", () => {
  const result = model([op("a", [
    record({ totalSc: 50, immediateSc: 2, durationDays: 7 }),
    record({ id: "small", kind: "purchase_package", priceUsd: 9, immediateSc: 18 }),
    record({ id: "large", kind: "first_purchase", priceUsd: 25, immediateSc: 100 }),
  ])]);
  const { metrics } = result.operators[0];
  assert.equal(metrics.signup.value, 2);
  assert.equal(metrics.staged.value, 50);
  assert.equal(metrics.purchase.priceUsd, 25);
  assert.equal(metrics.purchase10.priceUsd, 9);
  assert.equal(metrics.purchase20.priceUsd, 9);
});
test("daily benchmark excludes initial claims and unquantified repeating schedules", () => {
  for (const conditions of [["First daily bonus only"], ["First login reward"], ["Bonus grows each day"],
    ["Claim up to 5 SC daily"], ["Daily reward varies"], ["Random daily reward"], ["Seven-day streak reward"]]) {
    const result = model([op("a", [record({ kind: "recurring_daily", conditions })])]);
    assert.equal(result.operators[0].metrics.daily, null);
  }
  assert.equal(model([op("a", [record({ kind: "recurring_daily", intervalHours: 24 })])]).operators[0].metrics.daily.value, 5);
});
test("daily qualifiers in the offer name also exclude it from fixed daily sorting", () => {
  const result = model([op("a", [record({ kind: "recurring_daily", name: "First daily claim", intervalHours: 24 })])]);
  assert.equal(result.operators[0].metrics.daily, null);
  assert.equal(result.toplist.rows[0].sortValues.daily, null);
  assert.equal(result.toplist.rows[0].knownAttributeCount, 0);
});
test("cash needs explicit method evidence; gifts and USD are not SC cash minima", () => {
  const base = record({ recordType: "facts", field: "redemption_minimum", method: "general", value: 50, unit: "SC", comparison: "at_least" });
  assert.equal(model([op("a", [base])]).operators[0].metrics.cash, null);
  assert.equal(model([op("a", [{ ...base, conditions: ["Applies to cash prizes."] }])]).operators[0].metrics.cash.value, 50);
  assert.equal(model([op("a", [{ ...base, method: "unspecified" }])]).operators[0].metrics.cash, null);
  assert.equal(model([op("a", [{ ...base, method: "unspecified", basis: '"Cash Prize" Redemption option' }])]).operators[0].metrics.cash.value, 50);
  assert.equal(model([op("a", [{ ...base, method: "unspecified", basis: '"Cash Prize" Redemption option' }])]).operators[0].metrics.general, null);
  assert.equal(model([op("a", [{ ...base, method: "gift_card", basis: "Not the Cash Prize Redemption option" }])]).operators[0].metrics.cash, null);
  for (const change of [{ method: "gift_card" }, { unit: "USD" }, { conditions: ["Not for cash prizes"] }]) {
    assert.equal(model([op("a", [{ ...base, ...change }])]).operators[0].metrics.cash, null);
  }
});
test("all six stakeholder operators remain in the output without forced ranking", () => {
  const registry = JSON.parse(readFileSync("src/_data/operators.json"));
  const result = buildBenchmarks({ operators: [] }, registry, now);
  for (const slug of ["jackpota", "sweetsweeps", "lucky-bunny", "dorados", "yay-casino", "zonko"]) {
    assert.ok(result.operators.some(op => op.slug === slug));
  }
  assert.equal(result.operators.find(op => op.slug === "jackpota").rank, null);
});
test("discovery only follows relevant public verified-domain links", () => {
  const sources = discover([
    "https://example.com/bonus?utm_source=x", "https://example.com/rules.pdf",
    "https://example.com/account/bonus", "https://example.com/bonus?token=secret",
    "https://evil.example/bonus", "http://example.com/bonus", "https://example.com/news",
    "https://example.com/games/slots/piggy-power-hit-the-bonus",
    "https://example.com/en/slots/daily-rewards",
  ], { id: "home", depth: 0 }, "a", ["example.com"]);
  assert.deepEqual(sources.map(s => s.url), ["https://example.com/bonus", "https://example.com/rules.pdf"]);
  assert.equal(discover(["https://example.com/bonus"], { depth: 2 }, "a", ["example.com"]).length, 0);
});
test("destination guards reject credentials, local addresses and foreign redirects", async () => {
  assert.equal(safeUrl("https://user:pass@example.com/bonus", ["example.com"]), null);
  assert.equal(safeUrl("https://example.com:444/bonus", ["example.com"]), null);
  for (const ip of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.2", "::1", "fc00::1", "::ffff:127.0.0.1"]) assert.equal(publicAddress(ip), false);
  await assert.rejects(checkDestination("https://example.com/bonus", ["example.com"], async () => [{ address: "127.0.0.1" }]), /unsafe_source_address/);
  await assert.rejects(checkDestination("https://evil.example/bonus", ["example.com"]), /unsafe_source_url/);
});
test("incomplete and region-only pages require rendering, not absence classification", () => {
  for (const status of ["blocked", "empty", "region_notice"]) assert.equal(needsRendering({ status, text: "" }, { id: "a-home" }), true);
  assert.equal(needsRendering({ status: "ok", text: "Please enable JavaScript".repeat(50) }, { id: "a-home" }), true);
  assert.equal(needsRendering({ status: "login_required", text: "" }, { id: "a-home" }), false);
});
test("persistent discovery queue revisits oldest checks and retains unfinished sources", () => {
  const input = [{ slug: "a", sources: [{ id: "home", url: "https://example.com/" }] }];
  const previous = { discovery: { a: { checked: { home: "2026-09-21" },
    queue: [{ id: "bonus", url: "https://example.com/bonus", depth: 1 }] } } };
  const queue = sourceQueues(input, {}, previous)[0];
  assert.equal(queue.queue[0].id, "bonus");
  assert.equal(queue.queue.length, 2);
});
test("comparison sources precede generic discoveries even if discoveries were never checked", () => {
  const input = [{ slug: "a", sources: [{ id: "daily", url: "https://example.com/daily" }] }];
  const previous = { discovery: { a: { checked: { daily: "2026-09-22" },
    queue: [{ id: "other", url: "https://example.com/general-rules", depth: 1 }] } } };
  const queue = sourceQueues(input, { comparisonSources: { a: ["daily"] } }, previous)[0];
  assert.equal(queue.queue[0].id, "daily");
  assert.equal(queue.queue[1].id, "other");
});
test("all configured comparison sources fit within the existing round-robin run budget", () => {
  const registry = JSON.parse(readFileSync("src/_data/operators.json"));
  const config = JSON.parse(readFileSync("data/monitor/config.json"));
  const queues = sourceQueues(registry, config);
  const expected = Object.values(config.comparisonSources).flat();
  const visited = [];
  while (visited.length < 50 && queues.some(q => q.queue.length && q.attempted < 8)) {
    for (const q of queues) {
      if (visited.length === 50 || q.attempted === 8 || !q.queue.length) continue;
      visited.push(q.queue.shift().id);
      q.attempted++;
    }
  }
  for (const id of expected) assert.ok(visited.includes(id), `Priority source missed: ${id}`);
});
test("persisted game discoveries are removed without filtering explicit source seeds", () => {
  const input = [{ slug: "a", sources: [
    { id: "home", url: "https://example.com/" },
    { id: "curated", url: "https://example.com/games/bonus-rules" },
  ] }];
  const previous = { discovery: { a: { queue: [
    { id: "game", url: "https://example.com/games/slots/hit-the-bonus", depth: 1 },
    { id: "bonus", url: "https://example.com/bonus", depth: 1 },
    { id: "unsafe", url: "https://evil.example/bonus", depth: 1 },
  ] } } };
  assert.deepEqual(sourceQueues(input, {}, previous)[0].queue.map(source => source.id),
    ["curated", "home", "bonus"]);
});
