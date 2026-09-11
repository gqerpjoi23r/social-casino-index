import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { load } from "cheerio";
import { compareOperators, eligibleSorts, defaultOrder } from "../../src/assets/comparison-order.js";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const output = process.env.SCREENSHOT_DIR || "/tmp/compact-comparison";
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
const cards = page => page.locator("[data-comparison] > [data-operator]");
const order = page => cards(page).evaluateAll(rows => rows.map(row => JSON.parse(row.dataset.sort).name));
const overflow = async page => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Page overflows");
  assert.deepEqual(await page.locator(".compact-comparison :is(strong, p, summary, h3, h4, a, .term-note):not(.sr-only):not(:has(.term-symbol))").evaluateAll(elements =>
    elements.filter(element => element.getBoundingClientRect().width && element.scrollWidth > element.clientWidth + 2 &&
      getComputedStyle(element).display !== "inline").map(element => element.textContent.slice(0, 80))), [], "Text overflows");
};
async function expand(page) {
  for (const slug of ["chumba", "dorados"]) {
    await page.locator(`#${slug} > details > summary`).focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(`#${slug} > details`).getAttribute("open"), "");
  }
  assert.equal(await page.locator("details.operator-details[open]").count(), 2);
}

try {
  for (const path of ["/", "/updates/"]) {
    const label = path === "/" ? "home" : "updates";
    const html = await readFile(`docs/${path === "/" ? "" : "updates/"}index.html`, "utf8");
    const $ = load(html);
    const data = $("[data-operator]").toArray().map(element => JSON.parse($(element).attr("data-sort")));
    const options = eligibleSorts(data, now);
    assert.equal(data.length, 10);
    assert.deepEqual(data.map(row => row.name), defaultOrder([...data], now).map(row => row.name), "Static default order");
    assert.equal($(".compact-comparison table").length, 0);
    assert.equal($(".compact-comparison .badge").length, 0);
    assert.equal($(".compact-comparison .value-group").length, 30);
    assert.equal($(".entertainment-label").text().trim(), "Entertainment only");
    assert.equal($(".comparison-source-details").length, 1);
    assert.doesNotMatch(html, /Automated · unreviewed|s3:\/\/|\.monitor\/|evidenceQuote|captureHash|api[_-]?key/i);
    for (const operator of numeric.operators) {
      const card = $(`[data-operator="${operator.slug}"]`);
      assert.deepEqual(card.find("[data-record-id]").toArray().map(el => $(el).attr("data-record-id")),
        operator.records.map(record => record.id));
      assert.deepEqual(JSON.parse(card.find(".record-metadata").text()), operator.records, "Every public field retained");
      assert.equal(card.find(".source-coverage > li").length, operator.coverage.length);
      assert.equal(card.find(".public-history > li").length, monitor.events.filter(event => event.operator === operator.slug).length);
      assert.equal(card.find("h3 a").attr("href"), `/redemption-times/${operator.slug}/`);
      for (const record of operator.records) {
        if (record.sourceUrl) assert.equal(card.find(`[data-record-id="${record.id}"] .claim-source a`).attr("href"), record.sourceUrl);
        for (const condition of record.conditions || []) assert.ok(card.find(".public-claims").text().includes(condition));
      }
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await page.clock.install({ time: now });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}${path}`);
    await page.locator("#updates-sort-status").filter({ hasText: /Sorted|Alphabetical/ }).waitFor({ state: "attached" });
    assert.deepEqual(await order(page), data.map(row => row.name));
    assert.deepEqual(await page.locator("#updates-sort option").evaluateAll(items => items.map(item => item.value)), options.map(item => item.key));
    await overflow(page);
    await page.screenshot({ path: `${output}/${label}-desktop.png`, fullPage: true });
    const images = await page.locator(".operator-favicon").evaluateAll(images => images.map(image => ({ src: image.src, loaded: image.complete && image.naturalWidth > 0 })));
    assert.ok(images.every(image => image.loaded), JSON.stringify(images));
    await expand(page);
    for (const option of options) {
      await page.locator("#updates-sort").selectOption(option.key);
      assert.deepEqual(await order(page), [...data].sort((a, b) => compareOperators(a, b, option.key, option.direction, now)).map(row => row.name));
      assert.equal(await page.locator("details.operator-details[open]").count(), 2);
    }
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await overflow(page);
      const symbol = page.locator("#chumba .term-symbol").first();
      await symbol.focus();
      assert.ok(await symbol.getAttribute("aria-label"));
      assert.equal(await symbol.locator(".term-tooltip").isVisible(), true);
      const tip = await symbol.locator(".term-tooltip").boundingBox();
      assert.ok(tip.x >= 0 && tip.x + tip.width <= width, "Tooltip stays inside viewport");
      await overflow(page);
      await page.locator("#chumba > details > summary").focus();
      if (width === 390 || width === 1440) {
        await page.screenshot({ path: `${output}/${label}-${width}-expanded.png` });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("details.operator-details[open] > summary").evaluateAll(items => items.forEach(item => item.click()));
    await page.locator("#wow-vegas").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${label}-mobile-offer.png` });
    const symbol = page.locator("#wow-vegas .term-symbol").first();
    await symbol.hover();
    assert.equal(await symbol.locator(".term-tooltip").isVisible(), true);
    await overflow(page);
    const refresh = Date.parse(numeric.lastSuccessfulRefresh);
    await page.clock.setFixedTime(refresh + 36 * 60 * 60 * 1000);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    assert.equal(await page.locator("#refresh-warning").isVisible(), false);
    await page.clock.setFixedTime(refresh + 36 * 60 * 60 * 1000 + 1);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    assert.equal(await page.locator("#refresh-warning").isVisible(), true);
    await page.clock.setFixedTime(refresh + 72 * 60 * 60 * 1000);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    assert.deepEqual(await order(page), names);
    assert.equal(await page.locator(".sort-control").isVisible(), false);
    assert.equal(await page.locator("[data-valid-until]").count(), 0);
    assert.deepEqual(errors, []);
    await context.close();

    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const staticPage = await noJs.newPage();
    await staticPage.goto(`${base}${path}`);
    assert.deepEqual(await order(staticPage), data.map(row => row.name));
    assert.equal(await staticPage.locator(".sort-control").isVisible(), false);
    await expand(staticPage);
    await staticPage.locator("#chumba .collection-details > summary").focus();
    await staticPage.keyboard.press("Space");
    assert.equal(await staticPage.locator("#chumba .record-metadata").isVisible(), true);
    await overflow(staticPage);
    await staticPage.screenshot({ path: `${output}/${label}-no-js.png` });
    await noJs.close();

    // Exercise all options and timed fallbacks without modifying production snapshots.
    const synthetic = load(html);
    const fixture = data.map((row, index) => {
      const field = (sortValue, hours) => ({ sortValue, unit: "SC", validUntil: now + hours * 3600000 });
      return { name: row.name, signup: field(index < 3 ? [2, 5, 2][index] : null, 1),
        gift: field(index < 3 ? [20, 10, 10][index] : null, 2),
        cash: field(index < 3 ? [100, 50, 50][index] : null, 3) };
    });
    synthetic("[data-operator]").each((index, element) => synthetic(element).attr("data-sort", JSON.stringify(fixture[index])));
    const testContext = await browser.newContext();
    const testPage = await testContext.newPage();
    await testPage.clock.install({ time: now });
    await testPage.route(`${base}${path}`, route => route.fulfill({ contentType: "text/html", body: synthetic.html() }));
    await testPage.goto(`${base}${path}`);
    await testPage.locator("#updates-sort:enabled").waitFor();
    await expand(testPage);
    for (const sort of eligibleSorts(fixture, now)) {
      await testPage.locator("#updates-sort").selectOption(sort.key);
      assert.deepEqual(await order(testPage), [...fixture].sort((a, b) => compareOperators(a, b, sort.key, sort.direction, now)).map(row => row.name));
      assert.equal(await testPage.locator("details.operator-details[open]").count(), 2);
    }
    await testPage.locator("#updates-sort").selectOption("signup");
    await testPage.clock.setFixedTime(now + 3600000);
    await testPage.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    assert.equal(await testPage.locator("#updates-sort option").count(), 3);
    for (const [hours, selected] of [[1, "gift"], [2, "cash"], [3, ""]]) {
      await testPage.clock.setFixedTime(now + hours * 3600000 + 1);
      await testPage.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      assert.equal(await testPage.locator("#updates-sort").inputValue(), selected);
      assert.equal(await testPage.locator("details.operator-details[open]").count(), 2);
    }
    assert.deepEqual(await order(testPage), names);
    await testContext.close();
  }

  const exports = execFileSync("git", ["ls-files", "docs/assets/data", "docs/updates"], { encoding: "utf8" })
    .trim().split("\n").filter(path => /\.(json|csv)$/.test(path));
  for (const path of exports) {
    assert.deepEqual(await readFile(path), execFileSync("git", ["show", `HEAD:${path}`]), `Export changed: ${path}`);
  }
  const gateContext = await browser.newContext();
  const gate = await gateContext.newPage();
  await gate.goto(`${base}/redemption-times/dorados/`);
  const cta = gate.locator("[data-cta-operator]");
  assert.equal(await cta.evaluate(element => element.classList.contains("is-blocked")), true);
  await gate.locator("#state-picker-banner").selectOption("CA");
  assert.equal(await cta.evaluate(element => element.classList.contains("is-blocked")), true);
  await gate.goto(`${base}/`);
  assert.equal(await cards(gate).count(), 10);
  await gateContext.clearCookies();
  await gate.goto(`${base}/redemption-times/dorados/`);
  await gate.locator("#state-picker-banner").selectOption("FL");
  assert.equal(await cta.evaluate(element => element.classList.contains("is-blocked")), false);
  assert.match(await cta.locator("a").first().getAttribute("href"), /^\/go\/dorados\//);
  await gateContext.close();
  console.log(`PASS: both pages; 10 operators; all static claims/conditions/metadata/sources/history; 3 useful sorts and timed fallbacks; native expansion; keyboard and symbols; 5 viewport widths; no JS; eligibility; ${exports.length} byte-identical exports. Screenshots: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
