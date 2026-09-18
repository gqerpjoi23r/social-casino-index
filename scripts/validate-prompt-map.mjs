import { readFileSync, existsSync } from "node:fs";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "cheerio";

export function validatePromptMap(markdown, readPage) {
  const errors = [];
  let targets = 0;
  for (const line of markdown.split("\n")) {
    if (!/^\|\s*\d+[a-z]?\s*\|/.test(line)) continue;
    targets++;
    const target = line.split("|")[3]?.trim();
    if (!/^\/[^ \t]*$/.test(target) || target.startsWith("//")) {
      errors.push(`Expected one local target: ${target}`);
      continue;
    }
    const url = new URL(target, "https://socialcasinoindex.com");
    const html = readPage(url.pathname);
    if (html == null) {
      errors.push(`Missing page: ${target}`);
      continue;
    }
    if (url.hash) {
      const $ = load(html);
      const id = decodeURIComponent(url.hash.slice(1));
      if (!$("[id]").toArray().some(element => $(element).attr("id") === id)) {
        errors.push(`Missing fragment: ${target}`);
      }
    }
  }
  if (!targets) errors.push("No prompt targets found");
  return { errors, targets };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve("docs");
  const markdown = readFileSync("strategy/prompt-map.md", "utf8");
  const result = validatePromptMap(markdown, pathname => {
    const file = resolve(root, `.${pathname}`, "index.html");
    return file.startsWith(root + sep) && existsSync(file) ? readFileSync(file, "utf8") : null;
  });
  if (readFileSync("docs/strategy/prompt-map.md", "utf8") !== markdown) result.errors.push("Published prompt map differs from source");
  if (result.errors.length) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  } else console.log(`OK: ${result.targets} prompt targets resolve to built pages and fragments.`);
}
