import { createHash } from "node:crypto";
import { load } from "cheerio";

export const VERSION = "1.1.0";
export const FIELDS = {
  welcome: "Welcome offer",
  daily: "Recurring daily reward",
  purchase: "Public purchase packages",
  playthrough: "Playthrough",
  minimum: "Redemption minimums and caps",
  timing: "Published redemption timing and methods",
  verification: "Verification requirements",
  restrictions: "Operator-stated restrictions",
};
export const normalize = value => String(value).normalize("NFKC").replace(/\s+/g, " ").trim();
export const hash = value => createHash("sha256").update(value).digest("hex");

export function readableText(body, type = "text/html") {
  if (!type.includes("html")) {
    return body.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .split("\n").map(line => normalize(line.replace(/^[#>*\s-]+/, "")))
      .filter(Boolean).join("\n");
  }
  const $ = load(body);
  $("script,style,noscript,svg,nav,header,footer,form,[hidden],[aria-hidden=true]").remove();
  $("img[alt]").each((_, el) => $(el).replaceWith(` ${$(el).attr("alt")} `));
  $("br").replaceWith("\n");
  $("p,li,h1,h2,h3,h4,tr,section,article,div,td").each((_, el) => $(el).append("\n"));
  const main = $("main,article,[role=main]").first();
  return (main.length ? main.text() : $.root().text()).split("\n")
    .map(normalize).filter(Boolean).join("\n");
}

export function accessStatus(text, url = "", status = 200) {
  if (status === 401 || /\/(?:login|sign-in)(?:[/?#]|$)/i.test(url)) return "login_required";
  if (status === 403 || status === 429 ||
      /just a moment|verify you are human|checking your browser|captcha|access denied|attention required.*cloudflare/i.test(text.slice(0, 3000))) return "blocked";
  if (status >= 400) return "http_error";
  if (/\/geo-block|\/restricted(?:[/?#]|$)/i.test(url) ||
      (/not available in your (?:region|location|country)|access from your (?:region|location|country).*restricted/i.test(text) && text.length < 3000)) return "region_notice";
  if (text.length < 150) return "empty";
  return "ok";
}

const rules = {
  welcome: [
    /welcome|sign[\s-]?up|new (?:player|customer|user|account)|register|registration|first purchase/i,
    /\d[\d,.]*\s*(?:SC\b|sweeps? coins?|stake cash|gold coins?|GC\b|free spins?|%)/i,
  ],
  daily: [
    /daily|every 24 hours|each day|every day|login reward|log[\s-]?in bonus/i,
    /reward|bonus|claim|coin|stake cash|\bSC\b/i,
  ],
  purchase: [
    /purchas|package|buy|bundle/i,
    /\$\s*\d|\d+(?:\.\d+)?\s*(?:USD|dollars)/i,
  ],
  playthrough: [
    /play[\s-]?through|roll[\s-]?over|wager|redemption progress|played (?:at least|through)|play.{0,50}(?:once|three times)/i,
    /\d|once|twice|three times|one time/i,
  ],
  minimum: [
    /redeem|redemption|cash.?out|prize/i,
    /\bminimum\b|\bmaximum\b|at least|up to|\bthreshold\b|\blimits?\b|\bcaps?\b/i,
    /\$\s*[\d,.]+|[\d,.]+\s*(?:SC\b|sweeps? coins?|USD\b|dollars)/i,
  ],
  timing: [
    /redeem|redemption|prize|payout/i,
    /business days|working days|hours|minutes|processing|processed|Skrill|Trustly|Prizeout|MassPay|crypto|bank transfer|gift card/i,
  ],
  verification: [
    /verif|identity|identification|\bKYC\b|proof of|social security|\bSSN\b/i,
    /document|passport|licen[cs]e|address|government|photo|social security|\bSSN\b/i,
  ],
  restrictions: [
    /(?:not|no longer).{0,50}(?:availab|eligib|permit)|exclud|restrict|prohibit|residen|eligible states/i,
    /\bstates?\b|United States|California|New York|Florida|Nebraska|Washington|Idaho|Michigan|Montana|Nevada|years of age|years old/i,
  ],
};

// Match semantic text units, not site-specific class names or element paths.
// These are evidence passages, deliberately not inferred numerical facts.
export function extract(text) {
  const lines = text.split("\n").map(normalize).filter(Boolean);
  const units = lines.flatMap((line, index) => {
    const sentences = line.split(/(?<=[.!?])\s+(?=[A-Z])/);
    const candidates = line.length <= 600 ? [line] : sentences.map(normalize);
    if (line.length < 90 && lines[index + 1]) candidates.push(`${line} ${lines[index + 1]}`);
    return candidates;
  }).filter(line => line.length >= 30 && line.length <= 600);
  const result = {};
  for (const [key, patterns] of Object.entries(rules)) {
    let candidates = [...new Set(units)].filter(line => patterns.every(pattern => pattern.test(line)));
    if (key === "daily") candidates = /sign[\s-]?up bonus.{0,10}how it works/i.test(text.slice(0, 1000)) ? [] : candidates.filter(line =>
      !/first (?:three|3|seven|7) days|day (?:one|1)|2nd|3rd|welcome|sign[\s-]?up/i.test(line));
    if (key === "verification") candidates = candidates.filter(line => !line.endsWith("?"));
    if (key === "minimum") candidates = candidates.filter(line => !/roll[\s-]?over|for example/i.test(line));
    candidates.sort((a, b) => {
      const score = value => (/\d/.test(value) ? 3 : 0) + (/must|required|minimum|receive|eligible/i.test(value) ? 2 : 0);
      return score(b) - score(a) || a.length - b.length;
    });
    const picked = [];
    for (const candidate of candidates) {
      if (!picked.some(existing => existing.includes(candidate) || candidate.includes(existing))) picked.push(candidate);
      if (picked.length === 2) break;
    }
    result[key] = picked;
  }
  return result;
}

export function validQuotes(text, fields) {
  const body = normalize(text);
  const accepted = {};
  for (const key of Object.keys(FIELDS)) {
    accepted[key] = Array.isArray(fields?.[key]) ? [...new Set(fields[key])]
      .filter(quote => typeof quote === "string" && quote.length >= 30 && quote.length <= 600 &&
        body.includes(normalize(quote))).slice(0, 2).map(normalize) : [];
  }
  return accepted;
}

export function fingerprint(quotes) {
  return hash(quotes.map(item => `${item.sourceId}:${normalize(item.quote).toLowerCase().replace(/[^\p{L}\p{N}$%]+/gu, " ")}`)
    .sort().join("\n"));
}

export function aggregate(operator, sources, previous, observedAt) {
  const fields = {};
  const events = [];
  for (const [key, label] of Object.entries(FIELDS)) {
    const old = previous?.fields?.[key];
    const quotes = sources.filter(source => source.status === "ok").flatMap(source =>
      (source.fields?.[key] || []).map(quote => ({
        sourceId: source.id, url: source.url, quote, observedAt,
        textHash: source.textHash, extractor: source.extractor,
      })));
    const missingPriorSources = old?.quotes?.some(quote =>
      !sources.some(source => source.id === quote.sourceId && source.status === "ok" && source.fields?.[key]?.length));
    const status = quotes.length ? (missingPriorSources ? "partial" : "observed") :
      old?.quotes?.length ? "stale" : "unavailable";
    fields[key] = {
      label, status, checkedAt: observedAt,
      lastObservedAt: quotes.length ? observedAt : old?.lastObservedAt || null,
      quotes: quotes.length ? quotes : old?.quotes || [],
      note: status === "stale" ? "Previous evidence retained; not confirmed in this run." :
        status === "unavailable" ? "No supported passage collected. This does not mean the feature is absent." :
          status === "partial" ? "Some previously supporting sources were not reconfirmed." :
            "Operator source passages, not independently verified outcomes.",
    };
    if (quotes.length && !old?.quotes?.length) {
      events.push({ operator: operator.slug, field: key, label, type: "baseline", observedAt, before: [], after: quotes });
    } else if (quotes.length && !missingPriorSources && fingerprint(quotes) !== fingerprint(old?.quotes || [])) {
      // Scope/source changes and wording changes are not asserted to be new offers.
      events.push({ operator: operator.slug, field: key, label, type: "source_wording_changed", observedAt,
        before: old.quotes, after: quotes });
    }
  }
  return { record: { slug: operator.slug, name: operator.name,
    productMode: operator.playerValue.productMode, checkedAt: observedAt, fields,
    sources: sources.map(({ fields: _, ...source }) => source) }, events };
}
