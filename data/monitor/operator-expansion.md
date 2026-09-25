# Operator expansion: September 25, 2026

## Admission

New operators need a confirmed sweepstakes product and two supported categories:
offers, fixed recurring daily SC, bounded processing/approval, or a cash minimum.
Signup and purchase offers count as one category. No state eligibility, affiliate
relationship, fixed reward, currency conversion or payout performance is inferred.

| Operator | Admission evidence | Remaining limits |
| --- | --- | --- |
| Spree | Homepage: 2.5 SC free signup, 30 SC with the $9.99 first package, 0.3 SC daily. Rules: 100 SC cash minimum and 10 SC gift-card minimum. | Its separate daily rules describe a variable maximum; do not substitute that maximum for the fixed homepage amount. Payment timing has unspecified day units and does not qualify for processing sorting. |
| Crown Coins | Official help: 2 SC free signup and 24-72-hour approval window. | Approval can take seven days in some cases. Bank/wallet delivery follows approval and must remain separate. The collected 50 SC minimum is general, not a cash-specific comparison. Daily amount is not established. |

Both enter the shared monitor, not a manually maintained offer table. New current
figures are published only through the normal archived and validated production
refresh. Neither has a commercial visit link; Details opens the evidence profile.

## Screening evidence

The first rendered screening run is
`2026-09-25T10-23-33-552Z-36123673203-1`.
It collected 49 sources across ten candidates; 44 were readable, using 45
Firecrawl calls (69 reported credits). Readability alone is not qualification.
Exact sources, captures and candidate configuration are in the private archive.

Additional direct captures and model checks are archived under
`2026-09-25-expansion-direct` (Spree and High 5) and
`2026-09-25-expansion-crown-coins` (official help-centre recovery).

| Candidate | Finding at screening |
| --- | --- |
| High 5 Casino | Hold: a 55 SC claim on the daily page conflicts with the paid-spin focus of the dedicated signup page. Do not promote it as the best free deal. The collected cash wording and post-approval transfer times do not independently establish two categories. |
| Modo | Cash minimum is 50 SC; daily amount varies. The 30-day payment window has unspecified day units and is not bounded processing data for the homepage. |
| RealPrize | Readable homepage and terms did not establish qualifying comparable values. |
| Hello Millions | Signup evidence is readable, but collected redemption figures are insufficient. Main-page sweepstakes language and current virtual-coin terms require care. |
| PlayFame / SpinBlitz | Readable pages do not establish two useful numeric comparison categories. |
| Chanced | Cash threshold is disclosed. Daily amount is unspecified; generic promotional banners are not immediate free signup offers. |
| Rolling Riches | Its linked public PDF discloses a cash threshold. A six-hour reward has no collected amount; request-frequency limits are not processing times. |
| Sportzino | Welcome offer found, but daily SC is the first day of an increasing login streak, not a fixed daily amount. No second qualifying category was established. The GC notation also caused an extraction rejection; recovering it would not change admission. |
| Zula | Hold: homepage daily claim is 10 SC, while the dedicated daily promotion says 1 SC. Do not pick the larger claim or silently resolve the conflict. No independent qualifying cash/processing category was established. |
| Fortune Coins / Fortune Wins | The old domain redirects to Fortune Wins. FC is a different denomination; do not silently copy its amounts into SC comparisons. |
| Funrize | Initial direct request blocked; not admitted. |
| DingDingDing | Initial hostname resolution failed; not admitted. |
| SweepSlots | Initial TLS certificate validation failed; no bypass attempted. |
| Sweeptastic | Its own homepage says it is now a review site, not an operator. |

The second rendered screening run is
`2026-09-25T10-42-22-461Z-36125367483-1`.
It completed successfully: 21 sources, 18 readable, 21 Firecrawl calls and five
model calls, with no model errors. None of these four candidates qualified.

| Candidate | Finding at screening |
| --- | --- |
| LuckyLand Casino | The 2 SC welcome offer does not explicitly establish free, immediate signup qualification. Its daily bonus has no published amount in the captured pages. Browser-reviewed official help discloses a 50 SC cash minimum, but approval uses unspecified day units and bank transfer is a separate stage; these do not establish two comparable categories. Do not import LuckyLand Slots offers into this separate brand. |
| Legendz | A 3 SC welcome claim is combined with a first-purchase offer; free/immediate qualification is unclear. Daily rewards have no amount, and collected help pages establish no qualifying cash minimum or processing window. |
| Punt | The first-purchase banner describes dollars of unspecified coins, not an SC allocation. The 100 SC threshold is general; payment into a bank account is end-to-end timing, not a separately bounded processing window. Its rules and terms also disagree on playthrough. |
| MegaBonanza | Three readable pages, including current terms, do not establish useful numeric offers or redemption policies. A readable games catalogue is not comparison evidence. |

