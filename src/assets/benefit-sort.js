const select = document.querySelector("#benefit-sort");
const body = document.querySelector("[data-ranked-operators]");
if (select && body) {
  select.closest("label").hidden = false;
  select.addEventListener("change", () => {
    const key = select.value;
    const ascending = key === "cash" || key === "overall";
    const rows = [...body.rows].sort((a, b) => {
      const av = a.dataset[key] === "" ? null : Number(a.dataset[key]);
      const bv = b.dataset[key] === "" ? null : Number(b.dataset[key]);
      return (av === null) - (bv === null) ||
        (ascending ? 1 : -1) * ((av ?? 0) - (bv ?? 0)) ||
        Number(a.dataset.overall) - Number(b.dataset.overall);
    });
    rows.forEach(row => body.append(row));
    body.closest("table").querySelector("caption").textContent = `Published offers, ${select.selectedOptions[0].textContent}`;
  });
}
