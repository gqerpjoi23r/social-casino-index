// Stamp an article's updatedAt (front matter) and dateModified (JSON-LD) to
// today, for the "last updated" SEO signal. Usage:
//   npm run content:touch -- src/research/<slug>.njk
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run content:touch -- <article-file>");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
let text = readFileSync(file, "utf8");

const before = text;
text = text
  .replace(/^updatedAt:\s*"?\d{4}-\d{2}-\d{2}"?/m, `updatedAt: "${today}"`)
  .replace(/dateModified:\s*"\d{4}-\d{2}-\d{2}"/, `dateModified: "${today}"`);

if (text === before) {
  console.error(`No updatedAt/dateModified found in ${file}`);
  process.exit(1);
}

writeFileSync(file, text);
console.log(`Touched ${file}: updatedAt/dateModified set to ${today}`);
