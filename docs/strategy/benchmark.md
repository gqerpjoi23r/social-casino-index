# Operator Benchmark

Last verified: 2026-09-08. Verification methods: `direct` (plain HTTPS fetch),
`firecrawl-us` (Firecrawl scrape with US location), `blocked` (could not verify).
Nothing in this file is inferred; missing data is marked UNVERIFIED.

## Partners

### Jackpota (jackpota.com)

- Verification: firecrawl-us for terms page; direct fetch returns lobby shell.
- Owner/operator: not yet confirmed from public docs. UNVERIFIED.
- Terms of service (`/terms-of-service`, accessed 2026-09-08): covers the
  social-casino platform; states there is "no opportunity for a User on the
  Platform to win real-money or any prize while playing the Games" — i.e. this
  document governs Gold-Coin-style free play only.
- Sweepstakes/redemption rules: **no public sweepstakes rules page found**.
  Probed `/sweepstakes-rules`, `/sweeps-rules`, `/sweepstakes`, `/sc-rules`,
  `/promotional-rules`, `/rules` — all 404. The SC-side redemption terms
  (methods, minimums, timing, restricted states) are **UNVERIFIED** from
  public pages. Action: request sweepstakes rules from the Jackpota partner
  contact; until supplied, Jackpota rows show "terms not published publicly."
- Restricted states: UNVERIFIED (not stated in the ToS).
- Note: the platform mentions an "Unlimited Play" mode and holds a Delaware
  arbitration clause in ToS (Delaware courts; remote arbitration allowed).

### Lucky Bunny (luckybunny.fun)

- Verification: direct fetch of homepage; terms pages are JS-rendered and the
  CMS slugs for terms/sweepstakes-rules could not be located. The privacy
  policy renders at `/page/privacy-policy`; terms and sweepstakes rules do
  not render at any probed slug (`/page/terms-of-service`,
  `/page/terms-of-use`, `/page/user-agreement`, `/page/rules-of-play`,
  `/page/redemption-policy`, and 5 more variants — all return the app 404).
- Platform: white-label sweepstakes platform ("fungamess" backend,
  `sweepstakes.fungamess.games` demo endpoint in app config).
- Registration copy confirms dual-currency model with 21+ age gate:
  "I confirm that I am at least 21 years old, and agree with Terms and
  Conditions, Sweepstake Rules and Privacy Policy" (app config, 2026-09-08).
- Redemption terms (methods, minimums, timing): **UNVERIFIED** — the documents
  exist behind the app but no public URL could be confirmed. Action: request
  direct links from the partner; until supplied, rows show "terms not
  publicly reachable."
- Restricted states: UNVERIFIED.

### YAY Casino (yaycasino.com)

- Verification: firecrawl-us on terms-and-conditions (2026-09-08).
- Operator: Social Gaming LLC, 2711 Centerville Road, Suite 400, Wilmington,
  Delaware 19808, USA (site footer).
- Excluded Territories (T&C 1.1.7): **Washington, Idaho, California,
  New York and Michigan**, plus any jurisdiction outside the US.
- Redemption: cryptocurrency-based. T&C describes a "Crypto Payment
  Administration" that "processes purchases, handles redemptions, and
  coordinates with third-party crypto payment service providers."
  Specific coins, minimums, and payout timing: UNVERIFIED (not in T&C).
- Age: 21+ for US residents (footer/player-safety copy).

### Dorados (dorados.com)

- Verification: firecrawl-us on sweepstakes rules and terms (2026-09-08).
  Direct fetch returns 403 (bot protection).
