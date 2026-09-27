export function presentToplist(row, now) {
  const gift = row.minima.find(value => value.recordId === row.gift?.recordId ||
    /gift.card/i.test(value.note || ""));
  const cash = row.cash || row.minima.find(value => /^(Cash|Bank|Debit-card) minimum/i.test(value.note || ""));
  const recent = value => value?.valueChangedAt &&
    Date.parse(value.valueChangedAt) <= now && now - Date.parse(value.valueChangedAt) < 7 * 86400000 ?
    value.valueChangedAt : null;
  const fields = [
    { key: "signup", label: row.sortValues.welcome !== null ? "Free coins" : "Welcome offer", value: row.signup },
    { key: "purchase", label: row.purchase?.kind === "first_purchase" ? "First purchase" : "Purchase deal", value: row.purchase },
    { key: "minimum", label: "Cash out from", value: cash,
      gift: gift && (!cash || gift.unit !== cash.unit || gift.value < cash.value) ? gift : null },
    { key: "redemption", label: "Published timing", value: row.redemption },
  ];
  const summary = [
    row.signup && `${row.signup.label} (${row.signup.purchaseRequired === false ? "no purchase" :
      row.signup.purchaseRequired === true ? "purchase required" : "see claim conditions"})`,
    row.purchase && `${row.purchase.label}${row.purchase.note ? ` (${row.purchase.note})` : ""}`,
    cash && `Cash out from ${cash.label}`,
    gift && `Gift cards from ${gift.label}`,
    !cash && !gift && row.minimum && `${row.minimum.label} (${row.minimum.note})`,
    row.redemption && `${row.redemption.label} (${row.redemption.note})`,
    row.daily && row.daily.label,
  ].filter(Boolean).slice(0, 3).join("; ");
  const terms = Object.entries(row.labels).flatMap(([key, label]) =>
    (key === "minimum" ? row.minima : [row[key]]).filter(Boolean).map(value => ({
      key, heading: label, ...value, recentChangeAt: recent(value),
      condition: [...new Set(value.conditions || [])].join(" "),
    })));
  const codes = [...new Map([row.signup, row.purchase].filter(value => value?.promoCode)
    .map(value => [value.promoCode, { code: value.promoCode, label: value.label }])).values()];
  return { fields, summary, terms, codes, compact: row.sortValues.welcome === null };
}
