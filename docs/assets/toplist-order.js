export const SORTS = {
  welcome: { label: "Highest free signup offer", direction: "desc" },
  purchase: { label: "Best purchase value", direction: "desc" },
  daily: { label: "Highest daily reward", direction: "desc" },
  redemption: { label: "Shortest published processing", direction: "asc" },
  cash: { label: "Lowest cash minimum", direction: "asc" },
};

const valid = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
export function compareAttribute(a, b, key, direction = SORTS[key]?.direction) {
  const av = a.sortValues?.[key];
  const bv = b.sortValues?.[key];
  if (valid(av) !== valid(bv)) return valid(av) ? -1 : 1;
  if (!valid(av)) return 0;
  return (direction === "asc" ? 1 : -1) * (av - bv);
}

export function orderToplist(rows, key = "welcome", direction = SORTS[key]?.direction) {
  return [...rows].sort((a, b) => compareAttribute(a, b, key, direction) ||
    a.name.localeCompare(b.name, "en") || a.slug.localeCompare(b.slug, "en"));
}
