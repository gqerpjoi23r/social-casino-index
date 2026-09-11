export function compareOperators(a, b, key, direction, now = Date.now()) {
  const alphabetical = a.name.localeCompare(b.name, "en");
  if (key === "name") return direction === "desc" ? -alphabetical : alphabetical;
  const value = row => {
    const field = row[key];
    return field && Number.isFinite(field.sortValue) &&
      Number.isFinite(field.validUntil) && now <= field.validUntil ? field.sortValue : null;
  };
  const left = value(a);
  const right = value(b);
  if (left === null || right === null) {
    return left === right ? alphabetical : left === null ? 1 : -1;
  }
  return (left - right) * (direction === "desc" ? -1 : 1) || alphabetical;
}

if (typeof document !== "undefined") {
  const table = document.querySelector("[data-comparison]");
  const select = document.querySelector("#updates-sort");
  if (table && select) {
    const rows = [...table.querySelectorAll("tbody[data-operator]")].map(element => ({
      element, ...JSON.parse(element.dataset.sort),
    }));
    const headers = [...table.querySelectorAll("button[data-sort-key]")];
    let key = "name";
    let direction = "asc";
    function sort(nextKey, nextDirection) {
      key = nextKey;
      direction = nextDirection;
      const now = Date.now();
      rows.sort((a, b) => compareOperators(a, b, key, direction, now));
      const focused = document.activeElement;
      // Move existing nodes so open details and their content survive every sort.
      for (const row of rows) table.append(row.element);
      if (focused?.isConnected) focused.focus({ preventScroll: true });
      for (const button of headers) {
        const active = button.dataset.sortKey === key;
        button.parentElement.setAttribute("aria-sort", active ? (direction === "asc" ? "ascending" : "descending") : "none");
        button.querySelector("i").className = `ph ${active ? direction === "asc" ? "ph-arrow-up" : "ph-arrow-down" : "ph-arrows-down-up"}`;
      }
      select.value = `${key}:${direction}`;
      document.querySelector("#updates-sort-status").textContent = `Sorted by ${select.selectedOptions[0].textContent}.`;
    }
    for (const button of headers) {
      button.disabled = false;
      button.addEventListener("click", () => sort(button.dataset.sortKey,
        key === button.dataset.sortKey && direction === "asc" ? "desc" : "asc"));
    }
    select.disabled = false;
    select.addEventListener("change", () => sort(...select.value.split(":")));
  }
}
