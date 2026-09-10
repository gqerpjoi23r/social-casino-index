import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
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
    schemaVersion: 1, id, sourceId: source.id, operatorId: source.operatorId,
    requestedUrl: source.url, finalUrl: result.finalUrl, capturedAt: result.capturedAt || new Date().toISOString(),
    provider, status: result.status, httpStatus: result.httpStatus ?? null,
    context: { authenticated: false, country: provider === "direct" ? null : "US" },
    contentType: result.contentType, requestOptions: result.requestOptions || null,
    text: result.text, textHash: hash(result.text), links: result.links || [],
    markdown: result.markdown ?? null, html: result.html ?? null,
    rawHtml: result.rawHtml ?? null, pdfBase64: result.pdfBase64 ?? null,
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
  return JSON.parse(gunzipSync(bytes));
}

export function uploadDirectory(directory, env = process.env) {
  if (!env.MONITOR_BUCKET) {
    if (env.CI) throw new Error("archive_bucket_required");
    return;
  }
  execFileSync("aws", ["s3", "cp", directory, `s3://${env.MONITOR_BUCKET}/runs/${directory.split("/").at(-1)}/`,
    "--recursive", "--only-show-errors", "--region", env.AWS_REGION || "eu-north-1"],
  { stdio: ["ignore", "pipe", "pipe"], timeout: 180000 });
}
