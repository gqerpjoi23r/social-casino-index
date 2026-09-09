// Self-host the Phosphor webfont (regular weight) so icons don't depend on a
// CDN. Copies the font + style.css from the installed @phosphor-icons/web
// package into src/assets/phosphor/, which Eleventy passthrough-copies to the
// site. Run as part of `npm run build`.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@phosphor-icons/web/src/regular");
const dest = join(root, "src/assets/phosphor");

mkdirSync(dest, { recursive: true });
for (const f of ["style.css", "Phosphor.woff2", "Phosphor.woff", "Phosphor.ttf"]) {
  copyFileSync(join(src, f), join(dest, f));
}
console.log("Phosphor icons copied to src/assets/phosphor/ (regular weight)");
