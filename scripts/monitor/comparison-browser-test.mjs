import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { compareOperators } from "../../src/assets/updates-sort.js";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const output = process.env.SCREENSHOT_DIR || "/tmp/updates-comparison";
await mkdir(output, { recursive: true });
const numeric = JSON.parse(await readFile("src/_data/numeric.json", "utf8"));
const monitor = JSON.parse(await readFile("src/_data/monitor.json", "utf8"));
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
const root = resolve("docs");
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = resolve(root, `.${pathname}${pathname.endsWith("/") ? "index.html" : ""}`);
    assert.ok(file.startsWith(root + "/"));
    response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
const now = Date.now();
const names = numeric.operators.map(op => op.name).sort((a, b) => a.localeCompare(b, "en"));
const order = page => page.locator("tbody[data-operator]").evaluateAll(rows => rows.map(row => JSON.parse(row.dataset.sort).name));
const overflow = async page => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Page overflows");
  assert.deepEqual(await page.locator(".updates-comparison :is(strong, p, button, select, h1, h3, h4, a, .badge):not(.sr-only)").evaluateAll(elements =>
    elements.filter(element => element.getBoundingClientRect().width && element.scrollWidth > element.clientWidth + 2 &&
      getComputedStyle(element).display !== "inline").map(element => element.textContent.slice(0, 80))), [], "Text overflows");
};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.clock.install({ time: now });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}/updates/`);
  await page.locator("#updates-sort:enabled").waitFor();
  assert.deepEqual(await order(page), names);
  assert.equal(await page.locator("details.operator-details").count(), 10);
  for (const operator of numeric.operators) {
    const row = page.locator(`tbody[data-operator="${operator.slug}"]`);
    assert.deepEqual(await row.locator("[data-record-id]").evaluateAll(records => records.map(r => r.dataset.recordId)),
      operator.records.map(record => record.id));
    assert.equal(await row.locator(".source-coverage > li").count(), operator.coverage.length);
    assert.equal(await row.locator(".public-history > li").count(), monitor.events.filter(event => event.operator === operator.slug).length);
    for (const record of operator.records) {
      if (record.sourceUrl) {
        assert.equal(await row.locator(`[data-record-id="${record.id}"] .claim-source a`).getAttribute("href"), record.sourceUrl);
      }
    }
  }
  await overflow(page);
  await page.screenshot({ path: `${output}/desktop-collapsed.png`, fullPage: true });
  for (const slug of ["chumba", "dorados"]) {
    const summary = page.locator(`#${slug} summary`);
    await summary.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(`#${slug} details`).getAttribute("open"), "");
  }
  assert.equal(await page.locator("details[open]").count(), 2);
  await overflow(page);
  await page.locator("#chumba").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/desktop-expanded.png` });
  const data = await page.locator("tbody[data-operator]").evaluateAll(rows => rows.map(row => JSON.parse(row.dataset.sort)));
  for (const key of ["name", "signup", "cash", "purchase", "checked"]) {
    const header = page.locator(`button[data-sort-key="${key}"]`);
    // Start from another column so the first activation consistently selects ascending.
    await page.locator("#updates-sort").selectOption(`${key === "name" ? "cash" : "name"}:asc`);
    for (const direction of ["asc", "desc"]) {
      await header.focus();
      await page.keyboard.press("Enter");
      const expected = [...data].sort((a, b) => compareOperators(a, b, key, direction, now)).map(row => row.name);
      assert.deepEqual(await order(page), expected);
      assert.equal(await header.evaluate(element => element.parentElement.getAttribute("aria-sort")), direction === "asc" ? "ascending" : "descending");
      assert.equal(await page.locator("#updates-sort").inputValue(), `${key}:${direction}`);
      assert.equal(await page.locator("details[open]").count(), 2);
    }
  }
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator("#updates-sort").selectOption("name:asc");
    await overflow(page);
    if (width < 768) {
      for (const key of ["name", "signup", "cash", "purchase", "checked"]) {
        for (const direction of ["asc", "desc"]) {
          await page.locator("#updates-sort").selectOption(`${key}:${direction}`);
          assert.deepEqual(await order(page), [...data].sort((a, b) => compareOperators(a, b, key, direction, now)).map(row => row.name));
        }
      }
      await page.locator("#updates-sort").selectOption("name:asc");
      assert.equal(await page.locator("#chumba .mobile-values > span").count(), 4);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${output}/viewport-${width}.png` });
  }
  const refresh = Date.parse(numeric.lastSuccessfulRefresh);
  await page.clock.setFixedTime(refresh + 36 * 60 * 60 * 1000);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  assert.equal(await page.locator("#refresh-warning").isVisible(), false);
  await page.clock.setFixedTime(refresh + 36 * 60 * 60 * 1000 + 1);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  assert.equal(await page.locator("#refresh-warning").isVisible(), true);
  await page.clock.setFixedTime(refresh + 72 * 60 * 60 * 1000);
  await page.locator("#updates-sort").selectOption("signup:desc");
  assert.deepEqual(await order(page), names, "Expired amounts must not determine sort order");
  for (const path of ["updates/numeric.json", "updates/data.json"]) {
    const response = await page.request.get(`${base}/${path}`);
    assert.equal(response.status(), 200);
    assert.deepEqual(await response.json(), JSON.parse(execFileSync("git", ["show", `HEAD:docs/${path}`], { encoding: "utf8" })));
  }
  assert.deepEqual(errors, []);
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const staticPage = await noJs.newPage();
  await staticPage.goto(`${base}/updates/`);
  assert.equal(await staticPage.locator("#updates-sort").isDisabled(), true);
  for (const slug of ["chumba", "dorados"]) {
    await staticPage.locator(`#${slug} summary`).focus();
    await staticPage.keyboard.press("Space");
    assert.equal(await staticPage.locator(`#${slug} details`).getAttribute("open"), "");
    await staticPage.locator(`#${slug} .collapse-content`).waitFor({ state: "visible" });
  }
  assert.equal(await staticPage.locator("details[open]").count(), 2);
  await overflow(staticPage);
  await staticPage.locator("#chumba summary").focus();
  await staticPage.screenshot({ path: `${output}/mobile-no-js-expanded.png` });
  console.log(`PASS: 10 operators; ${numeric.operators.reduce((sum, op) => sum + op.records.length, 0)} static claims; coverage/history; all sort directions; keyboard; multiple expansions; 320/390/768/1024/1440 layouts; no JS; export equality; 36-hour warning. Screenshots: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
