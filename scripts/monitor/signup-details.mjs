const sc = value => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} SC`;

// Keep every detail attached to the offer selected for this benchmark.
export function signupDetails(benchmark) {
  if (!["signup", "staged"].includes(benchmark.id)) return null;
  const rows = benchmark.rows.map(row => ({
    ...row,
    initialLabel: sc(row.immediateSc),
    totalLabel: sc(row.totalSc),
    staged: row.totalSc > row.immediateSc,
    conditions: row.conditions.filter(condition => /[\p{L}\p{N}]/u.test(condition)),
  }));
  return {
    id: benchmark.id,
    rows,
    leaders: rows.filter(row => row.rank === 1),
    relatedUrl: benchmark.id === "signup" ? "/bonuses/staged-welcome-bonuses/" : "/bonuses/no-purchase-signup-bonuses/",
    relatedLabel: benchmark.id === "signup" ? "Compare larger staged welcome totals" : "Compare initial signup rewards",
  };
}
