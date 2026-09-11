import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { displayRecord } from "../../src/updates/display.js";
import { comparisonRows, currentRecord } from "../../src/updates/updates.11tydata.js";
import { compareOperators } from "../../src/assets/updates-sort.js";

const now = Date.parse("2026-09-11T15:00:00Z");
const capture = "2026-09-11T12:00:00Z";
const record = (fields = {}) => ({
  recordType: "offers", kind: "signup", immediateSc: 2, totalSc: 2,
  freshness: "captured_unreviewed", capturedAt: capture, reviewStatus: "automated_unreviewed",
  conditions: [], ...fields,
});
const operator = (records, fields = {}) => ({
  slug: "test", name: "Test", records, lastSuccessfulCapture: capture,
  lastAttempt: "2026-09-11T14:59:00Z", readablePages: 2, attemptedPages: 3, ...fields,
});
const row = (records, fields = {}) => comparisonRows({ operators: [operator(records, fields)] }, {}, now)[0];

test("display keeps discounts, extra coins and redeemable amounts distinct", () => {
  const row = displayRecord({ recordType: "offers", priceUsd: 9.99, immediateSc: 30,
    totalSc: 30, goldCoins: 1500000, advertisedDiscountPercent: 67, promoCode: "EXAMPLE",
    conditions: ["First purchase only"], sourceUrl: "https://example.com/offer" });
  assert.match(row.valueText, /9.99 USD/);
  assert.match(row.valueText, /30 immediate SC/);
  assert.match(row.valueText, /1,500,000 entertainment coins/);
  assert.match(row.valueText, /67 % price discount/);
  assert.doesNotMatch(row.valueText, /extra coins/);
  assert.match(row.scopeText, /First purchase only; Code: EXAMPLE/);
  assert.equal(row.sourceUrl, "https://example.com/offer");
});

test("display preserves qualified amounts, scope and unknowns", () => {
  assert.equal(displayRecord({ recordType: "offers" }).valueText, "Unknown");
  assert.equal(displayRecord({ recordType: "facts", value: null, unit: "SC" }).valueText, "Unknown");
  assert.equal(displayRecord({ recordType: "facts", unit: "USD" }).valueText, "Unknown");
  assert.match(displayRecord({ recordType: "offers", advertisedExtraPercent: 200,
    extraPercentComparison: "at_least" }).valueText, /at least 200 % extra coins/);
  const row = displayRecord({ recordType: "facts", value: 100, comparison: "at_least",
    unit: "SC", method: "cash", states: ["Florida"] });
  assert.equal(row.valueText, "at least 100 SC");
  assert.equal(row.scopeText, "cash; Florida");
});

test("stale warning ages without a rebuild and updates on visibility", () => {
  let now = Date.parse("2026-09-11T00:00:00Z");
  const warning = { dataset: { lastRefresh: new Date(now).toISOString() }, hidden: false };
  let tick;
  let visible;
  class Clock extends Date { static now() { return now; } }
  runInNewContext(readFileSync("src/assets/monitor-freshness.js", "utf8"), {
    Date: Clock,
    document: { getElementById: () => warning, addEventListener: (_, callback) => { visible = callback; } },
    setInterval: (callback, delay) => { tick = callback; assert.equal(delay, 60000); },
  });
  assert.equal(warning.hidden, true);
  now += 36 * 60 * 60 * 1000;
  tick();
  assert.equal(warning.hidden, true);
  now++;
  tick();
  assert.equal(warning.hidden, false);
  warning.dataset.lastRefresh = new Date(now).toISOString();
  visible();
  assert.equal(warning.hidden, true);
  warning.dataset.lastRefresh = "";
  tick();
  assert.equal(warning.hidden, false);
});

