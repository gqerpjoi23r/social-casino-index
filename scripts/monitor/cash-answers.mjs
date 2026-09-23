// Page-only answers reuse eligible metrics without changing the public data model.
export function cashMinimumAnswers(model) {
  const cash = model.benchmarks.find(benchmark => benchmark.id === "cash")?.rows || [];
  const gift = model.operators.filter(operator => operator.metrics.gift).map(operator => ({
    slug: operator.slug, name: operator.name, url: operator.url, ...operator.metrics.gift,
  })).sort((a, b) => a.value - b.value || a.name.localeCompare(b.name, "en"));
  const pair = ["wow-vegas", "chumba"].map(slug => cash.find(row => row.slug === slug));
  return {
    lowest: cash.filter(row => row.value === cash[0]?.value),
    cashBelow50: cash.filter(row => row.value < 50),
    giftBelow50: gift.filter(row => row.value < 50),
    hasCash: cash.length > 0,
    pair: pair.filter(Boolean),
    pairComplete: pair.every(Boolean),
    pairWinner: pair.every(Boolean) && pair[0].value !== pair[1].value
      ? pair[0].value < pair[1].value ? pair[0] : pair[1] : null,
  };
}
