import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { load } from "cheerio";
import { comparisonSections, playerAnswers } from "../../src/updates/updates.11tydata.js";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const output = process.env.SCREENSHOT_DIR || "/tmp/three-metric-benchmark";
await mkdir(output, { recursive: true });
const numeric = JSON.parse(await readFile("src/_data/numeric.json", "utf8"));
const expected = comparisonSections(numeric);
const answers = playerAnswers(numeric);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
const root = resolve("docs");
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = resolve(root, `.${pathname}${pathname.endsWith("/") ? "index.html" : ""}`);
    assert.ok(file.startsWith(root + "/"));
    response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = process.env.BENCHMARK_URL || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
try {
  for (const path of ["/", "/updates/"]) {
    const label = path === "/" ? "home" : "updates";
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}${path}`);
    assert.equal(await page.locator(".benchmark-section").count(), 3);
    assert.equal(await page.locator(".benchmark-table tbody tr").count(), 9);
    for (const group of answers) {
      const rendered = page.locator(`#${group.id}`);
      assert.equal(await rendered.locator("li").count(), group.rows.length);
      for (const [index, row] of group.rows.entries()) {
        const item = rendered.locator("li").nth(index);
        assert.ok((await item.innerText()).includes(row.text));
        assert.equal(await item.locator("a").getAttribute("href"), row.sourceUrl);
        assert.equal(await item.locator("time").getAttribute("datetime"), row.observedAt);
      }
    }
    assert.doesNotMatch(await page.locator("[data-comparison]").innerText(), /\?|Unknown|Multiple offers|Not applicable/i);
    assert.equal(await page.locator('script[src*="updates-sort"], script[src*="monitor-freshness"]').count(), 0);
    for (const section of expected) {
      for (const [index, group] of section.groups.entries()) {
        const table = page.locator(`#benchmark-${section.id} table`).nth(index);
        assert.deepEqual(await table.locator(".benchmark-brand").allTextContents().then(names => names.map(name => name.trim())),
          group.rows.map(row => row.name));
        for (const row of group.rows) {
          const rendered = table.locator(`[data-operator="${row.slug}"]`);
          assert.equal(await rendered.locator(".benchmark-value").innerText(), row.value);
          assert.equal(await rendered.locator(".benchmark-source").getAttribute("href"), row.sourceUrl);
          assert.equal(await rendered.locator("time").getAttribute("datetime"), row.observedAt);
          for (const condition of row.conditions) assert.ok((await rendered.textContent()).includes(condition));
        }
      }
    }
    for (const image of await page.locator(".benchmark .operator-favicon").all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(image => image.decode());
      assert.ok(await image.evaluate(image => image.naturalWidth > 0));
    }
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      if (path === "/") {
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        assert.match(await page.locator("#compare-heading").innerText(), /signup bonuses, purchase value and cash-out minimums/);
        assert.equal(await page.locator(".benchmark-intro a[href='/methodology/']").count(), 1);
        assert.equal(await page.locator("#latest-guides-heading, #choose-heading, main .hero-bg").count(), 0);
        const firstAmount = await page.locator(".benchmark-value").first().boundingBox();
        assert.ok(firstAmount.y + firstAmount.height < 900, `First amount must be above the fold at ${width}px`);
        assert.deepEqual(await page.locator(".benchmark-jumps a").allTextContents().then(labels => labels.map(label => label.trim())),
          ["Signup bonuses", "Purchase offers", "Redemption minimums"]);
        for (const link of await page.locator(".benchmark-jumps a").all()) {
          const href = await link.getAttribute("href");
          await link.click();
          await page.waitForFunction(href => {
            const target = document.querySelector(href).getBoundingClientRect();
            const header = document.querySelector("body > header").getBoundingClientRect();
            return location.hash === href && target.top >= header.bottom && target.top < innerHeight - 50;
          }, href);
        }
      }
      await page.locator("[data-comparison]").scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(await page.locator(".benchmark :is(td, th, p, strong), .player-answers :is(h3, li)").evaluateAll(elements =>
        elements.filter(element => element.scrollWidth > element.clientWidth + 2 &&
          getComputedStyle(element).display !== "inline").map(element => element.textContent)), []);
      const summary = page.locator(".benchmark summary").first();
      await summary.focus();
      await page.keyboard.press("Enter");
      assert.equal(await summary.evaluate(element => element.parentElement.open), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width === 390 || width === 1440) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${output}/${label}-${width}.png`, fullPage: true });
      }
      await page.keyboard.press("Enter");
    }
    assert.deepEqual(errors, []);
    await context.close();
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const staticPage = await noJs.newPage();
    await staticPage.goto(`${base}${path}`);
    assert.equal(await staticPage.locator(".benchmark-table tbody tr").count(), 9);
    assert.equal(await staticPage.locator(".player-answers > section").count(), answers.length);
    if (path === "/") {
      await staticPage.locator('.benchmark-jumps a[href="#benchmark-purchase"]').click();
      assert.equal(new URL(staticPage.url()).hash, "#benchmark-purchase");
    }
    await staticPage.locator(".benchmark summary").first().focus();
    await staticPage.keyboard.press("Enter");
    assert.equal(await staticPage.locator(".benchmark details[open]").count(), 1);
    await noJs.close();
    const html = await (await fetch(`${base}${path}`)).text();
    assert.doesNotMatch(html, /s3:\/\/|\.monitor\/|evidenceQuote|captureHash|api[_-]?key/i);
    const sitemap = load(await (await fetch(`${base}/sitemap.xml`)).text(), { xmlMode: true });
    assert.ok(sitemap("url").filter((_, element) => sitemap(element).find("loc").text() === `https://socialcasinoindex.com${path}`).find("lastmod").text() >= "2026-09-16");
  }
  const exports = execFileSync("git", ["ls-files", "docs/assets/data", "docs/updates"], { encoding: "utf8" })
    .trim().split("\n").filter(path => /\.(json|csv)$/.test(path));
  for (const path of exports) assert.deepEqual(await readFile(path), execFileSync("git", ["show", `${process.env.BENCHMARK_BASE || "545e3f5"}:${path}`]), `Export changed: ${path}`);
  const gateContext = await browser.newContext();
  const gate = await gateContext.newPage();
  await gate.goto(`${base}/redemption-times/dorados/`);
  const cta = gate.locator("[data-cta-operator]");
  assert.equal(await cta.evaluate(element => element.classList.contains("is-blocked")), true);
  await gate.locator("#state-picker-banner").selectOption("CA");
  assert.equal(await cta.evaluate(element => element.classList.contains("is-blocked")), true);
  await gateContext.clearCookies();
  await gate.reload();
  await gate.locator("#state-picker-banner").selectOption("FL");
  assert.equal(await cta.evaluate(element => element.classList.contains("is-blocked")), false);
  assert.match(await cta.locator("a").first().getAttribute("href"), /^\/go\/dorados\//);
  await gateContext.close();
  console.log(`PASS: ${base}; three metrics; nine numeric entries; dated sources and conditions; five widths; logos; keyboard; no JS; eligibility; ${exports.length} unchanged exports. Screenshots: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
