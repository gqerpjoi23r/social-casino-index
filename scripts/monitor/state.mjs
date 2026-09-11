import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, basename } from "node:path";
import { uploadDirectory } from "./archive.mjs";
import { baselineKey, usableRun } from "./state-core.mjs";
import { hash } from "./core.mjs";
import { productionRun } from "./publication-core.mjs";

const [command, directory] = process.argv.slice(2);
const bucket = process.env.MONITOR_BUCKET;
if (!bucket) throw new Error("archive_bucket_required");
const aws = args => execFileSync("aws", [...args, "--region", process.env.AWS_REGION || "eu-north-1"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60000 });
const read = path => JSON.parse(readFileSync(path, "utf8"));
function download(key, path, optional = false) {
  try { aws(["s3api", "get-object", "--bucket", bucket, "--key", key, path]); return true; }
  catch (error) {
    if (optional && /NoSuchKey|Not Found|\(404\)/.test(String(error.stderr))) return false;
    throw new Error("archive_state_download_failed", { cause: error });
  }
}
const pointerPath = ".monitor/latest.json";
const pointerKey = baselineKey();
mkdirSync(".monitor", { recursive: true });
if (command === "restore") {
  const reviewReference = read("scripts/monitor/review-reference.json");
  const reviewedPath = ".monitor/reviewed.json";
  download(reviewReference.key, reviewedPath);
  if (hash(readFileSync(reviewedPath)) !== reviewReference.sha256) throw new Error("reviewed_reference_integrity_failed");
  if (!download(pointerKey, pointerPath, true)) {
    console.log("No previous private run; using committed observation history.");
  } else {
    const pointer = read(pointerPath);
    if (!/^[\w-]+$/.test(pointer.runId)) throw new Error("invalid_archive_run_id");
    const statePath = ".monitor/previous-monitor.json";
    download(`runs/${pointer.runId}/monitor.json`, statePath);
    const ledgerPath = ".monitor/previous-budget.json";
    if (download(`runs/${pointer.runId}/budget.json`, ledgerPath, true)) {
      const state = read(statePath);
      state.spending = read(ledgerPath);
      writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
    }
    const numericRunId = pointer.numericRunId;
    if (numericRunId && !/^[\w-]+$/.test(numericRunId)) throw new Error("invalid_archive_run_id");
    const numericPath = ".monitor/previous-numeric.json";
    if (numericRunId) download(`runs/${numericRunId}/numeric.json`, numericPath);
    if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV,
      `MONITOR_PREVIOUS_STATE=${statePath}\n${numericRunId ? `MONITOR_PREVIOUS=${numericPath}\n` : ""}`);
    console.log(`Restored ${pointer.runId}; numeric baseline: ${numericRunId || "none"}.`);
  }
} else if (command === "finish" && directory) {
  const verification = uploadDirectory(directory);
  const manifest = read(join(directory, "manifest.json"));
  writeFileSync(join(directory, "archive-verified.json"), JSON.stringify({
    runId: manifest.runId, integrityHash: hash(readFileSync(join(directory, "integrity.json"))),
    blockedOperators: verification.blockedOperators,
  }) + "\n");
  console.log(`Verified remote archive ${manifest.runId}; baseline unchanged until publication.`);
} else if (command === "advance" && directory) {
  const manifest = read(join(directory, "manifest.json"));
  const receipt = read(join(directory, "archive-verified.json"));
  const publication = read(join(directory, "publication.json"));
  if (receipt.blockedOperators?.length) {
    console.log("Corrupt operator archive; baseline retained.");
    process.exit(0);
  }
  if (!productionRun(manifest) || receipt.runId !== manifest.runId ||
      publication.runId !== manifest.runId ||
      publication.numericHash !== hash(readFileSync("src/_data/numeric.json")) ||
      publication.monitorHash !== hash(readFileSync("src/_data/monitor.json")) ||
      receipt.integrityHash !== hash(readFileSync(join(directory, "integrity.json")))) {
    throw new Error("verified_production_publication_required");
  }
  if (!manifest.completedAt || !existsSync(join(directory, "monitor.json"))) {
    console.log("Partial run archived; previous completed baseline retained.");
  } else {
    const prior = existsSync(pointerPath) ? read(pointerPath) : {};
    const evaluationPath = join(directory, "numeric-evaluation.json");
    const evaluation = existsSync(evaluationPath) ? read(evaluationPath) : null;
    const replayPath = join(directory, "replay-evaluation.json");
    const replay = existsSync(replayPath) ? read(replayPath) : null;
    if (usableRun(manifest, evaluation, replay)) {
      const pointer = { runId: basename(directory), numericRunId: basename(directory), scope: manifest.scope };
      writeFileSync(pointerPath, JSON.stringify(pointer, null, 2) + "\n");
      aws(["s3", "cp", pointerPath, `s3://${bucket}/${pointerKey}`, "--only-show-errors"]);
      console.log(`Verified archive ${pointer.runId}; advanced ${pointerKey}.`);
    } else console.log(`Run archived; retained prior usable baseline ${prior.runId || "none"}.`);
  }
} else {
  throw new Error("Usage: node scripts/monitor/state.mjs restore|finish|advance [capture-directory]");
}
