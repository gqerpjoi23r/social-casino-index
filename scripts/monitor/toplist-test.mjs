import "./no-network.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { buildBenchmarks } from "./benchmarks.mjs";
import { stampValueHistory } from "./value-history.mjs";
import { orderToplist } from "../../src/assets/toplist-order.js";
import { comparisonCoverage } from "./coverage.mjs";
import { statedOfferEnd, expiryTime } from "./offer-expiry.mjs";
import { displayFact, presentToplist } from "./toplist-presentation.mjs";

const now = Date.parse("2026-09-22T12:00:00Z");
const record = change => ({ id: "record", sourceId: "home", sourceUrl: "https://example.com/",
  recordType: "offers", kind: "signup", capturedAt: "2026-09-21T06:00:00Z",
  immediateSc: 2, totalSc: 2, purchaseRequired: false, conditions: [], ...change });
const operator = (slug, records, change = {}) => ({ slug, name: slug, productMode: "sweepstakes",
  records, ...change });
const model = operators => buildBenchmarks({ operators }, [], now);
const row = records => model([operator("a", records)]).toplist.rows[0];

test("only equal known signup rewards use benefit coverage before alphabetical ties", () => {
  const make = (name, amount, count) => ({ name, slug: name, benefitCount: count,
    sortValues: { welcome: amount, purchase: 2, daily: 1, redemption: 72, cash: 50 } });
  const rows = [make("a-thin", 2, 2), make("z-full", 2, 5), make("b-full", 2, 5),
    make("large", 3, 2), make("a-unknown", null, 2), make("z-unknown", null, 5)];
  assert.deepEqual(orderToplist(rows).map(row => row.slug),
    ["large", "b-full", "z-full", "a-thin", "a-unknown", "z-unknown"]);
  for (const sort of ["purchase", "daily", "redemption", "cash"])
    assert.deepEqual(orderToplist(rows, sort).map(row => row.slug), [...rows].map(row => row.slug).sort());
});

test("presentation badges use supported thresholds, name timing stages and preserve tone order", () => {
  const records = [
    record({ totalSc: 5, conditions: ["Opt-in needed for the full bonus."] }),
    record({ id: "cash", recordType: "facts", field: "redemption_minimum",
      method: "cash", value: 50, unit: "SC", comparison: "at_least" }),
    record({ id: "time", recordType: "facts", field: "redemption_time",
      stage: "processing", method: "cash", value: 3, unit: "business_days", comparison: "up_to" }),
    record({ id: "daily", kind: "recurring_daily", intervalHours: 24, immediateSc: 0.3, totalSc: 0.3 }),
  ];
  const result = row(records);
  assert.deepEqual(result.presentation.badges.map(b => b.label),
    ["Processing \u22643 days", "Low minimum", "Daily 0.3 SC", "Opt-in for full bonus", "Cash prizes"]);
  assert.deepEqual(result.presentation.badges.map(b => b.tone), ["perk", "perk", "perk", "warn", "plain"]);
  for (const change of [{ value: 4 }, { unit: "days_unspecified" }, { comparison: "at_least" },
    { stage: "transfer" }, { unit: "hours", conditions: ["Within 24 business hours."], value: 24 }]) {
    const changed = row(records.map(r => r.id === "time" ? { ...r, ...change } : r));
    assert.equal(changed.presentation.badges.some(b => b.icon === "timer"), false, JSON.stringify(change));
  }
  for (const change of [{ value: 51 }, { method: "general" }, { method: "gift_card" }, { unit: "USD" }]) {
    const changed = row(records.map(r => r.id === "cash" ? { ...r, ...change } : r));
    assert.equal(changed.presentation.badges.some(b => b.label === "Low minimum"), false, JSON.stringify(change));
  }
  const variable = row(records.map(r => r.id === "daily" ? { ...r, conditions: ["Reward varies by day."] } : r));
  assert.equal(variable.presentation.badges.some(b => b.icon === "calendar-check"), false);
});

