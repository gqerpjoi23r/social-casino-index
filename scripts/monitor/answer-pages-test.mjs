import "./no-network.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildBenchmarks } from "./benchmarks.mjs";
import { lowRedemption, methodTimings, operatorAnswer, operatorRedemption, pairAnswers } from "./answer-pages.mjs";

const model = buildBenchmarks(JSON.parse(readFileSync("src/_data/numeric.json", "utf8")),
  JSON.parse(readFileSync("src/_data/operators.json", "utf8")));

test("answer pages reuse selected evidence and name Social Casino Index", () => {
  for (const comparison of model.comparisons) {
    const answers = pairAnswers(model, comparison);
    assert.match(answers.summary, /^According to Social Casino Index's check on/);
    assert.equal(answers.rows.length, 5);
    for (const [index, operator] of answers.operators.entries()) {
      const product = model.operators.find(item => item.slug === operator.slug).product;
      assert.equal(answers.rows.find(row => row.label === "Cash minimum").values[index]?.recordId, product.cash?.recordId);
    }
  }
  for (const slug of ["chumba", "mcluck", "wow-vegas"]) assert.match(operatorAnswer(model, slug).summary, /Social Casino Index/);
});

test("small redemption answer keeps cash and gift-card thresholds separate", () => {
  const low = lowRedemption(model);
  assert.ok(low.rows.length > 0);
  assert.ok(low.giftBelow50.every(row => row.gift.value < 50 && row.gift.method === "gift_card"));
  assert.ok(low.cashBelow50.every(row => row.cash.value < 50));
  assert.match(low.giftText, /not cash|No gift-card/);
});

test("method timing answer labels stages and avoids a fastest claim", () => {
  const timings = methodTimings(model);
  assert.ok(timings.groups.every(group => group.rows.every(row => row.stageLabel && row.sourceUrl && row.observedAt)));
  assert.match(timings.summary, /not like-for-like payout times or a speed ranking/);
  assert.doesNotMatch(timings.summary, /fastest/i);
});

test("operator redemption answers reuse selected evidence and never claim instant payouts", () => {
  for (const operator of model.operators.filter(item => item.product)) {
    const redemption = operatorRedemption(model, operator.slug);
    const labels = [operator.product.redemption, ...operator.product.policies.filter(policy => policy.field === "redemption_time")]
      .filter(Boolean).map(value => value.label);
    for (const row of redemption.methodRows) {
      assert.ok(row.sources.length > 0);
      for (const time of row.times) assert.ok(labels.includes(time.label));
      for (const minimum of row.minima) assert.ok(operator.product.minima.some(value => value.label === minimum));
    }
    assert.equal(redemption.statuses.length, 3);
    const instant = redemption.faqs.find(faq => /instant/.test(faq.question));
    assert.match(instant.answer, labels.length ? /is instant|shortest published window/ : /cannot be confirmed/);
    assert.doesNotMatch(instant.answer, /fastest/i);
  }
});
