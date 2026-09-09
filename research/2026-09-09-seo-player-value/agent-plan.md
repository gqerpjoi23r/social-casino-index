# Player-Value Research and Implementation Plan

## Objective and Limits

Deliver a US-focused, evidence-backed comparison framework covering bonuses, daily rewards, packages, games, eligibility, account experience, and redemptions. Produce research records and publishable briefs for the existing ten operators before expanding coverage.

Read `audit.md` for findings, citations, limitations, and recovered research. The priorities below are recommendations, not measured keyword rankings.

**The $200 is a hard research ceiling, not a spending target.** It covers agent/model usage and paid data collection. It does not fund player purchases, redemption tests, legal advice, paid advertising, or implementation labor. No paid research was launched during the audit. Do not create accounts, accept operator terms, purchase packages, impersonate players, or send operator outreach without separate authorization.

Engineering tickets are specified below for a subsequent implementation agent. Finish the research outputs even when an implementation ticket requires owner input.

## Budget and Dispatch

| Work package | Owner role | Maximum USD | Required output |
|---|---|---:|---|
| A. Demand and competitor refresh | Demand researcher | 35 | US keyword map, Trends comparisons, SERP inventory, manual page-gap review |
| B. Offer and reward records | Offer researcher | 65 | Welcome/daily/package evidence for ten operators, or explicit missing/conflicting status |
| C. Other player-value evidence | Product researcher | 30 | Game, account, support, minimum/fee, and state-exit matrices |
| D. Independent evidence QA | Reviewer | 35 | Critical-field recheck, conflict register, safety and classification review |
| E. Editorial synthesis | Lead researcher | 20 | Prioritized briefs, source inventory, acceptance report, implementation-ready data |
| Reserved contingency | Lead-controlled | 15 | Authentication-independent substitute, failed-source retry, or priority evidence gap |
| **Total** | | **200** | Unused funds remain unspent |

These are allocation caps, not verified vendor quotations. Before dispatch, inspect current model/provider prices and the configured account's usage controls. Estimate the complete job cost, including retries, browser duration, tool charges, and token usage. Reduce the batch if it does not fit. Do not claim a $200 guarantee if the runtime cannot report or bound its own charges.

Use one parent ledger with `jobId`, owner, provider, currency, authorized cap, reserved estimate, actual charge, request count, status, and evidence location. Reserve funds before starting concurrent work. Include running reservations when checking remaining budget. Check after each batch; never let independent agents each assume the full remaining balance is theirs.

If usage is not measurable, stop new paid work and continue with cached/public evidence. Allow at most one bounded retry per failed source in a batch. Do not silently switch to a more expensive provider or buy a subscription. The lead may allocate the $15 reserve to a documented gap without raising the $200 ceiling.

## A. Demand and Competitive Evidence

### Reuse and Authentication

Read the August 17 artifacts under `/Users/nimaboustanian/projects/kylserviceguiden.se/` before making requests. Reuse the four sweepstakes SERPs as a historical baseline, not as a current ranking sample.

If the workflow uses GCP credentials, inspect the active identity with `gcloud auth list` and validate its active token before cloud requests. Do not select an account by name or start interactive login automatically. If validation fails, record the exact error privately and the missing capability in the report. Continue other work; request owner reauthentication separately. Do not substitute invented volume estimates.

### Keyword Panel

Start with the following intent families. Expand and deduplicate to approximately 50 canonical queries, including a small sample of operator-name modifiers for the existing ten records.

| Family | Seed queries | Category / intent treatment |
|---|---|---|
| Discovery | `social casino`, `sweepstakes casino`, `social casino vs sweepstakes casino` | Keep entertainment-only and prize intent separate |
| Welcome | `sweepstakes casino sign up bonus`, `sweepstakes casino welcome bonus`, `social casino free coins` | Distinguish registration from first purchase |
| No purchase | `sweepstakes casino no deposit bonus`, `free sweeps coins no purchase`, `sweepstakes casino mail in entry` | Explain conditions; no "free money" claim |
| Daily | `sweepstakes casino daily bonus`, `daily free sweeps coins`, `social casino daily rewards` | Separate base claim and streak maximum |
| Packages | `sweepstakes casino coin packages`, `sweepstakes casino first purchase bonus`, `sweepstakes casino package deals` | Test demand; do not assume SC purchase semantics |
| Conditions | `sweepstakes casino playthrough`, `sweepstakes bonus expiration`, `sweeps coins vs gold coins` | High information need even if volume is sparse |
| Games | `sweepstakes casino games`, `sweepstakes casino blackjack`, `social casino slots` | Verify actual mode/provider availability |
| Redemption | `sweepstakes casino minimum redemption`, `sweepstakes casino redemption fees`, `sweepstakes casino payout time` | Improve existing coverage; avoid duplicate URLs |
| Account | `sweepstakes casino verification`, `sweepstakes casino account closed`, `sweepstakes casino support` | No identity-check avoidance guidance |
| State exit | `sweepstakes casino left state balance`, `sweepstakes casino redemption deadline`, state-name variants | Exact current notices and primary legal sources |
| Operators | `[operator] bonus`, `[operator] daily rewards`, `[operator] redemption minimum` | Allocate among brands based on observed demand |

