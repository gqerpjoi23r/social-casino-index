import { orderToplist, SORTS } from "./toplist-order.js";

const list = document.querySelector(".toplist-list");
const select = document.querySelector("#toplist-sort");
if (list && select) {
  const elements = new Map();
  const rows = [...list.children].filter(element => element.dataset.sort).map(element => {
    const row = JSON.parse(element.dataset.sort);
    elements.set(row.slug, element);
    return row;
  });
  select.addEventListener("change", () => {
    const key = select.value;
    if (!SORTS[key]) return;
    orderToplist(rows, key).forEach((row, index) => {
      const element = elements.get(row.slug);
      element.querySelector(".toplist-position").textContent = index + 1;
      list.append(element);
    });
    list.dataset.activeSort = key;
    document.querySelector("#toplist-sort-status").textContent = `Sorted by ${SORTS[key].label}.`;
  });
  select.closest("label").hidden = false;
}
