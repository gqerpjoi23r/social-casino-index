import "./no-network.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { archiveCapture } from "./archive.mjs";
import { execFileSync } from "node:child_process";
import { buildBenchmarks } from "./benchmarks.mjs";
import { orderToplist } from "../../src/assets/toplist-order.js";
import { comparisonCsv } from "./product-view.mjs";
import { nextSource, recoverySource, sourceQueues } from "./discovery.mjs";
import { RequestUsage, firecrawlOptions } from "./providers.mjs";
import { emptyExtraction } from "./schema.mjs";
import { deterministicExtract, checkExtraction } from "./numeric-core.mjs";
import { mergeRepairs } from "./repair.mjs";
import { productReport } from "./product-report.mjs";
import { recoverOfferSemantics } from "./offer-semantics.mjs";

const now = Date.parse("2026-09-24T12:00:00Z");
const base = { sourceId: "source", sourceUrl: "https://example.com/terms", capturedAt: "2026-09-23T12:00:00Z",
  conditions: [], freshness: "captured_unreviewed" };
const signup = amount => ({ ...base, id: `signup-${amount}`, recordType: "offers", kind: "signup",
  immediateSc: amount, totalSc: amount, purchaseRequired: false });
const cash = amount => ({ ...base, id: `cash-${amount}`, recordType: "facts", field: "redemption_minimum",
  value: amount, comparison: "at_least", method: "cash", unit: "SC" });
const paid = { ...base, id: "paid", recordType: "offers", kind: "first_purchase",
  immediateSc: 100, totalSc: 100, priceUsd: 10, purchaseRequired: true };
const operator = (slug, records) => ({ slug, name: slug, productMode: "sweepstakes", records });
const build = operators => buildBenchmarks({ operators }, [], now);

