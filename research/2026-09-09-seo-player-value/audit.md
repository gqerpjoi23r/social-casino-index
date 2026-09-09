# Social Casino Index Visibility and Player-Value Review

## Executive Assessment

**The site has a useful technical foundation, but it does not yet deliver its full player-value promise.** The landing page and About page describe a transparency service for offers, games, redemption terms, minimums, and restrictions. The comparison experience still centers on redemption. Welcome offers, daily rewards, and package economics are the largest immediately actionable information gaps. [E1-E3]

The recommended position is **a dated, evidence-backed comparison of what players receive, what conditions apply, and what remains unknown**. Bonus coverage belongs in that mission. It should explain usable value and restrictions, not repeat the largest promotional number.

Before expanding acquisition, fix the outbound journey and eligibility logic. Then complete the offer records, separate entertainment-only and prize-bearing products, and publish a small number of genuinely useful comparison pages. Use the $200 research budget to establish evidence and editorial briefs, not to generate dozens of thin pages or claim independently tested payouts.

This review covers the production snapshot retrieved on **September 9, 2026 UTC**, local source inspection, and research collected on **August 17, 2026**. It does not establish Google index coverage, search traffic, Core Web Vitals, backlinks, current AI citation share, or the legality of each operator in each state. Those remain measurement or verification tasks.

## Findings by Priority

| Priority | Finding and evidence | Required action |
|---|---|---|
| P0 | All ten `/go/` pages contain invalid inline JavaScript. Production and source checks agree. The meta-refresh fallback points to availability, not the operator. [E1, E2] | Repair escaping and test every outbound journey before sending additional traffic. |
| P0 | Eligibility uses a truthy cookie as a valid state. Dismissal and invalid values can enable CTAs. Operator-specific exclusions are ignored. Malformed cookie encoding throws. [E2] | Validate against the supported state set, separate dismissal from selection, catch decode errors, and apply verified operator restrictions. Unknown eligibility must not become approval. |
| P1 | Seven of ten welcome-offer records are placeholders; eight daily-reward and eight package-value records are placeholders. Homepage cards omit these fields. [E2, E3] | Research and normalize player value before promising bonus comparisons. Do not treat the three populated welcome strings as fully verified, comparable offers. |
| P1 | All ten operators are marked `pending`, but the test log is empty. Methodology defines pending as a funded test in progress. [E2, E3] | Reconcile with private evidence. If a funded test exists, record its metadata. Otherwise use `not tested` or `not applicable`, as appropriate. This is an inconsistency, not proof that no private tests exist. |
| P1 | Numbered positions put five partners first. Homepage copy promises the biggest bonus and fastest payout without comparable completed tests. [E3] | Explain ordering, remove implied performance ranks, and distinguish objective field sorting from endorsements. Keep best/fastest rankings gated by methodology. |
| P1 | Jackpota is described internally as entertainment-only, yet appears in redemption pages and has a pending redemption test. [E3] | Reverify the exact current product and jurisdiction. Correct classification, applicability, page title, and test status together. Current external classification was not independently resolved in this review. |
| P1 | Author `sameAs` links Alex Rowan to a LinkedIn URL named Alex Williams. [E3] | Verify that both identities are the same person and explain a pen name if relevant. Otherwise correct/remove the identity assertion. Do not invent credentials. |
| P2 | Benchmark page lacks Dataset markup; existing SEO validation largely checks string presence, not semantic validity. [E1, E3] | Add metadata only where it accurately describes the public dataset; strengthen validation across all generated pages. |
| P2 | State sitemap dates come from `statusDate`, which represents the underlying legal event, not necessarily a material page update. [E3] | Separate legal effective/event dates, source review dates, and content modification dates. |
| P2 | Earlier demand research mixes markets and gambling categories and has only four sweepstakes-specific SERPs. [E4-E6] | Run a bounded US-English, category-separated refresh before setting keyword priorities or traffic forecasts. |

### Reproduction References

