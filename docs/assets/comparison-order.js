export const SORTS = [
  { key: "signup", direction: "desc", label: "Highest signup SC" },
  { key: "gift", direction: "asc", label: "Lowest gift-card minimum" },
  { key: "cash", direction: "asc", label: "Lowest cash minimum" },
];

export function currentValue(row, key, now) {
  const field = row[key];
  return field && Number.isFinite(field.sortValue) &&
    Number.isFinite(field.validUntil) && now <= field.validUntil ? field.sortValue : null;
}

export function eligibleSorts(rows, now = Date.now()) {
  return SORTS.filter(({ key }) => {
    const current = rows.filter(row => currentValue(row, key, now) !== null);
    return current.length >= 2 && new Set(current.map(row => row[key].unit)).size === 1;
  });
}

export function compareOperators(a, b, key, direction, now = Date.now()) {
  const alphabetical = a.name.localeCompare(b.name, "en");
  if (key === "name") return alphabetical;
  const left = currentValue(a, key, now);
  const right = currentValue(b, key, now);
  if (left === null || right === null) {
    return left === right ? alphabetical : left === null ? 1 : -1;
  }
  return (left - right) * (direction === "desc" ? -1 : 1) || alphabetical;
}

export function defaultOrder(rows, now = Date.now()) {
  const sort = eligibleSorts(rows, now)[0];
  return rows.sort((a, b) => compareOperators(a, b, sort?.key || "name", sort?.direction, now));
}
