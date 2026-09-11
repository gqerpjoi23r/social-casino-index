(() => {
  const warning = document.getElementById("refresh-warning");
  if (!warning) return;
  const check = () => {
    const refreshedAt = Date.parse(warning.dataset.lastRefresh);
    warning.hidden = Number.isFinite(refreshedAt) && Date.now() - refreshedAt <= 36 * 60 * 60 * 1000;
  };
  check();
  setInterval(check, 60000);
  document.addEventListener("visibilitychange", check);
})();
