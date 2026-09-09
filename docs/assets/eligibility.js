/* Client-side eligibility gate (flat-host replacement for /api/eligibility).
   Stores the visitor-selected state in a 30-day cookie. Editorial content is
   always visible; commercial CTAs stay hidden until a state is selected and
   are blocked for states on the closed list. A top banner offers the state
   selector on every page; it disappears once a state is chosen or the banner
   is dismissed (both remembered in the cookie). Content is never gated. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var CLOSED_STATES = [
    "CA", "NY", "CT", "IN", "LA", "ME", "MT", "NV", "NJ", "OK", "TN",
    "ID", "MI", "WA"
  ];
  var COOKIE = "sci_state";
  var DAYS = 30;

  function setCookie(value) {
    var d = new Date();
    d.setTime(d.getTime() + DAYS * 864e5);
    document.cookie = COOKIE + "=" + encodeURIComponent(value) +
      ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
  }
  function getCookie() {
    var m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  /* Dismissal is stored alongside the state as a flag so a visitor who closes
     the banner without picking a state is not nagged on every page. */
  var DISMISSED = "__dismissed";

  function syncBanner(state) {
    var banner = document.querySelector("[data-state-banner]");
    if (!banner) return;
    var show = !state; // show only when nothing stored (no state, not dismissed)
    banner.hidden = !show;
  }

  function applyState(state) {
    var known = !!state;
    var closed = known && CLOSED_STATES.indexOf(state) !== -1;
    document.querySelectorAll("[data-cta-operator]").forEach(function (box) {
      var msg = box.querySelector(".cta-msg");
      if (!known) {
        box.classList.add("is-blocked");
        if (msg) msg.textContent = "Select your state to see whether this offer is available to you.";
      } else if (closed) {
        box.classList.add("is-blocked");
        if (msg) msg.textContent = "This operator is not available in your state. The research below remains public.";
      } else {
        box.classList.remove("is-blocked");
        if (msg) msg.textContent = box.getAttribute("data-cta-allowed") || "Available in your state.";
      }
    });
    document.querySelectorAll("[data-state-echo]").forEach(function (el) {
      el.textContent = known ? state : "not selected";
    });
    // keep every picker on the page in sync
    document.querySelectorAll("select[data-state-picker]").forEach(function (s) {
      if (known && s.value !== state) s.value = state;
    });
  }

  var current = getCookie();
  applyState(current);
  syncBanner(current);

  document.querySelectorAll("select[data-state-picker]").forEach(function (sel) {
    if (current) sel.value = current;
    sel.addEventListener("change", function () {
      var v = sel.value;
      if (!v) return;
      setCookie(v);
      applyState(v);
      syncBanner(v);
    });
  });

  document.querySelectorAll("[data-state-banner-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setCookie(DISMISSED);
      syncBanner(DISMISSED);
    });
  });
})();
