// Generates the shared Open Graph image from the repository hero photo.
// Requires Pillow; this is a local build aid, not a production dependency.
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts/render-social-card.py");
const useSource = process.argv.includes("--from-source");
const output = useSource
  ? join(root, "src/assets/social-card.jpg")
  : join(root, "docs/assets/social-card.jpg");

mkdirSync(dirname(output), { recursive: true });
const result = spawnSync("python3", [script, output], { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status);
