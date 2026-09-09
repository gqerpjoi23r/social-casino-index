// Content validation for article front matter. Run: npm run content:validate
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const REQUIRED = [
  "title", "description", "permalink", "status", "publishedAt",
  "updatedAt", "authorId", "reviewer", "primaryQuery", "disclosure"
];
const ARTICLE_DIRS = ["src/research", "src/guides"];
const ARTICLE_FILES = ["src/redemption-times/index.njk", "src/taxes.njk"];

let failures = 0;
let checked = 0;

// Extract a front-matter scalar value.
function fmValue(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, "m"));
  return m ? m[1].trim() : null;
}

// In a git repo, detect content edits to src/research files whose updatedAt
// was not advanced past the last committed value. Only runs when git history
// is available and the file is tracked; silently skips otherwise.
function checkStaleUpdatedAt(file) {
  let prev;
  try {
    prev = execSync(`git show HEAD:"${file}"`, { stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch {
    return; // not tracked yet, or no git history
  }
  const cur = readFileSync(file, "utf8");
  if (cur === prev) return; // no change at all

  const prevFm = (prev.match(/^---\n([\s\S]*?)\n---/) || [])[1];
  const curFm = (cur.match(/^---\n([\s\S]*?)\n---/) || [])[1];
  if (!prevFm || !curFm) return;

  const prevUpdated = fmValue(prevFm, "updatedAt");
  const curUpdated = fmValue(curFm, "updatedAt");

  // Compare body (content after front matter). If the body changed but the
  // updatedAt date is unchanged, the "Last updated" date is stale.
  const prevBody = prev.replace(/^---\n[\s\S]*?\n---/, "").trim();
  const curBody = cur.replace(/^---\n[\s\S]*?\n---/, "").trim();
  const today = new Date().toISOString().slice(0, 10);
  // Fail only if the body changed AND updatedAt was neither advanced past the
  // committed value NOR set to today (a same-day re-edit is still "updated
  // today", which is accurate for readers and crawlers).
  if (prevBody !== curBody && prevUpdated === curUpdated && curUpdated !== today) {
    console.error(`FAIL ${file}: content changed but "updatedAt" was not bumped (still ${curUpdated}). Run: npm run content:touch -- ${file}`);
    failures++;
  }
}

function frontMatter(file) {
  const text = readFileSync(file, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

function validateArticle(file, { checkUpdatedAt = true } = {}) {
  const fm = frontMatter(file);
  if (!fm) {
    console.error(`FAIL ${file}: no front matter`);
    failures++;
    return;
  }
  checked++;
  for (const key of REQUIRED) {
    if (!new RegExp(`^${key}:`, "m").test(fm)) {
      console.error(`FAIL ${file}: missing required key "${key}"`);
      failures++;
    }
  }
  for (const key of ["publishedAt", "updatedAt"]) {
    const m = fm.match(new RegExp(`^${key}:\\s*"?(\\d{4}-\\d{2}-\\d{2})"?`, "m"));
    if (!m) {
      console.error(`FAIL ${file}: ${key} must be an ISO date (YYYY-MM-DD)`);
      failures++;
    }
  }
  if (checkUpdatedAt) checkStaleUpdatedAt(file);
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (/\.(njk|md)$/.test(p)) validateArticle(p);
  }
}

for (const dir of ARTICLE_DIRS) walk(dir);
for (const file of ARTICLE_FILES) validateArticle(file);

const operatorTemplate = "src/redemption-times/operator.njk";
const operatorFm = frontMatter(operatorTemplate);
const operatorRequired = ["layout", "pagination", "permalink", "eleventyComputed"];
if (!operatorFm) {
  console.error(`FAIL ${operatorTemplate}: no front matter`);
  failures++;
} else {
  checked++;
  for (const key of operatorRequired) {
    if (!new RegExp(`^${key}:`, "m").test(operatorFm)) {
      console.error(`FAIL ${operatorTemplate}: missing required key "${key}"`);
      failures++;
    }
  }
  for (const key of ["data", "size", "alias", "title", "description"]) {
    if (!new RegExp(`^\\s+${key}:`, "m").test(operatorFm)) {
      console.error(`FAIL ${operatorTemplate}: missing pagination/computed key "${key}"`);
      failures++;
    }
  }
}

const operators = JSON.parse(readFileSync("src/_data/operators.json", "utf8"));
const requiredOperatorFields = [
  "slug", "name", "position", "bestFor", "summary", "offer", "games",
  "publishedEstimate", "firstRedemption", "repeatRedemption", "methods",
  "minRedemption", "playthrough", "kyc", "availability",
  "verificationStatus", "verifiedAt", "strengths", "tradeoffs", "sources"
];
const slugs = new Set();
for (const [index, operator] of operators.entries()) {
  for (const key of requiredOperatorFields) {
    if (operator[key] == null || operator[key] === "") {
      console.error(`FAIL operators.json record ${index}: missing "${key}"`);
      failures++;
    }
  }
  if (slugs.has(operator.slug)) {
    console.error(`FAIL operators.json: duplicate slug "${operator.slug}"`);
    failures++;
  }
  slugs.add(operator.slug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(operator.verifiedAt || "")) {
    console.error(`FAIL operators.json ${operator.slug}: verifiedAt must be an ISO date`);
    failures++;
  }
  if (!Array.isArray(operator.sources) || operator.sources.length === 0) {
    console.error(`FAIL operators.json ${operator.slug}: at least one source is required`);
    failures++;
  }
  if (!Array.isArray(operator.strengths) || !Array.isArray(operator.tradeoffs)) {
    console.error(`FAIL operators.json ${operator.slug}: strengths and tradeoffs must be arrays`);
    failures++;
  }
  if (operator.partner) {
    try {
      statSync(join("src/go", operator.slug, "index.html"));
    } catch {
      console.error(`FAIL operators.json ${operator.slug}: partner affiliate route is missing`);
      failures++;
    }
  }
}
const serialized = JSON.stringify(operators);
if (/(api[_-]?key|secret|password|bearer\s+[a-z0-9])/i.test(serialized)) {
  console.error("FAIL operators.json: possible secret material");
  failures++;
}

if (failures) {
  console.error(`\n${failures} problem(s) across ${checked} article file(s).`);
  process.exit(1);
}
console.log(`OK: ${checked} article file(s) passed content validation.`);
