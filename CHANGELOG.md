# Agent Changelog

Succinct log of what each working session changed, so multiple agents (and
humans) in this shared worktree can see what happened without reading diffs.
Newest entries on top. One short entry per commit/session.

Format:

    ## YYYY-MM-DD - short title
    - What changed (behavior, not file lists).
    - Why / what it unblocks.
    - Anything the next agent must know (data model changes, new required
      front matter, manual steps left to the user).

---

## 2026-09-24 - Preserve improving daily-reward wording after refresh
- Recognize "rewards become better with more days" as an increasing daily reward, without assigning fixed SC or admitting another operator.
- Production refresh read 47/50 sources with 38 Firecrawl and 12 model requests. One repair recovered two YAY records; no fixed daily amount was established.
- Lucky Bunny's new packages do not establish immediate SC and supersede its older comparison value. Five operators now qualify for the homepage. Access and numeric gaps remain tracked in issue #14.

## 2026-09-24 - Player-first comparisons and one current evidence model
- Require two of four comparison categories for homepage admission; rank by immediate free signup SC, not completeness. Keep paid SC-per-dollar sorting separate, unknowns last, and all operators monitored.
- Left-align names and values, move positions/logos right, and place Terms below each entry. Describe supported variable daily rewards without inventing a fixed SC amount.
- Feed eight current comparison pages, profiles and a current CSV from the shared evidence model. Preserve versioned downloads and remove stale registry-value rendering.
- Use automatic Firecrawl fallback and prioritize comparison seeds, then discovered official sources. One optional captured-quote repair shares the existing model limit; numeric extractor is 2.5.0.
- Add product-impact summaries and field-gap diagnoses to publication. Existing request ceilings, affiliate gates, observation dates, roster and Lovd prompts remain unchanged.
- Correct YAY's immediate signup from 4 to 1 SC against its saved September 24 registration-step breakdown; retain the up-to-12-SC task package and dated history. Prevent optional task totals from becoming immediate signup amounts.
- Verify 129 monitor tests, full release, five homepage viewport widths, all seven benchmarks, eleven profiles, eight migrated comparisons, keyboard/no-JavaScript use and CSV parity. Historical exports remain byte-identical.

## 2026-09-24 - Correct offer interpretation found by the live refresh
- The fresh run recovered 48/50 readable sources, up from 37/50. Numeric extraction exposed an ambiguous McLuck signup banner and omitted explicit WOW first-day and instant-purchase allocations.
- Keep generic signup/chance-to-win banners as promotions unless free signup is established. Recover explicitly quoted day-one and instant-delivery SC without calculating totals or overwriting an existing amount; apply banner qualification to retained public records too.
- Recheck the saved run without new collection, preserving capture dates and private originals. Numeric extractor is 2.4.4; operator roster and absence policy are unchanged.
- Correct five public records against run `2026-09-24T10-29-34-240Z-35987472986-1`; recover WOW's staged and purchase benchmarks and return McLuck to its dedicated 2.5 SC signup reward. Benchmark coverage remains six operators and 16 homepage attributes, with zero fixed daily amounts.
- Verify 118 monitor tests, full release, and all seven benchmarks/eleven profiles across desktop/mobile, keyboard and no-JavaScript checks.

## 2026-09-24 - Recover public pages and recurring first-login rewards
- Keep substantive public pages readable when they contain standard embedded reCAPTCHA notices. Preserve actual challenge, HTTP block and login detection.
- Treat explicitly first-login-each-day wording consistently in extraction, benefit ranking and homepage labels. Preserve original quotes and continue excluding first-ever, paid, variable and streak rewards.
- Numeric extractor is 2.4.3. No new operators, ranking policy, request budgets or absence penalties; deploy and run the existing daily workflow to measure recovery.
- Verify 114 monitor tests, full release, saved-capture reclassification, and seven benchmarks plus eleven profiles across desktop/mobile, keyboard and no-JavaScript checks. Generated output and existing observations are unchanged before the fresh run.

