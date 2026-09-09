/* Basic consent: Google code is loaded only after an affirmative choice. */
(function () {
  "use strict";
  var key = "sci_analytics_consent";
  var measurementId = "G-E3Y4MKKS6Q";
  var lifetime = 180 * 24 * 60 * 60 * 1000;
  var panel = document.getElementById("analytics-consent");
  var status = document.getElementById("analytics-consent-status");
  var loaded = false;
  var choice = null;

  try {
    var saved = JSON.parse(localStorage.getItem(key));
    if (saved && saved.expires > Date.now() &&
        (saved.value === "granted" || saved.value === "denied")) {
      choice = saved.value;
    }
  } catch (_) { /* Storage restrictions must not enable measurement. */ }

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  });
  gtag("set", { allow_google_signals: false, allow_ad_personalization_signals: false });

  function start() {
    if (loaded) return;
    loaded = true;
    window["ga-disable-" + measurementId] = false;
    gtag("consent", "update", { analytics_storage: "granted" });
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtm.js?id=GTM-NTLVFVB7";
    document.head.appendChild(script);
  }

  function clearCookies() {
    document.cookie.split(";").forEach(function (cookie) {
      var name = cookie.split("=")[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) return;
      var parts = location.hostname.split(".");
      var domains = [""];
      for (var i = 0; i < parts.length - 1; i++) {
        domains.push("; domain=" + parts.slice(i).join("."));
      }
      domains.forEach(function (domain) {
        document.cookie = name + "=; Max-Age=0; path=/" + domain;
      });
    });
  }

  document.querySelectorAll("[data-analytics-choice]").forEach(function (button) {
    button.addEventListener("click", function () {
      choice = button.getAttribute("data-analytics-choice");
      try {
        localStorage.setItem(key, JSON.stringify({ value: choice, expires: Date.now() + lifetime }));
      } catch (_) {
        status.textContent = "Your browser cannot save this preference. It applies to this page only.";
      }
      if (choice === "granted") {
        start();
      } else {
        // Disable collection before removing cookies and unloading Google's code.
        window["ga-disable-" + measurementId] = true;
        clearCookies();
        if (loaded) {
          location.reload();
          return;
        }
      }
      panel.hidden = true;
      document.getElementById("analytics-settings").focus();
    });
  });
  document.getElementById("analytics-settings").addEventListener("click", function () {
    panel.hidden = false;
    status.textContent = choice === "granted" ? "Analytics is currently accepted." :
      choice === "denied" ? "Analytics is currently rejected." : "";
    document.getElementById("analytics-consent-title").focus();
  });
  if (choice === "granted") start();
  if (choice !== "granted") clearCookies();
  panel.hidden = choice !== null;
})();
