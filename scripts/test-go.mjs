import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { load } from "cheerio";
import nunjucks from "nunjucks";
import visits from "../src/_data/visits.js";
import { visitRoutes } from "./visit-routes.mjs";

const script = readFileSync("src/assets/go.js", "utf8");
const closed = ["CA", "NY", "CT", "IN", "LA", "ME", "MT", "NV", "NJ", "OK", "TN", "ID", "MI", "WA"];
const destination = "https://example.com/";
function redirect(cookie, exclusions = closed) {
  let result;
  runInNewContext(script, {
    document: { cookie, querySelector: selector => selector.startsWith("script") ?
      { getAttribute: key => key === "data-go-destination" ? destination : JSON.stringify(exclusions) } : { textContent: "" } },
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
  const env = new nunjucks.Environment();
  env.addFilter("json", JSON.stringify);
  const template = readFileSync("src/go/operator.njk", "utf8").replace(/^---[\s\S]*?---/, "");
  const routes = visits();
  assert.equal(routes.length, JSON.parse(readFileSync("src/_data/operators.json")).length);
  for (const visit of routes) {
    const $ = load(env.renderString(template, { visit }));
    assert.equal($('meta[name="robots"]').attr("content"), "noindex, nofollow");
    assert.equal($('meta[http-equiv="refresh"]').attr("content"), "2;url=/availability/");
    const gate = $("script[data-go-destination]");
    if (visit.slug === "sweetsweeps") {
      assert.equal(gate.length, 0);
      continue;
    }
    assert.equal(gate.attr("src"), "/assets/go.js");
    for (const state of closed) assert.ok(JSON.parse(gate.attr("data-go-closed")).includes(state));
    assert.equal(new URL(gate.attr("data-go-destination")).protocol, "https:");
    assert.equal($("script:not([src])").length, 0);
  }
});
test("visit routes preserve operator-specific exclusions and reject unsafe destinations", () => {
  const [visit] = visitRoutes([{ slug: "test", visitDestination: destination, restrictedStates: ["DE"] }]);
  assert.equal(redirect("sci_state=DE", visit.closed), "/availability/");
  assert.equal(redirect("sci_state=TX", visit.closed), destination);
  for (const value of ["javascript:alert(1)", "http://example.com", "https://user:pass@example.com"])
    assert.throws(() => visitRoutes([{ slug: "test", visitDestination: value }]));
});