## 2026-09-23 - Evidence-led collection recovery
- Audit 44 comparison attributes against the verified September 23 archive; replay cached extraction and run an isolated 11-source direct probe without paid calls or production writes. Findings and remaining operator gaps are in `data/monitor/collection-recovery.md`.
- Exclude binary assets from discovery, retrieval and archived extraction. Restrict full-content retries to configured sources with readable first renders; retain useful Chumba/Lucky Bunny paths and existing request caps.
- Recover supported purchase price and initial SC when only the total is ungrounded, logging the omitted field. Reject request frequency as processing duration; numeric extractor is 2.4.2.
- Restore McLuck's explicitly typical processing range and remove Stake's misleading 24-hour request limit from speed comparisons. Attribute counts remain 14 overall; default ordering can change from corrected coverage, not a new ranking policy.
- Prioritize Stake's existing redemption-progress source. Public numeric observations, confirmation dates, collection baselines and Lovd prompts remain unchanged; wider rendered-run savings still need live measurement after merge.
- Verify 110 monitor tests, full release, and all seven benchmark pages plus eleven profiles at five viewport widths with keyboard and no-JavaScript checks.

## 2026-09-23 - Visible signup claim details
- Improve only the signup and staged-welcome benchmarks with dynamic leaders, initial-versus-total amounts, and uncollapsed offer-specific schedules, requirements, promo codes and dated sources below compact tables.
- Derive all details from each benchmark's selected record; preserve ranking, collection, exports and other pages. Remove only formatting-only condition fragments from this presentation.
- Targeted official-source checks support the saved WOW and YAY schedules. McLuck blocked access and Chumba did not expose the offer; retain existing saved observations and dates, and track these check gaps in issue #14.
- Build on the unmerged cash-page PR #15. No new pages, deployment or Lovd prompt changes; article updates remain dated September 23.
- Verify 105 monitor tests, release checks and browser coverage at five widths with keyboard/no-JavaScript access. Only the two benchmark HTML pages and their stylesheet change in generated output; data exports remain byte-identical.

## 2026-09-23 - Direct cash-minimum answers
- Strengthen the cash benchmark with data-derived lowest/tied minimums, separate below-50-SC cash and gift-card answers, and a WOW Vegas versus Chumba comparison.
- Show cash sources, observation dates and retained-evidence markers without expanding terms. Add one contextual homepage link and remove duplicate benchmark title branding.
- Keep rankings, metric eligibility, public exports, collection and Lovd prompts unchanged. Broader content and collection work are tracked in GitHub issues #13 and #14; this branch is not a production deployment.
- Verify 101 monitor tests, the full release, all seven benchmarks and eleven profiles across five viewport widths, keyboard and no-JavaScript use. Public exports remain byte-identical.

## 2026-09-22 - Restore the dark homepage skin
- Restore the existing dark palette while preserving the compact introduction and responsive single toplist.
- Remove "Most complete" from the sort menu. Keep the initial ranking unchanged; offer only the four player-facing attribute sorts.

## 2026-09-22 - Readable, purpose-led homepage
- Give the homepage a light editorial identity, compact introduction, publisher attribution and visible source-checking principles without adding another list.
- Replace the tall mobile navigation with a compact native menu. Keep state selection beside sorting, existing visit gates, all four attributes and ranking behavior.
- Align comparison values, emphasize actual amounts, quiet unknowns and expose coverage with expandable source details. Other pages retain their existing design.
- Source panels and the mobile menu support Escape and outside-click dismissal. Browser regression checks cover five viewport widths, first-fold visibility, state selection, keyboard use and no-JavaScript access.

## 2026-09-22 - Keep conditional daily rewards out of fixed-value sorting
- Validate daily qualifiers in the offer name as well as its conditions. Do not rank first-claim, variable, random, streak or "up to" rewards as fixed recurring daily SC.
- Preserve the same homepage layout and source-backed records; only fixed-value comparison eligibility changes.
- Add the reward-detail URLs linked by Zonko and WOW to priority checks. A discovered detail page must not wait behind unrelated promotion pages.
- Accept explicit K/M coin notation during numeric grounding, fixing whole-package rejection caused by values such as GC10M. Extractor version is 2.4.1; no inferred reward totals are allowed.
- Restore cash-minimum eligibility when an unspecified method has an explicit cash-prize basis; this repairs Chumba's reconfirmed 100 SC record without guessing truly unspecified methods.

## 2026-09-22 - Player-first completeness and attribute sorting
- Replace the homepage's legacy-score priority with comparable numeric attribute count. Sort the same rows by welcome value, recurring daily SC, published processing window or cash minimum, keeping unknowns last and ignoring other missing fields for a selected sort.
- Remove the redundant "Daily reward" fallback; initial claims and unquantified rewards do not count as complete daily data. Keep published evidence separate from measured payout claims.
- Prioritise configured comparison sources within the existing collection budget. Fix explicit free daily parsing and add the missing processing-stage schema value. Preserve validated deterministic daily candidates when model extraction omits amounts.
- Report per-operator missing comparison fields separately from collection success. The existing affiliate-independent benchmark data and query pages remain available.

