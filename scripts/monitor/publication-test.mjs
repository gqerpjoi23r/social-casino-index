import test from "node:test";
import assert from "node:assert/strict";
import { productionRun, publicNumeric } from "./publication-core.mjs";

const operators = Array.from({ length: 10 }, (_, index) => ({
  slug: `operator-${index}`, name: `Operator ${index}`, playerValue: { productMode: "sweepstakes" },
}));
const page = { operatorId: "operator-0", sourceId: "terms", textHash: "hash",
  capturedAt: "2026-09-11T06:20:00Z", status: "ok" };
const manifest = { runId: "production-test", scope: "production",
  startedAt: "2026-09-11T06:17:00Z", completedAt: "2026-09-11T06:21:00Z",
  sources: operators.map(operator => ({ operatorId: operator.slug, id: "terms",
    url: "https://example.com/terms", purpose: "terms", status: "ok" })) };
const claim = { id: "minimum", sourceId: "terms", textHash: "hash", recordType: "facts",
  field: "redemptionMinimum", value: 50, unit: "SC", conditions: ["cash only"],
  quote: "Cash redemptions require 50 SC.", capturedAt: "2026-09-10T06:20:00Z" };
const reviewed = { operators: [{ slug: "operator-0", records: [claim] }] };
const extract = record => ({ operators: [{ slug: "operator-0", facts: [record] }] });
const publish = (reference = reviewed, pages = [page], previous = null, extracted = null) =>
  publicNumeric(operators, reference, manifest, pages, previous, extracted);

test("publication also qualifies old banner records retained after a failed collection", () => {
  const banner = { ...claim, recordType: "offers", kind: "signup", immediateSc: 40, totalSc: 40,
    purchaseRequired: false, conditions: ["Sign up now to get FREE SC 40 + Chance to Win 200 FREE SC"] };
  const previous = { operators: [{ slug: "operator-0", records: [banner] }] };
  const record = publish({ operators: [] }, [], previous).operators[0].records[0];
  assert.equal(record.kind, "promotion");
  assert.equal(record.immediateSc, null);
  assert.equal(record.purchaseRequired, null);
  assert.equal(record.capturedAt, banner.capturedAt);
  assert.equal(banner.kind, "signup");
});

test("publication repairs explicit allocations from an older private baseline before sanitizing", () => {
  const offer = { id: "instant", sourceId: "terms", textHash: "hash", kind: "first_purchase",
    priceUsd: 10, immediateSc: null, totalSc: 30, purchaseRequired: true, durationDays: null,
    quote: "Buy 30 SC for $10. Instant coin delivery.", conditions: ["First purchase only."],
    capturedAt: page.capturedAt };
  const extracted = { operators: [{ slug: "operator-0", offers: [offer] }] };
  const first = publish({ operators: [] }, [page], null, extracted);
  const second = publish({ operators: [] }, [], first, extracted);
  for (const result of [first, second]) {
    const record = result.operators[0].records.find(record => record.id === offer.id);
    assert.equal(record.immediateSc, 30);
    assert.equal(record.quote, undefined);
    assert.equal(record.capturedAt, offer.capturedAt);
  }
  assert.equal(offer.immediateSc, null);
});

test("all ten operators remain public during partial collection and model failure", () => {
  const result = publish();
  assert.equal(result.operators.length, 10);
  assert.equal(result.operators[1].collectionStatus, "unavailable");
  assert.equal(result.operators[0].records[0].freshness, "reconfirmed");
});

test("disclosure findings require reviewed source hashes and retain their dates after failed collection", () => {
  const reviews = [{ operatorId: "operator-0", metric: "purchase", status: "not_disclosed",
    reviewedAt: "2026-09-10", checklistComplete: true,
    sources: [{ id: "terms", url: "https://example.com/terms", textHash: "hash" }] }];
  const first = publicNumeric(operators, reviewed, manifest, [page], null, null, null, [], reviews);
  assert.equal(first.operators[0].disclosureReviews.purchase.valid, true);
  const failed = publicNumeric(operators, reviewed, manifest, [], first, null, null, [], reviews);
  assert.equal(failed.operators[0].disclosureReviews.purchase.valid, true);
  assert.equal(failed.operators[0].disclosureReviews.purchase.reviewedAt, "2026-09-10");
  const changed = publicNumeric(operators, reviewed, manifest, [{ ...page, textHash: "new" }], first, null, null, [], reviews);
  assert.equal(changed.operators[0].disclosureReviews.purchase.valid, false);
  const unreviewed = publicNumeric(operators, reviewed, manifest, [], null, null, null, [], reviews);
  assert.equal(unreviewed.operators[0].disclosureReviews.purchase.valid, false);
});

