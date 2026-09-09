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
- Never publish a "fastest"/"best" ranking until 3 comparable funded tests
  complete per operator (see `src/methodology.njk`). Observed figures stay
  separate from published terms.
- No affiliate links in article copy; operator CTAs only behind the state
  gate (`/go/` + `src/assets/eligibility.js`).
- `docs/` is the committed deploy artifact - always produced by the build,
  never hand-edited.
