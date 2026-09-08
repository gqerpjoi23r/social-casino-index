# Local build and deploy workflow

## One-time setup

    npm install

## Day-to-day

1. Edit or add content under `src/`. Articles live in `src/research/`.
2. Validate content schema:

       npm run content:validate

3. Preview locally:

       npm run serve

   Open the printed local URL (default http://localhost:8080).

4. Build the flat HTML into `docs/`:

       npm run build

5. Commit and push `main`. GitHub Pages serves `docs/` from `main`, so a push
   is the deploy. Allow a minute or two for Pages to publish.

## Adding a new article

1. Copy an existing file in `src/research/` as a starting point.
2. Fill every required front-matter key: `title`, `description`, `permalink`,
   `status`, `publishedAt`, `updatedAt`, `authorId`, `reviewer`,
   `primaryQuery`, `entities`, `disclosure`, `noindex`.
3. Keep the answer-first block at the top and the sources list (with access
   dates) at the bottom.
4. Run `npm run content:validate`, fix any failures, then build and push.

## Rules that are enforced by convention (not yet by CI)

- Never publish a "fastest" or "best" ranking until at least three comparable
  funded tests have completed (see `src/methodology.njk`).
- Every factual claim traces to a source in the article's sources list with an
  access date.
- Operators without a completed funded test stay labeled `pending` or
  `not tested` in `src/_data/operators.json`.
- Affiliate destinations only appear behind the state gate (`/go/` pages and
  `src/assets/eligibility.js`); never link an operator directly from article
  copy.

## Analytics

GTM/GA4/Cookiebot placeholders are in `src/_includes/base.njk`. Create the
containers under business-owned accounts, paste the snippets, and validate in
GTM Preview and GA4 DebugView before considering analytics done.