## 2026-09-22 - Preserve processing windows after the live refresh
- Use an explicit processing basis when extraction leaves the timing stage unspecified. Do not substitute a payment-delivery-only window for redemption processing.
- Preserve named entry-tier scope and business-hour units; prefer an explicit cash-processing window over an unspecified-method window. Add regression coverage from the fresh WOW and McLuck record shapes.

## 2026-09-22 - One homepage toplist with daily rewards
- Replace the homepage's multiple rankings and directory with one operator list: welcome offer, daily reward, published redemption time and cash minimum. Preserve query-specific benchmark URLs, sources and state-gated visits.
- Keep existing complete-score ordering; document deterministic positions for incomplete operators without inventing scores, votes or daily SC amounts. Distinguish initial daily claims, recurring rewards, payment stages and entertainment-only coins.
- Add official redemption sources to the daily monitor and track attempted checks separately from first observations and observed value changes. Failed checks retain dated evidence.
- Repair invalid scripts in the existing visit pages without changing destinations or the closed-state list; reject dismissed, malformed and unknown state cookies. SweetSweeps stays routed to availability pending verification.
- Verify 82 monitor/gate tests, release validation, all 101 prompt targets, and desktop/mobile/no-JavaScript browser checks with real local redirects and mocked external destinations.

## 2026-09-21 - Verify production benefits and focus source discovery
- Verify all seven live bonus benchmarks and eleven profiles across mobile/desktop, keyboard, image loading and no-JavaScript use.
- Add three Lovd prompts for $20 packages, daily rewards and staged welcome bonuses; retain all 98 existing prompts and history without starting immediate analysis.
- Exclude game-title URLs from new and persisted offer discoveries after the production refresh found games named with "bonus". Explicitly configured source URLs remain unchanged.

## 2026-09-21 - Published-benefit rankings and bonus benchmarks
- Add an affiliate-independent, equal-weight operator ranking and seven query-specific bonus benchmarks. Incomplete overall evidence does not suppress a supported individual benefit.
- Use one comparison model for homepage, operator profiles, answers and the new leaderboard JSON; preserve dated observations and distinguish staged rewards, package prices and cash/gift-card thresholds.
- Add SweetSweeps to coverage, bounded source-link discovery, rendered-content fallback and reviewed disclosure-gap support. Collection failures do not create transparency penalties.
- Add two head-to-head pages and eleven bonus-query targets without changing the historical prompt baseline. Expiry and withdrawal need explicit source support.
- Verify 70 monitor tests, release validation and desktop/mobile browser checks. Feature-branch live collection is blocked by the existing OIDC trust; use the authorized main workflow without expanding IAM.

## 2026-09-21 - Keep daily refresh tests independent of changing offers
- Use synthetic fixtures for exact display expectations and smoke-check the current snapshot without fixed offers, promo codes or row counts.
- Cover unknown purchase requirements replacing old free-signup claims and promo-code addition, replacement and removal without changing display or extraction behavior.
- Validate refreshed observations before release, commit, baseline advancement and deployment; preserve private captures when validation fails.
- Verify 53 monitor tests, full release validation, both September 18/19 snapshots and a mocked workflow failure. Generated pages and public data are unchanged; a fresh production run remains pending.

## 2026-09-18 - Prompt-aligned redemption and state coverage
- Add one Sweeps Coins redemption guide, linked operator answers and dated source-register links. Preserve datasets, exports, monitoring and eligibility behavior; no funded rankings are introduced.
- Keep `/availability/` canonical. Separate unchanged site offer blocks from legal findings, add reviewed California/Washington primary-source notes, and make remaining state legal-review gaps explicit.
- Move the prompt map source to `strategy/`, publish it through the build, repair missing targets, and validate every mapped page/fragment on release. Page-modified dates remain separate from operator evidence dates.
- Verify 27 pages, all 90 prompt targets, four viewport widths, keyboard-scrollable comparisons and the guide without JavaScript; preserve existing data exports.

## 2026-09-16 - Compact player-first homepage
- Replace the large hero with a short player-focused headline, three direct comparison links and a methodology link beside the introduction.
- Put purchase price and staged signup timing in the prominent amount text; retain dated sources, conditions and all three metrics.
- Remove the homepage guide grid and secondary topic directory. Guides remain in navigation; saved data, exports, collection and eligibility are unchanged.