test("presentation cleans labels without changing underlying evidence or losing term qualifiers", () => {
  const original = { label: "Typically 10 days (type unspecified)", note: "Delivery after approval; bank",
    stage: "transfer", method: "bank" };
  const display = displayFact(original, "redemption");
  assert.equal(display.displayLabel, "About 10 days");
  assert.equal(display.displayNote, "After approval");
  assert.match(display.detailNote, /After approval. By bank/);
  assert.equal(display.label, original.label);
  assert.equal(displayFact({ label: "2.5 SC free", purchaseRequired: false }, "signup").displayLabel, "2.5 SC");
  const purchase = displayFact({ label: "25 SC for $9.99", priceUsd: 9.99,
    note: "2.5 SC per $1. First package in a three-purchase welcome offer." }, "purchase");
  assert.equal(purchase.displayNote, "2.5 SC per $1");
  assert.match(purchase.detailNote, /First of 3 welcome offers/);
  const bundle = displayFact({ label: "44 SC total + 440,000 Gold Coins", totalSc: 44 }, "purchase");
  assert.equal(bundle.displayLabel, "44 SC bundle");
  assert.equal(bundle.displayNote, "Price not stated");
  assert.equal(displayFact({ label: "100 USD", method: "general" }, "minimum").displayLabel, "$100");
});

test("terms group cash and gift minima once and show older capture dates", () => {
  const result = row([record({}), ...["cash", "gift_card"].map((method, i) =>
    record({ id: method, recordType: "facts", field: "redemption_minimum",
      value: i ? 10 : 75, method, unit: "SC", comparison: "at_least" }))]);
  const terms = result.presentation.terms.filter(term => term.key === "minimum");
  assert.equal(terms.length, 1);
  assert.equal(terms[0].heading, "Cash out from");
  assert.equal(terms[0].values.length, 2);
  const presented = checked => presentToplist(result, now, checked).terms[0].values[0];
  assert.equal(presented("2026-09-21T23:00:00Z").stale, false);
  assert.equal(presented("2026-09-22T06:00:00Z").stale, true);
  assert.equal(presented("2026-09-21T23:00:00Z").sourceDomain, "example.com");
});

test("explicit calendar expiry removes old promotions without removing the operator", () => {
  assert.equal(statedOfferEnd("Promotion Dates: July 1-27, 2026."), "2026-07-27");
  assert.equal(statedOfferEnd("Offer Period: April 22 \u2013 April 30, 2026."), "2026-04-30");
  assert.equal(statedOfferEnd("Offer ends February 30, 2026."), null);
  assert.equal(statedOfferEnd("Article published July 27, 2026."), null);
  assert.equal(statedOfferEnd("Expires July 27."), null);
  assert.equal(expiryTime("2026-09-22"), Date.parse("2026-09-23T12:00:00Z"));
  const result = model([operator("a", [record({}), record({ id: "expired", sourceId: "promo",
    kind: "first_purchase", immediateSc: 25, totalSc: 25, priceUsd: 9.99, promoCode: "JULY",
    conditions: ["Promotion Dates: July 1-27, 2026."] })])]);
  assert.equal(result.toplist.rows[0].purchase, null);
  assert.equal(result.toplist.rows[0].signup.label, "2 SC free");
  assert.equal(result.operators[0].product.expiredOffers.length, 1);
});

test("presentation keeps useful descriptions and excludes them from numeric signup grouping", () => {
  const result = row([record({ immediateSc: null, totalSc: null, goldCoins: 1000 }),
    record({ sourceId: "daily", kind: "recurring_daily", immediateSc: null, totalSc: null })]);
  assert.equal(result.presentation.compact, true);
  assert.match(result.presentation.summary, /1,000 GC/);
  assert.equal(result.homepageEligible, true);
  assert.equal(result.presentation.fields.length, 4);
  assert.equal(result.sortValues.welcome, null);
});

test("cash and lower gift minima are presented separately and published methods supply badges", () => {
  const result = row([
    record({ recordType: "facts", field: "redemption_minimum", id: "cash", value: 100, unit: "SC", method: "cash", comparison: "exact" }),
    record({ recordType: "facts", field: "redemption_minimum", id: "gift", value: 10, unit: "SC", method: "gift_card", comparison: "exact" }),
  ]);
  const minimum = result.presentation.fields.find(field => field.key === "minimum");
  assert.equal(minimum.value.label, "100 SC");
  assert.equal(minimum.gift.label, "10 SC");
  assert.deepEqual(result.rewardTypes, ["Cash prizes", "Gift cards"]);
  const bank = row([record({ recordType: "facts", field: "redemption_time", value: 3,
    unit: "business_days", stage: "transfer", method: "bank", comparison: "up_to" })]);
  assert.deepEqual(bank.rewardTypes, ["Cash prizes"]);
  assert.equal(bank.cash, null);
});

