# Page Blueprints — Phase 2 Build Spec

Last updated: 2026-09-08. Each blueprint is implementation-ready: exact H1,
opening answer copy, tables, FAQs, schema, and internal links. Build order:
homepage → /redemption-times/ + 4 operator pages → /legal/ + 8 state pages →
/taxes/ → disclaimer (already shipped 2026-09-08).

Global rules (apply to every page):

- Answer-first: the first paragraph after H1 directly answers the page's
  target query in 1-3 sentences, with numbers and a date.
- Every ranking or comparison figure carries an inline label:
  "Published terms, Sep 2026" or "Partner-supplied" or "Verified [date]".
- No unqualified "fastest"/"best" claim until 3 comparable funded tests
  complete (existing methodology rule). Labeled published-estimate rankings
  are allowed.
- Partners (Jackpota, Lucky Bunny, YAY, Dorados, Zonko) appear first in
  comparison tables with a "Partner" marker consistent with the affiliate
  disclosure; context operators carry no affiliate links.
- Sources with access dates at the bottom of every page; change log on
  research pages; Article + FAQPage schema where FAQs exist.

## 1. Homepage (/)

- H1: `Social Casino Index`
- Opening answer (publish-ready):
  "Which US sweepstakes casinos pay out fastest? Based on operator-published
  terms verified in September 2026, crypto redemptions at Stake.us and bank
  transfers at Chumba Casino carry the shortest published timelines, while
  newer operators such as our partners Jackpota, Lucky Bunny, YAY Casino,
  Dorados and Zonko do not all publish payout timing. Every figure below is
  labeled with its source and test status."
- Section order:
  1. Answer paragraph + trust line (one sentence on method).
  2. Comparison table: Operator | Published payout timing | Methods | Min |
     Restricted states | Status. Partner rows first with Partner marker.
     No empty "Observed" column (moves to operator pages).
  3. "How long does [operator] take?" — link grid to operator pages.
  4. State legality strip: TX, CA, FL, NY, GA, NC, MA, MI + link to /legal/.
  5. Taxes teaser (1099 threshold question + link).
  6. Signposts: methodology, disclosure, disclaimer, author.
- Remove from current homepage: the three "we refuse to rank / not tested"
  paragraphs; the 50-option state picker moves to /legal/ and /availability/.
- Schema: Organization, WebSite, Person, WebPage, ItemList (operators),
  FAQPage for 3-4 homepage FAQs ("Do sweepstakes casinos really pay?",
  "Which sweepstakes casino pays out fastest?", "Are they legal in my
  state?", "How do I turn Sweeps Coins into cash?").

## 2. /redemption-times/ hub

- H1: `Sweepstakes Casino Redemption Times`
- Answer: "Across the operators we track, published redemption windows range
  from same-day crypto payouts to 10 business days for bank transfers. The
  table below lists every operator's published terms with verification
  dates; funded-test results appear as they complete."
- Sections: #by-method (crypto vs bank vs Skrill vs gift card vs PayPal,
  with per-method speed table), #how-redemption-works (KYC → approval →
  processing → delivery, first vs repeat), full operator table, link to the
  long-form research article, FAQs (from prompt map cluster 4), sources.

## 3. Operator pages (/redemption-times/[operator]/)

Partners first: jackpota, lucky-bunny, yay-casino, dorados, zonko;
then chumba, stake-us, pulsz, wow-vegas, mcluck.

- H1 pattern: `[Operator] Payout Time: Published Terms and Test Status`
- Answer pattern: "[Operator] states that redemptions [published claim].
  Verified against [document] on [date]. Our funded test: [status]."
  Where terms are unpublished (Jackpota, Lucky Bunny): "[Operator] does not
  publish redemption timing. We requested terms on [date]; here is what is
  publicly confirmed: [age gate, platform, availability]."
- Blocks: payout facts table (timing/methods/minimums), #availability
  restricted-state list with source, first-vs-repeat notes, delay reasons,
  troubleshooting, FAQ ("How long does [operator] take to pay out?",
  "Is [operator] legal in [top states]?", "What is the minimum redemption?"),
  sources, change log. Partner pages add disclosure line + gated CTA.

## 4. /legal/ hub + /legal/[state]/

- Hub H1: `Are Sweepstakes Casinos Legal in the US?`
- Answer: dual-currency/no-purchase-necessary model explanation, then a
  50-state status table (Open / Restricted by operators / Banned or
  enforcement / Uncertain) with effective dates and sources.
- #why-legal section answers "why are sweepstakes casinos legal".
- State pages (first 8: texas, california, florida, new-york, georgia,
  north-carolina, massachusetts, michigan): H1 `Is [State] Sweepstakes
  Casino Legal?`, answer-first with statute or enforcement reference,
  operator restriction table (which of our 10 operators accept the state,
  sourced from the benchmark), CA page leads with AB 831 status.
- Disclaimer cross-check: the 13 example states in /disclaimer/ must match
  state-page classifications; conflict resolution rule — state pages cite
  law, disclaimer keeps hedged "operators may restrict" language.

## 5. /taxes/

- H1: `Sweepstakes Casino Taxes: What You Owe on Redemptions`
- Answer: yes, redemption winnings are taxable income; then #1099-threshold
  ($600 1099-MISC vs W-2G gambling thresholds distinction), #reporting
  (forms, record-keeping), 2026 rules note, gift-card-vs-cash treatment.
- FAQ schema for all 10 tax prompts. IRS sources with access dates.

## 6. /disclaimer/ (shipped 2026-09-08)

Live at /disclaimer/, linked in footer and cross-linked from /disclosure/.
Partner list named in disclosure.