For Ads historical metrics use US geography, English, and Google Search network consistently. Save the actual request, date range/month coverage, response date, returned keyword, close variants, monthly series, and average volume. Keep missing/suppressed results null. Do not sum overlapping variants. Advertising competition and bid estimates are not organic difficulty.

For Trends use eight anchored topic groups over 12 months and the latest 90 days, aiming for 16 comparisons. Preserve geography, query/topic identity, timeframe, category, and search property. Use a shared anchor within connected groups; do not compare raw 0-100 values from independently normalized requests. Do not report a short-term spike as established durable demand.

For SERPs aim for 50 queries on US mobile and desktop: 100 requests. Add up to 20 state-localized checks and 12 repeat checks of priority terms, for a ceiling of 132 requests before the cost gate reduces the sample. Use provider-supported location identifiers and record them. Do not claim state localization from `gl=us` alone.

Capture organic top ten, ads separately, PAA, related searches, and AI overview presence/citations when the response actually exposes them. Missing AI fields mean unavailable evidence, not "no AI overview." Preserve request settings, timestamps, response IDs, result URLs, and provider errors.

### Full-Page Gap Review

Read 12 distinct competitor pages selected across welcome bonuses, daily rewards, package value, and state exits, with at least two domains per family where results permit. Inspect the actual page, not just its snippet. Record which comparison fields have primary sources, dates, eligibility, test evidence, corrections, and clear currency separation.

Use SERP findings to select competitors rather than preselecting only weak affiliates. Include strong examples and disconfirming evidence. Report a source barrier or inaccessible page as such. Do not turn an absent snippet keyword into an absence-of-evidence claim.

Also produce a watchlist of up to five relevant operators absent from the index. Record their observed query/result appearances, apparent product model, official source availability, and inclusion rationale. Do not treat result appearances as market share. Do not expand package B beyond ten operators or spend the reserve on extra brands without the lead's cost check. The watchlist informs the next coverage decision, not automatic publication.

Output a query-to-page map with intent, category, geography, metric scope, observed competitors, gap evidence, confidence, proposed existing/new page, and reason. Assign P1/P2/P3 through transparent editorial judgment: player consequence, observed demand, demonstrable information gap, evidence availability, and maintenance cost. Do not invent a numeric opportunity score.

**Acceptance:** every demand number traces to a raw response; every asserted competitor gap traces to a full-page inspection; every proposed page maps to one main intent; no US demand is inferred from the global report.

## B. Offer Evidence

Cover Jackpota, Lucky Bunny, YAY Casino, Dorados, Zonko, Chumba Casino, Pulsz, Stake.us, WOW Vegas, and McLuck. Use their existing source lists for discovery, then check current official rules, help pages, offer pages, and public lobbies. Partner status must not affect coverage depth.

For inaccessible public terms, record `not_publicly_accessible`. For personalized/account-only offers, record `account_specific` or `unverified` until legitimately available evidence exists. Do not create a player account, bypass access/location controls, or treat an affiliate headline as primary proof.

### Record Contract

Deliver JSON records and a human-readable matrix. Use separate entities for operators, offers, sources, and claims so one offer's terms do not overwrite another offer or the operator's general rules.

| Entity | Minimum fields |
|---|---|
| Operator | Stable ID, display name, confirmed entity or unknown, product mode, currency definitions, official URLs |
| Offer | Stable ID, operator ID, type, eligible audience, jurisdiction, code/channel, purchase requirement, price/currency, GC amount, promotional currency amount, spins and denomination |
| Conditions | Playthrough multiplier and basis, game contribution, minimum redemption, maximum prize/cap, excluded methods/games, expiry/claim window, verification, linked general and offer-specific rules |
| Daily schedule | Base reward, interval/timezone, streak day table, reset rule, missed-day effect, eligibility, currency |
| Source | ID, exact URL, title, publisher, retrieved timestamp, document effective date when stated, hash/capture location, public/account context |
| Claim | Field path, value/unit, source ID, section/page locator, evidence type, scope, checked timestamp, status, conflict note |