test("value badges ignore prose churn and untrusted historical change dates", () => {
  const previous = stampValueHistory([record({ conditions: ["One reward per person."] })]);
  const same = stampValueHistory([record({ id: "new", conditions: ["Each person can claim once."],
    capturedAt: "2026-09-22T06:00:00Z" })], previous);
  assert.equal(same[0].valueChangedAt, null);
  const changed = stampValueHistory([{ ...same[0], immediateSc: 3 }], same);
  assert.equal(changed[0].valueChangedAt, "2026-09-22T06:00:00Z");
  assert.equal(row(changed).presentation.terms[0].values[0].recentChangeAt, changed[0].valueChangedAt);
  assert.equal(row([record({ lastChangedAt: "2026-09-22T06:00:00Z" })]).presentation.terms[0].values[0].recentChangeAt, null);
  assert.equal(row([record({ valueChangedAt: "2026-09-01T06:00:00Z" })]).presentation.terms[0].values[0].recentChangeAt, null);
  const priced = stampValueHistory([record({ kind: "first_purchase", priceUsd: 20 })]);
  const repriced = stampValueHistory([record({ kind: "first_purchase", priceUsd: 10, capturedAt: "2026-09-22T06:00:00Z" })], priced);
  assert.equal(repriced[0].valueChangedAt, "2026-09-22T06:00:00Z");
});

test("inconsistent first-claim amounts keep the useful daily description instead of picking a number", () => {
  const result = row([1, 0.2].map((value, index) => record({
    id: `daily-${index}`, kind: "recurring_daily", name: "Day 1 reward",
    immediateSc: value, totalSc: null, intervalHours: 24,
    conditions: ["A progressive seven-day streak; rewards increase each day."],
  })));
  assert.equal(result.daily.label, "Increasing daily reward");
  assert.equal(result.sortValues.daily, null);
});

test("typical processing ranges remain comparable and retain their qualifier", () => {
  const result = row([record({ recordType: "facts", field: "redemption_time", value: 3,
    upperValue: 5, comparison: "typical", unit: "business_days", stage: "processing", method: "cash" })]);
  assert.equal(result.redemption.label, "Typically 3-5 business days");
  assert.equal(result.sortValues.redemption, 120);
});
test("post-approval transfers do not displace the separate approval window", () => {
  const result = row([
    record({ id: "transfer", recordType: "facts", field: "redemption_time", value: 1,
      upperValue: 5, comparison: "range", unit: "business_days", stage: "processing",
      method: "bank", basis: "IBT / ACH redemption after approval" }),
    record({ id: "approval", recordType: "facts", field: "redemption_time", value: 24,
      upperValue: 72, comparison: "range", unit: "hours", stage: "approval", method: "general",
      conditions: ["In some cases, approval may take up to 7 days."] }),
  ]);
  assert.equal(result.redemption.label, "24-72 hours");
  assert.equal(result.redemption.stage, "approval");
  assert.equal(result.sortValues.redemption, 72);
  assert.deepEqual(result.redemption.conditions, ["In some cases, approval may take up to 7 days."]);
});
test("a one-request-per-day limit is not processing speed, including retained records", () => {
  for (const freshness of ["captured_unreviewed", "not_reconfirmed"]) {
    const result = row([record({ recordType: "facts", field: "redemption_time", value: 24,
      comparison: "exact", unit: "hours", stage: "processing", method: "unspecified", freshness,
      basis: "one Prize redemption request per Customer Account",
      conditions: ["Only one Prize redemption request is processed per Customer Account in any 24-hour period."] })]);
    assert.equal(result.redemption, null);
    assert.equal(result.sortValues.redemption, null);
  }
  assert.equal(row([record({ recordType: "facts", field: "redemption_time", value: 24,
    comparison: "up_to", unit: "hours", stage: "processing", method: "cash",
    basis: "A redemption request is processed within 24 hours." })]).sortValues.redemption, 24);
});
test("retained post-approval windows cannot be labelled request to receipt", () => {
  for (const basis of [
    "prize or cash after redemption request approval and all verification requirements are satisfied",
    "Prize delivery after the redemption request is approved",
    "Cash delivery after the request has been approved",
  ]) {
    const result = row([record({ recordType: "facts", field: "redemption_time", value: 5,
      comparison: "up_to", unit: "business_days", stage: "end_to_end", method: "cash",
      freshness: "not_reconfirmed", basis })]);
    assert.equal(result.redemption.note, "Delivery after approval; cash");
    assert.equal(result.redemption.status, "retained");
    assert.equal(result.sortValues.redemption, null);
  }
  const complete = row([record({ recordType: "facts", field: "redemption_time", value: 5,
    comparison: "up_to", unit: "business_days", stage: "end_to_end", method: "cash",
    basis: "Full time from request submission to receipt, including approval and bank transfer" })]);
  assert.equal(complete.redemption.note, "Request to receipt; cash");
});