The first normal production refresh, workflow run `36126079181`, completed and
deployed successfully. It read 58/60 sources, used 39 Firecrawl and 14 model calls,
and had zero model errors. Both Spree and Crown Coins qualified from the normal
production extraction, without importing screening results into public data.

After the classification review below, workflow run `36128138165` completed and
deployed on main. Run `2026-09-25T11-13-20-124Z-36128138165-1` read 58/60 sources,
used 41 Firecrawl and 14 model calls, and had zero model errors. The corrected
registry classifications now reach the shared current model.

## Existing roster classification review

The new explicit sweepstakes admission check exposed stale September 10
`unverified` registry labels. These are classification omissions, not missing
numeric comparisons. Correct the registry labels for the following operators,
using already archived official evidence:

| Operator | Classification evidence |
| --- | --- |
| McLuck | Homepage captured September 24 at 22:05 UTC in run `2026-09-24T22-03-36-894Z-36065157612-1`: describes no-purchase Sweepstakes Coins and redeemable cash/gift-card prizes. |
| Zonko | Official FAQ captured September 24 at 22:08 UTC in that same run: explicitly describes Zonko's sweepstakes model and free entry methods. |
| Lucky Bunny | Official sweepstakes rules captured September 24 at 10:38 UTC in run `2026-09-24T10-29-34-240Z-35987472986-1`: separates entertainment-only Standard Play from Promotional Play using redeemable Sweep Coins. |

Only product classification changes. No numeric evidence, observation dates,
state eligibility, or affiliate relationships are inferred or edited. The
ordinary publisher projects registry classification into the shared current
model; the two-category minimum and free-signup default remain unchanged.
McLuck's homepage and Zonko's FAQ reconfirmed the classification in the first
September 25 production run.

The final display review also found an older Lucky Bunny record labelled
end-to-end despite an explicit after-approval basis. Extraction and projection
now classify that wording as transfer, not request-to-receipt. This does not
change its offer/cash admission, any numeric amount, or the saved source dates.

## Product outcome

Eight homepage comparisons, up from six before expansion; thirteen operators
remain monitored. The default is still highest immediate free signup SC, with
alphabetical ties and unknown signup amounts last:

1. McLuck: 2.5 SC.
2. Spree: 2.5 SC.
3. Chumba Casino: 2 SC.
4. Crown Coins: 2 SC.
5. WOW Vegas: 2 SC.
6. YAY Casino: 1 SC.
7. Lucky Bunny: no verified free signup amount.
8. Zonko: no verified free signup amount.

Spree adds the 30 SC / $9.99 first package, 0.3 fixed daily SC and 100 SC cash
minimum. Crown Coins adds the typical 24-72-hour approval window with the
seven-day exception retained in Terms; its cash minimum and daily amount remain
unverified. Fixed daily SC is still established only for Spree among these eight.
Chumba, Spree, YAY and Lucky Bunny have no qualifying processing display in the
final build. All missing fields stay explicit rather than becoming zero.

The five monitored operators outside the homepage are Dorados (only processing
qualifies), Jackpota (entertainment-only), Pulsz, Stake.us and SweetSweeps
(insufficient comparable numeric evidence). Twelve homepage entries have not
been reached. There is no six- or eight-row display cap.

The same current model feeds the homepage, seven benchmarks, thirteen profiles,
eight other current comparison pages, and the current CSV. Historical editions
remain unchanged. No separate offer table or parallel collection path was added.

## Pipeline safeguards

- Candidate runs use the same collector/extractor/archive, a separate baseline
  scope, and no publication, deployment or baseline advancement.
- Every candidate seed is prioritized before discovered links.
- Each operator beyond the original eleven adds five source/Firecrawl requests
  and one model request. Thirteen monitored operators allow 60 direct requests,
  55 Firecrawl requests and 14 model calls, including one optional repair.
- The eight-source/operator limit remains. More than 24 operators requires a
  capacity review instead of silently expanding.
- Official support hosts and exact document URLs are curated sources. No
  accounts, geographic eligibility workarounds or third-party review claims are
  used as numeric evidence.

## Verification

- 136 monitor/gate tests passed.
- Full release validation passed.
- Homepage tested at five widths with all sorts, Terms, alignment, icons and
  JavaScript disabled; eight current comparison pages and CSV parity passed.
- Seven benchmarks and thirteen profiles passed desktop/mobile, keyboard,
  image and no-JavaScript checks.
- Both production refreshes deployed successfully; the classification refresh
  published all thirteen operators and eight eligible homepage comparisons.
- Final eight-row build passed both browser suites, including expanded Terms
  screenshots, all sorts, and cross-page/CSV evidence parity.
