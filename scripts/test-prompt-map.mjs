import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePromptMap } from "./validate-prompt-map.mjs";

const row = target => `| 45b | preserved prompt | ${target} | HOW | P1 |`;
test("valid page and fragment targets pass", () => {
  assert.deepEqual(validatePromptMap(row("/guide/#steps"), () => '<h2 id="steps">Steps</h2>'), { errors: [], targets: 1 });
});
test("missing pages and fragments fail", () => {
  assert.match(validatePromptMap(row("/missing/"), () => null).errors[0], /Missing page/);
  assert.match(validatePromptMap(row("/guide/#absent"), () => "<main></main>").errors[0], /Missing fragment/);
});
test("multiple, external and empty targets fail", () => {
  for (const target of ["/one/ + /two/", "https://example.com/", "//example.com/"]) {
    assert.equal(validatePromptMap(row(target), () => "").errors.length, 1);
  }
  assert.equal(validatePromptMap("# Empty", () => "").errors.length, 1);
});
