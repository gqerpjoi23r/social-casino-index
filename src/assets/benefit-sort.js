const select = document.querySelector("#benefit-sort");
const body = document.querySelector("[data-ranked-operators]");
if (select && body) {
  select.closest("label").hidden = false;
  select.addEventListener("change", () => {
    window.location.assign(select.selectedOptions[0].dataset.url);
  });
}
