import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { comparisonSections, playerAnswers } from "../../src/updates/updates.11tydata.js";

const now = Date.parse("2026-09-15T12:00:00Z");
const record = (fields = {}) => ({
  recordType: "offers", kind: "signup", sourceUrl: "https://example.com/promo",
  capturedAt: "2026-09-12T12:00:00Z", immediateSc: 2, totalSc: 2, conditions: [], ...fields,
});
const operator = (records, fields = {}) => ({ slug: "example", name: "Example", records, ...fields });
const sections = records => comparisonSections({ operators: [operator(records)] }, now);
const rows = (records, section = 0, group = 0) => sections(records)[section].groups[group].rows;
const fact = fields => record({
  recordType: "facts", field: "redemption_minimum", method: "cash",
  unit: "SC", comparison: "at_least", value: 100, ...fields,
});

test("saved snapshots populate all three metrics without empty operators", () => {
  const numeric = JSON.parse(readFileSync("src/_data/numeric.json", "utf8"));
  const result = comparisonSections(numeric, Date.parse(numeric.lastSuccessfulRefresh));
  assert.deepEqual(result.map(section => section.groups.map(group => group.rows.length)), [[3], [2], [2, 2]]);
  const find = (section, slug, group = 0) => result[section].groups[group].rows.find(row => row.slug === slug);
  assert.equal(find(0, "mcluck").value, "2.5 SC");
  assert.equal(find(0, "yay-casino").value, "12 SC");
  assert.match(find(0, "yay-casino").note, /No purchase needed/);
  assert.equal(find(0, "wow-vegas").value, "5 SC over 3 days");
  assert.match(find(0, "wow-vegas").note, /2 SC immediate; total over 3 days/);
  assert.equal(find(1, "wow-vegas").value, "30 SC for $9.99");
  assert.equal(find(1, "wow-vegas").promoCode, null);
  assert.equal(find(1, "zonko").value, "40 SC for $20");
  assert.ok(find(1, "zonko").conditions.some(condition => condition.includes("8 days")));
  assert.equal(find(2, "chumba").value, "100 SC");
  assert.equal(find(2, "chumba", 1).value, "10 SC");
  assert.equal(find(2, "wow-vegas").value, "50 SC");
  assert.equal(find(2, "wow-vegas", 1).value, "20 SC");
  for (const section of result) for (const group of section.groups) {
    assert.deepEqual(group.rows.map(row => row.name), group.rows.map(row => row.name).sort((a, b) => a.localeCompare(b, "en")));
    assert.ok(group.rows.every(row => row.value && !row.value.includes("?") && row.sourceUrl && row.observedAt));
  }
});

test("player answers preserve methods, stages and source dates without inventing missing pair metrics", () => {
  const numeric = JSON.parse(readFileSync("src/_data/numeric.json", "utf8"));
  const answers = playerAnswers(numeric, Date.parse(numeric.lastSuccessfulRefresh));
  const text = id => answers.find(group => group.id === id).rows.map(row => row.text).join(" ");
  assert.match(text("low-redemption"), /50 SC cash/);
  assert.match(text("low-redemption"), /10 SC.*gift-card threshold/);
  assert.match(text("free-signup"), /5 SC over 3 days.*2 SC immediate; total over 3 days/);
  assert.match(text("purchase-value"), /\$9.99 includes 30 immediate SC/);
  assert.match(text("purchase-value"), /3 SC per dollar|3 immediate SC per dollar/);
  assert.doesNotMatch(text("compare-mcluck"), /cash redemption/i);
  assert.match(text("compare-chumba"), /50 SC.*100 SC/);
  assert.ok(answers.every(group => group.rows.every(row => row.sourceUrl && row.observedAt)));
  assert.deepEqual(playerAnswers(undefined, now), []);
});

test("budget answers find affordable packages even when a larger package has a better ratio", () => {
  const numeric = { operators: [operator([
    record({ kind: "first_purchase", priceUsd: 20, immediateSc: 100 }),
    record({ kind: "first_purchase", priceUsd: 9, immediateSc: 18 }),
    record({ purchaseRequired: null }),
  ])] };
  const answers = playerAnswers(numeric, now);
  assert.ok(!answers.some(group => group.id === "free-signup"));
  const text = answers.find(group => group.id === "purchase-value").rows.map(row => row.text).join(" ");
  assert.match(text, /\$9 includes 18 immediate SC/);
  assert.match(text, /5 immediate SC per dollar on its \$20 package/);
});

