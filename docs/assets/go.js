(function () {
  "use strict";
  var config = document.querySelector("script[data-go-destination]");
  var destination = config && config.getAttribute("data-go-destination");
  var closed = JSON.parse(config.getAttribute("data-go-closed"));
  var knownStates = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" ");
  var match = document.cookie.match(/(?:^|; )sci_state=([^;]*)/);
  var state = null;
  try { state = match ? decodeURIComponent(match[1]) : null; } catch (_) {}
  var message = document.querySelector("[data-go-msg]");
  if (knownStates.indexOf(state) !== -1 && closed.indexOf(state) === -1) {
    if (message) message.textContent = "Taking you to the operator. Confirm its current eligibility and terms.";
    window.location.replace(destination);
  } else {
    if (message) message.textContent = closed.indexOf(state) !== -1 ?
      "This offer is blocked for your state. Opening state availability." :
      "Select your state on the state availability page.";
    window.location.replace("/availability/");
  }
})();
