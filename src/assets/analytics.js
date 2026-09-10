/* Load the site's Google Tag Manager container on every page. */
(function () {
  "use strict";

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtm.js?id=GTM-NTLVFVB7";
  document.head.appendChild(script);
})();
