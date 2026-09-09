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
