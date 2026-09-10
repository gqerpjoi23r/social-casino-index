import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { verifyArchive } from "./archive.mjs";
import { changeSignals } from "./numeric-core.mjs";

const directory = resolve(process.argv[2]);
const verified = verifyArchive(directory);
const read = path => JSON.parse(readFileSync(path, "utf8"));
const original = read(join(directory, "numeric.json"));
const work = mkdtempSync(join(tmpdir(), "sci-offline-replay-"));
try {
  cpSync(directory, work, { recursive: true });
  const env = { ...process.env, CI: "", MONITOR_BUCKET: "", MONITOR_USE_MODEL: original.model ? "true" : "false",
    MONITOR_MODEL: original.model || "", MONITOR_MODEL_KEY: "", MONITOR_CACHE_ONLY: "true", MONITOR_FORCE_MODEL: "",
    MONITOR_PREVIOUS: existsSync(join(work, "previous-numeric.json")) ? join(work, "previous-numeric.json") : "" };
  for (const script of ["evaluate", "numeric"]) {
    execFileSync(process.execPath, ["--import", resolve("scripts/monitor/no-network.mjs"),
      `scripts/monitor/${script}.mjs`, work], { env, stdio: "pipe", timeout: 120000 });
  }
  const replayed = read(join(work, "numeric.json"));
  assert.deepEqual(changeSignals(original, replayed), []);
  assert.deepEqual(replayed.events, original.events);
  const evaluation = read(join(work, "numeric-evaluation.json"));
  assert.equal(evaluation.modelCalls, 0);
  assert.equal(evaluation.modelErrors.length, 0);
  const result = { ...verified, networkDisabled: true, newScrapes: 0, newModelCalls: 0, identicalNumericEvents: 0,
    runId: original.runId, verifiedAt: new Date().toISOString() };
  writeFileSync(join(directory, "offline-replay.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
} finally { rmSync(work, { recursive: true, force: true }); }
