import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { hash } from "./core.mjs";

const forbidden = /(?:^|\/)(?:login|signin|sign-in|register|signup|sign-up|logout|checkout|payment|deposit|withdraw|account|cart|go|api)(?:\/|$)/i;
const relevant = /bonus|promo|offer|welcome|reward|daily|package|sweep|redeem|redemption|terms|rules|faq|help|support|\.pdf$/i;
export function publicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 ||
      a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 ||
      a === 198 && (b === 18 || b === 19));
  }
  // Global unicast only; mapped IPv4 must pass the same checks.
  if (address.startsWith("::ffff:")) return publicAddress(address.slice(7));
  return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:db8:/i.test(address);
}
export function safeUrl(value, hosts) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") ||
      isIP(url.hostname) || !hosts.includes(url.hostname.toLowerCase())) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch { return null; }
}
export async function checkDestination(value, hosts, resolver = lookup) {
  const url = safeUrl(value, hosts);
  if (!url) throw new Error("unsafe_source_url");
  const addresses = await resolver(new URL(url).hostname, { all: true });
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error("unsafe_source_address");
  return url;
}
export function discover(links, source, operatorId, hosts) {
  if ((source.depth || 0) >= 2) return [];
  return [...new Set(links || [])].map(link => safeUrl(link, hosts)).filter(Boolean)
    .filter(link => relevant.test(new URL(link).pathname) && !forbidden.test(new URL(link).pathname) &&
      !/[?&](?:action|token|session|redirect|return|affiliate|ref)=/i.test(link))
    .sort().slice(0, 100).map(url => ({ id: `${operatorId}-discovered-${hash(url).slice(0, 12)}`,
      url, discoveredFrom: source.id, depth: (source.depth || 0) + 1, purpose: "discovered_terms_or_offer" }));
}
export function needsRendering(result, source) {
  if (result.status !== "ok") return result.status !== "login_required";
  return result.text.length < 800 || /enable javascript|javascript (?:is required|disabled)|loading\.\.\./i.test(result.text) ||
    (/home|promo|offer|welcome|package/.test(source.id) &&
      !/\d[\d,.]*\s*(?:SC\b|sweeps? coins?)|\bSC\s*\d/i.test(result.text));
}
export function sourceQueues(operators, config, previous = {}) {
  return operators.map(operator => {
    const seeds = [...operator.sources, ...(config.additionalSources || []).filter(s => s.operatorId === operator.slug)]
      .map(source => ({ ...source, url: config.sourceOverrides?.[source.id] || source.url, depth: 0 }));
    const hosts = [...new Set([...seeds.map(s => new URL(s.url).hostname), ...(config.allowedHosts?.[operator.slug] || [])])];
    const prior = previous.discovery?.[operator.slug] || {};
    const byUrl = new Map();
    for (const source of [...seeds, ...(prior.queue || [])]) {
      const url = safeUrl(source.url, hosts);
      if (url && !byUrl.has(url)) byUrl.set(url, { ...source, url });
    }
    const queue = [...byUrl.values()].sort((a, b) =>
      (Date.parse(prior.checked?.[a.id] || "") || 0) - (Date.parse(prior.checked?.[b.id] || "") || 0) ||
      (a.depth || 0) - (b.depth || 0) || a.id.localeCompare(b.id));
    return { operator, hosts, queue, checked: { ...prior.checked }, attempted: 0, sources: [] };
  });
}
