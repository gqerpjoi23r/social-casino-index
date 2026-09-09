// Read-only source checks. Writes findings only inside this research folder.
import { readFileSync, writeFileSync } from "node:fs";
import { Script, runInNewContext } from "node:vm";

const root = new URL("../../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const operators = JSON.parse(read("src/_data/operators.json"));
const code = read("src/assets/eligibility.js");
const cases = [
  { cookie: "", label: "no selection", expectedBlocked: true },
  { cookie: "sci_state=__dismissed", label: "dismissed then reload", expectedBlocked: true },
  { cookie: "sci_state=XX", label: "invalid state", expectedBlocked: true },
  { cookie: "sci_state=AL", label: "Jackpota-specific exclusion", expectedBlocked: true },
  { cookie: "sci_state=CA", label: "global closed state", expectedBlocked: true },
  { cookie: "sci_state=%", label: "malformed encoding", expectedBlocked: true },
];
const gateCases = cases.map(test => {
  const classes = new Set();
  const message = { textContent: "" };
  const box = {
    classList: { add: x => classes.add(x), remove: x => classes.delete(x) },
    querySelector: () => message,
    getAttribute: name => name === "data-cta-operator" ? "jackpota" : null,
  };
  const document = {
    cookie: test.cookie,
    documentElement: { classList: { add() {} } },
    querySelector: () => null,
    querySelectorAll: selector => selector === "[data-cta-operator]" ? [box] : [],
  };
  let error = null;
  try { runInNewContext(code, { document }); }
  catch (e) { error = e.message; }
  return {
    label: test.label,
    expectedBlocked: test.expectedBlocked,
    observedBlocked: classes.has("is-blocked"),
    error,
    message: message.textContent,
  };
});
const redirects = operators.map(op => {
  const html = read(`src/go/${op.slug}/index.html`);
  const start = html.indexOf("<script>") + "<script>".length;
  const end = html.indexOf("</script>", start);
  let error = null;
  try { new Script(html.slice(start, end)); }
  catch (e) { error = e.message; }
  return { slug: op.slug, syntaxError: error };
});
const isUnknown = value => /require a live account check|not publicly verified|not included until independently verified/i.test(value);
const findings = {
  checkedAt: new Date().toISOString(),
  scope: "Repository gate logic with a minimal DOM fixture, inline script syntax, and data completeness. Not an end-to-end browser test.",
  gateCases,
  redirects,
  completeness: {
    operators: operators.length,
    offerPlaceholders: operators.filter(o => isUnknown(o.offer)).map(o => o.slug),
    dailyPlaceholders: operators.filter(o => isUnknown(o.dailyValue)).map(o => o.slug),
    packagePlaceholders: operators.filter(o => isUnknown(o.packageValue)).map(o => o.slug),
    pendingTestRecords: operators.filter(o => o.testStatus === "pending").map(o => o.slug),
    testLog: JSON.parse(read("src/_data/tests.json")),
    firstFiveAllPartners: operators.slice(0, 5).every(o => o.partner),
  },
};
writeFileSync(new URL("local-audit.json", import.meta.url), JSON.stringify(findings, null, 2) + "\n");
console.log(JSON.stringify(findings, null, 2));
