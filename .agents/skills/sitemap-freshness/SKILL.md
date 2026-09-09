---
name: sitemap-freshness
description: Keep the Social Casino Index sitemap.xml fresh, complete, and valid. Use this skill whenever adding, removing, renaming, or dating any page on the site, or when verifying that the sitemap stays current with the content. The sitemap is generated from Eleventy collections on every build, so it stays fresh automatically — this skill ensures that guarantee is never broken by a bad template, a missing date, or an accidentally included gated page.
---

# Sitemap freshness for Social Casino Index

## How the sitemap stays fresh (do not hand-edit the output)

- `src/sitemap.njk` generates `docs/sitemap.xml` on every `npm run build` from
  `collections.all` (dated pages) plus one `<url>` per operator in
  `src/_data/operators.json`.
- Never edit `docs/sitemap.xml` directly. Fix the source: the page's front
  matter, the operator record, or `src/sitemap.njk`.
- `docs/` is the deploy artifact served by GitHub Pages, so it IS committed —
  but it is always produced by the build, not by hand.

## The guarantee to preserve

1. **Coverage** — every public page (each `docs/**/index.html`) appears as a
   `<loc>`. New page added? It must appear in the sitemap after the next build.
2. **No gated redirects** — `/go/<operator>/` stubs are `noindex` and must
   NEVER appear in the sitemap.
3. **Freshness** — dated content (guides, research, operator records) must
   carry a `<lastmod>` date. If a page's content changed, its
   `updatedAt`/`verifiedAt` must advance (see the content date-enforcement
   rule in WORKFLOW.md) so the sitemap date moves with it.

## What to run (the agent's job)

After any change that adds/removes/renames/dates a page, run:

    npm run build            # regenerates docs/sitemap.xml
    npm run sitemap:validate # fails the build if the guarantee breaks

`validate-sitemap.mjs` checks: well-formed XML, no `/go/` entries, every
public page covered, and every dated page has `<lastmod>`. It runs
automatically as the last step of `npm run build`, so a green build means a
fresh, valid sitemap.

## Common pitfalls (learned on this repo)

- The Nunjucks `slice` filter silently returns empty/undefined here — do NOT
  use it to exclude `/go/` paths or limit loops. Use an explicit condition
  (`"/go/" not in item.url`) or a `loop.index` guard instead.
- A page missing `<lastmod>` almost always means its front matter lacks
  `publishedAt`/`updatedAt` — add them, don't patch the sitemap.
- If a new page type should be excluded (like `/go/`), exclude it by front
  matter `noindex: true` AND confirm the sitemap template skips it.
