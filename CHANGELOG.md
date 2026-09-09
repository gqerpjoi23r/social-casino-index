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
