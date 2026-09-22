import "./no-network.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { buildBenchmarks } from "./benchmarks.mjs";
import { stampValueHistory } from "./value-history.mjs";
import { orderToplist } from "../../src/assets/toplist-order.js";
import { comparisonCoverage } from "./coverage.mjs";

const now = Date.parse("2026-09-22T12:00:00Z");
const record = change => ({ id: "record", sourceId: "home", sourceUrl: "https://example.com/",
  recordType: "offers", kind: "signup", capturedAt: "2026-09-21T06:00:00Z",
  immediateSc: 2, totalSc: 2, purchaseRequired: false, conditions: [], ...change });
const operator = (slug, records, change = {}) => ({ slug, name: slug, productMode: "sweepstakes",
  records, ...change });
const model = operators => buildBenchmarks({ operators }, [], now);
const row = records => model([operator("a", records)]).toplist.rows[0];

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
  assert.equal(row([record({ kind: "recurring_daily", immediateSc: null, totalSc: null })]).daily.label, "Amount not verified");
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
  assert.equal(paid.welcome.label, "5 SC for $4.99");
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
    { stage: "unspecified", basis: "Unspecified redemption window" }, { method: "virtual_card" }, { method: "gift_card" },
    { basis: "VIP4 processing time" }, { basis: "Verification process after receiving documents" },
    { basis: "Time to provide requested information before automatically declined" },
    { unit: "months" }, { comparison: "range", upperValue: null },
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
  assert.equal(row([transfer]).redemption, null);
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
  assert.equal(result.daily.label, "Amount not verified");
  assert.equal(result.sortValues.daily, null);
});

test("default promotes completeness, but a single strong attribute wins its own sort", () => {
  const cash = value => record({ id: "cash", recordType: "facts", field: "redemption_minimum",
    method: "cash", comparison: "at_least", value, unit: "SC" });
  const rows = model([
    operator("complete", [record({}), cash(100), record({ id: "daily", kind: "recurring_daily", intervalHours: 24 })]),
    operator("one-strong", [cash(10)]), operator("unknown", []),
  ]).toplist.rows;
  assert.equal(rows[0].slug, "complete");
  assert.equal(rows[0].knownAttributeCount, 3);
  assert.equal(orderToplist(rows, "cash")[0].slug, "one-strong");
  assert.equal(orderToplist(rows, "cash").at(-1).slug, "unknown");
  assert.equal(orderToplist(rows, "cash", "desc").at(-1).slug, "unknown");
  assert.equal(orderToplist(rows, "default")[0].slug, "complete");
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
