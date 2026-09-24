# Player-first comparison release

## Product effect

- Before: 11 homepage positions, ordered by coverage. After: six entries with at
  least two comparable categories, ordered by highest immediate free signup SC.
- Order before: McLuck, WOW Vegas, Zonko, YAY Casino, Chumba Casino, Lucky Bunny,
  Dorados, Pulsz, Stake.us, SweetSweeps, Jackpota.
- Order after: McLuck (2.5 SC), Chumba Casino (2 SC), WOW Vegas (2 SC), YAY Casino
  (1 SC), Lucky Bunny, Zonko. The last two have no comparable signup amount.
  Equal and unknown amounts use alphabetical ties.
- Dorados, Pulsz, Stake.us, SweetSweeps and Jackpota leave the homepage, not the
  monitoring roster, profiles, or evidence exports.
- Paid packages have their own field and SC-per-dollar sort. They are never
  presented as free signup rewards. Names and values align left; positions and
  logos align right. Terms expand below each entry.
- Descriptive daily rewards are visible without inventing fixed SC amounts.
  No fixed daily amount qualifies before this release's fresh collection.

## Evidence correction

YAY's retained 4 SC figure included multiple onboarding rewards. Its official
registration breakdown specifies 1 SC for signup alone, with separate opt-in,
first-daily-claim and gameplay steps. The reviewed replacement retains the
operator's advertised up-to-12-SC total and its requirements.

Source: `yay-signup`, captured `2026-09-24T10:36:41.663Z`, run
`2026-09-24T10-29-34-240Z-35987472986-1`.
Replacement record: `bc8f7e1fbb4ded73ba90`. The private correction retains the
source quote and capture provenance. Historical records and originals remain
unchanged. This corrects our interpretation, not a claimed operator offer change.

## Shared data and recovery

Homepage, benchmark pages, pair comparisons, operator profiles, eight older
comparison pages and the current CSV use the shared published evidence model.
Identity, state eligibility, affiliate routing and funded-test metadata remain
separate. Historical download editions are no longer regenerated.

Automatic Firecrawl proxy fallback, comparison-source priority and one optional
exact-quote repair run within the existing 50-source, 45-Firecrawl and 12-model
request limits. Offline repair replay makes zero model calls.

The saved-capture audit does not demonstrate more numeric coverage: before and
after, six operators have offers, zero have fixed daily SC, four have comparable
processing windows, and six have cash minimums. Remaining gaps include unavailable
sources, rejected extractions and non-comparable claims. No missing field is
treated as proof that an operator does not disclose it.

## Verification

129 monitor tests and the full release pass. Browser checks cover five homepage
widths, all sorts, Terms, logos, keyboard, no-JavaScript rendering, seven benefit
benchmarks, eleven profiles, eight migrated comparison pages and current CSV
parity. Historical exports remain byte-identical. The subsequent production
refresh reports its own actual values, order, coverage and requests in the
workflow summary and `product-impact` artifact.