## 2026-09-16 - Player-value answers and visibility topics
- Add source-linked, dated answers for redemption minimums, free signup timing, purchase budgets and two direct comparisons to both benchmark pages.
- Generate answers from the same saved numeric records as the three metrics. Preserve cash versus gift cards, immediate versus staged coins, and all data exports.
- Add eight Lovd visibility prompts in four topics without replacing the existing monitoring baseline. These measure visibility; they do not establish indexing or ranking gains.

## 2026-09-15 - Three numeric comparisons, less display machinery
- Replace ten partially empty cards with welcome SC, first-purchase value, and method-specific redemption comparisons. Include only supported numeric entries, with observed dates and expandable conditions.
- Choose player-beneficial amounts from the latest saved snapshot per source and category. Keep staged totals distinct from immediate SC; never combine incomplete purchase packages or guess redemption methods.
- Remove comparison sorting, 36-hour value expiry, conflict suppression, audit panels, old record formatting and historical method patches. Keep collection, evidence, exports and state-gated CTAs unchanged.
- These are dated advertised terms, not newly verified offers or funded payout rankings. Missing entries are omitted; raw history remains downloadable.
- Clean generated assets before builds so removed comparison scripts cannot remain in the deployment. The changed display implementation is approximately 47% smaller, excluding tests, data and generated output.
- Verify 47 monitor tests, release validation, nine numeric entries on both pages at five widths, loaded logos, keyboard/native details without JavaScript, eligibility controls and five unchanged exports.

## 2026-09-12 - Restore supported player comparison values
- Stop unrelated entertainment-coin and percentage ads from hiding an explicit signup SC reward. Show complete priced packages even when other offer descriptions are incomplete; do not combine their terms.
- Add the missing cash method to the extraction schema. Correct only four exact saved Chumba/WOW cash records in the shared display adapter; preserve original metadata and all exports.
- Keep genuine conflicts, ambiguous methods, retained values and expired records out of comparisons. No new collection or infrastructure changes.
- Advance both comparison pages' sitemap dates for this update while retaining later collection dates.
- Verify 54 monitor tests, release validation, both pages at five widths, loaded logos, keyboard/native details, expiry and sort preservation, eligibility controls, private-evidence exclusion, and five byte-identical exports.

## 2026-09-11 - Compact shared player comparisons
- Use the same branded cards on the homepage and updates page, with ten operators, visible offer conditions, separate redemption methods, and native source details.
- Show unknown and inapplicable values explicitly; exclude stale, conflicting, scoped, or mixed-unit amounts from current comparisons. Offer only supported useful sorts with static default ordering.
- Preserve public exports, review metadata, dated claims, and eligibility routing. No new operator collection.
- Verify 50 monitor tests and both pages at five viewport widths, keyboard symbols, independent native details without JavaScript, timed sort fallbacks, eligibility controls, private-evidence exclusion, and five byte-identical exports.

## 2026-09-11 - Player-friendly operator updates comparison
- Replace the audit-first view with alphabetical, sortable operator terms and native expandable public detail.
- Keep conflicting, retained, stale and ambiguous amounts out of numeric sorting; preserve separate cash/gift-card methods and immediate/staged SC.
- Reuse the public snapshots and exports without changing collection or private evidence.
- Verify 46 monitor tests and browser checks for all ten operators, every public claim, both sort directions, keyboard/native expansion without JavaScript, five responsive widths, unchanged exports and the live 36-hour warning. Browser checks use `scripts/monitor/comparison-browser-test.mjs` with an installed Playwright browser.

## 2026-09-11 - Use the existing private archive permissions
- Pin the verified review under `runs/review-2026-09-11-a2bef284992ccc38/`, inside the existing Actions role permissions.
- The first production attempt stopped before collection because the original `reviews/` prefix was not allowed. Preserve those artifacts; do not expand IAM permissions.

## 2026-09-11 - Complete daily numeric publication
- Publish archive-verified typed claims for all ten operators, with reviewed history separate from automated updates and failed-source retention.
- Add condition-sensitive reconfirmation, corruption isolation, production-only baseline advancement, and publication regression tests.
- Render numeric values, source coverage and a live 36-hour stale warning. Keep captures and the hash-pinned review/evaluation artifacts private.
- Verify 40 tests and corrected offline replay; the older prompt cache cannot identically replay with the current extractor. Review artifacts are pinned under `reviews/2026-09-11-a2bef284992ccc38/`.

