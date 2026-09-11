import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRecords } from "./review-core.mjs";

const record = { id: "one", recordType: "facts", field: "redemption_minimum",
  value: 50, unit: "SC", method: "cash", conditions: ["Verified account"] };

test("review evaluation deduplicates equivalent claims across sources", () => {
  const result = evaluateRecords([record, { ...record, id: "two", sourceId: "other" }], [record]);
  assert.equal(result.emitted, 1);
  assert.equal(result.precision, 1);
  assert.equal(result.recall, 1);
});

test("wrong units, conditions, timing and values are incorrect and omitted", () => {
  for (const patch of [{ unit: "USD" }, { conditions: [] }, { timing: "staged" }, { value: 20 }]) {
    const result = evaluateRecords([{ ...record, ...patch }], [record]);
    assert.equal(result.incorrect.length, 1);
    assert.equal(result.omissions.length, 1);
  }
});

test("conflicting supported values remain separate reference fields", () => {
  const result = evaluateRecords([record], [record, { ...record, id: "conflict", value: 100 }]);
  assert.equal(result.reference, 2);
  assert.equal(result.recall, 0.5);
});
