// Content validation for article front matter. Run: npm run content:validate
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const REQUIRED = [
  "title", "description", "permalink", "status", "publishedAt",
  "updatedAt", "authorId", "reviewer", "primaryQuery", "disclosure"
];
const ARTICLE_DIRS = ["src/research"];

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
  if (prevBody !== curBody && prevUpdated === curUpdated) {
    console.error(`FAIL ${file}: content changed but "updatedAt" was not bumped (still ${curUpdated}). Run: npm run content:touch -- ${file}`);
    failures++;
  }
}

function frontMatter(file) {
  const text = readFileSync(file, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(njk|md)$/.test(p)) continue;
    const fm = frontMatter(p);
    if (!fm) { console.error(`FAIL ${p}: no front matter`); failures++; continue; }
    checked++;
    for (const key of REQUIRED) {
      if (!new RegExp(`^${key}:`, "m").test(fm)) {
        console.error(`FAIL ${p}: missing required key "${key}"`);
        failures++;
      }
    }
    for (const key of ["publishedAt", "updatedAt"]) {
      const m = fm.match(new RegExp(`^${key}:\\s*"?(\\d{4}-\\d{2}-\\d{2})"?`, "m"));
      if (!m) { console.error(`FAIL ${p}: ${key} must be an ISO date (YYYY-MM-DD)`); failures++; }
    }
    checkStaleUpdatedAt(p);
  }
}

for (const dir of ARTICLE_DIRS) walk(dir);

if (failures) {
  console.error(`\n${failures} problem(s) across ${checked} article file(s).`);
  process.exit(1);
}
console.log(`OK: ${checked} article file(s) passed content validation.`);