## 2026-09-10 - Live archive review and numeric publication
- The ten-operator Actions run completed; review now separates semantic correctness from quote grounding.
- Fix offline event replay to ignore extraction timestamps and preserve readable captures when fallback fails.
- Keep automated numeric records private; promotion requires explicit source-backed review.

## 2026-09-10 - Numeric monitor completion and live evaluation
- Correct AWS trust to the repository's verified immutable OIDC subject; add archive-only model re-extraction and bounded authentication retries.
- Remove dollar-ledger enforcement; retain request bounds, raw capture provenance, model tokens and reported Firecrawl credits.
- Isolate branch baselines, verify S3 uploads by download and hash, retain failed-source values, and distinguish wording, numeric and extractor changes.
- Correct prior access diagnosis: the repository-scoped credential has push/admin access. The global `sunmer` login remains unchanged.
- Switch Pages to Actions deployment for ordinary main pushes and monitor runs. Daily numeric results remain private until reviewed and promoted.

## 2026-09-10 - Private captures and staged numeric extraction
- Archive source responses, Firecrawl Markdown/HTML, model responses and numeric records in private S3; GitHub Actions uses AWS OIDC and an SSM model key, without Lambda.
- Extract typed offer amounts and policy values with exact evidence, units, scope, explicit unknowns and review-required change signals. Cached replay needs no new scrape or model call.
- Add readable per-run results with all source URLs, values, evidence and rejected records; use one parallel directory transfer for final archiving.
- Numeric records remain private and unreviewed; production comparison facts are unchanged. Local S3 upload/restore verified with 49 grounded numeric fields and 20 rejected records. The earlier GitHub blocker diagnosis was incorrect; the repository credential has write access.

## 2026-09-10 - Simplify navigation and identify the publisher
- Remove Methodology, Payout methods and Redemption times from the main menu; preserve all existing pages, operator attributes and data exports.
- Add a SweepsBrief footer link and identify Sweeps Brief LLC on About using the shared legal name.
- Keep methodology accessible through the footer and About. Attribute-specific rankings remain deferred until comparable evidence meets the existing research standard.

## 2026-09-10 - Monitor first-run corrections
- Fix publication staging of an ignored CSS source; keep normalized observations with capture artifacts for independent evaluation.
- Tighten passage categories after first-run review, preserve decimal values and join PDF-wrapped paragraphs.
- Add false-match regression tests and an exact-evidence / identical-replay evaluation. These checks do not establish semantic accuracy.
- Gate subsequent publication on evidence/replay checks; update the monitor sitemap date from its latest readable run.

## 2026-09-10 - Daily public-source monitor
- Add bounded daily collection for the existing ten operators, direct retrieval with Firecrawl fallback, evidence snapshots, stale-data retention and wording-change history.
- Publish automated observations separately from reviewed comparison facts at /updates/ with a JSON export. No measured payout or new-offer claims.
- GitHub Actions runs tests and release validation before committing observations and deploying. Paid request allowances are estimates, not verified billing ceilings. Model and Bright Data adapters remain disabled.

## 2026-09-10 - Player-first homepage benchmarks
- Lead with signup SC, first-purchase price/SC and redemption minimums/playthrough. Move timing, games and verification details below; alphabetical listings are not rankings.
- Publish the primary-source review with scoped conditions and explicit unknowns; separate entertainment-only Jackpota. Remove unsupported legacy amounts instead of substituting industry averages.
- Operator pages and JSON share the same field-level evidence; add a player-value CSV while preserving the redemption CSV format. Existing eligibility routing remains unchanged.
- Save first-party claim differences and unresolved product scopes in the dated internal research register; US public-page retrieval is not player eligibility verification.

## 2026-09-10 - Restore automatic Google Analytics
- Restored GTM/GA4 tracking on every page after it was removed by mistake.
- Kept the bottom analytics notice, consent panel and settings control removed.
- Added release validation so tracking cannot disappear unnoticed.

## 2026-09-10 - Remove Google Analytics
- Removed Google Analytics tracking and the consent notice/settings shown at the bottom of every page.
- Updated the privacy policy to match the site's current data practices.

## 2026-09-10 - Primary-source cleanup and readable operator review
- Replaced secondary and legacy support with operator-owned public evidence; corrected product/offer interpretations and removed unsupported values.
- Kept technical provenance outside the main comparison tables. Dropped account-only attributes and noncomparable columns; hands-on experience is deferred TODO only.
- Research schema v2 preserves operator IDs, renames `kyc` to `verificationPolicy`, and attaches field-level source locators. No screenshots, accounts, production edits or deployment.
- Regenerated the committed CSS artifact required by CI after Tailwind scanned the new research files.

