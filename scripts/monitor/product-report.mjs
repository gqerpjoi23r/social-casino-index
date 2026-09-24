export function productReport(before, after) {
  const visible = model => model.toplist.homepageRows || model.toplist.rows;
  const previous = new Map(before.toplist.rows.map(row => [row.slug, row]));
  const entered = visible(after).filter(row => !visible(before).some(old => old.slug === row.slug)).map(row => row.name);
  const left = visible(before).filter(row => !visible(after).some(next => next.slug === row.slug)).map(row => row.name);
  const changes = [];
  for (const row of after.toplist.rows) for (const key of ["signup", "purchase", "daily", "redemption", "cash"]) {
    const oldRow = previous.get(row.slug);
    const old = oldRow?.[key] || (key === "signup" && oldRow?.welcomeGroup === 0 ? oldRow.welcome : null);
    const next = row[key];
    if (JSON.stringify([old?.label, old?.note, old?.recordId, old?.sourceUrl, old?.observedAt, old?.conditions]) !==
        JSON.stringify([next?.label, next?.note, next?.recordId, next?.sourceUrl, next?.observedAt, next?.conditions])) {
      changes.push({ operator: row.name, field: key, before: old?.label || "Unknown",
        after: next?.label || "Unknown", recordId: next?.recordId || null });
    }
  }
  return [
    "## Product impact", "",
    `Homepage before: ${visible(before).map(row => row.name).join(", ") || "None"}.`,
    `Homepage after: ${visible(after).map(row => row.name).join(", ") || "None"}.`,
    `Entered: ${entered.join(", ") || "None"}. Left homepage: ${left.join(", ") || "None"}.`,
    `Comparable categories before: ${JSON.stringify(before.toplist.coverage)}; after: ${JSON.stringify(after.toplist.coverage)}.`,
    "", "| Operator | Field | Before | After |", "| --- | --- | --- | --- |",
    ...changes.map(change => `| ${change.operator} | ${change.field} | ${change.before.replaceAll("|", "/")} | ${change.after.replaceAll("|", "/")} |`),
    "", "### Remaining gaps", "",
    ...after.toplist.rows.filter(row => row.missingAttributes.length).map(row =>
      `- ${row.name}: ${row.missingAttributes.join(", ")}${row.homepageEligible ? "" : " (not on homepage)"}.`),
    "", "Collection readability is not comparison coverage. Observation dates and conditions remain attached to each record.",
  ].join("\n") + "\n";
}
