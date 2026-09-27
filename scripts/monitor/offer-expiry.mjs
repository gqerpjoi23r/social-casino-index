const months = "January February March April May June July August September October November December".split(" ");
const month = `(${months.join("|")})`;
const separator = "[-\\u2013\\u2014]";
const date = (name, day, year) => {
  const value = `${year}-${String(months.findIndex(m => m.toLowerCase() === name.toLowerCase()) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return Number.isFinite(Date.parse(value)) && new Date(value).toISOString().startsWith(value) ? value : null;
};

// Read explicit offer periods only, never article publication or capture dates.
export function statedOfferEnd(text = "") {
  const period = new RegExp(`(?:promotion dates|offer period)\\s*:\\s*${month}\\s+\\d{1,2}\\s*${separator}\\s*(?:${month}\\s+)?(\\d{1,2}),?\\s+(\\d{4})`, "i").exec(text);
  if (period) return date(period[2] || period[1], period[3], period[4]);
  const ending = new RegExp(`(?:offer ends|expires|valid until)\\s*(?:on\\s+)?${month}\\s+(\\d{1,2}),?\\s+(\\d{4})`, "i").exec(text);
  return ending ? date(ending[1], ending[2], ending[3]) : null;
}

export function expiryTime(value) {
  // A date without a timezone remains valid until that day has ended everywhere.
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? Date.parse(value) + 36 * 3600000 : Date.parse(value);
}

export function offerExpiry(record) {
  return record.expiresAt || statedOfferEnd((record.conditions || []).join(" "));
}
