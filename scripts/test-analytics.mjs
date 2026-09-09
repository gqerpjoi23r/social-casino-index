import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("../src/assets/analytics.js", import.meta.url), "utf8");
function setup(saved, storageBlocked = false) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, textContent: "", focus() {},
      addEventListener(_, handler) { this.click = handler; },
      getAttribute() { return id; }
    });
    return elements.get(id);
  };
  const scripts = [];
  const storage = new Map(saved ? [["sci_analytics_consent", JSON.stringify(saved)]] : []);
  let reloads = 0;
  const window = {};
  const document = {
    cookie: "_ga=123; _ga_E3Y4MKKS6Q=456",
    getElementById: element,
    querySelectorAll: () => [element("granted"), element("denied")],
    createElement: () => ({}),
    head: { appendChild: (script) => scripts.push(script) }
  };
  runInNewContext(source, {
    window, document, Date,
    location: { hostname: "socialcasinoindex.com", reload() { reloads++; } },
    localStorage: {
      getItem: (key) => { if (storageBlocked) throw Error(); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (storageBlocked) throw Error(); storage.set(key, value); }
    }
  });
  return { window, scripts, element, storage, reloads: () => reloads };
}
test("no Google loader before consent or after rejection", () => {
  const page = setup();
  assert.equal(page.scripts.length, 0);
  assert.equal(page.element("analytics-consent").hidden, false);
  page.element("denied").click();
  assert.equal(page.scripts.length, 0);
  assert.equal(JSON.parse(page.storage.get("sci_analytics_consent")).value, "denied");
});
test("accept loads GTM once; withdrawal disables GA and reloads", () => {
  const page = setup();
  page.element("granted").click();
  page.element("granted").click();
  assert.equal(page.scripts.length, 1);
  assert.match(page.scripts[0].src, /GTM-NTLVFVB7$/);
  assert.equal(page.window.dataLayer[0][2].analytics_storage, "denied");
  assert.equal(page.window.dataLayer[0][2].ad_storage, "denied");
  assert.equal(page.window.dataLayer[2][2].analytics_storage, "granted");
  page.element("denied").click();
  assert.equal(page.window["ga-disable-G-E3Y4MKKS6Q"], true);
  assert.equal(page.reloads(), 1);
});
test("remembered consent, expiry, denied choice and blocked storage", () => {
  assert.equal(setup({ value: "granted", expires: Date.now() + 10000 }).scripts.length, 1);
  assert.equal(setup({ value: "denied", expires: Date.now() + 10000 }).scripts.length, 0);
  assert.equal(setup({ value: "granted", expires: 1 }).scripts.length, 0);
  const page = setup(null, true);
  assert.equal(page.scripts.length, 0);
  page.element("granted").click();
  assert.equal(page.scripts.length, 1);
});