test("signup never chooses a conflicting maximum or uses staged SC as immediate", () => {
  assert.equal(row([record({ immediateSc: 8 }), record({ immediateSc: 12 })]).signup.sortValue, null);
  assert.equal(row([record({ conflict: "Two saved sources disagree" })]).signup.text, "Conflicting terms");
  assert.equal(row([record({ reviewStatus: "unresolved" })]).signup.sortValue, null);
  const staged = row([record({ totalSc: 5, durationDays: 3 })]).signup;
  assert.equal(staged.text, "2 SC immediate");
  assert.equal(staged.sortValue, 2);
  assert.match(staged.notes.join(" "), /5 SC total over 3 days \(not all immediate\)/);
  assert.equal(row([record({ immediateSc: null, totalSc: 5, durationDays: 3 })]).signup.sortValue, null);
  assert.equal(row([record({ immediateSc: null, totalSc: null, goldCoins: 1000000 })]).signup.sortValue, null);
  assert.equal(row([record()], { productMode: "entertainment_only" }).signup.text, "No redeemable SC");
});

test("claim freshness never comes from a recent operator collection attempt", () => {
  for (const fields of [
    { freshness: "not_reconfirmed", lastConfirmedAt: capture },
    { capturedAt: "2026-09-09T00:00:00Z" },
    { capturedAt: null },
    { capturedAt: "not-a-date" },
    { capturedAt: "2026-09-12T00:00:00Z" },
    { freshness: "reconfirmed", lastConfirmedAt: null },
  ]) {
    const result = row([record(fields)]);
    assert.equal(result.signup.sortValue, null);
    assert.equal(result.signup.text, "Not currently confirmed");
    assert.equal(result.records[0].current, false);
    assert.match(result.records[0].freshnessLabel, /Retained \/ dated/);
  }
  const reconfirmed = record({ freshness: "reconfirmed", capturedAt: "2026-01-01", lastConfirmedAt: capture });
  assert.equal(currentRecord(reconfirmed, now), true);
  assert.equal(row([reconfirmed]).signup.sortValue, 2);
  const boundary = Date.parse(capture) + 36 * 60 * 60 * 1000;
  assert.equal(currentRecord(record(), boundary), true);
  assert.equal(currentRecord(record(), boundary + 1), false);
  assert.equal(row([record()], { lastSuccessfulCapture: null }).checked.sortValue, null);
  assert.equal(row([record()], { lastSuccessfulCapture: "2026-09-09" }).checked.sortValue, null);
  assert.equal(row([record()]).checked.sortValue, Date.parse(capture));
});

const minimum = (fields = {}) => record({
  recordType: "facts", field: "redemption_minimum", value: 100, unit: "SC",
  comparison: "at_least", method: "cash", states: [], ...fields,
});

test("redemption separates explicit methods, units, scope and qualified ranges", () => {
  const separated = row([minimum(), minimum({ method: "gift_card", value: 10 })]);
  assert.equal(separated.cash.sortValue, 100);
  assert.equal(separated.gift.sortValue, 10);
  for (const method of ["general", "unspecified", null, "bank_transfer"]) {
    const result = row([minimum({ method, basis: "Cash redemption" })]);
    assert.equal(result.cash.sortValue, null);
    assert.equal(result.unspecifiedMinimum, true);
  }
  for (const fields of [
    { comparison: "greater_than" }, { upperValue: 200 }, { states: ["Florida"] },
    { unit: "gold_coins" }, { scope: "VIP" }, { value: null }, { comparison: "up_to" },
  ]) assert.equal(row([minimum(fields)]).cash.sortValue, null);
  assert.equal(row([minimum(), minimum({ value: 50 })]).cash.sortValue, null);
  assert.equal(row([minimum(), minimum({ unit: "USD" })]).cash.sortValue, null);
  const currencies = comparisonRows({ operators: [
    operator([minimum()], { name: "SC Operator" }),
    operator([minimum({ unit: "USD" })], { name: "USD Operator" }),
  ] }, {}, now);
  assert.ok(currencies.every(item => item.cash.sortValue === null));
  assert.match(currencies[0].cash.notes.join(" "), /Different published units/);
});

