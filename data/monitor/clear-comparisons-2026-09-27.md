# Clear comparisons release

## Product changes

- One combined homepage, operator-page and benchmark release.
- 21 monitored operators, 19 homepage entries: the roster and admission rule are unchanged.
- Nine comparable free-signup rows; ten concise other-offer rows in the default view.
- All five sorts retain their existing calculations, direction and name tie-breaks.
- Existing operator URLs, state safeguards, partner destinations and non-partner Details links remain.
- Sources, conditions and all labelled facts are in the initial HTML. No runtime extraction or new crawler infrastructure.

## Data review

- McLuck: July 1-27 and April 22-30 promotions no longer enter current comparisons. The existing separate promo-code source still supports 25 SC for $9.99, dated September 25. Its retained code is MCLUCKBLOG26, not MCLUCK4JULY. Old offers remain in profile history.
- YAY: retain the descriptive 44-SC offer, with no per-dollar comparison because its purchase price is missing.
- Fortune Wins: retain 1,000 FC without an SC conversion or numeric SC ranking. The official terms retrieved September 27 use Virtual Coins and contain a historical note about replacing Fortune Coins terminology; this does not establish a current FC-to-SC equivalence.
- Crown Coins: bank-delivery evidence supports the Cash prizes badge without asserting that its general threshold is a cash-specific minimum.
- LuckyLand: current captured evidence says real prizes but does not establish specific prize methods. Its live help URL returns an application shell to direct retrieval. Leave the specific prize badges absent.
- Sportzino: its reviewed PDF describes bank redemption, but the current extracted records do not attach a bank method to a publishable fact. The badge remains absent rather than changing the recorded general minimum into a cash minimum. This is an extraction gap, not evidence that cash prizes are unavailable.
- Rolling Riches: official icon recovered from the public S3 asset corresponding to the icon link in its captured homepage. Keep the existing letter fallback for missing images.
- robots.txt: both repository and production allow all crawlers. No robots change.
- Public recent-change badges now use structured value changes only. Conditions remain in source history, but rephrasing does not earn a new public value-change badge. Old untrusted change timestamps are not relabelled.

## Pipeline

Existing official-page/PDF capture -> grounded numeric and descriptive extraction -> shared dated evidence -> homepage, profiles, benchmarks and exports.

Extractor 2.6.2 accepts grounded, explicitly labelled calendar end dates as well as quoted ISO timestamps. A date-only offer remains valid until that calendar day has ended in all timezones. Existing retained records are filtered through the same expiry check without rewriting their capture dates.

## Verification and rollout

- Passed: 158 monitoring tests, `npm run release`, `scripts/monitor/product-browser-test.mjs` and `scripts/monitor/benefit-browser-test.mjs`.
- Browser checks cover five homepage widths (320, 390, 768, 1024, 1440), all sorts, ordered-list positions, compact/full rendering, source disclosures, row navigation, clipboard success/failure, no JavaScript, profiles, current-data tables and CSV parity.
- Inspected default, expanded, compact and operator-page screenshots on desktop and phone. Final suite images are in `/tmp/sci-combined-release-final` and `/tmp/sci-combined-benchmarks-final`.
- Compared with the preceding production build: all default positions and all five numeric sort inputs are unchanged. McLuck's code/source changes, not its compared amount.
- No numeric source snapshot or production database was edited. No operator onboarding or funded tests are claimed.
- Merge only the scoped release branch after checks pass. A push to main deploys the generated `docs/` build.

## Citation evaluation

Keep Lovd's existing 86 SCI prompts unchanged. Report its 11 benefit-focused prompts separately; do not combine source citations with brand mentions or combine model rates.

For each of the four post-release weeks report completed answers, answers citing the site, unique cited pages, narrative mentions and collection coverage by model. Record successful no-AI-Overview outcomes separately from missing collection.

Pre-release reference: September 23-27, 2026 had 0/344 ChatGPT cited answers, 0/344 Gemini cited answers and 0/141 actual AI Overview cited answers; 203 checks returned no overview. The focused subset had 0/109 cited answers across models. These are fixed-panel monitoring results, not traffic or market-wide share.

Start the four-week evaluation from verified production publication, not from local implementation. Outreach remains a subsequent experiment. Citation improvement is not a release acceptance test.
