// Generate the versioned published-terms CSV from src/_data/operators.json.
// Output: src/assets/data/redemption-times-<version>.csv (passthrough-copied
// to the site and linked from the article's "Versions and data" table).
// Usage: node scripts/build-csv.mjs [version]   (default version: 2026.1)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2] || "2026.1";

const operators = JSON.parse(
  readFileSync(join(root, "src/_data/operators.json"), "utf8")
);

// CSV-escape a field (wrap in quotes when it contains a comma, quote or newline).
function esc(value) {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADER = [
  "operator", "parent", "published_estimate", "methods", "min_redemption",
  "first_redemption", "repeat_redemption", "terms_effective",
  "source_url", "access_date", "record_type",
];

const rows = [];
for (const op of operators) {
  const sources = Array.isArray(op.sources) && op.sources.length ? op.sources : [{}];
  for (const s of sources) {
    rows.push([
      op.name,
      op.parent || "",
      op.publishedEstimate || "",
      op.methods || "",
      op.minRedemption || "",
      op.firstRedemption || "",
      op.repeatRedemption || "",
      op.termsEffective || "",
      s.url || "",
      s.accessed || "",
      "published_terms",
    ]);
  }
}

const csv = [HEADER, ...rows].map((r) => r.map(esc).join(",")).join("\n") + "\n";

const outDir = join(root, "src/assets/data");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `redemption-times-${version}.csv`);
writeFileSync(outFile, csv);

// Validation: one row per (operator × source); at least one row per operator.
if (rows.length < operators.length) {
  console.error(`FAIL: CSV has ${rows.length} rows for ${operators.length} operators`);
  process.exit(1);
}
console.log(`Wrote ${outFile.replace(root + "/", "")}: ${rows.length} data rows, ${operators.length} operators, version ${version}`);
