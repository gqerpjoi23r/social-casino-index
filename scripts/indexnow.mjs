import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { load } from "cheerio";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const endpoint = "https://api.indexnow.org/indexnow";
const normalize = value => String(value || "").replace(/\s+/g, " ").trim();

export function validateUrl(value, origin) {
  if (/%2f|%5c|%2e/i.test(value)) throw new Error(`Encoded path segments are not canonical: ${value}`);
  const url = new URL(value);
  if (url.origin !== origin || url.protocol !== "https:" || url.username ||
      url.password || url.search || url.hash || url.pathname.startsWith("/go/")) {
    throw new Error(`Not a canonical public URL on this site: ${value}`);
  }
  if (!url.pathname.endsWith("/") || /%2f|%5c|%2e/i.test(url.pathname)) {
    throw new Error(`Expected a public page directory URL: ${value}`);
  }
  return url.href;
}

export function sitemapUrls(xml, origin) {
  const $ = load(xml, { xmlMode: true });
  if ($("urlset").length !== 1) throw new Error("Expected a sitemap urlset");
  const urls = $("urlset > url > loc").map((_, el) => validateUrl($(el).text().trim(), origin)).get();
  if (!urls.length || urls.length > 10000) throw new Error("Invalid sitemap URL count");
  return [...new Set(urls)].sort();
}

export function fingerprint(html, url) {
  const $ = load(html);
  if ($('meta[name="robots"], meta[name="bingbot"]').toArray()
    .some(el => /\b(noindex|none)\b/i.test($(el).attr("content") || ""))) {
    throw new Error(`Sitemap page is noindex: ${url}`);
  }
  if ($('link[rel="canonical"]').attr("href") !== url) {
    throw new Error(`Canonical mismatch: ${url}`);
  }
  const title = normalize($("title").text());
  const description = normalize($('meta[name="description"]').attr("content"));
  const structuredData = $('script[type="application/ld+json"]').map((_, el) => {
    return JSON.stringify(JSON.parse($(el).text()));
  }).get();
  const main = $("main").first();
  if (!main.length) throw new Error(`Missing main content: ${url}`);
  main.find("script, style, svg").remove();
  // Ignore CSS, layout attributes and verification tags, but retain sources and page metadata.
  const content = normalize(main.text());
  const links = main.find("a[href]").map((_, el) => $(el).attr("href")).get();
  const images = main.find("img").map((_, el) => ({
    src: $(el).attr("src"), alt: $(el).attr("alt"),
  })).get();
  if (!title || !content) throw new Error(`Empty page: ${url}`);
  return createHash("sha256").update(JSON.stringify({
    title, description, structuredData, content, links, images,
  })).digest("hex");
}

export function changedUrls(current, previous, origin) {
  for (const [url, digest] of Object.entries({ ...previous, ...current })) {
    validateUrl(url, origin);
    if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error(`Invalid saved fingerprint: ${url}`);
  }
  return [...new Set([...Object.keys(current), ...Object.keys(previous)])]
    .filter(url => current[url] !== previous[url]).sort();
}

async function request(url, fetchImpl, options = {}) {
  return fetchImpl(url, {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
    ...options,
  });
}

export async function submit({ origin, key, urls, current, fetchImpl = fetch }) {
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error("Invalid IndexNow key");
  if (!urls.length) return { status: "unchanged", count: 0 };
  if (urls.length > 10000) throw new Error("IndexNow accepts at most 10000 URLs per batch");
  urls.forEach(url => validateUrl(url, origin));
  const keyLocation = `${origin}/${key}.txt`;
  const keyResponse = await request(keyLocation, fetchImpl);
  if (keyResponse.status !== 200 || (await keyResponse.text()).trim() !== key) {
    throw new Error("The live IndexNow ownership file is missing or does not match");
  }

  // Do not notify about a local build that has not reached the live Pages deployment.
  for (let offset = 0; offset < urls.length; offset += 4) {
    await Promise.all(urls.slice(offset, offset + 4).map(async url => {
      const response = await request(url, fetchImpl);
      if (!current[url]) {
        if (![200, 404, 410].includes(response.status)) {
          throw new Error(`Cannot verify removed sitemap URL: ${url} (${response.status})`);
        }
        return;
      }
      if (response.status !== 200 || /\b(noindex|none)\b/i.test(response.headers.get("x-robots-tag") || "")) {
        throw new Error(`Live page is not indexable: ${url} (${response.status})`);
      }
      if (fingerprint(await response.text(), url) !== current[url]) {
        throw new Error(`Live content differs from the checked-out deployment: ${url}`);
      }
    }));
  }

  const response = await request(endpoint, fetchImpl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(origin).host, key, keyLocation, urlList: urls }),
  });
  // IndexNow may return an empty body. Only HTTP 200 advances the saved baseline.
  if (response.status === 202) {
    throw new Error("IndexNow received the batch (202), but key validation is pending. Retry later; baseline unchanged.");
  }
  if (response.status !== 200) {
    const retryAfter = response.headers.get("retry-after");
    throw new Error(`IndexNow HTTP ${response.status}${retryAfter ? `; Retry-After: ${retryAfter}` : ""}. Baseline unchanged.`);
  }
  return { status: "received", count: urls.length };
}

export async function run({ dryRun = false, fetchImpl = fetch, statePath = resolve(root, ".indexnow/state.json") } = {}) {
  const site = JSON.parse(await readFile(resolve(root, "src/_data/site.json"), "utf8"));
  const { key } = JSON.parse(await readFile(resolve(root, "src/_data/indexnow.json"), "utf8"));
  const origin = new URL(site.url).origin;
  const urls = sitemapUrls(await readFile(resolve(root, "docs/sitemap.xml"), "utf8"), origin);
  const current = {};
  for (const url of urls) {
    const file = resolve(root, `docs${new URL(url).pathname}index.html`);
    if (!file.startsWith(resolve(root, "docs") + "/")) throw new Error("Page escapes docs directory");
    current[url] = fingerprint(await readFile(file, "utf8"), url);
  }
  let previous = {};
  try {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    if (state.version !== 1 || state.origin !== origin || !state.pages ||
        typeof state.pages !== "object" || Array.isArray(state.pages)) {
      throw new Error("Invalid IndexNow state; refusing to silently reset the baseline");
    }
    previous = state.pages;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const changed = changedUrls(current, previous, origin);
  console.log(`${urls.length} sitemap pages; ${changed.length} new, changed or removed URLs.`);
  if (dryRun) {
    console.log(changed.join("\n"));
    return { status: "dry-run", count: changed.length };
  }
  const result = await submit({ origin, key, urls: changed, current, fetchImpl });
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify({
    version: 1, origin, pages: current, checkedAt: new Date().toISOString(),
  }, null, 2) + "\n");
  const summary = result.status === "unchanged"
    ? "No changed URLs; nothing submitted."
    : `IndexNow received ${result.count} URLs (HTTP 200). This is not confirmation of indexing or AI citations.`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, `## IndexNow\n\n${summary}\n`);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--dry-run")) {
    console.error("Usage: npm run indexnow:submit -- [--dry-run]");
    process.exitCode = 1;
  } else {
    run({ dryRun: args.includes("--dry-run") }).catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }
}
