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
  await page.goto(`${base}/`);
  for (const key of ["signup", "purchase", "cash"]) {
    await page.goto(`${base}/`);
    await page.selectOption("#benefit-sort", key);
    await page.waitForURL(`${base}${data.benchmarks.find(b => b.id === key).url}`);
    assert.equal(await page.locator(`[data-benchmark="${key}"] tbody tr`).count(), data.benchmarks.find(b => b.id === key).rows.length);
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const plain = await noJs.newPage();
  await plain.goto(`${base}/`);
  assert.equal(await plain.locator("[data-ranked-operators] tr").count(), data.ranked.length);
  assert.equal(await plain.locator(".benefit-directory-list article").count(), data.incomplete.length);
  assert.equal(await plain.locator(".benefit-sort").isVisible(), false);
  await noJs.close();
  assert.deepEqual(errors, []);
  console.log(`PASS: ${data.benchmarks.length} benchmark pages; ${data.operators.length} profiles; desktop/mobile, logos, keyboard and no-JavaScript. Screenshots: ${screenshots}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
