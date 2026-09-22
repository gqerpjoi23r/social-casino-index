import { orderToplist, SORTS } from "./toplist-order.js";

const table = document.querySelector(".toplist-table");
const select = document.querySelector("#toplist-sort");
if (table && select) {
  const body = table.tBodies[0];
  const elements = new Map();
  const rows = [...body.rows].map(element => {
    const row = JSON.parse(element.dataset.sort);
    elements.set(row.slug, element);
    return row;
  });
  let key = "default";
  let direction = "desc";
  const apply = () => {
    const sorted = orderToplist(rows, key, direction);
    sorted.forEach((row, index) => {
      const element = elements.get(row.slug);
      element.querySelector(".toplist-position").textContent = index + 1;
      body.append(element);
    });
    select.value = key;
    table.querySelectorAll("[data-sort-key]").forEach(button => {
      const active = button.dataset.sortKey === key;
      button.closest("th").setAttribute("aria-sort", active ?
        direction === "asc" ? "ascending" : "descending" : "none");
      button.querySelector("i").className = `ph ph-${active ? direction === "asc" ? "arrow-up" : "arrow-down" : "arrows-down-up"}`;
    });
    document.querySelector("#toplist-sort-status").textContent = `Sorted by ${SORTS[key].label}.`;
  };
  select.addEventListener("change", () => {
    key = select.value;
    direction = SORTS[key].direction;
    apply();
  });
  table.querySelectorAll("[data-sort-key]").forEach(button => {
    button.disabled = false;
    button.addEventListener("click", () => {
      const next = button.dataset.sortKey;
      direction = key === next ? direction === "asc" ? "desc" : "asc" : SORTS[next].direction;
      key = next;
      apply();
    });
  });
  select.closest("label").hidden = false;
}
