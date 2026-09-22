import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { orderToplist, SORTS } from "../../src/assets/toplist-order.js";

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
      assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
      assert.equal(await page.locator('#toplist-sort option[value="default"]').count(), 0);
      assert.deepEqual(await page.locator("#toplist-sort option:not([disabled])").evaluateAll(options =>
        options.map(option => option.value)), ["welcome", "daily", "redemption", "cash"]);
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
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} at ${width}`);
      if (path === "/") {
        for (const key of Object.keys(SORTS).filter(key => key !== "default")) {
          await page.selectOption("#toplist-sort", key);
          assert.deepEqual(await page.locator(".toplist-table tbody tr").evaluateAll(rows =>
            rows.map(row => row.dataset.operator)), orderToplist(data.toplist.rows, key).map(row => row.slug),
          `Sort ${key} at ${width}`);
          assert.equal(new URL(page.url()).pathname, "/");
          assert.equal(await page.locator("main table").count(), 1);
        }
        if (width >= 768) {
          await page.locator('[data-sort-key="cash"]').click();
          assert.deepEqual(await page.locator(".toplist-table tbody tr").evaluateAll(rows =>
            rows.map(row => row.dataset.operator)), orderToplist(data.toplist.rows, "cash", "desc").map(row => row.slug));
          assert.equal(await page.locator('[data-sort-key="cash"]').evaluate(button =>
            button.closest("th").getAttribute("aria-sort")), "descending");
        }
        await page.reload();
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        const firstRow = await page.locator(".toplist-table tbody tr").first().boundingBox();
        assert.ok(firstRow.y + firstRow.height <= (width <= 390 ? 844 : 900), `First operator below fold at ${width}`);
        assert.equal(await page.locator(".toplist-coverage").count(), data.toplist.rows.length);
        const statePicker = page.locator("[data-state-picker]");
        await statePicker.selectOption("TX");
        assert.ok((await page.context().cookies()).some(cookie => cookie.name === "sci_state" && cookie.value === "TX"));
        if (width <= 390) {
          const menu = page.locator(".home-menu");
          await menu.locator("summary").focus();
          await page.keyboard.press("Enter");
          assert.equal(await menu.evaluate(element => element.open), true);
          await page.keyboard.press("Escape");
          assert.equal(await menu.evaluate(element => element.open), false);
          await menu.locator("summary").click();
          await page.locator("h1").click({ position: { x: 2, y: 2 } });
          assert.equal(await menu.evaluate(element => element.open), false);
        }
        const sources = page.locator(".toplist-sources").first();
        await sources.locator("summary").click();
        const evidence = await sources.locator(".toplist-evidence").boundingBox();
        assert.ok(evidence.x >= 0 && evidence.x + evidence.width <= width, `Evidence overflow at ${width}`);
        assert.equal(await sources.locator(".toplist-evidence a").first().isVisible(), true);
        await page.keyboard.press("Escape");
        assert.equal(await sources.evaluate(element => element.open), false);
        assert.equal(await sources.locator("summary").evaluate(element => element === document.activeElement), true);
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
        await page.evaluate(async () => {
          await document.fonts.ready;
          document.activeElement?.blur();
          scrollTo({ top: 0, behavior: "instant" });
        });
        await page.mouse.move(0, 0);
        await page.screenshot({ path: `${screenshots}/${path === "/" ? "home" : "signup"}-${width}.png`, fullPage: true });
        if (path === "/") await page.screenshot({ path: `${screenshots}/home-fold-${width}.png` });
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
  assert.equal(await plain.locator(".toplist-sort").isVisible(), false);
  assert.equal(await plain.locator(".home-state").isVisible(), false);
  await plain.locator(".home-menu summary").click();
  assert.equal(await plain.locator(".home-menu nav").isVisible(), true);
  await plain.locator(".toplist-sources summary").first().click();
  assert.equal(await plain.locator(".toplist-sources").first().evaluate(element => element.open), true);
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
