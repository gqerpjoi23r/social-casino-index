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
  document.querySelectorAll("[data-copy-code]").forEach(button => {
    button.addEventListener("click", async () => {
      const label = button.querySelector("span");
      const status = button.closest(".toplist-footer").querySelector('[role="status"]');
      try {
        await navigator.clipboard.writeText(button.dataset.copyCode);
        label.textContent = "Copied";
        status.textContent = `Copied ${button.dataset.copyCode}`;
        clearTimeout(button.copyTimer);
        button.copyTimer = setTimeout(() => { label.textContent = button.dataset.copyCode; }, 1800);
      } catch {
        status.classList.remove("sr-only");
        status.textContent = "Press and hold to copy";
      }
    });
  });
})();