test("unchanged evidence suppresses only the identical reviewed claim", () => {
  assert.equal(publish(reviewed, [page], null, extract(claim)).operators[0].records.length, 1);
});

test("changed conditions or numeric meaning cannot inherit a reviewed identity", () => {
  for (const change of [{ conditions: ["gift card only"] }, { value: 20 }, { unit: "GC" },
    { goldCoins: 5000 }, { totalSc: 20 }, { advertisedDiscountPercent: 67 }, { method: "gift_card" },
    { states: ["Florida"] }, { basis: "purchase only" }, { promoCode: "NEW" }]) {
    const records = publish(reviewed, [page], null, extract({ ...claim, ...change })).operators[0].records;
    assert.equal(records.length, 2);
    assert.equal(records[1].reviewStatus, "automated_unreviewed");
    assert.equal(records[0].freshness, "not_reconfirmed");
    assert.notEqual(records[0].id, records[1].id);
  }
});

test("corrupt operator captures block only affected records and preserve collection status", () => {
  const result = publicNumeric(operators, reviewed, manifest, [page,
    { ...page, operatorId: "operator-1" }], null, extract(claim), null, ["operator-0"]);
  assert.equal(result.operators[0].collectionStatus, "archive_corrupt");
  assert.equal(result.operators[0].records[0].freshness, "not_reconfirmed");
  assert.equal(result.operators[0].records.length, 1);
  assert.equal(result.operators[1].collectionStatus, "readable");
});

test("model failures publish fallback records and explicit extraction status", () => {
  const result = publicNumeric(operators, { operators: [] }, manifest, [page], null, extract(claim),
    { operators: [{ operator: "operator-0", modelStatus: "model_http_500" }] });
  assert.equal(result.operators[0].records[0].reviewStatus, "automated_unreviewed");
  assert.equal(result.operators[0].extractionStatus, "model_http_500");
});

test("fresh validated claims publish without human approval and without quotes", () => {
  const record = publish({ operators: [] }, [page], null, extract(claim)).operators[0].records[0];
  assert.equal(record.reviewStatus, "automated_unreviewed");
  assert.equal(record.freshness, "captured_unreviewed");
  assert.equal("quote" in record, false);
  assert.equal("textHash" in record, false);
});

test("failed or changed captures retain dated reviewed values without reconfirmation", () => {
  for (const pages of [[], [{ ...page, textHash: "changed" }], [{ ...page, status: "blocked" }]]) {
    const record = publish(reviewed, pages).operators[0].records[0];
    assert.equal(record.freshness, "not_reconfirmed");
    assert.equal(record.lastConfirmedAt, claim.capturedAt);
  }
});

test("conflicting reviewed records remain unresolved", () => {
  const reference = { operators: [{ slug: "operator-0", records: [{ ...claim, conflict: true }] }] };
  assert.equal(publish(reference).operators[0].records[0].reviewStatus, "unresolved");
});

test("branch and archive-only runs cannot publish or advance production", () => {
  assert.equal(productionRun(manifest, { GITHUB_REF: "refs/heads/main" }), true);
  assert.equal(productionRun(manifest, { GITHUB_REF: "refs/heads/main",
    MONITOR_OPERATORS_FILE: "data/monitor/candidates.json" }), false);
  assert.equal(productionRun(manifest, { GITHUB_REF: "refs/heads/feature" }), false);
  assert.equal(productionRun(manifest, { GITHUB_REF: "refs/heads/main", ARCHIVE_RUN_ID: "old" }), false);
  assert.equal(productionRun({ ...manifest, scope: "branch" }, { GITHUB_REF: "refs/heads/main" }), false);
  assert.equal(productionRun({ ...manifest, reextractedFrom: "old" }, { GITHUB_REF: "refs/heads/main" }), false);
});
