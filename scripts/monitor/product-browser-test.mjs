import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { orderToplist } from "../../src/assets/toplist-order.js";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = resolve("docs");
const output = process.env.SCREENSHOT_DIR || "/tmp/sci-player-first";
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const path = resolve(root, `.${pathname}${pathname.endsWith("/") ? "index.html" : ""}`);
    assert.ok(path.startsWith(root + "/"));
    response.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript",
      ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" }[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = process.env.BENCHMARK_URL || `http://127.0.0.1:${server.address().port}`;
const data = await (await fetch(`${base}/updates/leaderboard.json`)).json();
const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", error => errors.push(error.message));
  const order = () => page.locator(".toplist-item").evaluateAll(items => items.map(item => item.dataset.operator));
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    assert.deepEqual(await order(), data.toplist.homepageRows.map(row => row.slug));
    assert.equal(await page.locator("#toplist-sort").inputValue(), "welcome");
    assert.equal(await page.locator('#toplist-sort option[value="default"]').count(), 0);
    for (const sort of data.toplist.sorts) {
      assert.equal(await page.locator(`#toplist-sort option[value="${sort.key}"]`).evaluate(option => option.disabled), !sort.available);
      if (!sort.available) continue;
      await page.selectOption("#toplist-sort", sort.key);
      assert.deepEqual(await order(), orderToplist(data.toplist.homepageRows, sort.key).map(row => row.slug));
      assert.deepEqual(await page.locator(".toplist-position").allTextContents(),
        data.toplist.homepageRows.map((_, index) => String(index + 1)));
    }
    await page.selectOption("#toplist-sort", "welcome");
    for (const row of data.toplist.homepageRows) {
      const item = page.locator(`[data-operator="${row.slug}"]`);
      assert.equal(await item.locator("summary").innerText(), "Terms");
      const identity = await item.locator(".toplist-name").boundingBox();
      const metric = await item.locator(".toplist-metric").first().boundingBox();
      const mark = await item.locator(".toplist-mark").boundingBox();
      assert.ok(Math.abs(identity.x - metric.x) <= 1);
      assert.ok(mark.x > identity.x + identity.width);
      const footer = await item.locator(".toplist-footer").boundingBox();
      const values = await item.locator(".toplist-values").boundingBox();
      assert.ok(footer.y >= values.y + values.height);
      assert.equal(await item.locator(".toplist-visit").getAttribute("href"), row.visitUrl || row.url);
      assert.equal(await item.locator(".toplist-visit span").innerText(), row.visitUrl ? "Visit" : "Details");
      for (const key of ["signup", "purchase", "daily", "redemption", "cash"]) {
        if (row[key]) assert.ok((await item.locator(`[data-metric="${key}"]`).innerText()).includes(row[key].label));
      }
    }
    for (const image of await page.locator(".toplist-mark img").all()) {
      await image.evaluate(image => image.decode());
      assert.ok(await image.evaluate(image => image.naturalWidth > 0));
    }
    const terms = page.locator(".toplist-sources").first();
    await terms.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await terms.evaluate(element => element.open), true);
    const first = await page.locator(".toplist-item").first().boundingBox();
    const next = await page.locator(".toplist-item").nth(1).boundingBox();
    assert.ok(next.y >= first.y + first.height - 1, "Terms overlap next operator");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.keyboard.press("Escape");
    assert.equal(await terms.evaluate(element => element.open), false);
    if (width <= 390) {
      await page.locator(".home-menu summary").click();
      assert.equal(await page.locator(".home-menu").evaluate(element => element.open), true);
      await page.keyboard.press("Escape");
    }
    await page.selectOption("[data-state-picker]", "TX");
    assert.ok((await page.context().cookies()).some(cookie => cookie.name === "sci_state" && cookie.value === "TX"));
    await page.evaluate(async () => { await document.fonts.ready; document.activeElement?.blur(); scrollTo(0, 0); });
    const amount = await page.locator(".toplist-value").first().boundingBox();
    assert.ok(amount.y + amount.height < 900, `First offer below fold: ${width}`);
    await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true });
    await page.screenshot({ path: `${output}/fold-${width}.png` });
  }
  const paths = ["/redemption-times/", "/research/operator-benchmark/", "/research/sweepstakes-casino-redemption-times/",
    "/guides/how-to-redeem-sweeps-coins/", "/guides/sweepstakes-casino-redemption-methods/",
    "/guides/redemption-methods/bank-transfer/", "/guides/redemption-methods/gift-card/", "/guides/redemption-methods/crypto/"];
  for (const path of paths) {
    await page.goto(`${base}${path}`);
    assert.equal(await page.locator(".current-comparison tbody tr").count(), data.operators.length);
    for (const op of data.operators) for (const key of ["redemption", "cash", "gift"]) {
      const cell = page.locator(`[data-current-operator="${op.slug}"] [data-current-metric="${key}"]`);
      const value = op.product[key];
      if (value) {
        assert.equal(await cell.getAttribute("data-record-id"), value.recordId);
        assert.ok((await cell.innerText()).includes(value.label));
        assert.equal(await cell.locator("time").first().getAttribute("datetime"), value.observedAt);
        assert.equal(await cell.locator(".benefit-source a").getAttribute("href"), value.sourceUrl);
      } else assert.equal((await cell.innerText()).trim(), "Not verified");
    }
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, path);
      await page.screenshot({ path: `${output}/${path.split("/").filter(Boolean).join("-")}-${width}.png`, fullPage: true });
    }
  }
  const csv = await (await fetch(`${base}/updates/comparison.csv`)).text();
  assert.ok(csv.startsWith('"operator","attribute"'), "Current CSV was not generated");
  for (const row of data.toplist.homepageRows) for (const key of ["signup", "purchase", "daily", "redemption", "cash"]) {
    if (row[key]) assert.ok(csv.includes(`"${row[key].recordId}"`));
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const plain = await noJs.newPage();
  await plain.goto(base);
  assert.deepEqual(await plain.locator(".toplist-item").evaluateAll(items => items.map(item => item.dataset.operator)),
    data.toplist.homepageRows.map(row => row.slug));
  await plain.locator(".toplist-sources summary").first().click();
  assert.equal(await plain.locator(".toplist-sources").first().evaluate(element => element.open), true);
  await noJs.close();
  assert.deepEqual(errors, []);
  console.log(`PASS: homepage at five widths, all sorts, Terms, alignment, logos, no JS; ${paths.length} shared-data pages; CSV parity. Screenshots: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