- Sponsor: RAFFLEFY LIMITED, Limassol, Cyprus (Sweepstakes Rules 1.1).
- Sweepstakes rules last revised: February 2026.
- Minimum redemption: **100 Redeemable Sweeps Coins** (Sweepstakes Rules,
  intro: "a minimum of 100 Redeemable Sweeps Coins is required to initiate
  Prize redemption").
- Redemption method: "the funds will be transferred to your designated
  Payment Method"; fallback to an alternative financial account in the
  player's name. Specific methods and timing: UNVERIFIED.
- Restricted Jurisdictions (Terms and Conditions, definitions): any
  jurisdiction outside the US; **California, Connecticut, Idaho, Indiana,
  Iowa, Louisiana, Maine, Michigan, Montana, Nevada, New Jersey, New York,
  Tennessee, and Washington**; plus Indian land in the US.
- Age: 21+ or legal age of majority, whichever is greater.

### Zonko (zonko.com)

- Verification: firecrawl-us retrieved `/help/terms/` (2026-09-08).
  Homepage and all other help pages geo-block even via Firecrawl's US exit
  (block page shows detected location US, IP 195.64.119.73). Terms are
  served from the geo-block page itself, which is why only that document
  is readable.
- Restricted Territories (Terms 3.x): **Washington, Idaho, Louisiana,
  Michigan, Nevada, Montana, Delaware, Connecticut, New Jersey, New York,
  California, Tennessee, Indiana, Maine** and any jurisdiction outside the US.
- Currency model: Gold Coins purchases (Terms §6). Sweeps-coin redemption
  mechanics, methods, minimums, timing: UNVERIFIED — the sweepstakes rules
  document is not publicly reachable from any probed URL.
- VPN circumvention explicitly prohibited (Terms 3.5).

## Context Operators (from existing research, verified 2026-09-07)

| Operator | Published estimate | Methods | Notes |
|----------|-------------------|---------|-------|
| Chumba Casino | Processed within 2 days after approval | Bank transfer, gift card | First redemption slower (full KYC) |
| Pulsz | First redemption 3-7 business days; repeat up to 72h processing + delivery | Trustly bank transfer, Skrill | — |
| Stake.us | Crypto redemptions; identity verification typically 2-3 business days | Crypto | — |
| WOW Vegas | Timing not stated in verifiable form; 1x wagering requirement on SC | — | — |
| McLuck | Bank transfer 2-5 days (up to 10); up to 72h processing; min 75 SC bank / 10 SC gift card; max 10,000 SC/day (4,900 FL/NY) | Bank transfer, gift card | — |

## Partner Comparison Table (for homepage + hub)

| Partner | Published payout timing | Methods | Min redemption | Restricted states | Verification |
|---------|------------------------|---------|---------------|-------------------|--------------|
| Jackpota | Not published publicly | UNVERIFIED | UNVERIFIED | UNVERIFIED | Partial |
| Lucky Bunny | Not publicly reachable | UNVERIFIED | UNVERIFIED | UNVERIFIED | Partial |
| YAY Casino | Not stated in T&C | Crypto | UNVERIFIED | WA, ID, CA, NY, MI | Verified (T&C) |
| Dorados | Not stated in rules | "Designated payment method" | 100 SC | CA, CT, ID, IN, IA, LA, ME, MI, MT, NV, NJ, NY, TN, WA | Verified (firecrawl-us) |
| Zonko | Not publicly reachable | UNVERIFIED | UNVERIFIED | WA, ID, LA, MI, NV, MT, DE, CT, NJ, NY, CA, TN, IN, ME | Verified terms only |

## Competitive Pattern Notes (who wins these prompts now)

- "Fastest payout" and "best" list queries: newspaper casino verticals
  (PennLive, OregonLive, AL.com, Freep) with weekly-refreshed listicles.
  Pattern: numeric claim in H1/first paragraph ("These 7 payout the
  fastest"), per-operator mini-reviews with first-person test claims,
  comparison table with sign-up offers, FAQ block.
- How-to queries ("how to redeem Sweeps Coins"): rg.org-style guides with
  step-by-step structure, per-operator callouts, FAQ schema.
- State legality queries: mix of affiliate listicles and news coverage of
  enforcement (e.g. California AB 831). No strong statute-cited reference
  page currently dominates — this is the clearest gap for us.
- LLM-quotable answer shape across all clusters: one direct sentence with
  numbers and dates, a compact table, explicit "last updated" date, named
  sources. Pages without dates or with vague claims are not quoted.

## Gaps And Follow-ups

1. Jackpota: request sweepstakes rules URL or document from partner contact.
2. Lucky Bunny: request public terms/sweepstakes-rules URLs from partner.
3. YAY Casino: confirm coin list, minimums, and payout timing from partner.
4. Zonko: sweepstakes rules document needed from partner; site geo-blocks
   even US datacenter exits, suggesting stricter checks (residential IP?).
5. Dorados: request payment-method list and typical timing to complete the
   row (rules state the mechanism but not the options).
6. Funded tests remain the long-term differentiator for the "observed"
   columns; no test data exists yet.
