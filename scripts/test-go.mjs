import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { load } from "cheerio";

const script = readFileSync("src/assets/go.js", "utf8");
const closed = ["CA", "NY", "CT", "IN", "LA", "ME", "MT", "NV", "NJ", "OK", "TN", "ID", "MI", "WA"];
const destination = "https://example.com/";
function redirect(cookie) {
  let result;
  runInNewContext(script, {
    document: { cookie, querySelector: selector => selector.startsWith("script") ?
      { getAttribute: key => key === "data-go-destination" ? destination : JSON.stringify(closed) } : { textContent: "" } },
    window: { location: { replace: value => { result = value; } } },
  });
  return result;
}

test("visit gate preserves closed states and requires an actual selected state", () => {
  for (const state of closed) assert.equal(redirect(`sci_state=${state}`), "/availability/");
  for (const cookie of ["", "sci_state=__dismissed", "sci_state=ZZ", "sci_state=%E0%A4%A", "sci_state=<script>"]) {
    assert.equal(redirect(cookie), "/availability/");
  }
  for (const state of ["TX", "FL", "DC"]) assert.equal(redirect(`sci_state=${state}`), destination);
});
test("all visit stubs load the valid shared gate or retain availability-only fallback", () => {
  const operators = JSON.parse(readFileSync("src/_data/operators.json"));
  for (const op of operators.filter(op => op.partner)) {
    assert.ok(readdirSync("src/go").includes(op.slug), `Missing partner visit route: ${op.slug}`);
  }
  for (const slug of readdirSync("src/go")) {
    const $ = load(readFileSync(`src/go/${slug}/index.html`, "utf8"));
    assert.equal($('meta[name="robots"]').attr("content"), "noindex, nofollow");
    assert.equal($('meta[http-equiv="refresh"]').attr("content"), "2;url=/availability/");
    const gate = $("script[data-go-destination]");
    if (slug === "sweetsweeps") {
      assert.equal(gate.length, 0);
      continue;
    }
    assert.equal(gate.attr("src"), "/assets/go.js");
    assert.deepEqual(JSON.parse(gate.attr("data-go-closed")), closed);
    assert.equal(new URL(gate.attr("data-go-destination")).protocol, "https:");
    assert.equal($("script:not([src])").length, 0);
  }
});
