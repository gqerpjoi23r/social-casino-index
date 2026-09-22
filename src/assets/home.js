(() => {
  const panels = [...document.querySelectorAll(".home-menu, .toplist-sources")];
  const close = panel => { panel.open = false; };
  panels.forEach(panel => {
    panel.addEventListener("toggle", () => {
      if (panel.open) panels.filter(other => other !== panel).forEach(close);
    });
  });
  document.addEventListener("click", event => {
    panels.filter(panel => panel.open && !panel.contains(event.target)).forEach(close);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const open = panels.find(panel => panel.open);
    if (!open) return;
    close(open);
    open.querySelector("summary").focus();
  });
  // A dismissed or obsolete state cookie must not leave the picker blank.
  const state = document.querySelector("[data-state-picker]");
  if (state && state.selectedIndex < 0) state.selectedIndex = 0;
})();