- `src/go/jackpota/index.html:24`: branch containing the malformed quoted HTML. The same class of error affects the other nine stubs.
- `src/assets/eligibility.js:24`: cookie decoding; `:41`: truthiness-based state validation; no operator-specific exclusion lookup.
- `src/index.njk:63`: strongest homepage claims; `:117`: numbered placement; `:124`: redemption-focused comparison fields.
- `src/_data/operators.json`: offer strings, partner ordering, classification, verification dates, and pending test flags.
- `src/_data/tests.json`: empty entries array at the audited revision.
- `src/methodology.njk:32`: pending means funded/in progress; `:37`: ranking threshold.
- `src/authors/alex-rowan/index.njk:19`: identity relationship.
- `src/sitemap.njk:16`: state `lastmod`.
- `scripts/validate-seo.mjs`: hard-coded page sets and substring checks.

The gate reproduction uses a minimal DOM fixture, not a complete browser journey. The outbound syntax errors were also detected in fetched production HTML. Do not repair the syntax alone: doing so could activate the underlying eligibility defects. [E1, E2]

### Validation

`npm run release` passed after installing the lockfile dependencies in the audit worktree. It validated ten articles, sitemap coverage for 42 public pages, canonicals on 38 pages, and JSON-LD presence on 33 pages. The separate audit checks found the defects above despite that green release. Existing release validation is therefore insufficient to establish a working commercial journey. No production source fix is included in this planning branch.

## What Is Already Working

The production sitemap contains 42 public URLs. All 42 and the ten additional outbound pages returned HTTP 200. Public sitemap URLs had the expected canonical, and all 52 checked pages had one H1. Existing JSON-LD parsed successfully. The outbound pages are excluded from the sitemap. These are positive crawl and document checks, not proof of indexing or search eligibility. [E1]

The site provides static editorial content, readable source links, dates, a methodology, affiliate disclosures, an author page, and downloadable data. The separation of published terms from observed results is the correct foundation. Unknown fields are generally labeled instead of filled with invented facts. [E1-E3]

The September 9 changelog records Search Console ownership and sitemap submission plus consent-controlled Google measurement. Repeating setup is not the immediate priority. The next agent should inspect actual property data and validate collection rather than assume configuration means useful measurement. No account-level GSC or GA performance was inspected here. [E3]

## Product Categories

**Social casino and sweepstakes casino should not be treated as interchangeable categories.** For this site's taxonomy, separate:

| Proposed category | Player objective | Suitable comparison |
|---|---|---|
| Entertainment-only social casino | Play casino-style games with virtual currency, without standard redeemable prizes | Free-play allocation, paid virtual-coin packages, games, ads, access, account tools |
| Sweepstakes/prize-bearing product | Participate under sweepstakes rules with possible prize redemption | Promotional currency, entry routes, eligibility, playthrough, prize methods, minimums, restrictions |
| Licensed real-money casino | Wager within the scope of a specific gambling licence | A separate regulated-product category, outside the initial content expansion |
| Unresolved or mixed product | Product model or state-specific mode not verified | Explain what is known; do not assign prize or eligibility claims by inference |

This is a recommended editorial taxonomy, not a legal classification. Record the actual currencies and rules for each product. Do not assume every operator uses the names Gold Coins and Sweeps Coins, or that every dual-currency product follows identical rules.

Google's advertising policy also distinguishes social casino games without valuable prizes from sweepstake casinos. Its social-casino section disallows promotion by aggregators/affiliates. Therefore the old Google Ads keyword data cannot be interpreted as permission to advertise this comparison site. Organic SEO research and advertising certification are separate matters. Recheck the applicable country/product policy before any campaign. [S8]

Use the existing brand, but give visitors distinct paths such as **Social casino games** and **Sweepstakes casino comparisons**. A classification legend should appear before any cross-product comparison. An entertainment-only coin bonus must never compete numerically with promotional currency that may become redeemable.

## Player Needs Beyond Payout Speed

The following are research priorities, not a claim that current search volume has already ranked them.

