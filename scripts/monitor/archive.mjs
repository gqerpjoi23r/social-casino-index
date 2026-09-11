import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { hash } from "./core.mjs";

export function uploadFile(directory, path, env = process.env) {
  if (!env.MONITOR_BUCKET) {
    if (env.CI) throw new Error("archive_bucket_required");
    return null;
  }
  const key = `runs/${directory.split("/").at(-1)}/${relative(directory, path)}`;
  execFileSync("aws", ["s3", "cp", path, `s3://${env.MONITOR_BUCKET}/${key}`, "--only-show-errors",
    "--region", env.AWS_REGION || "eu-north-1"], { stdio: ["ignore", "pipe", "pipe"], timeout: 60000 });
  return key;
}

export function saveJson(directory, name, value, env = process.env) {
  const path = join(directory, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
  uploadFile(directory, path, env);
  return path;
}

export function archiveCapture(directory, source, provider, result, env = process.env) {
  const id = `${source.id}-${provider}-${randomUUID()}`;
  const capture = {
    schemaVersion: 1, id, sourceId: source.id, operatorId: source.operatorId, purpose: source.purpose || null,
    requestedUrl: source.url, finalUrl: result.finalUrl, capturedAt: result.capturedAt || new Date().toISOString(),
    provider, status: result.status, httpStatus: result.httpStatus ?? null,
    context: { authenticated: false, country: provider === "direct" ? null : "US" },
    contentType: result.contentType, requestOptions: result.requestOptions || null,
    text: result.text, textHash: hash(result.text), links: result.links || [],
    markdown: result.markdown ?? null, html: result.html ?? null,
    rawHtml: result.rawHtml ?? null, pdfBase64: result.pdfBase64 ?? null,
    htmlStatus: result.html || result.rawHtml ? "available" : result.pdfBase64 ? "not_applicable_pdf" : "not_returned",
    body: result.body, providerMetadata: result.metadata || null,
  };
  const path = join(directory, "captures", `${id}.json.gz`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, gzipSync(JSON.stringify(capture)));
  const archiveKey = uploadFile(directory, path, env);
  return { id, path: relative(directory, path), archiveKey, capturedAt: capture.capturedAt,
    textHash: capture.textHash, sha256: hash(readFileSync(path)), status: capture.status,
    formats: ["text", "markdown", "html", "rawHtml", "pdfBase64"].filter(key => capture[key] !== null && capture[key] !== undefined) };
}

export function readCapture(directory, entry) {
  const bytes = readFileSync(join(directory, entry.path));
  if (hash(bytes) !== entry.sha256) throw new Error(`capture_hash_mismatch:${entry.id}`);
  const capture = JSON.parse(gunzipSync(bytes));
  if (hash(capture.text) !== capture.textHash || capture.textHash !== entry.textHash) throw new Error(`capture_text_hash_mismatch:${entry.id}`);
  return capture;
}

export function verifyArchive(directory, { allowPartial = false } = {}) {
  const index = JSON.parse(readFileSync(join(directory, "integrity.json"), "utf8"));
  const manifestBytes = readFileSync(join(directory, "manifest.json"));
  if (!index.files.some(file => file.path === "manifest.json" && file.sha256 === hash(manifestBytes))) {
    throw new Error("archive_manifest_integrity_required");
  }
  const manifest = JSON.parse(manifestBytes);
  const blockedOperators = new Set();
  function failure(path, error) {
    const entry = manifest.captures.find(entry => entry.path === path);
    const source = entry && manifest.sources.find(source => entry.id.startsWith(`${source.id}-`));
    const operator = source?.operatorId;
    if (!allowPartial || !operator) throw error;
    blockedOperators.add(operator);
  }
  for (const file of index.files) {
    if (file.path.includes("..") || file.path.startsWith("/")) throw new Error("invalid_archive_path");
    try {
      if (hash(readFileSync(join(directory, file.path))) !== file.sha256) throw new Error(`archive_hash_mismatch:${file.path}`);
    } catch (error) { failure(file.path, error); }
  }
  for (const name of ["manifest.json", ...manifest.captures.map(entry => entry.path),
    ...["numeric.json", "numeric-evaluation.json"].filter(name => existsSync(join(directory, name)))]) {
    if (!index.files.some(file => file.path === name)) failure(name, new Error(`archive_missing:${name}`));
  }
  for (const entry of manifest.captures) {
    try { readCapture(directory, entry); } catch (error) { failure(entry.path, error); }
  }
  if (manifest.completedAt) for (const name of ["summary.json", "monitor.json", "usage.json"]) {
    if (!index.files.some(file => file.path === name)) throw new Error(`archive_missing:${name}`);
  }
  return { files: index.files.length, captures: manifest.captures.length, blockedOperators: [...blockedOperators] };
}

export function uploadDirectory(directory, env = process.env) {
  const files = readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && !["integrity.json", "archive-verified.json", "publication.json"].includes(entry.name))
    .map(entry => {
      const path = join(entry.parentPath || entry.path, entry.name);
      return { path: relative(directory, path), sha256: hash(readFileSync(path)) };
    }).sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(join(directory, "integrity.json"), JSON.stringify({ files }, null, 2) + "\n");
  const verification = verifyArchive(directory, { allowPartial: true });
  if (!env.MONITOR_BUCKET) {
    if (env.CI) throw new Error("archive_bucket_required");
    return verification;
  }
  execFileSync("aws", ["s3", "cp", directory, `s3://${env.MONITOR_BUCKET}/runs/${directory.split("/").at(-1)}/`,
    "--recursive", "--only-show-errors", "--region", env.AWS_REGION || "eu-north-1"],
  { stdio: ["ignore", "pipe", "pipe"], timeout: 180000 });
  const restored = mkdtempSync(join(tmpdir(), "sci-archive-verify-"));
  try {
    execFileSync("aws", ["s3", "cp", `s3://${env.MONITOR_BUCKET}/runs/${directory.split("/").at(-1)}/`, restored,
      "--recursive", "--only-show-errors", "--region", env.AWS_REGION || "eu-north-1"],
    { stdio: ["ignore", "pipe", "pipe"], timeout: 180000 });
    // Check against the LOCAL inventory so a stale remote inventory cannot pass.
    if (!existsSync(join(restored, "integrity.json")) ||
        hash(readFileSync(join(restored, "integrity.json"))) !== hash(readFileSync(join(directory, "integrity.json")))) {
      throw new Error("archive_inventory_mismatch");
    }
    const remote = verifyArchive(restored, { allowPartial: true });
    if (JSON.stringify(remote.blockedOperators) !== JSON.stringify(verification.blockedOperators)) {
      throw new Error("archive_operator_verification_mismatch");
    }
  } finally { rmSync(restored, { recursive: true, force: true }); }
  return verification;
}
