import test from "node:test";
import assert from "node:assert/strict";
import { fixture, evaluate, scoreCase } from "./benchmark.mjs";
import { FIELDS } from "./core.mjs";

const empty = () => Object.fromEntries(Object.keys(FIELDS).map(key => [key, []]));
test("benchmark covers ten operators with unique IDs", () => {
  assert.equal(new Set(fixture.cases.map(item => item.operator)).size, 10);
  assert.equal(new Set(fixture.cases.map(item => item.id)).size, fixture.cases.length);
  assert.equal(evaluate().total, 12);
});
test("unsupported model evidence is counted, not filtered away", () => {
  const output = empty();
  output.verification = ["A passport is always required before any purchase can be completed."];
  assert.equal(scoreCase(fixture.cases[0], output).unsupported, 1);
});
test("exact quotation can still be assigned to the wrong topic", () => {
  const item = fixture.cases.find(item => item.id === "yay-daily-cap");
  const output = empty();
  output.daily = [item.text];
  const result = scoreCase(item, output);
  assert.equal(result.fp, 1);
  assert.equal(result.fn, 1);
  assert.equal(result.unsupported, 0);
  assert.equal(result.pass, false);
});
test("missing qualifiers fail even with correct topic", () => {
  const output = empty();
  output.verification = ["photo identification, such as a government issued passport"];
  const result = scoreCase(fixture.cases[0], output);
  assert.equal(result.tp, 1);
  assert.equal(result.retained, 0);
  assert.equal(result.pass, false);
});
test("reject incomplete responses and invalid schemas", () => {
  assert.throws(() => evaluate({}));
  assert.throws(() => scoreCase(fixture.cases[0], {}));
  assert.throws(() => scoreCase(fixture.cases[0], { ...empty(), invented: [] }));
});
