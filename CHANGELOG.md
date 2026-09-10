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
