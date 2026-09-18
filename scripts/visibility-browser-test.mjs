import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { load } from "cheerio";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const output = "/tmp/visibility-content-checks";
await mkdir(output, { recursive: true });
const root = resolve("docs");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, "http://localhost").pathname;
    const file = resolve(root, `.${path}${path.endsWith("/") ? "index.html" : ""}`);
    assert.ok(file.startsWith(root + "/"));
    response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const operators = JSON.parse(await readFile("src/_data/operators.json", "utf8"));
  const states = JSON.parse(await readFile("src/_data/states.json", "utf8"));
  const paths = ["/guides/how-to-redeem-sweeps-coins/", "/redemption-times/", "/availability/",
    ...states.filter(s => s.slug).map(s => `/availability/${s.slug}/`),
    ...operators.map(op => `/redemption-times/${op.slug}/`)];
  for (const path of paths) {
    const html = await readFile(`docs${path}index.html`, "utf8");
    const $ = load(html);
    for (const script of $('script[type="application/ld+json"]').toArray()) JSON.parse($(script).text());
    assert.equal($('link[rel="canonical"]').attr("href"), `https://socialcasinoindex.com${path}`);
    for (const anchor of $("main a[href^='/']").toArray()) {
      const url = new URL($(anchor).attr("href"), base);
      const local = `docs${url.pathname}${url.pathname.endsWith("/") ? "index.html" : ""}`;
      const destination = await readFile(local, "utf8");
      if (url.hash) {
        const other = load(destination);
        assert.ok(other("[id]").toArray().some(el => other(el).attr("id") === url.hash.slice(1)), `${path}: ${url.href}`);
      }
    }
    if (path === "/availability/") {
      assert.equal($("tbody tr").length, 51);
      assert.equal($("tbody tr").toArray().filter(el => $(el).text().includes("Offers blocked")).length, 14);
    }
    if (path.includes("/redemption-times/") && path !== "/redemption-times/") {
      const op = operators.find(op => path.includes(`/${op.slug}/`));
      assert.ok($("#redemption-answer").parent().text().includes(op.publishedEstimate));
      assert.ok($("#redemption-answer").parent().text().includes(op.minRedemption));
    }
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const path of paths.slice(0, 3).concat(["/availability/california/", "/availability/michigan/", "/redemption-times/yay-casino/"])) {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal((await page.goto(base + path)).status(), 200);
      assert.equal(await page.locator("main h1").count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} at ${width}`);
      assert.deepEqual(await page.locator("main :is(h1, h2, p, li)").evaluateAll(elements => elements.filter(el =>
        el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).display !== "inline").map(el => el.textContent)), []);
      if (path === paths[0] || path === "/redemption-times/") {
        assert.ok(await page.locator(".redemption-requirements th, .redemption-requirements td")
          .evaluateAll(cells => cells.every(cell => cell.getBoundingClientRect().width >= 130)), `Squeezed guide columns at ${width}`);
        const region = page.getByRole("region", { name: path === paths[0] ? "Operator redemption requirements" : "Published redemption comparison" });
        await region.focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(el => el.scrollWidth <= el.clientWidth || el.scrollLeft > 0, await region.elementHandle());
        assert.ok(await region.evaluate(el => el.scrollWidth <= el.clientWidth || el.scrollLeft > 0), `Guide table cannot scroll at ${width}`);
        await region.evaluate(el => { el.scrollLeft = 0; el.blur(); });
      }
      if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}/${path.split("/").filter(Boolean).join("-")}-${width}.png`, fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  await context.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  await staticPage.goto(base + paths[0]);
  assert.equal(await staticPage.locator("table tbody tr").count(), 10);
  await noJs.close();
  for (const file of ["src/_data/operators.json", "src/_data/states.json", "src/assets/eligibility.js",
    "docs/assets/data/operators-2026.1.json", "docs/assets/data/redemption-times-2026.1.csv",
    "docs/assets/data/player-value-2026.1.csv", "docs/updates/data.json", "docs/updates/numeric.json"]) {
    assert.deepEqual(await readFile(file), execFileSync("git", ["show", `HEAD:${file}`]), `${file} changed`);
  }
  console.log(`OK: ${paths.length} pages, internal links, JSON-LD, 51 state rows, 14 blocks, four viewport widths, no-JS guide, unchanged data and exports. Screenshots: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