test("conflicting sources choose the higher welcome total and retain its conditions", () => {
  const conditions = ["Verify email", "Claim over three days"];
  const chosen = rows([record({ immediateSc: 8, totalSc: 8 }),
    record({ sourceUrl: "https://example.com/home", immediateSc: 4, totalSc: 12,
      durationDays: 3, conditions, reviewStatus: "unresolved", conflict: "Different ads" })])[0];
  assert.equal(chosen.value, "12 SC over 3 days");
  assert.match(chosen.note, /4 SC immediate; total over 3 days/);
  assert.deepEqual(chosen.conditions, conditions);
});

test("latest source snapshot supersedes older higher values and old promo codes", () => {
  const old = record({ capturedAt: "2026-09-11T12:00:00Z", totalSc: 50, promoCode: "OLD" });
  assert.equal(rows([old, record()])[0].value, "2 SC");
  assert.equal(rows([old, record({ immediateSc: null, totalSc: null })]).length, 0);
  assert.equal(rows([old, record({ states: ["FL"] })]).length, 0);
  assert.equal(rows([old, record()])[0].promoCode, undefined);
});

test("observation dates survive failed refreshes and do not expire after 36 hours", () => {
  const saved = record({ capturedAt: "2026-09-01T12:00:00Z", freshness: "not_reconfirmed" });
  assert.equal(rows([saved])[0].observedAt, saved.capturedAt);
  assert.equal(rows([record({ lastConfirmedAt: "2026-09-14T12:00:00Z" })])[0].observedAt, "2026-09-14T12:00:00Z");
});

test("purchase comparison selects complete packages by immediate SC per dollar", () => {
  const pack = fields => record({ kind: "first_purchase", ...fields });
  const chosen = rows([
    pack({ priceUsd: 20, immediateSc: 40, totalSc: 200 }),
    pack({ priceUsd: 10, immediateSc: 30, totalSc: 30, promoCode: "NEW" }),
    pack({ priceUsd: null, immediateSc: 1000 }),
    pack({ priceUsd: 1, immediateSc: null }),
  ], 1)[0];
  assert.equal(chosen.value, "30 SC for $10");
  assert.equal(chosen.promoCode, "NEW");
  assert.equal(rows([pack({ priceUsd: 1, immediateSc: null }), pack({ priceUsd: null, immediateSc: 30 })], 1).length, 0);
  assert.equal(rows([pack({ priceUsd: 0, immediateSc: 30 })], 1).length, 0);
});

test("minimums choose the lowest supported amount within each explicit SC method", () => {
  const result = sections([fact({ value: 100 }), fact({ value: 50 }),
    fact({ value: 10, method: "gift_card" }), fact({ value: 1, unit: "USD" }),
    fact({ value: 2, method: "general" }), fact({ value: 3, upperValue: 99 }),
    fact({ value: 4, comparison: "up_to" }), fact({ value: 5, states: ["FL"] })]);
  assert.equal(result[2].groups[0].rows[0].value, "50 SC");
  assert.equal(result[2].groups[1].rows[0].value, "10 SC");
});

test("changed method does not resurrect a superseded cash claim", () => {
  assert.equal(rows([fact({ capturedAt: "2026-09-11T12:00:00Z" }), fact({ method: "general" })], 2).length, 0);
});

test("totals do not become immediate coins; purchase requirements remain visible", () => {
  assert.equal(rows([record({ immediateSc: 2, totalSc: 5 })])[0].value, "5 SC in stages");
  assert.equal(rows([record({ immediateSc: null, totalSc: 5 })])[0].note, "Advertised total");
  assert.match(rows([record({ purchaseRequired: true })])[0].note, /Purchase required/);
  assert.match(rows([record({ purchaseRequired: false })])[0].note, /No purchase needed/);
  assert.equal(rows([record({ immediateSc: 10, totalSc: 5 })]).length, 0);
});

test("invalid dates, sources, amounts, scoped claims and entertainment-only products are excluded", () => {
  for (const fields of [{ capturedAt: "invalid" }, { capturedAt: "2026-09-16T00:00:00Z" },
    { sourceUrl: "" }, { sourceUrl: "javascript:alert(1)" }, { immediateSc: null, totalSc: null },
    { totalSc: NaN, immediateSc: -1 }, { states: ["FL"] }, { scope: "vip" }]) {
    assert.equal(rows([record(fields)]).length, 0, JSON.stringify(fields));
  }
  const result = comparisonSections({ operators: [operator([record()], { productMode: "entertainment_only" })] }, now);
  assert.ok(result.every(section => section.groups.every(group => group.rows.length === 0)));
  assert.ok(comparisonSections(undefined).every(section => section.groups.every(group => group.rows.length === 0)));
});