| Player question | What to benchmark | Why the current record is insufficient |
|---|---|---|
| What do I receive just for joining? | Registration reward, verification requirement, code, eligible currency, new-user restriction | A headline offer can combine free registration rewards with a purchase promotion. |
| What can I receive without a purchase? | No-purchase entry routes, daily claims, mail-in rules, limits, processing terms | "No deposit" does not explain verification, time, effort, or redeemability. |
| What do I get for a $10 or $20 purchase? | Exact displayed package price, GC, promotional SC, fees, account eligibility | General package ranges do not allow like-for-like comparison. Do not interpolate unavailable packages. |
| Which daily rewards are actually predictable? | Base amount, claim interval, streak schedule, expiry, region/account differences | A maximum streak reward is not the same as an ordinary daily reward. |
| What is the catch in the bonus? | Playthrough basis, eligible games, contribution, maximum redemption, expiry, exclusions | The largest nominal offer can have the most restrictive conditions. |
| Can I play the games I enjoy? | Verified game/provider availability, game modes, device support, minimum play amount | Advertised game counts do not establish availability for a particular account or currency. |
| Does "free spins" mean prize-bearing play? | Currency, game, spin denomination, award cap, expiry | Spin counts without these fields are not comparable. |
| Can I redeem a small balance? | Method-specific minimum, fees, required verification, restrictions | A single operator-wide minimum may hide method differences. |
| What happens if verification fails? | Required documents, stated checks, appeal/contact route, account limitations | General KYC language does not answer the practical question. |
| Can I trust support and account controls? | Published support channels, case escalation, limits, closure and exclusion tools | Availability claims are not measured response-time claims. |
| What if the operator leaves my state? | Operator notice, dates, entry/purchase cutoff, redemption deadline, support route | A ban summary alone does not answer what happens to an existing balance. |
| What do returning players receive? | Public recurring offers and loyalty terms, eligibility and expiry | Personalized/VIP offers cannot be generalized to all players. |

The existing August SERPs include related searches for signup bonuses and no-deposit bonuses. That is direct discovery evidence for those intents, but not a volume estimate or proof of current offer availability. Daily rewards, package economics, and the other motivations above require the targeted refresh described in the plan. [E6]

### Comparable Value, Not Implied Profit

Publish GC and promotional/prize-bearing currency separately. A disclosed package can show **promotional SC per purchase dollar** as a descriptive ratio only when the exact package and eligibility are documented. Label it as a package comparison, not a cash return, expected value, discount on withdrawable money, or profit.

Do not convert the nominal offer into guaranteed cash. Do not estimate playing outcomes from a game count or generic RTP. If a game-level RTP is published, preserve the exact game/version and source and explain its limited applicability. Do not recommend chasing losses, higher spending to unlock tiers, or identity/location workarounds.

For entertainment-only products, compare GC per dollar only within the same operator unless a defensible common unit exists. One million GC on one platform need not buy the same amount of play as one million GC on another.

## Recovered Demand Research

The relevant files were found in a separate local project:

`/Users/nimaboustanian/projects/kylserviceguiden.se/`

| Artifact | What was recovered | Proper use |
|---|---|---|
| `outputs/gambling-demand/2026-08-17-global/global-gambling-demand-report.md` | Global-English Ads historical metrics and Bright Data Trends synthesis | Broad category discovery; not a US sweepstakes keyword plan |
| `private/gambling-demand/2026-08-17-global/google-ads-historical-raw.json` | Raw historical response supporting the global report | Verify metric scope, month range, close variants, and individual values |
| `outputs/player-choice-demand/2026-08-17/player-choice-demand-report.md` | 50 localized SERPs and 24 localized Trends comparisons across several markets | Player-question discovery and hypotheses |
| `outputs/player-choice-demand/2026-08-17/serp-results.json` | Four US sweepstakes-related SERPs, IDs 34-37 | Seed the new US content-gap sample |
| `private/player-choice-demand/2026-08-17/` | Raw-response directory identified by that report | Reuse before paying to recollect; inspect only relevant records |

The global Ads run reported **60,500** average monthly searches for `social casino`, **5,400** for `casino cashback`, and **1,900** for `no wagering casino bonus`. These are rounded global-English estimates, not US sweepstakes counts. Do not combine them into a unique audience, use advertiser competition as organic keyword difficulty, or import real-money-casino demand into sweepstakes projections. [E4, E5, S7]

The player-choice report's Ads authentication failed, so it contains no absolute volume for its new queries. This does not contradict the successful global Ads run: they were different jobs. The four sweepstakes SERPs averaged 6.75 shortlist-style results and zero evidence-oriented results under the report's text heuristic. That heuristic assessed result text, not full-page research quality. The finding supports investigating a gap; it does not prove that competitors have no evidence. [E4-E6]