test("homepage admits two categories, preserves full roster and defaults to free signup", () => {
  const model = build([operator("small", [signup(1), cash(50)]), operator("big", [signup(5), cash(100)]),
    operator("paid", [paid, cash(10)]), operator("thin", [signup(99)]), operator("empty", [])]);
  assert.deepEqual(model.toplist.homepageRows.map(row => row.slug), ["big", "small", "paid"]);
  assert.deepEqual(model.toplist.homepageRows.map(row => row.position), [1, 2, 3]);
  assert.equal(model.operators.length, 5);
  assert.equal(model.benchmarks.find(row => row.id === "signup").rows[0].slug, "thin");
  assert.equal(orderToplist(model.toplist.homepageRows, "purchase")[0].slug, "paid");
  assert.equal(orderToplist(model.toplist.homepageRows, "cash")[0].slug, "paid");
  assert.deepEqual(orderToplist(orderToplist(model.toplist.homepageRows, "cash")).map(row => row.slug), ["big", "small", "paid"]);
  assert.equal(model.toplist.sorts.find(sort => sort.key === "daily").available, false);
});
test("signup and purchase are one admission category; ranking ties never use coverage", () => {
  const model = build([operator("b", [signup(3), paid]), operator("a", [signup(3), cash(50)])]);
  assert.equal(model.toplist.rows.find(row => row.slug === "b").knownAttributeCount, 1);
  assert.deepEqual(model.toplist.rows.map(row => row.slug), ["a", "b"]);
  assert.deepEqual(model.toplist.homepageRows.map(row => row.slug), ["a"]);
});
test("descriptive rewards remain useful without inventing daily SC", () => {
  const daily = { ...base, recordType: "offers", kind: "recurring_daily", purchaseRequired: false,
    immediateSc: null, name: "Daily login", conditions: ["Rewards increase with consecutive days."] };
  const model = build([operator("a", [signup(1), cash(10), daily])]);
  assert.equal(model.toplist.homepageRows[0].daily.label, "Increasing daily reward");
  assert.equal(model.toplist.homepageRows[0].knownAttributeCount, 2);
  assert.equal(model.toplist.homepageRows[0].sortValues.daily, null);
});
test("signup ranking uses the registration step, not the total of optional tasks", () => {
  const quote = "Free signup bonus up to 12 SC. Sign Up Click 'Join Now' and complete the quick registration form. You'll receive: 5,000 GC + 1 SC 2 Opt In to Email Updates: 1 SC. First daily claim: 1 SC.";
  const record = { ...signup(4), quote, totalSc: 12 };
  const corrected = recoverOfferSemantics(record);
  assert.equal(corrected.immediateSc, 1);
  assert.equal(corrected.totalSc, 12);
  assert.equal(record.immediateSc, 4);
  assert.equal(recoverOfferSemantics({ ...record, quote: "Sign up for up to 12 SC after completing tasks." }).immediateSc, 4);
  const model = build([operator("tasks", [corrected, cash(50)]), operator("instant", [signup(2), cash(50)])]);
  assert.deepEqual(model.toplist.homepageRows.map(row => row.slug), ["instant", "tasks"]);
});
test("product projections and CSV preserve selected records, conditions and observation dates", () => {
  const model = build([operator("a", [signup(1), cash(10), paid])]);
  const row = model.toplist.homepageRows[0];
  const op = model.operators[0];
  for (const key of ["signup", "purchase", "cash"]) {
    assert.deepEqual(row[key], op.product[key]);
    assert.ok(comparisonCsv(model).includes(`"${row[key].recordId}"`));
    assert.ok(comparisonCsv(model).includes(`"${row[key].observedAt}"`));
  }
  assert.ok(productReport(model, model).includes("Entered: None"));
});
test("global queue completes comparison seeds then discovered sources without starvation", () => {
  const a = { attempted: 0, queue: [{ id: "general" }, { id: "discovery", depth: 1, recoverySource: true }] };
  const b = { attempted: 0, queue: [{ id: "core", comparisonSource: true }] };
  assert.equal(nextSource(a, [a, b]), null);
  assert.equal(nextSource(b, [a, b]).id, "core");
  assert.equal(nextSource(a, [a, b]).id, "discovery");
  assert.equal(nextSource(a, [a, b]).id, "general");
});
test("recovery priorities target missing fields and every comparison seed fits the live budget", () => {
  assert.equal(recoverySource({ depth: 1, url: "https://example.com/daily-bonus" }, ["daily"]), true);
  assert.equal(recoverySource({ depth: 1, url: "https://example.com/daily-bonus" }, ["cash"]), false);
  const read = path => JSON.parse(readFileSync(path));
  const queues = sourceQueues(read("src/_data/operators.json"), read("data/monitor/config.json"));
  const expected = queues.flatMap(queue => queue.queue.filter(source => source.comparisonSource).map(source => source.id));
  const selected = [];
  while (selected.length < 50 && queues.some(queue => queue.attempted < 8 && queue.queue.length)) {
    for (const queue of queues) {
      if (selected.length >= 50) break;
      const source = nextSource(queue, queues);
      if (source) { queue.attempted++; selected.push(source); }
    }
  }
  assert.deepEqual(selected.slice(0, expected.length).map(source => source.id).sort(), expected.sort());
  assert.ok(queues.every(queue => queue.attempted <= 8));
});
test("automatic proxy and shared model budget include repairs", () => {
  assert.equal(firecrawlOptions("https://example.com").proxy, "auto");
  const usage = new RequestUsage({ model: 11, firecrawl: 45 });
  assert.equal(usage.reserve("model"), true);
  assert.equal(usage.reserve("model"), false);
  assert.equal(usage.reserve("firecrawl"), false);
});
test("repair cannot add unsupported numbers or unrelated records", () => {
  const pages = [{ sourceId: "source", text: "Claim 1 SC free every day. No purchase required." }];
  const parsed = deterministicExtract(pages);
  const valid = checkExtraction(parsed, pages);
  assert.ok(valid.accepted.offers.length);
  const original = valid.accepted.offers[0];
  const selected = { accepted: emptyExtraction(), rejected: [{ kind: "offers", reason: "number_not_in_quote", item: original }] };
  const repaired = mergeRepairs(selected, parsed, pages);
  assert.equal(repaired.accepted.offers.length, 1);
  assert.equal(repaired.rejected.length, 0);
  assert.equal(mergeRepairs(selected, { ...parsed, offers: [{ ...original, immediateSc: 999 }] }, pages).accepted.offers.length, 0);
  assert.equal(mergeRepairs(selected, { ...parsed, offers: [{ ...original, name: "Different offer" }] }, pages).accepted.offers.length, 0);
});
test("current templates do not read legacy numeric registry fields", () => {
  const files = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" }).split("\n").filter(path => path.endsWith(".njk") &&
    path !== "src/_includes/player-value.njk");
  for (const path of files) assert.doesNotMatch(readFileSync(path, "utf8"),
    /\b(?:op|operator)\.(?:publishedEstimate|firstRedemption|repeatRedemption|minRedemption|methods|bestFor|playerValue)\b/, path);
});

