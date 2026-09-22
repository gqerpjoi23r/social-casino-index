export const SORTS = {
  default: { label: "Most complete", direction: "desc" },
  welcome: { label: "Welcome offer", direction: "desc" },
  daily: { label: "Daily SC", direction: "desc" },
  redemption: { label: "Processing time", direction: "asc" },
  cash: { label: "Cash minimum", direction: "asc" },
};

const valid = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
export function compareAttribute(a, b, key, direction = SORTS[key]?.direction) {
  const av = a.sortValues?.[key];
  const bv = b.sortValues?.[key];
  if (valid(av) !== valid(bv)) return valid(av) ? -1 : 1;
  if (!valid(av)) return 0;
  // Free welcome SC and purchased SC-per-dollar are separate comparison groups.
  if (key === "welcome" && a.welcomeGroup !== b.welcomeGroup) return a.welcomeGroup - b.welcomeGroup;
  return (direction === "asc" ? 1 : -1) * (av - bv);
}

export function orderToplist(rows, key = "default", direction = SORTS[key]?.direction) {
  return [...rows].sort((a, b) => {
    if (key !== "default") return compareAttribute(a, b, key, direction) ||
      a.position - b.position || a.name.localeCompare(b.name, "en");
    return b.knownAttributeCount - a.knownAttributeCount ||
      (a.productMode === "entertainment_only") - (b.productMode === "entertainment_only") ||
      compareAttribute(a, b, "welcome") || compareAttribute(a, b, "daily") ||
      compareAttribute(a, b, "redemption") || compareAttribute(a, b, "cash") ||
      a.name.localeCompare(b.name, "en");
  });
}