Use a status enum such as `operator_stated`, `observed`, `independently_tested`, `unverified`, `conflicting`, `expired`, and `not_applicable`. Store unknown numeric values as null, never zero. A generic page source list is not sufficient: attach the source to the field it supports.

Capture dated screenshots/document hashes where permitted. Keep raw pages, access tokens, and any private account material outside the public site repository. No identity documents or player financial records belong in public evidence files.

**Acceptance:** ten operator rows; every critical offer field either source-backed or explicitly unknown; all offer amounts distinguish currencies; all purchase requirements are visible; no claim implies guaranteed cash or profit; account-specific offers are never universalized.

## C. Other Player Benchmarks

Record published game providers and a reproducible lobby sample rather than accepting an advertised total as an observed count. Capture device/mode and region when relevant. Do not imply all games share the same RTP or availability.

Record redemption minimum and fees by method, published support channels/hours, verification requirements, account closure/appeal routes, and published spending/session/exclusion controls. Label response time and successful closure as untested unless actually observed under authorized conditions.

For three priority state-exit questions selected by package A, build a notice-based chronology: legal source, operator notice, effective date, purchase/play cutoff, redemption deadline, balance treatment, support route, and unresolved conflicts. Use official state/regulator/operator sources. A law change, operator withdrawal, and legal availability are different facts. Do not describe another gambling product as a workaround.

**Acceptance:** one comparison matrix, at least five non-payout dimensions, no unverified legal assertions, and clear separation between published policy and measured experience.

## D. Independent Review and Refresh Policy

Recheck every high-consequence field: category, prize eligibility, purchase requirement, offer amount/currency, expiry, state exclusion, playthrough, redemption minimum/cap, and any legal deadline. Sample at least 20% of lower-risk fields. Log conflicts and resolve them from the applicable current primary rules; retain a conflict label when resolution is not possible.

Review provenance, units, personalization, and misleading omissions. Verify that unknown is not presented as zero, an exclusion list is not assumed complete, and a source review does not imply a funded product test.

Proposed publication service levels:

- Recheck volatile promotional amounts within 24 hours before first publication.
- During active promotion coverage, recheck volatile offers daily or label them as dated snapshots and suppress "current/best" language when stale.
- Check recurring rewards and package terms weekly; recheck immediately after a detected change.
- Check baseline product/account terms monthly and after a change notice.
- Check state exits and legal deadlines immediately before publication; review active deadlines daily.
- Expire offers automatically at known end times. If the source disappears or freshness cannot be maintained, show stale/unverified status and remove current-offer promotion.

These are operating requirements, not ongoing monitoring already funded by the $200. Price the maintenance separately before promising a continuously maintained service. Preserve `checkedAt`, `effectiveAt`, `expiresAt`, and `updatedAt` as different concepts.

## E. Editorial Backlog

Paths are proposals. Confirm query intent and overlap before creation.

| Priority | Page / action | Required differentiation and publication gate |
|---|---|---|
| P1 | Upgrade existing operator records | Add welcome, daily, packages, games, support, restrictions, and field-level sources; preserve existing URLs initially |
| P1 | `/bonuses/` | Compare signup/no-purchase and purchase offers separately; require at least five comparable current records for a cross-operator table |
| P1 | `/guides/social-vs-sweepstakes-casinos/` | Clear currencies/prizes taxonomy; existing real-prizes guide should be consolidated or linked without duplicated intent |
| P1 | `/daily-rewards/` | Base versus streak amounts, claim windows, eligibility; require at least five comparable records |
| P2 | `/coin-packages/` | Disclosed exact-price baskets and conditions; show unavailable price points as unavailable, never interpolated |
| P2 | Bonus-conditions guide | Explain playthrough, expiry, excluded games, free-spin units, and redemption caps using sourced examples |
| P2 | Existing state pages plus state-exit guide | Add operator-specific notices, balance deadlines, evidence, and update history; primary-source review required |
| P2 | Game-choice comparison | Provider/title/mode coverage and verification date; do not rank operators by unverified game counts |
| P2 | Verification/support/account-controls guide | Published requirements, escalation, closure tools; no unsupported response-time league table |
| P2 | Dataset/methodology/corrections pages | Data dictionary, stable IDs, evidence statuses, distributions, versioning, permitted reuse, submission standards |
| P3 | Returning-player rewards | Publish only broadly available terms; personalized VIP promises remain out of universal comparisons |
| P3 | Objective comparisons by specific player need | Create only after unique demand and adequate records exist; no template-generated "best" pages |

