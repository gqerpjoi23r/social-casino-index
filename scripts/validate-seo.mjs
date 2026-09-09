// SEO/AI-visibility validation for the built site. Checks that key pages keep
// an on-domain canonical and JSON-LD, and that new state/method pages appear
// in the sitemap. Wired into `npm run release`. Run: npm run seo:validate
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://socialcasinoindex.com";

let failures = 0;
const fail = (msg) => { console.error(`FAIL ${msg}`); failures++; };

const read = (rel) => {
  const p = join(root, "docs", rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
};

// 1. Every public page must have a canonical on the live domain.
const KEY_PAGES = [
  "index.html",
  "research/sweepstakes-casino-redemption-times/index.html",
  "redemption-times/index.html",
  "availability/index.html",
  "taxes/index.html",
  "guides/index.html",
  "guides/sweepstakes-casino-real-prizes-rules/index.html",
  "guides/sweepstakes-casino-redemption-methods/index.html",
  "guides/redemption-methods/bank-transfer/index.html",
  "guides/redemption-methods/gift-card/index.html",
  "guides/redemption-methods/crypto/index.html",
  "methodology/index.html",
  "about/index.html",
  "authors/alex-rowan/index.html",
];

// State pages (one per closed state).
const STATE_PAGES = [
  "california", "connecticut", "idaho", "indiana", "louisiana", "maine",
  "montana", "nevada", "new-jersey", "new-york", "oklahoma", "tennessee",
  "michigan", "washington",
].map((s) => `availability/${s}/index.html`);

const ALL_KEY = [...KEY_PAGES, ...STATE_PAGES];

for (const rel of ALL_KEY) {
  const html = read(rel);
  if (!html) { fail(`missing built page: docs/${rel}`); continue; }
  if (!html.includes(`<link rel="canonical" href="${SITE}`)) {
    fail(`canonical missing or off-domain: ${rel}`);
  }
}

// 2. Key pages must carry JSON-LD.
const JSONLD_PAGES = [
  "index.html",
  "research/sweepstakes-casino-redemption-times/index.html",
  "availability/index.html",
  "taxes/index.html",
  "guides/sweepstakes-casino-real-prizes-rules/index.html",
  "guides/sweepstakes-casino-redemption-methods/index.html",
  "guides/redemption-methods/bank-transfer/index.html",
  "guides/redemption-methods/gift-card/index.html",
  "guides/redemption-methods/crypto/index.html",
  ...STATE_PAGES,
];

for (const rel of JSONLD_PAGES) {
  const html = read(rel);
  if (!html) continue; // already reported above
  if (!html.includes('type="application/ld+json"')) {
    fail(`missing JSON-LD: ${rel}`);
  }
}

// 3. Operator pages must carry JSON-LD and a canonical.
const OPERATORS = ["jackpota", "lucky-bunny", "yay-casino", "dorados", "zonko", "chumba", "pulsz", "stake-us", "wow-vegas", "mcluck"];
for (const slug of OPERATORS) {
  const rel = `redemption-times/${slug}/index.html`;
  const html = read(rel);
  if (!html) { fail(`missing built operator page: docs/${rel}`); continue; }
  if (!html.includes(`<link rel="canonical" href="${SITE}`)) fail(`canonical missing or off-domain: ${rel}`);
  if (!html.includes('type="application/ld+json"')) fail(`missing JSON-LD: ${rel}`);
}

// 4. New state/method pages must appear in the sitemap.
const sitemap = read("sitemap.xml");
if (sitemap) {
  for (const s of ["california", "new-york", "washington", "michigan", "nevada", "new-jersey"]) {
    if (!sitemap.includes(`/availability/${s}/`)) fail(`state page missing from sitemap: /availability/${s}/`);
  }
  for (const m of ["bank-transfer", "gift-card", "crypto"]) {
    if (!sitemap.includes(`/guides/redemption-methods/${m}/`)) fail(`method page missing from sitemap: /guides/redemption-methods/${m}/`);
  }
} else {
  fail("docs/sitemap.xml does not exist");
}

if (failures) {
  console.error(`\n${failures} SEO problem(s).`);
  process.exit(1);
}
console.log(`OK: ${ALL_KEY.length + OPERATORS.length} pages checked for canonicals, ${JSONLD_PAGES.length + OPERATORS.length} for JSON-LD, state/method pages present in sitemap.`);