test("purchase summaries preserve package identity, unknowns, conditions and currency", () => {
  const offer = record({ kind: "first_purchase", priceUsd: 20, immediateSc: 40,
    totalSc: 65, durationDays: 8, promoCode: "WELCOME", conditions: ["Verified new accounts only"] });
  const single = row([offer]).purchase;
  assert.equal(single.sortValue, 20);
  assert.match(single.text, /\$20 USD \/ 40 SC immediate/);
  assert.match(single.notes.join(" "), /65 SC total over 8 days/);
  assert.match(single.notes.join(" "), /Code: WELCOME/);
  assert.match(single.notes.join(" "), /Verified new accounts only/);
  assert.equal(single.automated, true);
  assert.equal(row([offer, { ...offer, sourceId: "another-source" }]).purchase.sortValue, 20);
  for (const change of [{ priceUsd: 10 }, { immediateSc: 60 }, { priceUsd: null },
    { promoCode: "OTHER" }, { conditions: ["VIP only"] }]) {
    const multiple = row([offer, { ...offer, ...change }]).purchase;
    assert.equal(multiple.text, "Multiple offers");
    assert.equal(multiple.sortValue, null);
  }
  assert.equal(row([{ ...offer, priceUsd: null }]).purchase.sortValue, null);
  assert.equal(row([{ ...offer, conflict: "Conflicting price" }]).purchase.sortValue, null);
  assert.equal(row([{ ...offer, kind: "paid_pass" }]).purchase.sortValue, null);
});

test("all sort directions put unknown, conflicting and expired values last with alphabetical ties", () => {
  for (const key of ["signup", "cash", "purchase", "checked"]) {
    const sortable = (name, sortValue, validUntil = now + 1000) => ({ name, [key]: { sortValue, validUntil } });
    const items = [sortable("Unknown", null), sortable("Expired", 100, now - 1),
      sortable("Zulu", 2), sortable("Alpha", 2), sortable("Beta", 1), sortable("Conflict", null)];
    const sorted = direction => [...items].sort((a, b) => compareOperators(a, b, key, direction, now)).map(item => item.name);
    assert.deepEqual(sorted("asc"), ["Beta", "Alpha", "Zulu", "Conflict", "Expired", "Unknown"]);
    assert.deepEqual(sorted("desc"), ["Alpha", "Zulu", "Beta", "Conflict", "Expired", "Unknown"]);
    assert.equal(compareOperators(sortable("Alpha", 0), sortable("Beta", 1), key, "asc", now), -1);
  }
  const names = [{ name: "Zulu" }, { name: "Alpha" }];
  assert.deepEqual([...names].sort((a, b) => compareOperators(a, b, "name", "asc", now)).map(item => item.name), ["Alpha", "Zulu"]);
  assert.deepEqual([...names].sort((a, b) => compareOperators(a, b, "name", "desc", now)).map(item => item.name), ["Zulu", "Alpha"]);
});

test("published ten-operator fixture keeps every record, history event and export unchanged", () => {
  const numeric = JSON.parse(readFileSync("src/_data/numeric.json", "utf8"));
  const monitor = JSON.parse(readFileSync("src/_data/monitor.json", "utf8"));
  const original = JSON.stringify(numeric);
  const rows = comparisonRows(numeric, monitor, Date.parse(numeric.lastSuccessfulRefresh) + 60000);
  assert.equal(rows.length, 10);
  assert.deepEqual(rows.map(item => item.name), rows.map(item => item.name).sort((a, b) => a.localeCompare(b, "en")));
  for (const item of rows) {
    const source = numeric.operators.find(op => op.slug === item.slug);
    assert.deepEqual(item.records.map(r => r.id), source.records.map(r => r.id));
    assert.equal(item.history.length, monitor.events.filter(event => event.operator === item.slug).length);
    assert.deepEqual(item.coverage, source.coverage);
    assert.deepEqual(item.unknowns, source.unknowns);
    assert.ok(item.records.filter(r => r.reviewStatus === "automated_unreviewed").every(r => r.reviewLabel === "automated unreviewed"));
  }
  assert.equal(rows.find(item => item.slug === "yay-casino").signup.text, "Conflicting terms");
  assert.equal(rows.find(item => item.slug === "wow-vegas").signup.sortValue, 2);
  assert.equal(rows.find(item => item.slug === "wow-vegas").purchase.text, "Multiple offers");
  assert.equal(rows.find(item => item.slug === "chumba").cash.sortValue, null);
  assert.equal(rows.find(item => item.slug === "chumba").gift.sortValue, 10);
  assert.equal(rows.find(item => item.slug === "lucky-bunny").checked.sortValue, null);
  assert.equal(JSON.stringify(numeric), original);
});
