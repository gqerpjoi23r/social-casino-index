// Read-only audit. Requires Playwright and a local Chrome installation.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { Script } from "node:vm";

const require = createRequire(process.env.SCI_AUDIT_RUNTIME || import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ javaScriptEnabled: false });
const parser = await context.newPage();
const base = "https://socialcasinoindex.com";
const retrievedAt = new Date().toISOString();
const out = new URL("./", import.meta.url);

async function request(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "Accept-Language": "en-US,en;q=0.9" } });
    return {
      requestedUrl: url, url: r.url, status: r.status,
      contentType: r.headers.get("content-type"),
      xRobotsTag: r.headers.get("x-robots-tag"),
      lastModified: r.headers.get("last-modified"),
      text: await r.text(),
    };
  } catch (e) {
    return { requestedUrl: url, error: e.message, text: "" };
  }
}

async function parse(text, xml = false) {
  return parser.evaluate(({ text, xml }) => {
    const d = new DOMParser().parseFromString(text, xml ? "application/xml" : "text/html");
    if (xml) return {
      errors: [...d.querySelectorAll("parsererror")].map(x => x.textContent),
      entries: [...d.querySelectorAll("url")].map(x => ({
        url: x.querySelector("loc")?.textContent,
        lastmod: x.querySelector("lastmod")?.textContent,
      })),
    };
    const main = d.querySelector("main") || d.body;
    return {
      title: d.title,
      description: d.querySelector('meta[name="description"]')?.content,
      canonical: [...d.querySelectorAll('link[rel="canonical"]')].map(x => x.getAttribute("href")),
      robots: d.querySelector('meta[name="robots"]')?.content,
      h1: [...d.querySelectorAll("h1")].map(x => x.textContent.trim()),
      jsonld: [...d.querySelectorAll('script[type="application/ld+json"]')].map(x => x.textContent),
      scripts: [...d.querySelectorAll("script:not([src]):not([type]),script[type='text/javascript']:not([src])")].map(x => x.textContent),
      internalLinks: [...new Set([...main.querySelectorAll("a[href]")].map(x => x.getAttribute("href")).filter(x => x.startsWith("/")))],
      text: main.textContent.replace(/\s+/g, " ").trim(),
    };
  }, { text, xml });
}

try {
  await parser.route("**/*", route => route.abort());
  const sitemap = await request(`${base}/sitemap.xml`);
  const robots = await request(`${base}/robots.txt`);
  const xml = await parse(sitemap.text, true);
  const operatorSlugs = ["jackpota", "lucky-bunny", "yay-casino", "dorados", "zonko", "chumba", "pulsz", "stake-us", "wow-vegas", "mcluck"];
  const urls = [...new Set([...xml.entries.map(x => x.url), ...operatorSlugs.map(x => `${base}/go/${x}/`)])];
  const pages = [];
  for (const url of urls) {
    const response = await request(url);
    const html = await parse(response.text);
    const jsonld = html.jsonld.map(raw => {
      try { return { valid: true, value: JSON.parse(raw) }; }
      catch (e) { return { valid: false, error: e.message }; }
    });
    const scriptErrors = html.scripts.flatMap((raw, i) => {
      try { new Script(raw); return []; }
      catch (e) { return [{ index: i, error: e.message }]; }
    });
    const { text, scripts, ...attributes } = html;
    const { text: source, ...http } = response;
    pages.push({ ...http, ...attributes, jsonld, scriptErrors, mainTextCharacters: text.length });
    console.log(response.status, new URL(url).pathname, scriptErrors.length ? "SCRIPT_ERROR" : "");
  }
  const siteAudit = {
    retrievedAt,
    scope: "HTTP and DOM parsing; no field performance, index coverage, legal verification, or ranking measurement.",
    sitemap: { status: sitemap.status, ...xml },
    robots: { status: robots.status, text: robots.text },
    pages,
    summary: {
      sitemapUrls: xml.entries.length,
      pagesChecked: pages.length,
      non200: pages.filter(x => x.status !== 200).map(x => x.requestedUrl),
      invalidJsonld: pages.filter(x => x.jsonld.some(j => !j.valid)).map(x => x.requestedUrl),
      inlineScriptErrors: pages.filter(x => x.scriptErrors.length).map(x => x.requestedUrl),
      canonicalMismatch: pages.filter(x => !x.requestedUrl.includes("/go/") && (x.canonical.length !== 1 || x.canonical[0] !== x.requestedUrl)).map(x => x.requestedUrl),
      nonSingleH1: pages.filter(x => x.h1.length !== 1).map(x => x.requestedUrl),
    },
  };
  writeFileSync(new URL("live-audit.json", out), JSON.stringify(siteAudit, null, 2) + "\n");
  const sources = [
    ["S1", "Google Search: AI features", "https://developers.google.com/search/docs/appearance/ai-features?hl=en", ["special", "structured data", "indexed", "Search Console", "robots", "snippet"]],
    ["S2", "Google Search: high quality reviews", "https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews", ["evidence", "measurements", "benefits", "drawbacks", "best", "decision"]],
    ["S3", "Google Search: structured data policies", "https://developers.google.com/search/docs/appearance/structured-data/sd-policies", ["visible", "misleading", "up-to-date", "represent", "guarantee"]],
    ["S4", "Google Search: FAQ documentation redirect and documentation updates", "https://developers.google.com/search/docs/appearance/structured-data/faqpage?hl=en", ["FAQ", "May 7", "May 2026"]],
    ["S5", "Google Search: Dataset structured data", "https://developers.google.com/search/docs/appearance/structured-data/dataset", ["license", "distribution", "creator", "citation", "download", "temporal"]],
    ["S6", "Google Trends: data FAQ", "https://support.google.com/trends/answer/4365533?hl=en", ["normalized", "sample", "100", "0", "relative", "search volume"]],
    ["S7", "Google Ads: historical keyword metrics", "https://developers.google.com/google-ads/api/docs/keyword-planning/generate-historical-metrics?hl=en", ["geo", "language", "network", "close", "competition", "monthly"]],
    ["S8", "Google Ads: gambling and games policy", "https://support.google.com/adspolicy/answer/6018017?hl=en", ["simulate", "sweepstakes casino", "affiliate", "certification", "prizes"]],
    ["S9", "Google Search: spam policies", "https://developers.google.com/search/docs/essentials/spam-policies", ["scaled content", "doorway", "affiliate", "sponsored", "value"]],
    ["S10", "Google Search: build a sitemap", "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap", ["lastmod", "accurate", "significant", "guarantee"]],
    ["S11", "OpenAI crawler documentation", "https://platform.openai.com/docs/bots", ["OAI-SearchBot", "GPTBot", "ChatGPT-User", "search results"]],
    ["S12", "Jackpota terms of service", "https://jackpota.com/terms-of-service", ["Gold Coins", "prizes", "redeem", "cash value"]],
  ];
  const evidence = [];
  for (const [id, title, url, terms] of sources) {
    const r = await request(url);
    const p = await parse(r.text);
    // Retain discovery metadata, not copyrighted page excerpts.
    const termChecks = terms.map(term => {
      const i = p.text.toLowerCase().indexOf(term.toLowerCase());
      return { term, found: i >= 0 };
    });
    const { text, ...http } = r;
    evidence.push({ id, title, ...http, pageTitle: p.title, termChecks });
    console.log(id, r.status, p.title);
  }
  writeFileSync(new URL("source-checks.json", out), JSON.stringify({ retrievedAt, sources: evidence }, null, 2) + "\n");
  console.log(JSON.stringify(siteAudit.summary));
} finally {
  await browser.close();
}
