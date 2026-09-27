const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const clean = value => String(value || "").trim().replace(/[.;\s]+$/, "").replace(/\.\.(?!\d)/g, ".");
const sentence = value => value ? `${clean(value)}.` : "";
const money = label => label.replace(/([\d,.]+) USD\b/g, "$$$1");
const methodLabel = value => ({ cash: "Cash", bank: "Bank", debit_card: "Debit card",
  gift_card: "Gift cards", crypto: "Crypto", virtual_card: "Virtual card" })[value.method] ||
  (/gift.card/i.test(value.note || "") ? "Gift cards" : /^Cash/i.test(value.note || "") ? "Cash" : "Prize minimum");

export function displayFact(value, key) {
  if (!value) return null;
  let label = money(value.label);
  let note = "";
  let detailNote = "";
  if (key === "signup") {
    label = label.replace(/ SC free$/, " SC").replace(/Gold Coins/g, "GC");
    note = value.note || "";
    if (value.purchaseRequired === false && !/total|stages|tasks|opt.in/i.test(note)) note = "At sign-up";
    else note = note.replace(/On signup; no purchase; /, "").replace(/On signup; no purchase/, "At sign-up");
  } else if (key === "purchase") {
    if (value.priceUsd == null && (value.totalSc || value.immediateSc)) {
      label = `${number(value.totalSc || value.immediateSc)} SC bundle`;
      note = "Price not stated";
    } else {
      note = (value.note || "").replace(/First purchase only\.?/, "").replace(/Purchase package\.?/, "")
        .replace("First package in a three-purchase welcome offer.", "First of 3 welcome offers");
      if (/See purchase and claim conditions/i.test(note)) note = value.priceUsd == null ?
        "Price not stated" : value.kind === "first_purchase" ? "First purchase" : "Purchase package";
      detailNote = note;
      note = note.replace(/\.?\s*First of 3 welcome offers/, "").replace(/^(First purchase|Purchase package)$/, "");
    }
  } else if (key === "minimum") {
    if (!["Cash", "Bank", "Debit card"].includes(methodLabel(value))) {
      note = methodLabel(value) === "Gift cards" ? "Gift cards" : "Prize type not stated";
    }
  } else if (key === "redemption") {
    label = label.replace(/^Typically /, "About ").replace(/business days/, "days")
      .replace(/calendar days/, "days").replace(/days \(type unspecified\)/, "days");
    const dayType = /business days/.test(value.label) ? "Business days" :
      /calendar days/.test(value.label) ? "Calendar days" : "";
    const stage = { processing: "Processing", approval: "Approval",
      transfer: "After approval", end_to_end: "Request to receipt", unspecified: "Stage not stated" }[value.stage];
    note = [dayType, value.stage === "transfer" ? "After approval" : ""].filter(Boolean).join(" · ");
    const method = { bank: "By bank", debit_card: "By debit card", gift_card: "Gift cards",
      crypto: "By crypto", virtual_card: "Virtual card" }[value.method];
    detailNote = [dayType, stage, method].filter(Boolean).join(". ");
  } else if (key === "daily") {
    label = label.replace(/ SC daily$/, " SC");
    note = value.comparable ? "Every day" : value.note || "";
  }
  return { ...value, displayLabel: label, displayNote: clean(note), detailNote: clean(detailNote || note),
    accessibleLabel: [value.label, value.note].filter(Boolean).join(". ") };
}

