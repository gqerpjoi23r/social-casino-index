import test from "node:test";
import assert from "node:assert/strict";
import { readableText, accessStatus, extract, validQuotes, aggregate } from "./core.mjs";
import { Budget } from "./providers.mjs";

const operator = { slug: "fixture", name: "Fixture", playerValue: { productMode: "sweepstakes" } };
const text = "The minimum redemption is 50 SC for eligible players.\nClaim your daily reward of 0.5 SC every day.\nIdentity verification requires government photo identification.";
const source = { id: "rules", url: "https://example.com/rules", status: "ok", fields: extract(text) };
test("semantic passages survive changed wrappers and classes", () => {
  const a = readableText(`<main><p>${text.replaceAll("\n", "</p><p>")}</p></main>`);
  const b = readableText(`<article class="changed"><div>${text.replaceAll("\n", "</div><div>")}</div></article>`);
  assert.deepEqual(extract(a), extract(b));
  assert.ok(extract(a).minimum.length);
  assert.ok(extract(a).verification.length);
});
test("welcome rewards are not recurring daily rewards", () => {
  assert.equal(extract("Welcome reward: claim 1 SC daily for the first three days.").daily.length, 0);
});
test("untrusted model output must be an exact source passage", () => {
  assert.equal(validQuotes(text, { minimum: ["The minimum redemption is 100 SC for eligible players."] }).minimum.length, 0);
});
test("block pages and login redirects are not observations", () => {
  assert.equal(accessStatus("Please verify you are human"), "blocked");
  assert.equal(accessStatus(text, "https://example.com/login"), "login_required");
  assert.equal(accessStatus(text, "", 500), "http_error");
});
test("baseline, repeat, change and failed-source retention", () => {
  const first = aggregate(operator, [source], null, "2026-09-10T01:00:00Z");
  assert.ok(first.events.every(e => e.type === "baseline"));
  assert.equal(aggregate(operator, [source], first.record, "2026-09-10T02:00:00Z").events.length, 0);
  const changed = { ...source, fields: extract(text.replace("50 SC", "100 SC")) };
  assert.ok(aggregate(operator, [changed], first.record, "2026-09-10T03:00:00Z").events.some(e => e.type === "source_wording_changed"));
  const failed = aggregate(operator, [{ ...source, status: "blocked" }], first.record, "2026-09-10T04:00:00Z");
  assert.equal(failed.record.fields.minimum.status, "stale");
  assert.deepEqual(failed.record.fields.minimum.quotes, first.record.fields.minimum.quotes);
  assert.equal(failed.events.length, 0);
});
test("paid calls have a hard request cap and reservation allowance", () => {
  const budget = new Budget([], "2026-09-10");
  for (let i = 0; i < 35; i++) assert.equal(budget.reserve("firecrawl", 0.1), true);
  assert.equal(budget.reserve("firecrawl", 0.1), false);
  assert.equal(budget.reserve("model", undefined), false);
});