test("one list includes incomplete operators without invented scores", () => {
  const result = model([operator("b", [record({ immediateSc: 1 })]), operator("a", [record({})]),
    operator("c", []), operator("entertainment", [], { productMode: "entertainment_only" })]);
  assert.deepEqual(result.toplist.rows.map(row => row.slug), ["a", "b", "c", "entertainment"]);
  assert.deepEqual(result.toplist.rows.map(row => row.position), [1, 2, 3, 4]);
  assert.equal(result.ranked.length, 0);
  assert.equal(result.toplist.rows[2].welcome, null);
});
test("repeated checks do not change the order or display amounts", () => {
  const input = [operator("a", [record({})]), operator("b", [record({ immediateSc: 1 })])];
  const before = model(input).toplist.rows;
  input.forEach(op => op.records.forEach(r => { r.capturedAt = "2026-09-22T06:00:00Z"; }));
  const after = model(input).toplist.rows;
  assert.deepEqual(before.map(r => [r.slug, r.welcome.label]), after.map(r => [r.slug, r.welcome.label]));
});
test("daily first claims, recurring amounts and paid passes stay distinct", () => {
  assert.equal(row([record({ kind: "recurring_daily", immediateSc: 1, intervalHours: 24 })]).daily.label, "1 SC daily");
  const initial = row([record({ kind: "recurring_daily", immediateSc: 1, conditions: ["First daily claim only"] })]);
  assert.equal(initial.daily.label, "1 SC first claim");
  assert.equal(initial.daily.note, "Later daily amounts unverified");
  assert.equal(row([record({ kind: "paid_pass", intervalHours: 24 })]).daily, null);
  assert.equal(row([record({ kind: "recurring_daily", immediateSc: null, totalSc: null })]).daily.label, "Daily login reward");
});
test("unranked recurring claim timing is not displayed as a first-ever reward", () => {
  const result = row([record({ kind: "recurring_daily", immediateSc: 1,
    conditions: ["Claim once per day on your first daily login.", "Reward varies by day."] })]);
  assert.equal(result.daily.label, "Variable daily reward");
  assert.equal(result.daily.comparable, false);
  assert.equal(result.sortValues.daily, null);
});
test("signup stages, cheap paid packages and cash methods stay explicit", () => {
  const staged = row([record({ immediateSc: 2, totalSc: 5, durationDays: 3 })]).welcome;
  assert.equal(staged.label, "2 SC free");
  assert.equal(staged.note, "5 SC total over 3 days");
  const tasks = row([record({ immediateSc: 1, totalSc: 12, durationDays: 7,
    conditions: ["Make 150 spins to unlock the extra reward"] })]).welcome;
  assert.equal(tasks.note, "Up to 12 SC with 7-day tasks");
  const paid = row([record({ kind: "purchase_package", priceUsd: 4.99, immediateSc: 5 }),
    record({ id: "large", kind: "purchase_package", priceUsd: 499.99, immediateSc: 510 })]);
  assert.equal(paid.welcome.label, "510 SC for $499.99");
  assert.equal(paid.sortValues.welcome, null);
  assert.equal(paid.purchase.priceUsd, 499.99);
  assert.equal(paid.welcome.note, "Regular purchase package");
  const general = row([record({ recordType: "facts", field: "redemption_minimum", value: 50,
    unit: "SC", comparison: "at_least", method: "general" })]);
  assert.equal(general.cash, null);
  assert.equal(general.generalMinimum.label, "50 SC");
});
test("redemption times retain stage, units and standard tier; exclude misleading windows", () => {
  const timing = record({ recordType: "facts", field: "redemption_time", value: 3,
    unit: "business_days", method: "general", stage: "processing", comparison: "up_to",
    basis: "Standard VIP tier processing" });
  assert.equal(row([timing]).redemption.label, "Up to 3 business days");
  assert.equal(row([timing]).redemption.note, "Processing; standard tier");
  for (const change of [
    { stage: "unspecified", basis: "Unspecified redemption window" }, { method: "virtual_card" },
    { method: "gift_card" }, { unit: "months" },
  ]) {
    assert.ok(row([{ ...timing, ...change }]).redemption);
    assert.equal(row([{ ...timing, ...change }]).sortValues.redemption, null);
  }
  for (const change of [
    { basis: "VIP4 processing time" }, { basis: "Verification process after receiving documents" },
    { basis: "Time to provide requested information before automatically declined" },
    { comparison: "range", upperValue: null },
  ]) assert.equal(row([{ ...timing, ...change }]).redemption, null);
});
test("explicit processing basis restores unclassified stages without substituting transfer time", () => {
  const base = record({ recordType: "facts", field: "redemption_time", value: 3,
    unit: "business_days", method: "unspecified", stage: "unspecified", comparison: "up_to",
    basis: "VIP status: Rising, Shooting Star, Blue, Bronze & Silver processing time." });
  const transfer = { ...base, id: "transfer", value: 24, unit: "hours", stage: "transfer",
    basis: "Skrill delivery time.", conditions: ["Up to 24 business hours."] };
  assert.equal(row([base, transfer]).redemption.label, "Up to 3 business days");
  assert.equal(row([base, transfer]).redemption.note, "Processing; Rising-Silver tiers");
  assert.match(row([transfer]).redemption.note, /Delivery after approval/);
  assert.equal(row([transfer]).sortValues.redemption, null);
  const cash = { ...base, method: "cash", comparison: "range", upperValue: 5,
    basis: "Cash prize redemption processing timeline." };
  const generic = { ...cash, id: "generic", method: "general", value: 10, upperValue: null,
    unit: "days_unspecified", comparison: "up_to", basis: "Prize redemption processing time." };
  assert.equal(row([generic, cash]).redemption.label, "3-5 business days");
  assert.equal(row([generic, cash]).redemption.note, "Processing; cash");
});
test("business hours are never labelled ordinary hours", () => {
  const timing = record({ recordType: "facts", field: "redemption_time", value: 24,
    unit: "hours", method: "cash", stage: "processing", comparison: "up_to",
    conditions: ["Within 24 business hours."] });
  assert.equal(row([timing]).redemption.label, "Up to 24 business hours");
});
test("new unknown timings supersede an old numeric promise", () => {
  const timing = record({ recordType: "facts", field: "redemption_time", value: 3,
    unit: "business_days", method: "general", stage: "processing", comparison: "up_to" });
  assert.equal(row([timing, { ...timing, capturedAt: "2026-09-22T06:00:00Z", value: null }]).redemption, null);
});
test("new daily unknown supersedes an old amount, not counted as zero", () => {
  const daily = record({ kind: "recurring_daily", intervalHours: 24 });
  const result = row([daily, { ...daily, capturedAt: "2026-09-22T06:00:00Z", immediateSc: null, totalSc: null }]);
  assert.equal(result.daily.label, "Daily login reward");
  assert.equal(result.sortValues.daily, null);
});