The earlier Trends work correctly used anchors and warned about sparse long-tail queries. Its remaining limitation is applicability: a global `online casino` anchor and mixed-product comparisons cannot answer which US sweepstakes bonus topics deserve publication now. Google Trends is sampled and normalized; zero or insufficient data is not proof of zero demand. [E4, E5, S6]

**Best-practice verdict on the earlier research:** useful exploratory work with explicit limitations, but insufficient for the current editorial decision. Preserve its raw evidence and refresh narrowly instead of repeating the entire global study.

## SEO and AI Visibility

### Search Intent and Information Architecture

The current homepage claims broader utility than its cards provide. Most operator records also live under `/redemption-times/`, reinforcing a payout-centered identity. [E1, E3] Keep those URLs stable initially. Add offer, games, and account sections to the existing records and connect them from new topic hubs. Do not create a second near-identical operator page just to use a broader URL.

The first new hub should compare welcome bonuses and no-purchase conditions. The second should compare daily rewards and package terms. Exact paths and titles should follow the US intent/overlap analysis; proposed paths in the plan are provisional. State pages need state-specific evidence and practical dates, not just a place-name substitution. Google's spam guidance is relevant to thin affiliate material, doorway patterns, and scaled pages without additional value. [S9]

The initial evidence work should complete the ten existing records, but market discovery should not be limited to those brands. Identify relevant unlisted operators from the new SERP sample and record a small expansion watchlist. Inclusion should depend on player demand, product scope, and accessible evidence, not affiliate availability. This review does not establish that the current ten represent the whole market.

Google's review guidance emphasizes original evidence, important decision factors, and balanced comparisons. Completing source-backed player-value fields advances that goal. A generic "best casino" list without comparable evidence does not. [S2]

### Structured Data and Crawl Access

Existing parseable JSON-LD is a foundation, not a rich-result guarantee. Add accurate Dataset metadata to a substantive dataset landing page, with creator, description, distributions, version/date information, and a licence that the publisher can actually grant. Avoid inventing ratings or using Product/Offer markup merely because a page mentions casino promotions. Markup must reflect visible content. [E1, S3, S5]

Google states that its AI features do not require special AI schema or special optimization. Prioritize indexable text, useful comparisons, internal links, accurate facts, and source attribution. Treat `llms.txt` as optional experimentation, not a prerequisite or a promised ranking lever. [S1]

The live `robots.txt` allows all crawlers. OpenAI distinguishes its search crawler from its training crawler; choose those permissions deliberately if policy changes are desired. Do not accidentally block discovery when changing training preferences. No robots change is required merely to complete this plan. [E1, S11]

**Do not spend the budget expanding FAQ markup for Google rich results.** Google's documentation says the FAQ rich-result feature stopped appearing on **May 7, 2026**. Useful visible questions and answers can remain. Existing accurate FAQ markup is not the main problem, and removing it is not an urgent growth project. [S4]

### Citation-Worthy Transparency

The strongest differentiation is a reusable fact record: one claim, its scope, source, date, evidence status, and known restrictions. Build HTML tables and machine-readable exports from the same normalized records. This is a recommendation for information quality and consistency, not a guarantee that an AI engine will cite the site.

Each operator needs a stable identifier, confirmed legal entity where available, product mode, field-level sources, and a visible change history. Distinguish operator-stated facts, researcher observations, independently funded tests, unresolved conflicts, and missing information. Replace the blanket impression of a fully verified operator with more granular verification coverage.

For operators, provide a corrections/submissions route that accepts evidence but does not grant editorial control. Publish inclusion criteria, partner relationships, sorting rules, correction dates, and the right to respond to a documented dispute. Do not sell verification labels or erase historical corrections in exchange for a commercial relationship.

### Measurement Still Needed

Inspect GSC performance and page indexing, not `site:` result counts as a substitute. Capture US queries, landing pages, brand/nonbrand splits, impressions, clicks, CTR, and position with dates. Inspect representative homepage, operator, state, and guide URLs individually. Check rendered content and real-user performance when available; this audit did not establish Core Web Vitals.

