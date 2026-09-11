import { compareOperators, eligibleSorts } from "./comparison-order.js";
export { compareOperators } from "./comparison-order.js";

if (typeof document !== "undefined") {
  const list = document.querySelector("[data-comparison]");
  const select = document.querySelector("#updates-sort");
  if (list && select) {
    const rows = [...list.querySelectorAll("[data-operator]")].map(element => ({
      element, ...JSON.parse(element.dataset.sort),
    }));
    let selected = select.value;
    function refresh() {
      const now = Date.now();
      const options = eligibleSorts(rows, now);
      if (!options.some(option => option.key === selected)) selected = options[0]?.key || "name";
      select.replaceChildren(...options.map(option => new Option(option.label, option.key)));
      select.value = selected;
      select.closest(".sort-control").hidden = options.length === 0;
      select.disabled = options.length === 0;
      const active = options.find(option => option.key === selected);
      rows.sort((a, b) => compareOperators(a, b, selected, active?.direction, now));
      const focused = document.activeElement;
      // Reorder existing cards: native details retain their independent open state.
      for (const row of rows) list.append(row.element);
      if (focused?.isConnected && focused !== document.body) focused.focus({ preventScroll: true });
      for (const element of list.querySelectorAll("[data-valid-until]")) {
        if (now <= Number(element.dataset.validUntil)) continue;
        const explanation = "Not currently confirmed. Retained or dated values are in sources.";
        const symbol = document.createElement("span");
        symbol.className = "term-symbol";
        symbol.tabIndex = 0;
        symbol.setAttribute("role", "img");
        symbol.setAttribute("aria-label", explanation);
        symbol.title = explanation;
        const mark = document.createElement("span");
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = "?";
        const tooltip = document.createElement("span");
        tooltip.className = "term-tooltip";
        tooltip.setAttribute("aria-hidden", "true");
        tooltip.textContent = explanation;
        symbol.append(mark, tooltip);
        element.replaceChildren(symbol);
        element.removeAttribute("data-valid-until");
      }
      document.querySelector("#updates-sort-status").textContent =
        active ? `Sorted by ${active.label}.` : "Alphabetical order. No current comparable amounts.";
    }
    select.addEventListener("change", () => { selected = select.value; refresh(); });
    refresh();
    setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
  }
}
