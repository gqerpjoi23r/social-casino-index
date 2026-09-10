import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, basename } from "node:path";
import { uploadDirectory } from "./archive.mjs";

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
mkdirSync(".monitor", { recursive: true });
if (command === "restore") {
  if (!download("runs/latest.json", pointerPath, true)) {
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
  uploadDirectory(directory);
  const manifest = read(join(directory, "manifest.json"));
  if (!manifest.completedAt || !existsSync(join(directory, "monitor.json"))) {
    console.log("Partial run archived; previous completed baseline retained.");
  } else {
    const prior = existsSync(pointerPath) ? read(pointerPath) : {};
    const evaluationPath = join(directory, "numeric-evaluation.json");
    const evaluation = existsSync(evaluationPath) ? read(evaluationPath) : null;
    const usable = evaluation && evaluation.modelErrors.length === 0 && evaluation.replayEvents === 0;
    const pointer = { runId: basename(directory), numericRunId: usable ? basename(directory) : prior.numericRunId || null };
    writeFileSync(pointerPath, JSON.stringify(pointer, null, 2) + "\n");
    aws(["s3", "cp", pointerPath, `s3://${bucket}/runs/latest.json`, "--only-show-errors"]);
    console.log(`Archived ${pointer.runId}; numeric baseline: ${pointer.numericRunId || "none"}.`);
  }
} else {
  throw new Error("Usage: node scripts/monitor/state.mjs restore|finish [capture-directory]");
}
