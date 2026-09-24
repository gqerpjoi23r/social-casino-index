# Collection Recovery: September 23, 2026

## Scope and Result

Audited all 44 homepage attributes across 11 operators against the verified
September 23 archive (`2026-09-23T06-32-05-055Z-35827134695-1`).
Replayed cached model output without new model calls. Ran an isolated live
probe of 11 existing official URLs with direct retrieval only.
No production observations, confirmation dates or private baselines changed.

The existing snapshot has 6 comparable welcome offers, 0 fixed daily rewards,
3 processing estimates and 5 cash minimums. The total remains 14 after the
display fixes: McLuck gains its published typical cash-processing estimate;
Stake loses a request-frequency limit that was incorrectly counted as speed.

## Findings and Fixes

- McLuck: archived source supports 60 signup SC separately from a chance to
  win 500 SC. Its 3-5 business-day cash-processing estimate was excluded solely
  because the model uses `typical`. Preserve that qualifier and compare the
  published range; do not describe it as a guaranteed deadline.
- Stake: one request per account in 24 hours is a frequency restriction, not
  processing speed. Reject that interpretation in extraction and display,
  including old retained records. Prioritize the existing redemption-progress
  source rather than adding a duplicate.
- Zonko: one FAQ package explicitly gives 40 initial SC for $20 and another
  25 SC in stages. The extracted total of 65 was not explicitly stated in
  that quote, causing the entire package to be rejected. Recover its grounded
  price and initial allocation, omit the unsupported total, and retain its
  schedule and conditions. Log the field-level recovery. Other conflicting
  offer records remain separate.
- Retrieval: a discovered binary download was treated as readable and
  contributed 160,000 truncated characters to model input. Exclude asset URLs
  from discovery, reject binary responses and skip historical binary text
  during extraction.
- Rendering: the archive has 12 second full-content retries that the new
  policy would omit. This is a replay estimate, not a measured live saving.
  Full-content attempts remain enabled for the specific Chumba, Lucky Bunny,
  Jackpota-promotion and McLuck-promotion sources, only after a readable first
  rendered response. Do not repeat full rendering for access or region blocks.
  Existing provider caps remain unchanged.

## Remaining Gaps

| Operator | Evidence and unresolved collection need |
| --- | --- |
| Jackpota | Saved public content describes Gold Coins and the configured product mode is entertainment-only. Do not force SC into this comparison. A fresh mode review needs official product evidence. |
| Lucky Bunny | Saved package amounts exist; no saved cash minimum or fixed daily amount. Direct homepage is an app shell; preserve the full-content rendered path. |
| YAY | Daily source describes increasing seven-day rewards without a quantified schedule. A general minimum is current; the explicit bank minimum remains dated. Do not infer a fixed daily amount. |
| Dorados | Readable rules contain a general minimum and tier-specific timing; neither proves a universal cash minimum or entry-tier processing estimate. Current direct rules request is blocked. |
| Zonko | Daily rewards are variable/unquantified. Resolve conflicting welcome descriptions and retain dated cash evidence; the live direct daily page gives a region notice. |
| Chumba | Saved signup and cash figures exist; daily amount is unquantified. Live direct promotions do not expose the offer. Rendered capture remains necessary. |
| Pulsz | Gold Coin welcome copy and unquantified daily rewards do not establish SC values. Its 90-day cancellation deadline is not processing speed. Live support access is blocked. |
| Stake | Daily SC quantity is absent from the saved statements. The live progress article is readable but concerns redemption qualification, not a fixed daily allocation or processing guarantee. |
| WOW | Supported welcome, cash and processing values exist. Daily Drops are described as surprise rewards without a fixed SC amount. |
| McLuck | Saved banner and typical processing range are supported by the archive. Current direct access is blocked; use the established rendered provider path for reconfirmation. |
| SweetSweeps | Saved terms and a blocked/app-shell homepage do not establish offers or a product-mode change. Do not treat collection failure as nondisclosure. |

## Reproduction and Follow-Up

Run `node scripts/monitor/collection-audit.mjs <verified-archive-directory>`.
It writes a private 44-cell trace, replay rejection/recovery details and retry
analysis under `.monitor/collection-recovery-report/`. Its before comparison
uses the currently built `docs/updates/leaderboard.json`; run it before rebuilding
when comparing an old build with new display code.

The direct probe returned 3 readable pages, 3 blocked, 3 app-shell/empty pages
and 2 region notices. It used no paid rendering
or model calls. Private captures are under `.monitor/collection-recovery-live/`.

After merge, validate the normal daily rendered run at the existing budget:
record provider usage, source coverage, recovered fields and remaining failures.
Do not claim 12 calls were saved until measured on a live run. Continue issue
#14 with public-source discovery for missing benefits; do not weaken numeric,
method or scope requirements merely to increase coverage.
