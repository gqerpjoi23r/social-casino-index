import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { displayRecord } from "../../src/updates/display.js";

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
