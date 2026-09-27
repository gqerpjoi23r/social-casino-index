import { readFileSync } from "node:fs";
import { visitRoutes } from "../../scripts/visit-routes.mjs";

export default function () {
  return visitRoutes(JSON.parse(readFileSync(new URL("./operators.json", import.meta.url))));
}