Each brief must include primary intent, audience/category, evidence table, outline, required original contribution, source IDs, existing-page overlap, internal links, freshness owner, and acceptance checks. If fewer than five comparable records exist, publish a limited explanatory guide or operator-specific record instead of implying market-wide coverage.

A comparison page should answer the question first, present comparable facts, explain conditions nearby, identify evidence gaps, and link to detailed source records. No affiliate links in article copy. Commercial CTAs must follow the repaired eligibility flow.

## Engineering Backlog

### ENG-01: Eligibility and Outbound Repair

Scope: `src/assets/eligibility.js`, all `src/go/*/index.html`, shared operator/state data, targeted tests.

Use one source of eligibility truth. Separate banner dismissal from valid state selection. Decode cookies defensively. Validate state values against an explicit set. Combine jurisdiction status with verified operator restrictions. Unknown product availability must block commercial routing. A browser preference is not legal verification; retain that distinction in visible copy.

Avoid unsafe HTML string construction. Verify syntax on every generated outbound page. The current meta-refresh must not race a legitimate navigation.

Acceptance: browser tests cover no cookie, dismissal/reload, malformed cookie, invalid state, globally restricted state, operator-only exclusion, unresolved availability, verified allowed route, changed selection, direct `/go/` access, and no JavaScript. Stub external navigation during tests; never visit an operator to create activity. Editorial content remains public.

### ENG-02: Truth and Category Consistency

Scope: operator records, `tests.json`, methodology, homepage positioning/order, author identity.

Reconcile pending with test evidence. Add not-applicable handling for entertainment-only products. Verify the author identity with the owner. Display neutral ordering and relationship disclosure. Do not claim a verified operator is safe/legal in every state.

Acceptance: no pending status without a referenced funded run; no payout metrics for an inapplicable product; no best/fastest ranking without three comparable completed tests per operator; unresolved identity assertions removed or held pending confirmation.

### ENG-03: Normalized Player-Value Data

Scope: existing Eleventy data pattern, operator template, homepage comparison, JSON/CSV exports, content validation.

Implement the reviewed record contract with minimal abstractions. Add category and player-need filters backed by visible static content. Show purchase requirement, currency, conditions, and source freshness adjacent to the offer.

Acceptance: HTML/JSON/CSV agree on values; null/expired/conflicting states render correctly; operator-specific restrictions do not get lost; no duplicate canonical operator records; mobile comparison and filters work without text overlap.

### ENG-04: SEO/Data Integrity

Scope: sitemap/template metadata, structured data, SEO/content validators.

Parse JSON-LD rather than checking only its existence. Derive tested URLs from build output or collections. Check exact canonicals, indexability, internal links, unique main headings, required source metadata, and exclusion of `/go/`. Add truthful Dataset markup to the dataset page. Separate state event dates from content modification dates.

Acceptance: all public pages are covered; gated pages remain excluded/noindex; dates reflect real content changes; no fabricated ratings/reviews; new metadata represents visible data. Read the sitemap-freshness skill before page/date changes.

### ENG-05: Measurement and Corrections

Inspect existing GSC/GA configuration before adding anything. Establish a 28-day baseline when enough history exists; otherwise label the available period. Separate US brand/nonbrand query groups and offer versus payout landing pages.

Run a panel of 12 fixed player prompts on two available AI search surfaces, repeated once, for up to 48 observations if the remaining research allocation supports it. Otherwise prepare the panel without claiming a baseline. Record engine/mode/date, exact cited URL, accuracy, and no-citation/error states. Additional recurring costs require a separate budget.

Publish an operator correction/submission policy with named editorial ownership, evidence requirements, dated resolutions, conflict handling, and no pay-for-verification mechanism. Do not send outreach in this planning task.

Acceptance: baseline or explicitly unavailable status; no unsupported traffic/citation uplift claims; correction policy and data provenance agree.

## Delivery and Release Gates

Research delivery consists of the spend ledger, scoped demand outputs, operator/offer/source/claim JSON, comparison matrices, conflict register, page briefs, and a review acceptance summary. The reviewer must approve critical claims before production use.

Implementation runs `npm run release` plus the new browser and data-consistency tests. Use a short-lived branch, update `CHANGELOG.md`, and commit only task files. Generate `docs/` through the build. Do not publish new rankings or legal assertions simply because release validation passes.

First implementation target: fix ENG-01 and ENG-02. First research target: five comparable current welcome-offer records and the complete ten-operator known/unknown matrix. Completing this evidence before writing more pages is the recommended use of the budget.
