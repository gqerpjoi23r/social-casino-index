# Player-Value Research and Implementation Plan

## Current Scope and Stop

The public-evidence pass covers all ten indexed operators. Phase 1 established the foundation and first three operators; the owner then authorized the remaining seven. The latest instruction narrows the work to accessible operator-owned evidence, readable output and no hands-on experience.

This plan supersedes the earlier dollar-allocation and account-testing requirements. Spending cannot be capped by prose. Bound the work by scope and stop after delivering the corrected evidence package.

No accounts, screenshots, purchases, funded tests, outreach, paid services, access-control bypasses, production edits or deployment. No further demand research or operator expansion is included. Operational experience is a deferred TODO only.

## Operator Sequence

Order is a work sequence, not a ranking or endorsement. Preserve these IDs.

| Order | Operator | Stable ID | Phase |
|---:|---|---|---|
| 1 | Jackpota | `jackpota` | 1 |
| 2 | Lucky Bunny | `lucky-bunny` | 1 |
| 3 | YAY Casino | `yay-casino` | 1 |
| 4 | Dorados | `dorados` | 2 |
| 5 | Zonko | `zonko` | 2 |
| 6 | Chumba Casino | `chumba` | 2 |
| 7 | Pulsz | `pulsz` | 2 |
| 8 | Stake.us | `stake-us` | 2 |
| 9 | WOW Vegas | `wow-vegas` | 2 |
| 10 | McLuck | `mcluck` | 2 |

## Evidence Method

1. Use search, including operator-domain searches, to discover official pages. Search snippets and third-party articles are not evidence for operator values.
2. Read the public offer, applicable rules, help pages and notices. Prefer specific applicable terms over generic marketing; leave unresolved contradictions explicit.
3. For JS-heavy pages, read the rendered public DOM/text and public linked documents. Check currency labels and offer conditions, not only visible numbers.
4. Do not log in, bypass challenges, change identity/location to evade restrictions, or proceed through checkout. After a bounded retry or an alternative public official page, record the access limitation and stop.
5. Store a source URL, retrieval date, title, publisher, access result and available document date/hash. Attach the supporting section/page locator to each field. Do not take screenshots.
6. Keep unsupported numeric values null, not zero. Do not infer availability from the absence of a state in a list or a feature from a currency label.

Raw local captures may contain IP addresses. They stay outside the repository. Public evidence records contain no private account data. Page reachability is not proof an offer remains claimable.

### Record Contract

`operator-evidence.json` is the canonical research snapshot, not production data. Schema version 2 preserves operator IDs, renames `kyc` to `verificationPolicy`, and uses `evidence: [{sourceId, locator}]` on each attribute.

Statuses are limited to `operator_stated`, `public_page_observed`, `unverified` and `conflicting`. Public-page observation means displayed content, never a successful transaction. Unsupported fields have a null value. Conflicts can retain separate sourced variants without selecting a winner.

Thirteen public-evidence attributes remain:

| Group | Attributes |
|---|---|
| Identity | Entity, product mode, currencies |
| Offers | Welcome offer, purchase requirement, daily reward, public package examples |
| Games | Provider/category examples, without an exact inventory comparison |
| Redemption | Scoped playthrough, minimum/cap, public methods and scoped published timing |
| Policy | Public verification requirements, dated operator restrictions |

Keep signup and first-purchase offers separate. Preserve currency units, price, claim timing, multiplier scope, method and cap period. A promotional win limit is not a withdrawal limit. Published processing time is not observed end-to-end payout speed.

### Coverage and Readability

The review matrix includes all ten operators in its overview. Topic tables include only useful evidenced entries, with a single explanation for missing operators rather than rows full of repeated unknowns.

Do not add columns for universally unsupported or noncomparable fields: exact game totals, complete recurring-reward schedules, standardized package baskets and all-in redemption fees. Keep useful isolated facts as operator notes. Account-specific offers, balances, cashier values and personalized limits are excluded, not targets for future gap filling in this scope.

Reader-facing copy should answer the question first. Keep essential purchase and eligibility conditions next to the number. Group official source links below the table or in the operator's source section. Keep technical status codes, IDs, hashes and detailed provenance outside the main reading flow.

For publication, require at least five comparable current records for a cross-operator topic table; otherwise use a limited guide or individual operator notes. Do not produce rankings from this research snapshot.

## Review Findings

The detailed values and URLs are in `comparison-matrix.md`.

- Jackpota: current terms establish ordinary entertainment-only coin play, with a separate promotional-contest exception. Remove legacy ordinary SC/prize-redemption claims.
- Lucky Bunny: rendered public cards establish price/FC/SC examples, not prize rights.
- YAY: welcome amounts remain conflicting; daily rewards have a balance condition. Scope its 1x guide, Visa estimate and caps correctly.
- WOW: day-one and three-day signup amounts agree once the schedule is considered. The ongoing daily reward and playthrough remain unverified.
- Dorados, Zonko, Chumba, Pulsz and McLuck: retain only what readable notices or footers support. Do not carry old or secondary claims forward.
- Stake.us: scope 3x to purchase-linked Stake Cash; inaccessible current terms do not support legacy entity, cap or state claims.

