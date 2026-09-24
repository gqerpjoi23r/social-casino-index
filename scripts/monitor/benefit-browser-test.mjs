import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { cashMinimumAnswers } from "./cash-answers.mjs";
import { signupDetails } from "./signup-details.mjs";

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
const cashPath = "/bonuses/cash-redemption-minimums/";
const answers = cashMinimumAnswers(data);
const signupBenchmarks = data.benchmarks.filter(b => ["signup", "staged"].includes(b.id));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const path of ["/updates/", "/bonuses/", ...data.benchmarks.map(b => b.url), ...data.comparisons.map(c => c.url)]) {
    await page.goto(`${base}${path}`);
    if (path === cashPath) {
      assert.equal(await page.title(), "Cash redemption minimums | Social Casino Index");
      for (const row of answers.lowest) {
        assert.ok((await page.locator("#lowest-cash-minimum").innerText()).includes(row.name));
        assert.ok((await page.locator("#lowest-cash-minimum").innerText()).includes(row.label));
      }
      for (const row of data.benchmarks.find(b => b.id === "cash").rows) {
        const source = page.locator(`[data-benchmark="cash"] [data-operator="${row.slug}"] .benefit-source`);
        assert.equal(await source.isVisible(), true);
        assert.equal(await source.locator("a").getAttribute("href"), row.sourceUrl);
        assert.equal(await source.locator("time").getAttribute("datetime"), row.observedAt);
        assert.equal((await source.innerText()).includes("Previous observation"), row.status === "retained");
      }
      assert.equal(await page.locator('a[href="/compare/wow-vegas-vs-chumba/"]').count(), 1);
      assert.deepEqual(await page.locator("[data-gift-operator]").evaluateAll(rows =>
        rows.map(row => row.dataset.giftOperator)), answers.giftBelow50.map(row => row.slug));
      for (const row of answers.giftBelow50) {
        const gift = page.locator(`[data-gift-operator="${row.slug}"]`);
        assert.equal(await gift.locator(".benefit-value").innerText(), row.label);
        assert.equal(await gift.locator(".benefit-source a").getAttribute("href"), row.sourceUrl);
        assert.equal(await gift.locator("time").getAttribute("datetime"), row.observedAt);
      }
    }
    const signupBenchmark = signupBenchmarks.find(b => b.url === path);
    if (signupBenchmark) {
      const details = signupDetails(signupBenchmark);
      assert.equal(await page.locator("main details").count(), 0);
      assert.equal(await page.locator("main table").count(), details.rows.length ? 1 : 0);
      assert.deepEqual(await page.locator("[data-claim-operator]").evaluateAll(rows =>
        rows.map(row => row.dataset.claimOperator)), details.rows.map(row => row.slug));
      for (const row of details.rows) {
        const claim = page.locator(`[data-claim-operator="${row.slug}"]`);
        assert.equal(await claim.getAttribute("data-record-id"), row.recordId);
        assert.ok((await claim.innerText()).includes(row.initialLabel));
        if (row.staged) assert.ok((await claim.innerText()).includes(row.totalLabel));
        assert.deepEqual(await claim.locator(".signup-requirements li").allTextContents(), row.conditions);
        assert.equal(await claim.locator(".signup-code").count(), row.promoCode ? 1 : 0);
        if (row.promoCode) assert.ok((await claim.locator(".signup-code").innerText()).includes(row.promoCode));
        assert.equal(await claim.locator(".benefit-source a").getAttribute("href"), row.sourceUrl);
        assert.equal(await claim.locator("time").getAttribute("datetime"), row.observedAt);
        assert.equal((await claim.locator(".benefit-source").innerText()).includes("Previous observation"), row.status === "retained");
      }
      for (const row of details.leaders) assert.ok((await page.locator("#signup-answer").innerText()).includes(row.name));
      assert.equal(await page.locator(`.signup-related a[href="${details.relatedUrl}"]`).count(), 1);
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
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} at ${width}`);
      for (const image of await page.locator("main img:visible").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(image => image.decode());
        assert.ok(await image.evaluate(image => image.naturalWidth > 0));
      }
      if (signupBenchmark) {
        for (const element of await page.locator(".signup-claim h3,.signup-amounts,.signup-requirements,.signup-code").all()) {
          const box = await element.boundingBox();
          assert.ok(box.x >= 0 && box.x + box.width <= width, `Claim details overflow at ${width}`);
        }
      }
      if (path === "/" || signupBenchmark || path === cashPath) {
        await page.evaluate(async () => {
          await document.fonts.ready;
          document.activeElement?.blur();
          scrollTo({ top: 0, behavior: "instant" });
        });
        await page.mouse.move(0, 0);
        await page.screenshot({ path: `${screenshots}/${path === "/" ? "home" : path === cashPath ? "cash" : signupBenchmark.id}-${width}.png`, fullPage: true });
        if (path === "/") await page.screenshot({ path: `${screenshots}/home-fold-${width}.png` });
      }
    }
    const details = page.locator("main details summary").first();
    if (signupBenchmark?.rows.length) {
      const link = page.locator(".signup-claim-link").first();
      await link.focus();
      await page.keyboard.press("Enter");
      assert.equal(new URL(page.url()).hash, `#claim-${signupBenchmark.rows[0].slug}`);
    }
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
  assert.equal(await plain.locator(".toplist-item").count(), data.toplist.homepageRows.length);
  assert.equal(await plain.locator("main table").count(), 0);
  assert.equal(await plain.locator(".benefit-sort").count(), 0);
  assert.equal(await plain.locator(".toplist-sort").isVisible(), false);
  assert.equal(await plain.locator(".home-state").isVisible(), false);
  await plain.locator(".home-menu summary").click();
  assert.equal(await plain.locator(".home-menu nav").isVisible(), true);
  await plain.locator(".toplist-sources summary").first().click();
  assert.equal(await plain.locator(".toplist-sources").first().evaluate(element => element.open), true);
  await plain.locator(`.toplist-footnote a[href="${cashPath}"]`).click();
  assert.equal(new URL(plain.url()).pathname, cashPath);
  assert.equal(await plain.locator("#lowest-cash-minimum").isVisible(), true);
  assert.equal(await plain.locator('[data-answer="cash-below-50"]').isVisible(), true);
  for (const source of await plain.locator(".benefit-source").all()) assert.equal(await source.isVisible(), true);
  const cashTerms = plain.locator('main details summary').first();
  if (await cashTerms.count()) {
    await cashTerms.focus();
    await plain.keyboard.press("Enter");
    assert.equal(await cashTerms.evaluate(element => element.parentElement.open), true);
  }
  for (const benchmark of signupBenchmarks) {
    await plain.goto(`${base}${benchmark.url}`);
    assert.equal(await plain.locator("#signup-answer").isVisible(), true);
    assert.equal(await plain.locator("main details").count(), 0);
    for (const claim of await plain.locator(".signup-claim").all()) assert.equal(await claim.isVisible(), true);
    if (benchmark.rows.length) {
      await plain.locator(".signup-claim-link").first().focus();
      await plain.keyboard.press("Enter");
      assert.equal(new URL(plain.url()).hash, `#claim-${benchmark.rows[0].slug}`);
    }
  }
  await noJs.close();
  await page.context().addCookies([{ name: "sci_state", value: "__dismissed", url: base }]);
  await page.goto(`${base}/`);
  assert.equal(await page.locator("[data-state-picker]").evaluate(select => select.selectedIndex), 0);
  await page.goto(`${base}/about/`);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(await page.locator('link[href="/assets/home.css"]').count(), 0);
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
