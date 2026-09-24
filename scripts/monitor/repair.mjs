import { checkExtraction } from "./numeric-core.mjs";

export function repairTargets(rejected) {
  return rejected.filter(row => ["number_not_in_quote", "unsupported_quote"].includes(row.reason));
}

export function mergeRepairs(selected, parsed, pages) {
  const checked = checkExtraction(parsed, pages);
  const recovered = [];
  const repairedTargets = new Set();
  const accepted = structuredClone(selected.accepted);
  for (const kind of Object.keys(accepted)) for (const candidate of checked.accepted[kind]) {
    const target = repairTargets(selected.rejected).find(row => row.kind === kind &&
      row.item.sourceId === candidate.sourceId &&
      (kind === "offers" ? row.item.kind === candidate.kind && row.item.name === candidate.name :
        row.item.field === candidate.field && row.item.method === candidate.method));
    if (!target || accepted[kind].some(record => JSON.stringify(record) === JSON.stringify(candidate))) continue;
    accepted[kind].push(candidate);
    repairedTargets.add(target);
    recovered.push({ kind, item: candidate, reason: "captured_source_quote_repaired" });
  }
  return { ...selected, accepted, rejected: selected.rejected.filter(target => !repairedTargets.has(target)),
    recovered: [...(selected.recovered || []), ...recovered] };
}
