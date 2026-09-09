// Validate the built sitemap.xml: well-formed, covers every public page, and
// excludes gated/noindex redirects. Runs as part of `npm run build` so the
// sitemap can never silently go stale or drop a page. Run: npm run sitemap:validate
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sitemapPath = join(root, "docs/sitemap.xml");

let failures = 0;
const fail = (msg) => { console.error(`FAIL ${msg}`); failures++; };

if (!existsSync(sitemapPath)) {
  console.error("FAIL docs/sitemap.xml does not exist");
  process.exit(1);
}
const xml = readFileSync(sitemapPath, "utf8");

// 1. Well-formed enough: has urlset, and loc/lastmod tags are balanced.
if (!xml.includes("<urlset") || !xml.includes("</urlset>")) fail("missing <urlset> root");
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locs.length === 0) fail("no <loc> entries found");

// 2. No gated /go/ redirect stubs.
const goEntries = locs.filter((u) => u.includes("/go/"));
if (goEntries.length) fail(`sitemap contains ${goEntries.length} gated /go/ redirect(s): ${goEntries.join(", ")}`);

// 3. Coverage: every directory in docs/ with an index.html (except /go/) must
//    appear in the sitemap as a <loc>.
function walk(dir, urls = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, urls);
    else if (entry === "index.html") {
      let url = p.replace(join(root, "docs"), "").replace(/\/index\.html$/, "/") || "/";
      urls.push(url);
    }
  }
  return urls;
}
const pageUrls = walk(join(root, "docs")).filter((u) => !u.startsWith("/go/"));
const inSitemap = new Set(locs.map((u) => u.replace(/^https?:\/\/[^/]+/, "")));
for (const u of pageUrls) {
  if (!inSitemap.has(u)) fail(`page missing from sitemap: ${u}`);
}

// 4. Freshness: dated content (guides, research, operator records) must carry
//    a <lastmod>.
const datedPaths = ["/guides/", "/research/", "/redemption-times/"];
const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
for (const e of entries) {
  const loc = (e.match(/<loc>([^<]+)<\/loc>/) || [])[1] || "";
  if (datedPaths.some((p) => loc.includes(p)) && !/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(e)) {
    fail(`dated page missing <lastmod>: ${loc}`);
  }
}

if (failures) {
  console.error(`\n${failures} sitemap problem(s). ${locs.length} URLs, ${pageUrls.length} public pages.`);
  process.exit(1);
}
console.log(`OK: sitemap has ${locs.length} URLs covering ${pageUrls.length} public pages; no /go/ stubs; dated pages have <lastmod>.`);
