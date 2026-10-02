// Answer-first page models built only from the shared published-evidence model.
const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const HOURS = { hours: 1, business_days: 24, calendar_days: 24, days_unspecified: 24 };
const METHOD_GROUPS = [
  ["bank", "Bank transfer"], ["gift_card", "Gift card"], ["debit_card", "Debit card"],
  ["virtual_card", "Virtual card"], ["crypto", "Cryptocurrency"], ["cash", "Cash prize"],
  ["other", "Method not specified"],
];
const STAGES = { processing: "Processing", approval: "Approval", transfer: "Delivery after approval",
  end_to_end: "Request to receipt", unspecified: "Stage unspecified" };

export function readableDate(value) {
  return value ? new Date(value).toLocaleDateString("en-US",
    { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "";
}

export function nameList(names) {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

const operatorBySlug = (model, slug) => model.operators.find(operator => operator.slug === slug);
const signupOf = operator => operator.metrics.signup || operator.metrics.welcome || null;
const possessive = name => name.endsWith("s") ? `${name}'` : `${name}'s`;
const inline = label => String(label || "").replace(/^(Up to|Typically|At least) /, match => match.toLowerCase());
const lower = value => String(value || "").toLowerCase();

function lowerAnswer(pair, key, noun) {
  const values = pair.map(operator => operator.product[key]);
  if (!values.every(Boolean)) {
    const missing = pair.filter((operator, index) => !values[index]).map(operator => operator.name);
    return `Social Casino Index has not established a published ${noun} for ${nameList(missing)} yet.` +
      pair.filter((operator, index) => values[index]).map(operator => ` ${operator.name}: ${operator.product[key].label}.`).join("");
  }
  if (values[0].value === values[1].value) return `Both publish the same ${noun}: ${values[0].label}.`;
  const winner = values[0].value < values[1].value ? 0 : 1;
  return `${pair[winner].name} has the lower published ${noun}: ${values[winner].label}, compared with ${values[1 - winner].label} at ${pair[1 - winner].name}.`;
}

function signupAnswer(pair) {
  const values = pair.map(signupOf);
  if (!values.every(Boolean)) return "A comparable no-purchase signup reward has not been established for both casinos yet.";
  const immediate = values.map(value => value.immediateSc ?? value.totalSc);
  const staged = pair.flatMap((operator, index) => values[index].totalSc > immediate[index] ?
    [`${possessive(operator.name)} offer totals ${number(values[index].totalSc)} SC${values[index].durationDays ? ` over ${values[index].durationDays} days` : " in stages"}.`] : []);
  const high = immediate[0] > immediate[1] ? 0 : 1;
  const lead = immediate[0] === immediate[1] ?
    `Both advertise ${number(immediate[0])} SC immediately without a purchase.` :
    `${pair[high].name} gives more Sweeps Coins immediately at signup: ${number(immediate[high])} SC, compared with ${number(immediate[1 - high])} SC at ${pair[1 - high].name}.`;
  return [lead, ...staged].join(" ");
}

function purchaseAnswer(pair) {
  const values = pair.map(operator => operator.metrics.purchase);
  if (!values.every(Boolean)) return "A comparable purchase package has not been established for both casinos yet.";
  const ratio = values.map(value => `${value.label} (${number(value.value)} SC per $1)`);
  if (Math.abs(values[0].value - values[1].value) < 0.005) {
    return `Both first-purchase offers include about the same Sweeps Coins per dollar: ${pair[0].name} ${ratio[0]}; ${pair[1].name} ${ratio[1]}.`;
  }
  const winner = values[0].value > values[1].value ? 0 : 1;
  return `${possessive(pair[winner].name)} purchase offer includes more Sweeps Coins per dollar: ${ratio[winner]}, compared with ${ratio[1 - winner]} at ${pair[1 - winner].name}. Gold Coins are not included in this ratio.`;
}

function timingAnswer(pair) {
  const parts = pair.map(operator => operator.product.redemption ?
    `${operator.name}: ${inline(operator.product.redemption.label)} (${lower(operator.product.redemption.note)})` :
    `${operator.name}: no published processing time established from the sources we check`);
  return `Published operator estimates: ${parts.join("; ")}. These are not measured payout times, and the stages can differ.`;
}

export function pairAnswers(model, comparison) {
  const pair = comparison.slug.split("-vs-").map(slug => operatorBySlug(model, slug));
  const asOf = readableDate(model.generatedAt);
  const faqs = [
    { question: `Which has the lower cash redemption minimum, ${pair[0].name} or ${pair[1].name}?`, answer: lowerAnswer(pair, "cash", "cash redemption minimum") },
    { question: "Which gives more free signup coins?", answer: signupAnswer(pair) },
    { question: "Which has the better first-purchase offer?", answer: purchaseAnswer(pair) },
    { question: "What are the gift-card redemption minimums?", answer: lowerAnswer(pair, "gift", "gift-card minimum") },
    { question: `How long do ${pair[0].name} and ${pair[1].name} take to process redemptions?`, answer: timingAnswer(pair) },
  ];
  const rows = [
    ["Free signup", operator => operator.product.signup],
    ["First purchase", operator => operator.product.purchase],
    ["Cash minimum", operator => operator.product.cash],
    ["Gift-card minimum", operator => operator.product.gift],
    ["Published processing", operator => operator.product.redemption],
  ].map(([label, pick]) => ({ label, values: pair.map(operator => pick(operator) || null) }));
  return { asOf, operators: pair.map(operator => ({ slug: operator.slug, name: operator.name, url: operator.url })), rows, faqs,
    summary: `According to Social Casino Index's check on ${asOf}: ${faqs[0].answer} ${faqs[1].answer} ${faqs[2].answer}` };
}

export function operatorAnswer(model, slug) {
  const operator = operatorBySlug(model, slug);
  if (!operator) return null;
  const product = operator.product;
  const parts = [
    product.cash && `cash redemptions start at ${product.cash.label}`,
    product.gift && `gift cards start at ${product.gift.label}`,
    !product.cash && product.minimum && `the published redemption threshold is ${product.minimum.label}`,
    product.redemption ? `the published redemption estimate is ${inline(product.redemption.label)} (${lower(product.redemption.note)})` :
      "a published processing time has not been established from the sources we check",
    product.signup && `the signup offer is ${product.signup.label}${product.signup.note ? ` (${product.signup.note.replace(/^[A-Z](?=[a-z])/, char => char.toLowerCase())})` : ""}`,
    product.purchase && `the purchase offer is ${product.purchase.label}`,
  ].filter(Boolean);
  const faqs = (product.faqs || []).map(faq => ({ question: faq.question, answer: String(faq.answer || "").trim() }));
  if (!product.redemption) faqs.push({ question: `How long does ${operator.name} take to pay out?`,
    answer: `Social Casino Index has not established a published ${operator.name} processing time from the sources checked. Identity verification, approval and payment delivery can each add time.` });
  return { summary: `At ${operator.name}, according to Social Casino Index's check on ${readableDate(product.lastCheckedAt || model.generatedAt)}, ${nameList(parts)}.`, faqs };
}

const METHOD_LABELS = Object.fromEntries(METHOD_GROUPS.filter(([id]) => id !== "other"));
const ANY_METHOD = "Any method or not specified";
const methodLabel = method => METHOD_LABELS[method] || ANY_METHOD;
const timingHours = value => Number.isFinite(value?.value) && HOURS[value.unit] ?
  (value.upperValue ?? value.value) * HOURS[value.unit] : null;

// Redemption time, minimum and status answers for operator profiles. Uses only selected evidence records.
export function operatorRedemption(model, slug) {
  const operator = operatorBySlug(model, slug);
  if (!operator?.product) return null;
  const product = operator.product;
  const { name } = operator;
  const times = [product.redemption, ...(product.policies || []).filter(policy => policy.field === "redemption_time")]
    .filter(Boolean);
  const minima = product.minima || [];
  const rows = new Map();
  const rowFor = method => {
    const label = methodLabel(method);
    if (!rows.has(label)) rows.set(label, { method: label, minima: [], times: [], sources: new Map() });
    return rows.get(label);
  };
  const addSource = (row, value) => {
    const previous = row.sources.get(value.sourceUrl);
    if (!previous || value.observedAt > previous) row.sources.set(value.sourceUrl, value.observedAt);
  };
  for (const value of minima) {
    const row = rowFor(value.method);
    if (!row.minima.includes(value.label)) row.minima.push(value.label);
    addSource(row, value);
  }
  for (const value of times) {
    const row = rowFor(value.method);
    const stage = STAGES[value.stage] || STAGES.unspecified;
    if (!row.times.some(item => item.label === value.label && item.stage === stage)) row.times.push({ label: value.label, stage });
    addSource(row, value);
  }
  const order = [ANY_METHOD, ...METHOD_GROUPS.map(([, label]) => label)];
  const methodRows = [...rows.values()]
    .map(row => ({ ...row, sources: [...row.sources].map(([url, observedAt]) => ({ url, observedAt })) }))
    .sort((a, b) => order.indexOf(a.method) - order.indexOf(b.method));

  // Short status summary: distinct windows for one stage, with the generic window first. The table keeps full detail.
  const stageWindows = stage => {
    const seen = new Set();
    return times.filter(value => value.stage === stage)
      .map(value => ({ value, key: lower(value.label).replace(/^typically /, "") }))
      .filter(({ key }) => !seen.has(key) && seen.add(key))
      .sort((a, b) => (a.value.method in METHOD_LABELS) - (b.value.method in METHOD_LABELS))
      .slice(0, 2)
      .map(({ value }) => `${inline(value.label)}${value.method in METHOD_LABELS ? ` for ${lower(methodLabel(value.method))}` : ""}`);
  };
  const approval = stageWindows("approval");
  const delivery = stageWindows("transfer");
  const statuses = [
    { status: "Pending", meaning: "The request is submitted and waiting for review. Identity verification is often completed at this stage.",
      published: approval.length ? `${name} publishes approval of ${nameList(approval)}.` : null },
    { status: "In progress or processing", meaning: "The operator is reviewing or preparing the payment. Some operators use these labels for the same stage as pending.",
      published: null },
    { status: "Approved, scheduled or processed", meaning: "The operator has accepted the request and sent it, or will send it, to the payment provider. Delivery time then depends on the method.",
      published: delivery.length ? `${name} publishes delivery after approval of ${nameList(delivery)}.` : null },
  ];

  const faqs = [];
  const askedMinimum = (product.faqs || []).some(faq => /minimum/i.test(faq.question));
  if (!askedMinimum && minima.length) faqs.push({ question: `What is the minimum redemption at ${name}?`,
    answer: `According to Social Casino Index's check, ${name} publishes ${nameList(minima.map(value =>
      `${value.label}${value.method in METHOD_LABELS ? ` for ${lower(methodLabel(value.method))}` : ""}`))}.` });
  const timed = times.map(value => ({ value, hours: timingHours(value) })).filter(item => item.hours !== null)
    .sort((a, b) => a.hours - b.hours);
  faqs.push({ question: `Does ${name} have instant redemptions?`, answer: timed.length ?
    `None of the ${name} redemption windows collected by Social Casino Index is instant. The shortest published window is ${inline(timed[0].value.label)}${timed[0].value.method in METHOD_LABELS ? ` for ${lower(methodLabel(timed[0].value.method))}` : ""} (${lower(STAGES[timed[0].value.stage] || STAGES.unspecified)}).` :
    `Social Casino Index has not established a published ${name} processing time from the sources checked, so instant redemptions cannot be confirmed.` });
  faqs.push({ question: `What does a pending ${name} redemption mean?`,
    answer: `Pending usually means the request is waiting for review, which can include identity verification.${approval.length ? ` ${name} publishes approval of ${nameList(approval)}.` : ""} Status labels differ between operators, so check the redemption history in your account.` });
  return { methodRows, statuses, faqs };
}

export function lowRedemption(model) {
  const rows = (model?.operators || []).filter(operator => operator.product).map(operator => {
    const minima = operator.product.minima || [];
    const other = minima.filter(value => value.recordId !== operator.product.cash?.recordId &&
      value.recordId !== operator.product.gift?.recordId && value.unit === "SC");
    const values = [operator.product.cash, operator.product.gift, ...other].filter(Boolean).map(value => value.value);
    return { slug: operator.slug, name: operator.name, url: operator.url, cash: operator.product.cash,
      gift: operator.product.gift, other: other[0] || null, lowest: values.length ? Math.min(...values) : null };
  }).filter(row => row.lowest !== null)
    .sort((a, b) => a.lowest - b.lowest || a.name.localeCompare(b.name, "en"));
  const cash = rows.filter(row => row.cash).sort((a, b) => a.cash.value - b.cash.value || a.name.localeCompare(b.name, "en"));
  const lowestCash = cash.filter(row => row.cash.value === cash[0]?.cash.value);
  const giftBelow50 = rows.filter(row => row.gift?.value < 50).sort((a, b) => a.gift.value - b.gift.value || a.name.localeCompare(b.name, "en"));
  const cashBelow50 = cash.filter(row => row.cash.value < 50);
  const asOf = readableDate(model.generatedAt);
  const cashText = cashBelow50.length ?
    `${nameList(cashBelow50.map(row => `${row.name} (${row.cash.label})`))} publish cash minimums below 50 SC.` :
    cash.length ? `None of the ${cash.length} casinos with a published cash minimum lets you redeem cash below 50 SC; the lowest cash minimum is ${cash[0].cash.label}, at ${nameList(lowestCash.map(row => row.name))}.` :
      "No cash minimum has been established yet.";
  const giftText = giftBelow50.length ?
    `Gift cards go lower: ${nameList(giftBelow50.map(row => `${row.name} (${row.gift.label})`))}. Those are gift-card thresholds, not cash.` :
    "No gift-card minimum below 50 SC has been established.";
  return { asOf, rows, lowestCash, giftBelow50, cashBelow50, cashText, giftText,
    summary: `According to Social Casino Index's check on ${asOf}: ${cashText} ${giftText}` };
}

export function methodTimings(model) {
  const entries = new Map();
  for (const operator of (model?.operators || []).filter(item => item.product)) {
    const values = [operator.product.redemption, ...(operator.product.policies || []).filter(policy => policy.field === "redemption_time")];
    for (const value of values) {
      if (!value || entries.has(value.recordId) || !Number.isFinite(value.value) || !HOURS[value.unit]) continue;
      const method = METHOD_GROUPS.some(([key]) => key === value.method) ? value.method : "other";
      entries.set(value.recordId, { ...value, method, slug: operator.slug, name: operator.name, url: operator.url,
        stageLabel: STAGES[value.stage] || STAGES.unspecified, hours: (value.upperValue ?? value.value) * HOURS[value.unit] });
    }
  }
  const groups = METHOD_GROUPS.map(([id, label]) => ({ id, label,
    rows: [...entries.values()].filter(row => row.method === id)
      .sort((a, b) => a.hours - b.hours || a.name.localeCompare(b.name, "en")) }))
    .filter(group => group.rows.length);
  const described = groups.filter(group => group.id !== "other").map(group => {
    const first = group.rows[0], last = group.rows.at(-1);
    return group.rows.length === 1 ? `${group.label}: ${inline(first.label)} at ${first.name} (${first.stageLabel.toLowerCase()})` :
      `${group.label}: from ${inline(first.label)} at ${first.name} (${first.stageLabel.toLowerCase()}) to ${inline(last.label)} at ${last.name} (${last.stageLabel.toLowerCase()})`;
  });
  const asOf = readableDate(model.generatedAt);
  return { asOf, groups, count: new Set([...entries.values()].map(row => row.slug)).size,
    summary: `According to Social Casino Index's check on ${asOf}, published redemption windows by method are: ${described.join("; ")}. These windows cover different stages, so they are not like-for-like payout times or a speed ranking.` };
}

export const faqJsonLd = (id, faqs) => ({ "@type": "FAQPage", "@id": id,
  mainEntity: faqs.map(faq => ({ "@type": "Question", name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer } })) });
