import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sitemapUrls, fingerprint, changedUrls, submit, run } from "./indexnow.mjs";

const origin = "https://socialcasinoindex.com";
const url = `${origin}/`;
const key = "a232ed20c2aeb4f151b35af8c027d138";
const page = (body = "Minimum: 50 SC", extra = "") =>
  `<html><head><title>Casino data</title><link rel="canonical" href="${url}">${extra}</head><body><main>${body}</main></body></html>`;
const digest = fingerprint(page(), url);

test("parse the sitemap and reject foreign or gated URLs", () => {
  const xml = loc => `<urlset><url><loc>${loc}</loc></url></urlset>`;
  assert.deepEqual(sitemapUrls(xml(url), origin), [url]);
  for (const bad of ["https://other.example/", `${origin}/go/casino/`, `${url}?q=1`, `${origin}/%2e%2e/secret/`, "http://socialcasinoindex.com/"]) {
    assert.throws(() => sitemapUrls(xml(bad), origin));
  }
  assert.throws(() => sitemapUrls("<sitemapindex/>", origin));
});

test("only content, links and relevant metadata affect fingerprints", () => {
  assert.equal(fingerprint(page('<p class="new">Minimum: 50 SC</p>', '<meta name="msvalidate.01" content="token">'), url), digest);
  assert.notEqual(fingerprint(page("Minimum: 60 SC"), url), digest);
  assert.notEqual(fingerprint(page('Minimum: 50 SC <a href="/source/">Source</a>'), url), digest);
  assert.notEqual(fingerprint(page("Minimum: 50 SC", '<meta name="description" content="Updated description">'), url), digest);
});

test("noindex, wrong canonicals and empty pages fail closed", () => {
  assert.throws(() => fingerprint(page("", '<meta name="robots" content="noindex">'), url));
  assert.throws(() => fingerprint(page().replace(`href="${url}"`, 'href="https://other.example/"'), url));
  assert.throws(() => fingerprint(page(""), url));
});

test("find added, modified and removed URLs without resubmitting unchanged pages", () => {
  const oldUrl = `${origin}/old/`;
  const newUrl = `${origin}/new/`;
  assert.deepEqual(changedUrls({ [url]: digest }, { [url]: digest }, origin), []);
  assert.deepEqual(changedUrls({ [url]: digest, [newUrl]: digest }, { [url]: "0".repeat(64), [oldUrl]: digest }, origin), [url, newUrl, oldUrl].sort());
  assert.throws(() => changedUrls({}, { "https://other.example/": digest }, origin));
  assert.throws(() => changedUrls({}, { [url]: "corrupt" }, origin));
});

function transport({ keyText = key, html = page(), status = 200, headerNoindex = false } = {}) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (target, options) => {
      calls.push({ target, options });
      if (target.endsWith(".txt")) return new Response(keyText);
      if (target === url) return new Response(html, {
        headers: headerNoindex ? { "x-robots-tag": "noindex" } : {},
      });
      if (target === "https://api.indexnow.org/indexnow") return new Response(null, { status });
      throw new Error(`Unexpected request: ${target}`);
    },
  };
}

const input = { origin, key, urls: [url], current: { [url]: digest } };

test("verify live key and pages, then submit a valid batch with an empty 200 response", async () => {
  const mock = transport();
  assert.deepEqual(await submit({ ...input, fetchImpl: mock.fetchImpl }), { status: "received", count: 1 });
  const payload = JSON.parse(mock.calls.at(-1).options.body);
  assert.deepEqual(payload, { host: "socialcasinoindex.com", key, keyLocation: `${origin}/${key}.txt`, urlList: [url] });
});

test("unchanged pages make no network requests", async () => {
  const mock = transport();
  assert.equal((await submit({ ...input, urls: [], fetchImpl: mock.fetchImpl })).status, "unchanged");
  assert.equal(mock.calls.length, 0);
});

for (const [name, options, error] of [
  ["missing key", { keyText: "404 page" }, /ownership/],
  ["stale deployment", { html: page("Old minimum") }, /differs/],
  ["header noindex", { headerNoindex: true }, /not indexable/],
  ["pending validation", { status: 202 }, /validation is pending/],
  ["bad key", { status: 403 }, /HTTP 403/],
  ["rate limit", { status: 429 }, /HTTP 429/],
  ["server error", { status: 503 }, /HTTP 503/],
]) {
  test(`reject ${name} without reporting indexing success`, async () => {
    const mock = transport(options);
    await assert.rejects(submit({ ...input, fetchImpl: mock.fetchImpl }), error);
    if (["missing key", "stale deployment", "header noindex"].includes(name)) {
      assert.equal(mock.calls.some(call => call.options.method === "POST"), false);
    }
  });
}

test("removed sitemap pages can be notified after a live 404", async () => {
  const mock = transport();
  const fetchImpl = (target, options) => target === url
    ? Promise.resolve(new Response(null, { status: 404 }))
    : mock.fetchImpl(target, options);
  assert.equal((await submit({ ...input, current: {}, fetchImpl })).status, "received");
});

test("a pending submission cannot advance state; success persists and suppresses repeats", async t => {
  const directory = await mkdtemp(join(tmpdir(), "indexnow-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const statePath = join(directory, "state.json");
  let status = 202;
  let requests = 0;
  const fetchImpl = async target => {
    requests++;
    if (target.endsWith(".txt")) return new Response(key);
    if (target === "https://api.indexnow.org/indexnow") return new Response(null, { status });
    const path = new URL(target).pathname;
    return new Response(await readFile(new URL(`../docs${path}index.html`, import.meta.url), "utf8"));
  };
  await assert.rejects(run({ statePath, fetchImpl }), /validation is pending/);
  await assert.rejects(readFile(statePath), { code: "ENOENT" });
  status = 200;
  const result = await run({ statePath, fetchImpl });
  assert.equal(result.status, "received");
  const saved = JSON.parse(await readFile(statePath, "utf8"));
  assert.equal(Object.keys(saved.pages).length, result.count);
  requests = 0;
  assert.equal((await run({ statePath, fetchImpl })).status, "unchanged");
  assert.equal(requests, 0);
});
