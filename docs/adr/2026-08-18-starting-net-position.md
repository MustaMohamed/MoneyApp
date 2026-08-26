# ADR — the starting net position, its sign, and its refusal

- **Date:** 2026-08-18
- **Status:** accepted
- **Ticket:** MA-012 (issue #214), scope `MA-onboarding-redesign`
- **Applies to:** `resolveStartingNetPosition`, `selectApproximationPill`, `selectReadySummaryState`
  in `src/modules/onboarding/domain/`

N4 replaces `computeTotalBalance`, which summed `current_balance` across accounts of mixed currencies
with no sign for liabilities. The replacement changes money-handling behaviour and introduces a state
in which the app declines to show a number at all, so both decisions are recorded here rather than in
a commit message.

## 1. One named site owns the credit-card sign

`resolveAccountAggregationSign(type)` returns `-1` for `AccountType.CreditCard` and `+1` for every
other type. Nothing else in this screen's path may encode that rule.

It is the **third** independent encoding in the app. `computeNetWorth` (dashboard helpers) inlines the
same conditional, and `resolvePrimaryBalanceDelta` in the transactions domain owns it for the write
side. Three is one too many; the point of naming this one is that when #249 is answered there is a
single site to adopt, move, or delete — not a conditional buried inside a reduce.

The corollary is a rule for the screen: **no leading minus is derived at the display layer.** The
formatter renders whatever sign the resolver produced. A minus recomputed in a component would be a
fourth encoding, one layer further from the write, which is defect class 3 in `.claude/rules/review.md`.

## 2. The rate-verification gate, and why it refuses

A stored rate counts as usable only when `rateUpdatedAt !== null` **and** `rate` is finite **and**
`rate > 0`. Conversion is required only when at least one non-archived account carries a currency
other than the base. Required and unusable is the **refusal** outcome, `{ kind: 'rate-needed',
foreignCount }` — a discriminated union member with no `value`, so a caller cannot format a number
that does not exist.

The gate exists because `useCurrencyStore`'s `INITIAL_STATE` is `{ rate: 50, rate_updated_at: null }`.
`50` is a placeholder nobody verified; without the timestamp check it would silently become the number
a first-time user reads as their net worth. Refusal is the contract, not a degraded mode: no
substituted rate, no zero, no partial total, no dash rendered where a number belongs. The screen keeps
its CTA fully enabled and states, in a warning tone, that a rate is needed.

## 3. The accepted false-refusal population

`parsePersistedTimestamp` returns `null` for any non-ISO string, independently of the rate value, and
the `usd_rate_updated_at` setting first appears in #165 with no backfill. Installs predating #165
therefore hydrate a real, user-entered rate alongside a null marker, and land on the refusal state
permanently until the user re-saves a rate.

That population is known and **accepted**. The direction of the failure is the safe one — the app
declines to show a number rather than showing one it cannot vouch for — and the remedy is a backfill
migration, filed separately and out of scope here. **Do not loosen the gate to make those installs
show a number**; loosening it re-admits the unverified `50`.

## 4. Round each converted value, then round the sum

`round2( Σ sign × round2(converted opening_balance) )`, where `round2` is `roundMoney` — banker's
rounding, half-even, 2 dp — summed in array order.

Rounding once at the end instead is a real behavioural difference, not a stylistic one: two USD
wallets of `0.502` at rate `2` convert to `1.004` each, which is `2.00` round-then-sum and `2.01`
sum-then-round. The scope spec nominates its case 14 (two `0.005` USD wallets at rate `2`) as the
regression catcher for this, and it is not one — that fixture converts to exactly `0.01`, so both
orders agree. The suite therefore carries an additional fixture that separates them.

Two further consequences of rounding at this layer:

- **`opening_balance` only.** `credit_limit`, `revolving_balance`, `minimum_payment` and
  `current_balance` never contribute. The replaced code read `current_balance`; business rule 6 makes
  the two columns equal at account creation, so during onboarding the swap is invisible — but it is a
  deliberate change of column, not an accident of the rewrite.
- **`-0` is normalised at the last step before returning.** `roundMoney` returns `-0` for a negative
  value that rounds to zero, and `Intl.NumberFormat` renders `-0` as `-0.00`. Without the
  normalisation, an account set that cancels out to a floating-point residue would draw "what you have
  and what you owe cancel out exactly" above `-0.00 EGP`. `normalizeNegativeZero` is called on the
  resolver's amount **and** on the approximation pill's value; each call site needs its own fixture,
  because neither one's zero reaches the other.

## 5. Divergence from `computeNetWorth`, and who owns reconciling it

The dashboard's `computeNetWorth` multiplies by the rate unconditionally, never divides, never rounds,
carries no archived filter, and falls back to `rate > 0 ? value / rate : 0`. This resolver does the
opposite on every one of those points: it divides EGP into a USD base, rounds per value and again at
the sum, filters archived rows itself, and refuses rather than falling back.

The two are not reconciled here. **#249 owns that**, and this file is the argument it should be
reconciled toward — not evidence that N4 is the odd one out.

## 6. Recorded deviation: EGP at two decimals on this screen

N4 renders EGP amounts with an explicit two decimals (`N4_HERO_AMOUNT_DECIMALS`), while
`CURRENCY_CONFIG` sets EGP's default to zero and the dashboard's stat cards, hero card and
net-worth breakdown all render it at zero. This is a deliberate, approved, screen-local deviation: the
number on N4 is the sum of balances the user has just typed, and dropping the cents would make it
disagree with what they entered. It does not change the default for any other surface.