## 2026-09-10 - Ten-operator player-value evidence
- Extended the authorized public-evidence pass from the first three operators to all ten indexed operators.
- Added normalized attribute values, field-level sources and evidence statuses, plus a human-readable comparison matrix.
- No accounts, purchases, funded tests, paid research, or production content changes; conflicts and unavailable numeric values remain explicit.

## 2026-09-10 - Phase-gated player-value plan
- Replaced the unenforceable dollar-allocation dispatch with a mandatory scope gate.
- Phase 1 now builds the shared evidence and engineering foundation, completes Jackpota, Lucky Bunny, and YAY Casino, and then stops for owner evaluation.
- The remaining seven operators are listed but cannot be researched without explicit approval after the Phase 1 review.

## 2026-09-09 - SEO and player-value research plan
- Audited live crawl metadata, outbound routing, eligibility behavior, and offer-data completeness; recovered the earlier Google Ads and Bright Data research.
- Added a cited review and capped $200 research plan for bonuses, daily rewards, packages, games, and transparency, with implementation acceptance criteria.
- Planning only: no production changes or paid jobs. Fix outbound syntax and eligibility together before promoting offers; global keyword volumes are not US sweepstakes demand.

## 2026-09-09 - Consent-controlled Google measurement
- Added optional analytics with explicit acceptance, rejection and withdrawal; GTM is the only Google tag loader.
- Connected GTM-NTLVFVB7 to GA4 G-E3Y4MKKS6Q; removed unconsented state-selection events and corrected the privacy policy.
- Search Console domain ownership and sitemap submission are configured in the owner's Google account.

## 2026-09-10 - Homepage leads with player value
- Homepage hero and "In short" block now open with player outcomes (bonus size, payout speed, state legality) and frame the dated, source-linked records as the method.
- Homepage SEO title/description updated to lead with bonuses, payouts and availability.

## 2026-09-09 - Homepage positioning: transparency service
- Homepage now positions the site as a maintained transparency service: human-readable records, structured metadata, JSON/CSV downloads, no operator count claim.
- Updated homepage SEO title/description and social-card copy to match the service framing; build regenerates `docs/`.

## 2026-09-09 - Brand mark and social sharing metadata
## 2026-09-09 - Brand mark and social sharing metadata
- Replaced the top-nav geometric mark with the gold Phosphor `crown-simple` icon.
- Added Open Graph and Twitter large-image metadata, plus a tracked 1200x630 social card that states the site's actual purpose.
- The social card is generated from the existing hero photo with `scripts/render-social-card.py`; run `npm run build:social-card` to regenerate it.

## 2026-09-09 - AI/search visibility: answer-first pages, state + method clusters, funded-test pipeline
## 2026-09-09 - AI/search visibility: answer-first pages, state + method clusters, funded-test pipeline
- Homepage H1 is now answer-led ("...and how fast they pay") with a quotable answer block linking to the redemption research.
- Added 14 state-legality pages at `/availability/{slug}/`, data-driven from `src/_data/states.json` (new fields: `status`, `slug`, `statusShort`, `statusDate`, `basis`, `answer`). Only states with status `statute`/`enforcement` and a `slug` get a page, via the `closedStates`/`statuteStates`/`enforcementStates` collections in `eleventy.config.js`.
- Added 3 payout-method pages at `/guides/redemption-methods/{bank-transfer,gift-card,crypto}/`.
- Added JSON-LD (Article + FAQPage + BreadcrumbList) to operator pages, taxes, both guides, availability, state pages and method pages.
- Operator pages now render a funded-test status section from `testStatus` + `observedResult` in `src/_data/operators.json`. New append-only log: `src/_data/tests.json`. Ranking claims stay gated on 3 completed comparable tests per methodology.
- New `scripts/validate-seo.mjs` (canonical + JSON-LD + sitemap presence) wired into `npm run release` as `seo:validate`.
- Fixed a latent build bug: `src/index.njk` used an unregistered `limit(3)` filter; added `limit` to `eleventy.config.js`.
- Nunjucks here does NOT support `selectattr`/`slice`/`limit` by default - compute filtered lists as collections in `eleventy.config.js`, not in templates (this bit twice).
- MANUAL STEPS left to user: fund redemption tests and record them in `tests.json` / operator `observedResult`; submit sitemap in Google Search Console.