test("default ranks free signup only; completeness is an admission rule", () => {
  const cash = value => record({ id: "cash", recordType: "facts", field: "redemption_minimum",
    method: "cash", comparison: "at_least", value, unit: "SC" });
  const rows = model([
    operator("complete", [record({}), cash(100), record({ id: "daily", kind: "recurring_daily", intervalHours: 24 })]),
    operator("one-strong", [record({ immediateSc: 10, totalSc: 10 })]), operator("unknown", []),
  ]).toplist.rows;
  assert.equal(rows[0].slug, "one-strong");
  assert.equal(rows.find(r => r.slug === "complete").knownAttributeCount, 3);
  assert.equal(orderToplist(rows, "cash")[0].slug, "complete");
  assert.equal(orderToplist(rows, "cash").at(-1).slug, "unknown");
  assert.equal(orderToplist(rows, "cash", "desc").at(-1).slug, "unknown");
  assert.equal(orderToplist(rows)[0].slug, "one-strong");
});
test("daily sort ignores first claims, Gold Coins, and unquantified advertising", () => {
  const rows = model([
    operator("first-only", [record({ kind: "recurring_daily", immediateSc: 50, totalSc: 50, conditions: ["First daily claim only"] })]),
    operator("recurring", [record({ kind: "recurring_daily", immediateSc: 1, totalSc: 1, intervalHours: 24 })]),
    operator("gold", [record({ kind: "recurring_daily", immediateSc: null, totalSc: null, goldCoins: 10000 })]),
  ]).toplist.rows;
  assert.equal(orderToplist(rows, "daily")[0].slug, "recurring");
  for (const slug of ["first-only", "gold"]) assert.equal(rows.find(row => row.slug === slug).knownAttributeCount, 0);
});
test("welcome sorts free SC before priced packages; processing uses bounded upper estimates", () => {
  const rows = model([
    operator("paid", [record({ kind: "first_purchase", priceUsd: 10, immediateSc: 100, totalSc: 100, purchaseRequired: true })]),
    operator("free", [record({ immediateSc: 1, totalSc: 1 })]),
    operator("fast", [record({ recordType: "facts", field: "redemption_time", value: 24,
      unit: "hours", comparison: "up_to", stage: "processing", method: "cash" })]),
    operator("range", [record({ recordType: "facts", field: "redemption_time", value: 1, upperValue: 3,
      unit: "business_days", comparison: "range", stage: "processing", method: "cash" })]),
  ]).toplist.rows;
  assert.equal(orderToplist(rows, "welcome")[0].slug, "free");
  assert.equal(orderToplist(rows, "redemption")[0].slug, "fast");
  assert.equal(rows.find(row => row.slug === "range").sortValues.redemption, 72);
});
test("coverage flags an empty daily column even when all pages were readable", () => {
  const coverage = comparisonCoverage({ operators: [operator("a", [record({})], { collectionStatus: "readable" })] }, []);
  assert.equal(coverage.status, "incomplete");
  assert.equal(coverage.fields.daily, 0);
  assert.ok(coverage.operators[0].missing.includes("daily"));
});
test("history separates first observations, unchanged checks, changes and failures", () => {
  const first = stampValueHistory([record({ freshness: "captured_unreviewed" })]);
  assert.equal(first[0].firstObservedAt, "2026-09-21T06:00:00Z");
  assert.equal(first[0].lastChangedAt, null);
  const repeated = stampValueHistory([record({ id: "new-extractor-id", capturedAt: "2026-09-22T06:00:00Z",
    freshness: "captured_unreviewed" })], first);
  assert.equal(repeated[0].firstObservedAt, first[0].firstObservedAt);
  assert.equal(repeated[0].lastChangedAt, null);
  const changed = stampValueHistory([{ ...repeated[0], immediateSc: 3 }], repeated);
  assert.equal(changed[0].lastChangedAt, "2026-09-22T06:00:00Z");
  const failed = stampValueHistory([{ ...changed[0], freshness: "not_reconfirmed" }], changed);
  assert.equal(failed[0].lastChangedAt, changed[0].lastChangedAt);
  const next = stampValueHistory([{ ...changed[0], capturedAt: "2026-09-23T06:00:00Z" }], changed);
  assert.equal(next[0].lastChangedAt, changed[0].lastChangedAt);
});
test("condition changes and reversions are changes; condition reordering is not", () => {
  const first = stampValueHistory([record({ conditions: ["A", "B"] })]);
  const same = stampValueHistory([record({ id: "next", conditions: ["B", "A"] })], first);
  assert.equal(same[0].lastChangedAt, null);
  const changed = stampValueHistory([record({ conditions: ["C"], capturedAt: "2026-09-22T06:00:00Z" })], first);
  assert.equal(changed[0].lastChangedAt, "2026-09-22T06:00:00Z");
  const reverted = stampValueHistory([record({ conditions: ["A", "B"], capturedAt: "2026-09-23T06:00:00Z" })],
    [...first, ...changed]);
  assert.equal(reverted[0].lastChangedAt, "2026-09-23T06:00:00Z");
});
