import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("../src/assets/analytics.js", import.meta.url), "utf8");

test("loads the production GTM container on every page", () => {
  const scripts = [];
  const window = {};
  const document = {
    createElement: () => ({}),
    head: { appendChild: (script) => scripts.push(script) }
  };

  runInNewContext(source, { window, document, Date });

  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].async, true);
  assert.equal(
    scripts[0].src,
    "https://www.googletagmanager.com/gtm.js?id=GTM-NTLVFVB7"
  );
  assert.equal(window.dataLayer.length, 1);
  assert.equal(window.dataLayer[0].event, "gtm.js");
});