export function presentToplist(row, now, checkedAt) {
  const gift = row.minima.find(value => value.recordId === row.gift?.recordId || methodLabel(value) === "Gift cards");
  const cash = row.cash || row.minima.find(value => ["Cash", "Bank", "Debit card"].includes(methodLabel(value)));
  const minimum = cash || gift || row.minimum;
  const knownSignup = Number.isFinite(row.sortValues.welcome);
  const fields = [
    { key: "signup", label: knownSignup ? "Free coins" : "Welcome offer", value: displayFact(row.signup, "signup") },
    { key: "purchase", label: row.purchase?.kind === "first_purchase" ? "First purchase" : "Purchase deal", value: displayFact(row.purchase, "purchase") },
    { key: "minimum", label: cash ? "Cash out from" : gift ? "Gift cards from" : "Redeem from", value: displayFact(minimum, "minimum"),
      gift: cash && gift && (gift.unit !== cash.unit || gift.value < cash.value) ? displayFact(gift, "minimum") : null },
    { key: "redemption", label: "Payout time", value: displayFact(row.redemption, "redemption") },
  ];
  const badges = [];
  const badge = (tone, icon, label, value, title = label) =>
    badges.push({ tone, icon, label, recordId: value?.recordId, title });
  const timing = row.redemption;
  const maximum = timing?.upperValue ?? timing?.value;
  const shortTiming = timing && Number.isFinite(maximum) && ["exact", "up_to", "range", "typical"].includes(timing.comparison) &&
    (timing.unit === "business_days" && maximum <= 3 || timing.unit === "calendar_days" && maximum <= 3 ||
      timing.unit === "hours" && maximum <= 72 && !/business hours/.test(timing.label));
  if (shortTiming && ["processing", "approval", "end_to_end"].includes(timing.stage)) {
    const scope = { processing: "Processing", approval: "Approval", end_to_end: "Payout" }[timing.stage];
    badge("perk", "timer", `${scope} \u22643 days`, timing, `${scope}: ${timing.label}. ${timing.note}`);
  }
  if (cash && cash.unit === "SC" && cash.value <= 50) badge("perk", "arrow-line-down", "Low minimum", cash);
  if (row.daily?.comparable && Number.isFinite(row.sortValues.daily)) {
    badge("perk", "calendar-check", `Daily ${number(row.sortValues.daily)} SC`, row.daily);
  }
  const optIn = row.signup && /opt.in|consent to receive/i.test([row.signup.note, ...(row.signup.conditions || [])].join(" ")) &&
    !/no opt.in|opt.in (?:is )?not (?:needed|required)/i.test((row.signup.conditions || []).join(" "));
  if (optIn) badge("warn", "info", row.signup.totalSc > row.signup.immediateSc ? "Opt-in for full bonus" : "Opt-in needed", row.signup);
  const goldOffer = [row.signup, row.purchase].find(value => value?.rewardType === "Entertainment credits");
  if (goldOffer) badge("warn", "coins", "Gold Coin offer", goldOffer, "The shown Gold Coin offer is for entertainment, not redeemable SC");
  for (const prize of row.rewardTypes.filter(type => type !== "Entertainment credits")) {
    badge("plain", prize === "Gift cards" ? "gift" : "money", prize);
  }
  const signup = fields[0].value;
  const purchase = fields[1].value;
  const summary = [
    signup && sentence(`${signup.displayLabel}${knownSignup ? " free at sign-up" :
      row.signup.purchaseRequired === false ? " at sign-up, no purchase needed" :
        row.signup.purchaseRequired === true ? " with a purchase" : " welcome reward; purchase requirements are not confirmed"}`),
    purchase && sentence(`${purchase.displayLabel}${row.purchase.kind === "first_purchase" ? " on your first purchase" : " in a coin package"}${purchase.displayNote ? ` (${purchase.displayNote})` : ""}`),
    minimum && sentence(`${cash ? "Cash out" : gift ? "Gift cards" : "Redeem prizes"} from ${money(minimum.label)}`),
    timing && sentence(`${({ processing: "Processing takes", approval: "Approval takes", transfer: "Delivery after approval takes",
      end_to_end: "Payouts take", unspecified: "The published estimate is" })[timing.stage] || "The published estimate is"} ${timing.label.replace(/^Typically /, "about ").replace(/^Up to /, "up to ").replace(/^At least /, "at least ").replace(" (type unspecified)", "")}`),
    row.daily?.comparable && sentence(`${number(row.sortValues.daily)} SC free each day`),
  ].filter(Boolean).slice(0, 3).join(" ");
  const observedDay = value => value?.slice(0, 10);
  const checkDay = observedDay(checkedAt) || new Date(now).toISOString().slice(0, 10);
  const source = (value, key) => ({
    ...displayFact(value, key), displayNote: displayFact(value, key).detailNote,
    sourceDomain: new URL(value.sourceUrl).hostname.replace(/^www\./, ""),
    stale: value.status === "retained" || observedDay(value.observedAt) !== checkDay,
    recentChangeAt: value.valueChangedAt && Date.parse(value.valueChangedAt) <= now &&
      now - Date.parse(value.valueChangedAt) < 7 * 86400000 ? value.valueChangedAt : null,
    condition: [...new Set((value.conditions || []).map(clean))].map(sentence).join(" "),
    methodLabel: methodLabel(value),
  });
  const terms = Object.entries(row.labels).flatMap(([key, heading]) => {
    const values = (key === "minimum" ? row.minima : [row[key]]).filter(Boolean);
    return values.length ? [{ key, heading: key === "minimum" ? fields[2].label :
      key === "redemption" ? "Payout time" : key === "daily" ? "Daily bonus" : heading,
      values: values.map(value => source(value, key)) }] : [];
  });
  const codes = [...new Map([row.signup, row.purchase].filter(value => value?.promoCode)
    .map(value => [value.promoCode, { code: value.promoCode, label: value.label }])).values()];
  return { fields, summary, badges, terms, codes, compact: !knownSignup };
}
