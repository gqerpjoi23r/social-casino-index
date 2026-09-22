import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = resolve("docs");
const screenshots = process.env.SCREENSHOT_DIR || "/tmp/social-casino-benefits";
await mkdir(screenshots, { recursive: true });
const types = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".json": "application/json" };
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
const data = await (await fetch(`${base}/updates/leaderboard.json`)).json();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const path of ["/", "/updates/", "/bonuses/", ...data.benchmarks.map(b => b.url), ...data.comparisons.map(c => c.url)]) {
    await page.goto(`${base}${path}`);
    if (path === "/") {
      assert.equal(await page.locator("main table").count(), 1);
      assert.equal(await page.locator(".benefit-directory,.benefit-benchmark,.benefit-nav").count(), 0);
      assert.deepEqual(await page.locator(".toplist-table tbody tr").evaluateAll(rows =>
        rows.map(row => row.dataset.operator)), data.toplist.rows.map(row => row.slug));
      assert.ok((await page.locator(".toplist-table thead").innerText()).includes("Daily reward"));
      for (const row of data.toplist.rows) {
        const operator = page.locator(`.toplist-table [data-operator="${row.slug}"]`);
        for (const key of ["welcome", "daily", "redemption", "cash"]) {
          if (row[key]) assert.ok((await operator.innerText()).includes(row[key].label));
        }
        assert.equal(await operator.locator(".toplist-visit").getAttribute("href"), `/go/${row.slug}/`);
      }
    }
    for (const benchmark of data.benchmarks) {
      const rows = page.locator(`[data-benchmark="${benchmark.id}"] tbody tr`);
      if (await page.locator(`[data-benchmark="${benchmark.id}"]`).count()) {
        assert.equal(await rows.count(), benchmark.rows.length);
        assert.deepEqual(await rows.evaluateAll(rows => rows.map(r => r.dataset.operator)), benchmark.rows.map(r => r.slug));
        for (const row of benchmark.rows) assert.ok((await page.locator(`[data-benchmark="${benchmark.id}"] [data-operator="${row.slug}"]`).innerText()).includes(row.label));
      }
    }
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} at ${width}`);
      if (path === "/") {
        for (const brand of await page.locator(".toplist-name .benefit-brand").all()) {
          const box = await brand.boundingBox();
          assert.ok(box.width >= 120, `Casino name squeezed at ${width}: ${box.width}`);
          assert.ok(box.height <= 56, `Casino name wraps excessively at ${width}: ${box.height}`);
        }
        for (const position of await page.locator(".toplist-position").all()) {
          assert.ok(await position.evaluate(element => {
            const range = document.createRange();
            range.selectNodeContents(element);
            return range.getBoundingClientRect().height <= 32;
          }), `Position wraps at ${width}`);
        }
      }
      for (const image of await page.locator("main img:visible").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(image => image.decode());
        assert.ok(await image.evaluate(image => image.naturalWidth > 0));
      }
      if (path === "/" || path === "/bonuses/no-purchase-signup-bonuses/") {
        await page.evaluate(() => scrollTo(0, 0));
        if (width === 390 || width === 1440) await page.screenshot({ path: `${screenshots}/${path === "/" ? "home" : "signup"}-${width}.png`, fullPage: true });
      }
    }
    const details = page.locator("main details summary").first();
    if (await details.count()) {
      await details.focus();
      await page.keyboard.press("Enter");
      assert.equal(await details.evaluate(element => element.parentElement.open), true);
    }
  }
  for (const op of data.operators) {
    await page.goto(`${base}${op.url}`);
    for (const [key, metric] of Object.entries(op.metrics)) {
      if (!metric || ["purchase10", "purchase20"].includes(key)) continue;
      assert.ok((await page.locator(`[data-metric="${key}"]`).innerText()).includes(metric.label), `${op.slug}/${key}`);
    }
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const plain = await noJs.newPage();
  await plain.goto(`${base}/`);
  assert.equal(await plain.locator(".toplist-table tbody tr").count(), data.toplist.rows.length);
  assert.equal(await plain.locator("main table").count(), 1);
  assert.equal(await plain.locator(".benefit-sort").count(), 0);
  await plain.locator(".toplist-sources summary").first().click();
  assert.equal(await plain.locator(".toplist-sources").first().evaluate(element => element.open), true);
  await noJs.close();
  for (const row of data.toplist.rows) {
    assert.equal((await fetch(`${base}${row.visitUrl}`)).status, 200, `Missing visit route: ${row.slug}`);
  }
  const gate = await browser.newContext();
  const gatePage = await gate.newPage();
  gatePage.on("pageerror", error => errors.push(error.message));
  await gatePage.route("https://www.wowvegas.com/**", route => route.fulfill({ body: "Mock operator destination" }));
  for (const state of [null, "CA", "__dismissed", "ZZ", "TX"]) {
    await gate.clearCookies();
    if (state) await gate.addCookies([{ name: "sci_state", value: state, url: base }]);
    await gatePage.goto(`${base}/go/wow-vegas/`);
    await gatePage.waitForURL(state === "TX" ? "https://www.wowvegas.com/" : `${base}/availability/`);
  }
  await gate.close();
  assert.deepEqual(errors, []);
  console.log(`PASS: ${data.benchmarks.length} benchmark pages; ${data.operators.length} profiles; desktop/mobile, logos, keyboard and no-JavaScript. Screenshots: ${screenshots}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