Create a small repeatable AI citation panel: fixed player questions, named engines/modes, date, geography if controllable, exact cited URLs, and factual accuracy. A mention without a link is not a citation. Repeat the panel rather than treating one answer as a ranking. Report no citation separately from a failed or inaccessible run. Keep AI citation measurements separate from Google organic position and consented referral traffic.

## Recommended Sequence

1. Repair outbound and eligibility defects together. Reconcile test-status, classification, author identity, and implied rankings.
2. Use the $200 research allocation to refresh US demand and build source-backed offer records for the ten existing operators.
3. Publish welcome-offer and daily/package comparisons only after comparable evidence and editorial review exist.
4. Improve existing operator pages, source metadata, exports, internal linking, and validation before increasing page count.
5. Add state-exit, support, game-choice, and account-control comparisons where evidence and demand justify a distinct page.
6. Measure indexing, useful organic queries, citations, freshness, and factual accuracy. Do not promise traffic or affiliate revenue from the available evidence.

The detailed execution plan is in `agent-plan.md`. The short dispatch brief is in `handoff.md`. No production content, campaigns, funded play, or paid research jobs were changed or launched by this review.

## Sources and Evidence

Public references below were checked on September 9, 2026 UTC. URLs are exact source locations. Site findings refer to the saved snapshot; they are not statements about changes after that snapshot.

### Local Evidence

- **E1. Production audit:** `live-audit.json`; reproducible collector `check-live.mjs`. Contains HTTP, canonical, H1, JSON-LD, sitemap, robots, and script-syntax checks for 52 URLs. Site sources include `https://socialcasinoindex.com/` and `https://socialcasinoindex.com/about/`.
- **E2. Local reproduction:** `local-audit.json`; collector `check-local.mjs`. Contains six eligibility cases, ten script-syntax checks, and operator-field completeness counts. Minimal DOM fixture; not browser E2E.
- **E3. Repository evidence:** source files identified above, plus `CHANGELOG.md`, inspected at commit `3be1b7a`. Audit branch: `seo-player-value-research-plan`.
- **E4. Global gambling demand report:** August 17, 2026, local path in the recovered-research table. Internally generated research; no public source URL.
- **E5. Google Ads raw historical metrics:** August 17, 2026, local private JSON path in the table. Global-English scope; no fresh request in this review.
- **E6. Player-choice demand report and SERP records:** August 17, 2026, local paths in the table; particularly IDs 34-37. Raw provider material remains outside this repository.

### Public Primary Guidance

- **S1. Google Search Central, AI Features and Your Website.** `https://developers.google.com/search/docs/appearance/ai-features?hl=en`
- **S2. Google Search Central, How to Write High Quality Reviews.** `https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews`
- **S3. Google Search Central, General Structured Data Guidelines.** `https://developers.google.com/search/docs/appearance/structured-data/sd-policies`
- **S4. Google Search Central, Documentation Updates, May 2026 FAQ entry and subsequent removal notice.** `https://developers.google.com/search/updates?hl=en`
- **S5. Google Search Central, Dataset Structured Data.** `https://developers.google.com/search/docs/appearance/structured-data/dataset`
- **S6. Google Trends Help, FAQ About Google Trends Data.** `https://support.google.com/trends/answer/4365533?hl=en`
- **S7. Google Ads API, Generate Historical Metrics.** `https://developers.google.com/google-ads/api/docs/keyword-planning/generate-historical-metrics?hl=en`
- **S8. Google Ads, Gambling and Games Policy, Social Casino Games section.** `https://support.google.com/adspolicy/answer/15132179?hl=en`
- **S9. Google Search Central, Spam Policies.** `https://developers.google.com/search/docs/essentials/spam-policies`
- **S10. Google Search Central, Build and Submit a Sitemap.** `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- **S11. OpenAI, Overview of OpenAI Crawlers.** `https://developers.openai.com/api/docs/bots`

`source-checks.json` records retrieval metadata. Its S12 Jackpota fetch returned a page shell without enough terms text to resolve product classification; it is not supporting evidence for a definitive classification. Current operator offers, state law, tax rules, advertising approval, private analytics, and paid-provider pricing need separate checks before execution.
