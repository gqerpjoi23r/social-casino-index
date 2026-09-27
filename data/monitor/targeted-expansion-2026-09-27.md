# Targeted operator expansion: September 27, 2026

## Screening

Workflow `36295110784` completed successfully. Private archive:
`2026-09-27T04-43-55-384Z-36295110784-1`.

Eight candidates, 32 explicit seeds, 50 total attempted sources, 45 readable.
The run used 34 Firecrawl calls and nine model calls, including one repair;
there were no model errors. It did not publish or advance production state.
Private `candidate-decisions.json` contains each field's source URLs, capture
outcomes, extracted values, qualifiers and rejection reasons.

| Candidate | Reviewed decision |
| --- | --- |
| Modo | Add. Official cash help and rules establish a 50-SC cash minimum. Detailed help distinguishes the 24-hour Modo processing window from subsequent bank delivery up to five business days. The optional instant route's fee stays attached to that route. |
| Zula Casino | Add using the dedicated signup breakdown, rules and daily conditions, not its homepage headlines. Initial registration is 2 SC; the 10-SC welcome total includes optional account tasks. Rules establish a 50-SC-per-day minimum in cash-redemption context. Daily quantity remains unresolved. |
| Sportzino | Hold. Signup has a supported initial amount; the collected 50-SC minimum remains general, not cash-specific. Daily first/streak claims are not fixed recurring rewards. The support index yielded purchase-method information, not the missing cash connection. |
| LuckyLand Casino | Hold. Homepage offer qualification is incomplete, two help captures failed the expected-article check, and the rules request failed. This is not proof of nondisclosure. |
| Rolling Riches | Hold. Captured minimum/rules material does not pass the cash-method comparison gate. Delivery estimates are post-approval, not processing. Recovering rejected daily quantities would not establish two qualifying categories. |
| High 5 Casino | Hold. The 55-SC cross-promotion conflicts with the dedicated paid-spin signup page; do not publish it as a verified free offer. Captured timing is after approval; collected minimum records also have method/unit limitations. |
| Chanced | Hold. The model's threshold record remains general and timing does not qualify. Generic banners are not a complete immediate signup or purchase offer. Playthrough does not count as another admission category. |
| Fortune Wins | Hold. FC denomination and cash conversion are not established. The source-grounding rejection is retained; do not reinterpret FC as SC. |

## Source Review

Modo's rules explicitly define sweepstakes entry and cash/gift-card prizes.
Zula's rules define promotional Sweeps Coins and cash prize redemption.
These establish product classification, not independent state eligibility or
measured payout performance.

Zula's source inconsistency is preserved in the screening archive:

- The homepage describes 10 SC as a welcome package and 10 SC as a daily reward.
- The detailed signup table assigns 2 SC to registration; its 10-SC total
  includes phone verification, communications consent and a daily claim.
- The September 27 dedicated daily capture states a daily GC + SC reward but
  no quantity. Earlier research recovered a different daily number.

The production source set therefore uses the exact detailed promotion and
rules pages. It does not publish either disputed homepage quantity. Daily
conditions remain monitored without declaring the conflict resolved.

Both additions use `discoverLinks: false`: their reviewed three/four sources
are the complete intended collection set. This prevents generic promotion
links from reintroducing the broad headline claims and avoids low-value
discovery. Other operators keep existing bounded discovery. Global API-path
and unapproved-host exclusions remain intact; known public PDFs are explicit
seeds.

No screening records are copied into public data. The normal production run
must independently extract and publish the qualifying fields.

## Boundaries and Verification

- Existing two-category admission and sorting rules remain unchanged.
- No affiliate links, customer accounts, currency conversions, geographic
  workarounds or new scraping providers were added.
- Favicons come from the official help/site assets found in captured HTML.
- Field decisions distinguish extraction limitations from source access;
  differing numeric values prompt scope review, not an automatic conflict
  conclusion.
