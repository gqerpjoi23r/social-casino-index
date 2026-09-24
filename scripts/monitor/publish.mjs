import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { verifyArchive, readCapture } from "./archive.mjs";
import { productionRun, publicNumeric } from "./publication-core.mjs";
import { hash } from "./core.mjs";
import { comparisonCoverage } from "./coverage.mjs";
import { buildBenchmarks } from "./benchmarks.mjs";
import { productReport } from "./product-report.mjs";

const directory = process.argv[2];
const read = path => JSON.parse(readFileSync(path, "utf8"));
const manifest = read(join(directory, "manifest.json"));
if (!productionRun(manifest)) throw new Error("publication_requires_live_production_run");
const verification = verifyArchive(directory, { allowPartial: true });
const receipt = read(join(directory, "archive-verified.json"));
if (receipt.runId !== manifest.runId || receipt.integrityHash !== hash(readFileSync(join(directory, "integrity.json")))) {
  throw new Error("remote_archive_verification_required");
}
if (!manifest.completedAt) throw new Error("collection_incomplete");
const operators = read("src/_data/operators.json");
if (operators.some(operator => !manifest.sources.some(source => source.operatorId === operator.slug))) {
  throw new Error("all_operators_must_be_attempted");
}
const captures = manifest.captures.filter(entry => !manifest.sources.some(source =>
  verification.blockedOperators.includes(source.operatorId) && entry.id.startsWith(`${source.id}-`)))
  .map(entry => readCapture(directory, entry));
const previous = existsSync("src/_data/numeric.json") ? read("src/_data/numeric.json") : null;
const reviewPath = process.env.MONITOR_REVIEWED || ".monitor/reviewed.json";
const reviewed = existsSync(reviewPath) ? read(reviewPath) : { operators: [] };
const extracted = existsSync(join(directory, "numeric.json")) ? read(join(directory, "numeric.json")) : null;
const evaluation = existsSync(join(directory, "numeric-evaluation.json")) ? read(join(directory, "numeric-evaluation.json")) : null;
const absenceReviews = read("data/monitor/disclosure-reviews.json").reviews;
const numeric = publicNumeric(operators, reviewed, manifest, captures, previous, extracted, evaluation, verification.blockedOperators, absenceReviews);
const coverage = comparisonCoverage(numeric, operators, evaluation);
const impact = productReport(buildBenchmarks(previous, operators), buildBenchmarks(numeric, operators));
writeFileSync(join(directory, "product-impact.md"), impact);
writeFileSync(join(directory, "comparison-coverage.json"), JSON.stringify(coverage, null, 2) + "\n");
console.log(`Comparison coverage ${coverage.status}: ${JSON.stringify(coverage.fields)}`);
if (coverage.status === "incomplete") console.log("::warning::Comparison fields remain incomplete; collection success is not complete numeric coverage.");
const monitor = read(join(directory, "monitor.json"));
monitor.summary.providerCalls.model += evaluation?.modelCalls || 0;
monitor.summary.repair = evaluation?.repair ? {
  operator: evaluation.repair.operator, status: evaluation.repair.status, recovered: evaluation.repair.recovered,
} : null;
// Raw passages remain private; validated typed claims are explicitly unreviewed.
monitor.events = monitor.events.map(event => ({ ...event, before: [], after: [] }));
monitor.sources = {};
delete monitor.discovery;
monitor.operators.forEach(operator => {
  Object.values(operator.fields).forEach(field => { field.quotes = []; });
});
monitor.publication = { runId: manifest.runId, lastSuccessfulRefresh: manifest.completedAt, staleAfterHours: 36 };
writeFileSync("src/_data/monitor.json", JSON.stringify(monitor, null, 2) + "\n");
writeFileSync("src/_data/numeric.json", JSON.stringify(numeric, null, 2) + "\n");
writeFileSync(join(directory, "publication.json"), JSON.stringify({
  runId: manifest.runId, numericHash: hash(readFileSync("src/_data/numeric.json")),
  monitorHash: hash(readFileSync("src/_data/monitor.json")),
}) + "\n");
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `\n## Public refresh\nRun: ${manifest.runId}\n\nPublished ${numeric.operators.length} operators. New source-grounded claims feed the published-benefit benchmarks; these are not funded payout results.\n\n## Comparison coverage: ${coverage.status}\n\n| Operator | Comparable attributes | Missing |\n| --- | --- | --- |\n${coverage.operators.map(row =>
      `| ${row.slug} | ${row.comparable}/${row.total} | ${row.missing.join(", ") || "None"} |`).join("\n")}\n`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${impact}`);
}
console.log(`Published all ${numeric.operators.length} operator readouts for ${manifest.runId}`);