Before publication, review high-consequence fields: product mode, prize rights, currency/amount, purchase requirement, state restrictions, playthrough and caps. Check that every retained claim has accessible supporting evidence and that contradictions are visible. Structural validation cannot establish that operator terms are truthful or complete.

## Freshness and Corrections

These are proposed publication rules, not a scheduled monitoring commitment:

- Recheck promotional amounts within 24 hours before publication. During active offer coverage, check daily or label as a dated snapshot and suppress current-offer claims.
- Recheck recurring rewards and packages weekly when actively covered.
- Recheck baseline product/verification terms monthly and after a notice.
- Recheck operator restrictions and active exit deadlines immediately before publication. Active deadlines need daily review if covered.
- Expire offers at known end times. Mark disappeared or stale sources unverified and stop promotion when freshness cannot be maintained.

Keep retrieval, effective, expiry and article-update dates distinct. Do not invent an expiry. Assign a maintenance owner before promising continuous coverage.

Accept operator corrections only with an operator-owned URL or public applicable document. Review the affected claim, record the date and reason, preserve unresolved conflicts, and update the source record and reader-facing value together. Partner status never overrides evidence. No pay-for-verification process or outreach is authorized.

## Editorial Backlog

Future proposals only; no new pages are authorized. `audit.md` remains historical context, not current evidence for operator values.

| Priority | Brief | Publication gate |
|---|---|---|
| P1 | Correct existing operator records and product taxonomy | Owner review; preserve URLs; repair eligibility before commercial routing |
| P1 | Welcome/no-purchase comparison | Separate signup from purchase offers; five comparable fresh records |
| P1 | Social versus sweepstakes explanation | Clear currency/prize distinction; avoid overlap with the existing real-prizes guide |
| P2 | Daily rewards or package examples | Use limited operator notes until comparable coverage supports a table |
| P2 | Bonus conditions and public verification guide | Scoped, sourced examples; no measured experience claims |
| P2 | State notices and exit deadlines | Current operator notices and, for legal assertions, direct legal sources |
| P2 | Dataset, methodology and corrections | Readable methodology plus detailed provenance in the evidence layer |

Each future brief needs one primary intent, audience, outline, source records, distinctive contribution, existing-page overlap, internal links, freshness owner and acceptance checks. Reuse recovered demand research as historical context only; do not infer US demand from global numbers. Further query collection requires separate approval.

## Engineering Backlog

These tickets remain unimplemented. A green release alone does not verify source truth or the previously reported outbound defects.

### ENG-01: Eligibility and Outbound Repair

Use shared operator/state data. Separate banner dismissal from valid selection. Decode cookies defensively and validate state values. Unknown product availability blocks commercial routing. Avoid unsafe HTML construction and navigation races.

Acceptance: generated outbound scripts parse; browser tests cover no cookie, dismissed banner/reload, malformed cookie, invalid state, global/operator exclusion, unresolved availability, an allowed route, changed selection, direct `/go/` access and no JavaScript. Stub external navigation. Editorial pages remain public.

### ENG-02: Truth and Category Consistency

Reconcile existing test statuses with actual evidence. Exclude entertainment-only products from payout claims. Confirm author identity with the owner. Use neutral order and relationship disclosure.

Acceptance: no unsupported pending/completed tests; no payout metrics for an inapplicable product; no best/fastest ranking without three comparable completed funded tests per operator under the existing methodology. This is a publication safeguard, not authorization to conduct those tests.

### ENG-03: Reviewed Public-Evidence Data

Use existing Eleventy data patterns. Migrate only approved public-evidence fields. Keep offer conditions visible and provenance accessible but unobtrusive. Do not add account-observation fields.

Acceptance: HTML/JSON/CSV agree; null/conflicting/stale states render correctly; stable IDs and operator restrictions survive migration; sparse topics do not become misleading league tables; desktop/mobile layouts remain readable.

### ENG-04: SEO and Data Integrity

Validate exact canonicals, parsed JSON-LD, indexability, internal links and source metadata against generated output. Keep `/go/` excluded/noindex. Use truthful Dataset metadata and separate event dates from content updates.

Acceptance: metadata matches visible content; no invented ratings; public URLs covered; date rules honored. Read the sitemap-freshness skill before changing pages or dates.

### ENG-05: Measurement and Corrections

Inspect existing GSC/GA before adding instrumentation. Label unavailable or partial baselines honestly. Publish a correction process with editorial ownership and dated resolutions.

Acceptance: no unsupported traffic/AI-citation uplift claims; corrections update both visible values and provenance. Further measurement studies are outside this run.

## Deferred Operational TODOs

Actual redemption reliability/time, verification friction/time, support quality/time, and closure/safer-play effectiveness require a new owner decision. They are not current attributes or scheduled work. Do not create accounts to resolve them.

## Delivery Gate

Deliver the JSON, readable matrix and short handoff. Validate IDs, statuses, field/source references, units, null handling and matrix consistency. Run `npm run release` without disturbing unrelated work. Update the changelog and commit only task files on a short-lived branch. No production push.

Stop for owner review. Next action is approval/correction of the matrix, not more research, tests or implementation.
