# Player-first homepage research

Reviewed: September 10, 2026. Internal follow-up record, not a funded test.

## Publication decision

Lead with three groups: no-purchase signup SC; first-purchase package price
and bonus SC; cash/gift-card redemption minimums and playthrough. Do not
calculate a composite score or treat Gold Coins as redeemable value.
Daily rewards, games, timing and identity checks are secondary.

Three Google discovery searches completed in the browser:

1. `sweepstakes casino players no deposit SC minimum redemption playthrough`
2. `sweepstakes casino first purchase offer SC price compare`
3. `sweepstakes casino players cashout minimum playthrough reddit`

This is an editorial selection informed by discovery and operator terms,
not a statistically established ranking of player preferences. Search
snippets and third-party rankings do not substantiate published amounts.
The current source-linked values are in `src/_data/operators.json`.

Primary-source examples supporting the comparison:

- Chumba's homepage advertises a $10 first-time package with 30 free SC.
  Its redeem-prizes guide distinguishes 100 SC cash from 10 SC gift cards:
  https://www.chumbacasino.com/ and
  https://www.chumbacasino.com/getting-started/redeem-prizes
- WOW's signup help separates day-one SC from later welcome claims:
  https://help.wowvegas.com/en/articles/10676733-sign-up-bonus-how-it-works
- WOW's redemption help distinguishes 50 SC cash from 20 SC gift cards:
  https://help.wowvegas.com/en/articles/10676686-how-do-i-redeem
- Stake's rollover help scopes 3x to purchase-linked Stake Cash:
  https://help.stake.us/en/articles/6465093-redemption-progress

All were reviewed September 10, 2026. Amounts are published claims, not
guaranteed checkout availability or independently measured outcomes.

## Access and remaining gaps

US-location Firecrawl retrieval recovered public Chumba, Dorados, Pulsz,
McLuck and WOW material where direct access was blocked. No player account,
purchase, identity verification or funded test was performed. US retrieval
does not establish player eligibility. Regional access, anti-bot responses,
login-only documents and genuinely unstated amounts are different gaps.

Label an offer account-specific or promotion-specific only when the operator
states that condition. Do not invent performance-based eligibility. If
the reason for a missing number is unknown, retain "Not verified."
Lucky Bunny's public packages do not establish a first-purchase promotion
or SC redemption rights. Zonko's accessible response did not establish
current numeric terms. WOW's SC game rules required login.

## First-party follow-up register

Keep both sides until resolved. Do not overwrite an inconvenient claim or
choose an amount merely because it is larger.

### YAY signup: unresolved difference in advertised amounts

- Homepage: "120,000 GC & 12 SC + 20 Free Spins".
  https://www.yaycasino.com/
  Captured September 10, 2026 at 07:26:25 UTC.
- Promotions: "80,000 GC + 8 SC and 20 free spins".
  https://www.yaycasino.com/promotions
  Captured September 10, 2026 at 07:27:08 UTC after redirect from
  `/promotions/promo/social-casino-sign-up-promotion`.
- Homepage text SHA-256:
  `0167121b458161dda353b5551ed42a41f694ceaf0ed66b5e46035bf2bd29430a`
- Promotions text SHA-256:
  `1f574d78104361604ad237520ed5267e15193c5499cb77d0a50b08059599b684`
- Publication: show both SC amounts as conflicting offers, neither as
  confirmed signup value.
- Follow-up: determine whether campaign, location, eligibility or stale
  copy explains the difference.

### Jackpota game counts: inconsistent specificity, not proven contradiction

- The same homepage says "1,500+ Social Casino Games" and
  "over 700 Vegas-style casino games".
  https://www.jackpota.com/
  Captured September 10, 2026 at 07:26:19 UTC.
- Text SHA-256:
  `2529dbf73c4194a0acb53b0e0a10019fc65e58dad268b7679d0c29d650f6aaff`
- These are compatible lower bounds, so they do not prove a false claim.
  They may reflect stale copy or different library scope.
- Publication: use supported game categories, not a precise library count.
- Follow-up: ask which inventory and date each count describes.

### Pulsz: product and promotional scope unresolved

- Terms updated September 1, 2026, section 2.1: ordinary virtual coin
  play has no real-money prizes, with an exception for
  "promotional contests or giveaways".
  https://www.pulsz.com/terms-of-use
- Operator help describes bank and gift-card redemption:
  https://support.pulsz.com/hc/en-us/articles/24820788909457-How-do-I-redeem-using-Online-Banking
  and https://support.pulsz.com/hc/en-us/articles/24820902593169-How-do-I-redeem-via-Gift-Card
- Retrieved September 10, 2026 with US-location Firecrawl.
  Terms markdown SHA-256:
  `454d4ff6e5c8cd38958cd1e64298936b6651e4435a77f785a7a8d484af5fa8da`
- Not a proven contradiction: the help may concern the promotional
  exception. Separate applicable prize rules and minimums were not verified.
- Publication: product scope unresolved; no invented minimum or payout time.
  The terms' 90-day document condition is not a 90-day payout estimate.
- Follow-up: reconcile current prize-specific rules with the general terms
  and help articles.

### McLuck: Gold Coin terms versus SC marketing

- Terms dated July 15, 2026, sections 2.1 and 2.4 describe ordinary GC
  and state virtual coins are "non-redeemable".
  https://www.mcluck.com/terms-of-service
- Homepage describes "FREE Sweepstakes Coins (SC)" and cash/gift prizes.
  https://www.mcluck.com/
- Retrieved September 10, 2026 with US-location Firecrawl.
  Terms markdown SHA-256:
  `c680578901ff6c33b1b17324cc9ebd97bc1ebb65c5239f3d7e054d09e62965f5`
  Homepage markdown SHA-256:
  `11d5c2d7d495ad85628ee55f64b36ca36794cefa2ad5f531a62b4b4cd18cc7a5`
- Not a proven contradiction: the two pages may describe separate modes.
  Section 7.2 explicitly permits selected-customer offers and separate
  promotional conditions.
- Publication: account/promotion-specific offer, price and SC unverified;
  product scope unresolved.
- Follow-up: locate the applicable SC rules and identify offer eligibility.

### WOW: combined headline and stale-date caveat

- Promo headline includes "SC 35 FREE", but the same page breaks this
  into 5 SC across signup claims and 30 SC with a $9.99 first purchase.
  Code: `WOWBONUS2026`.
  https://www.wowvegas.com/promo-code
- Retrieved September 10, 2026 with US-location Firecrawl.
  Markdown SHA-256:
  `3ea814642a9951df0ff3377b125ca157937427b0badefbeb665a0a63889034ee`
- This is a headline qualification issue, not evidence of 35 no-purchase SC.
  The January 2026-labelled page remained advertised; checkout was not tested.
- Publication: separate signup and purchase figures, with the date caveat.
- Follow-up: confirm whether the advertised code remains available at checkout.

Raw captures remain temporary local files because they can contain IPs and
request metadata. Only short excerpts, source locators and hashes are retained
here. Do not commit API keys or raw request headers.
