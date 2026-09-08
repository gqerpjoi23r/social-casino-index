// Content validation for article front matter. Run: npm run content:validate
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REQUIRED = [
  "title", "description", "permalink", "status", "publishedAt",
  "updatedAt", "authorId", "reviewer", "primaryQuery", "disclosure"
];
const ARTICLE_DIRS = ["src/research"];

let failures = 0;
let checked = 0;

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
  }
}

for (const dir of ARTICLE_DIRS) walk(dir);

if (failures) {
  console.error(`\n${failures} problem(s) across ${checked} article file(s).`);
  process.exit(1);
}
console.log(`OK: ${checked} article file(s) passed content validation.`);
