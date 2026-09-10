import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { verifyArchive } from "./archive.mjs";
import { baselineScope } from "./state-core.mjs";

const sourceRunId = process.argv[2];
if (!/^[\w-]+$/.test(sourceRunId || "")) throw new Error("invalid_archive_run_id");
if (!process.env.MONITOR_BUCKET) throw new Error("archive_bucket_required");
const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.env.GITHUB_RUN_ID || "local"}-reextract`;
const directory = resolve(".monitor", runId);
mkdirSync(directory, { recursive: true });
execFileSync("aws", ["s3", "cp", `s3://${process.env.MONITOR_BUCKET}/runs/${sourceRunId}/`, directory,
  "--recursive", "--only-show-errors", "--region", process.env.AWS_REGION || "eu-north-1"], { stdio: "pipe", timeout: 180000 });
verifyArchive(directory);
const path = join(directory, "manifest.json");
const manifest = JSON.parse(readFileSync(path, "utf8"));
manifest.runId = runId;
manifest.reextractedFrom = sourceRunId;
manifest.scope = baselineScope();
writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(join(directory, "reextraction.json"), JSON.stringify({
  sourceRunId, runId, scrapedAgain: false, createdAt: new Date().toISOString(),
}) + "\n");
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `capture_path=${directory}\n`);
console.log(`Restored verified source archive ${sourceRunId} for model re-extraction; zero scrape calls.`);
