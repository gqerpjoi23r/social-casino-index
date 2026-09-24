# Working in this repo

Static site (Eleventy + Tailwind) for socialcasinoindex.com, deployed to
GitHub Pages from `main` / `docs/`. A push to `main` is the deploy.

## Changelog (required)

Several agents work in this worktree at once. When you make a change, add a
short entry to `CHANGELOG.md` (newest on top): what changed, why, and
anything the next agent must know. Keep it to a few bullets - behavior, not
file lists. Read it before starting so you don't collide with in-flight work.

## Branching (required)

Work on a short-lived branch, never directly on `main`. One branch per task,
named for the change (for example `state-pages` or `social-card`). Commit
only the files your task touched - do not `git add -A` over a shared
worktree, or you will sweep up another agent's in-flight work under your
commit message. Open a PR (or merge) back to `main` when your release build
is green. Rebase or merge `main` into your branch before finishing if it has
moved.

## Build & validate

    npm run release    # content:validate + build + sitemap:validate + seo:validate

A green release means content schema, sitemap and SEO checks all pass.

## Rules that bite

- Dates: editing an article body requires bumping `updatedAt`
  (`npm run content:touch -- <file>`); `content:validate` fails otherwise.
- Nunjucks here lacks `selectattr`/`slice`/`limit` by default - compute
  filtered lists as collections in `eleventy.config.js`, not in templates.
- Published-offer rankings and bonus-specific benchmarks use the shared
  evidence model and versioned methodology. Affiliate status never affects order.
  Rank measured payout performance only after 3 comparable funded tests per
  operator. Keep published benefits separate from observed payout results.
- A collection failure is not operator opacity. Retain dated evidence; only
  source-backed absence reviews can reduce a disclosure component.
- Product promise: help visitors compare actual deals and terms, not our scraper
  coverage. Every homepage entry needs two comparable categories out of offers,
  recurring daily SC, published processing, and cash minimum. Free signup and
  paid packages count once together for admission, but are NEVER mixed in sorting.
- Default to highest immediate no-purchase signup SC. Offer independent purchase
  value, daily SC, processing and cash-minimum sorts; unknowns last, ties by name.
  Completeness is only admission, never a customer-facing quality ranking.
- All current comparisons and exports use the shared evidence model. Registry
  identity, affiliate, eligibility and funded-test metadata stay separate.
  Historical download editions are immutable, not current-data fallbacks.
- Show useful supported daily descriptions without counting variable rewards,
  first claims or Gold Coins as fixed daily SC. Keep Terms below each entry.
- Releases must report changed visible operators, order, values and unresolved
  fields. Passing collection/tests alone is not evidence of product usefulness.
- No affiliate links in article copy; operator CTAs only behind the state
  gate (`/go/` + `src/assets/eligibility.js`).
- `docs/` is the committed deploy artifact - always produced by the build,
  never hand-edited.