- 139 monitor tests and the full release passed for the collector changes.
- Existing browser suites passed at five homepage widths, all sorts, Terms,
  seven benchmarks, thirteen existing profiles and CSV parity.

## Production Outcome

PRs #26 and #27 are merged. Fresh normal workflow `36296192801` published
commit `7adcb36` and deployed successfully. It did not reuse the screening
archive. Collection ran from 05:06:10 to 05:18:26 UTC on September 27.

- 15 registered operators, up from 13.
- 68/70 readable sources; all seven curated Modo/Zula sources succeeded.
- 46 Firecrawl calls and 16 model calls, including one repair; no model errors.
- Downloaded archive verified: 418 files, 116 captures, no corrupt operators.
- 222 checked passages, zero unsupported passages and zero identical-replay
  changes. Numeric validation checked 208 numbers; ten records were rejected.
- Production baseline advanced only after validated publication.

| Player-facing result | Before | After |
| --- | ---: | ---: |
| Homepage operators | 8 | 8 |
| Immediate free signup comparisons | 6 | 6 |
| Complete purchase comparisons | 6 | 5 |
| Fixed recurring daily SC comparisons | 1 | 1 |
| Comparable published processing | 5 | 6 |
| Cash-minimum comparisons | 7 | 9 |

The before snapshot was the live September 26 refresh. Category counts cover
the whole monitored roster, not just homepage rows. Offers remain one admission
category even when both signup and purchase values qualify.

Both additions qualify in production:

| Operator | Published comparison | Remaining gaps |
| --- | --- | --- |
| Modo | 50 SC cash minimum; up to 24 hours standard processing; 20 SC gift-card minimum on the specialist comparison | No comparable signup/purchase or fixed daily amount. Bank delivery of up to five business days is separate. Broader rules allow longer processing; published timing is not a funded payout measurement. |
| Zula Casino | 2 SC initial signup; 10 SC total across welcome tasks; 50 SC cash minimum | No fixed daily amount or comparable processing window. Homepage headline conflict remains unresolved. |

Default homepage order: McLuck, Spree, Chumba Casino, Crown Coins, WOW Vegas,
Zula Casino, Modo, Zonko.

### Why The Homepage Did Not Grow

YAY Casino and Lucky Bunny left the homepage in this refresh. Both remain
monitored and have profiles. These losses are not evidence of nondisclosure:

- **YAY: extraction/validation loss.** The readable `yay-signup` capture explicitly
  assigns 1 SC to registration. The primary model quoted a headline without that
  allocation. Its repair quoted the allocation but omitted the headline totals
  it still claimed (12 SC and 120,000 GC), so validation rejected the signup
  record. One repair succeeded for a different policy record, not this signup.
  This is a collection-system limitation, not an absent online attribute.
- **Lucky Bunny: immediate-delivery qualification unresolved.** The readable
  homepage still has priced packages and SC totals. New extraction leaves
  `immediateSc` unknown, superseding the prior purchase comparison. The captured
  package labels do not explicitly establish immediate delivery. Do not report
  this as a withdrawn offer or restore the old amount merely to increase count.

Keep these specific issues in the existing collection-gap backlog (#14).
No extra collection, broader crawl or admission-rule change is justified by
these two losses alone. The six screened candidates remain held for the
reasons above; the original twelve-homepage-operator target is not reached.

### Live Verification

All 139 monitor tests and release validation passed in production. Both browser
suites passed against the deployed site: homepage at five widths, all sorts,
Terms, logos, keyboard/no-JavaScript use, eight shared-data pages, seven
benchmarks, all 15 profiles and CSV parity. Mobile and desktop screenshots
were checked. No screening numeric records were imported to make the additions
qualify.

## Scraper Concept

Selected official pages/PDFs -> direct retrieval, rendered fallback where
needed -> private evidence archive -> numeric extraction and validation ->
unchanged comparison eligibility -> shared pages and exports.

This remains one scheduled pipeline, not a whole-site crawler. Exact curated
sources are preferred; access failure is never treated as absent disclosure.
