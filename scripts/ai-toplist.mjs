// Compact, citation-ready projection of the homepage toplist for AI clients.
// Served as /api/toplist.json and read by the Social Casino Index MCP server.
// Order and values come from the shared toplist model; nothing is re-ranked here.
const SITE = "https://socialcasinoindex.com";
const absolute = path => path ? new URL(path, SITE).href : null;
const blocked = state => state.status === "statute" || state.status === "enforcement";

function fact(value) {
  if (!value?.label) return null;
  return {
    label: value.label,
    note: value.note || null,
    conditions: value.conditions?.length ? value.conditions : undefined,
    promoCode: value.promoCode || undefined,
    priceUsd: value.priceUsd ?? undefined,
    stage: value.stage || undefined,
    method: value.method || undefined,
    sourceUrl: value.sourceUrl || null,
    observedAt: value.observedAt || null,
  };
}

export function aiToplist(benchmarks, states = []) {
  const toplist = benchmarks.toplist;
  return {
    name: "Social Casino Index top social casinos",
    publisher: { name: "Social Casino Index", legalName: "Sweeps Brief LLC", url: `${SITE}/` },
    description: "Independent toplist of US social and sweepstakes casinos, as shown on the Social Casino Index homepage. Each value links to the dated operator source it came from.",
    landingPage: `${SITE}/`,
    methodology: `${SITE}/methodology/`,
    listingVersion: toplist.version,
    order: "Highest immediate no-purchase signup Sweeps Coins (SC) first. Equal amounts break by the number of supported benefit areas, then by name. Affiliate status never affects order.",
    generatedAt: benchmarks.generatedAt,
    lastCheckedAt: toplist.lastCheckedAt,
    disclosure: "Some Social Casino Index links are affiliate links. Compensation never affects order or values.",
    responsibleGambling: "Players must be 21+ or 18+ depending on state. Help: 1-800-GAMBLER.",
    offerBlockedStates: states.filter(blocked).map(state => state.code),
    casinos: toplist.homepageRows.map(row => ({
      position: row.position,
      name: row.name,
      slug: row.slug,
      profileUrl: absolute(row.url),
      summary: row.presentation?.summary || null,
      signupBonus: fact(row.signup),
      firstPurchaseOffer: fact(row.purchase),
      dailyReward: fact(row.daily),
      payoutTime: fact(row.redemption),
      redemptionMinimums: {
        cash: fact(row.cash),
        giftCard: fact(row.gift),
        general: fact(row.generalMinimum),
      },
      prizeTypes: row.rewardTypes,
      lastCheckedAt: row.lastCheckedAt,
    })),
    states: states.filter(state => state.code).map(state => ({
      code: state.code,
      name: state.name,
      offersBlocked: blocked(state),
      status: state.statusShort || "No site-wide offer block",
      basis: state.basis || undefined,
      url: state.slug ? `${SITE}/availability/${state.slug}/` : `${SITE}/availability/`,
    })),
  };
}