test("numeric runner budgets one repair, replays it offline and never calls a real model", () => {
  const directory = mkdtempSync(join(tmpdir(), "sci-model-fixture-"));
  const text = "Claim 1 SC free every day. No purchase required.";
  try {
    const operators = Array.from({ length: 11 }, (_, index) => ({
      slug: `fixture-${index}`, name: `Fixture ${index}`, playerValue: { productMode: "sweepstakes" },
    }));
    const manifest = { runId: "fixture", startedAt: base.capturedAt, sources: [], captures: [] };
    for (const op of operators) {
      const source = { id: `${op.slug}-source`, operatorId: op.slug, url: base.sourceUrl };
      manifest.sources.push(source);
      manifest.captures.push(archiveCapture(directory, source, "direct", { text, body: text,
        status: "ok", contentType: "text/plain", finalUrl: base.sourceUrl, capturedAt: base.capturedAt }, {}));
    }
    writeFileSync(join(directory, "manifest.json"), JSON.stringify(manifest));
    writeFileSync(join(directory, "operators-config.json"), JSON.stringify(operators));
    const mock = join(directory, "mock.mjs");
    const candidate = deterministicExtract([{ sourceId: "source", text }]).offers[0];
    writeFileSync(mock, `
      import ${JSON.stringify(resolve("scripts/monitor/no-network.mjs"))};
      const candidate = ${JSON.stringify(candidate)};
      globalThis.fetch = async (url, options) => {
        if (url !== "https://model.invalid/mock") throw Error("unexpected_model_endpoint");
        const request = JSON.parse(options.body);
        const user = JSON.parse(request.messages[1].content);
        const repair = !Array.isArray(user);
        const record = {...candidate, sourceId: (repair ? user.pages : user)[0].sourceId,
          immediateSc: repair ? 1 : 999};
        return {ok: true, json: async () => ({choices: [{finish_reason:"stop",
          message:{content:JSON.stringify({offers:[record],facts:[],statements:[]})}}]})};
      };
    `);
    const env = { PATH: process.env.PATH, HOME: process.env.HOME, MONITOR_USE_MODEL: "true",
      MONITOR_MODEL: "fixture", MONITOR_MODEL_KEY: "fixture-only", MONITOR_MODEL_URL: "https://model.invalid/mock" };
    const run = extra => execFileSync(process.execPath, ["--import", mock, "scripts/monitor/numeric.mjs", directory],
      { env: { ...env, ...extra }, stdio: "pipe", timeout: 20000 });
    run({});
    const first = JSON.parse(readFileSync(join(directory, "numeric-evaluation.json")));
    assert.equal(first.modelCalls, 12);
    assert.equal(first.repair.recovered, 1);
    assert.equal(first.modelErrors.length, 0);
    const readOffers = () => JSON.parse(readFileSync(join(directory, "numeric.json"))).operators
      .map(op => op.offers.map(({ extractedAt, ...offer }) => offer));
    const offers = readOffers();
    run({ MONITOR_CACHE_ONLY: "true" });
    const replay = JSON.parse(readFileSync(join(directory, "numeric-evaluation.json")));
    assert.equal(replay.modelCalls, 0);
    assert.equal(replay.repair.status, "replayed", JSON.stringify({ first: first.repair, replay: replay.repair }));
    assert.deepEqual(readOffers(), offers);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
