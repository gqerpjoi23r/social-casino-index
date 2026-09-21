import { readFileSync } from "node:fs";
import { buildBenchmarks } from "../../scripts/monitor/benchmarks.mjs";

export default function () {
  return buildBenchmarks(
    JSON.parse(readFileSync(new URL("./numeric.json", import.meta.url))),
    JSON.parse(readFileSync(new URL("./operators.json", import.meta.url))),
  );
}
