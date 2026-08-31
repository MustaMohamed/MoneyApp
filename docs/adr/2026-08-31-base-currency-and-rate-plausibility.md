# ADR — Base currency as the reporting currency, and a rate band that only warns

- **Date:** 2026-08-31
- **Status:** accepted (W4)
- **Ticket:** W4 (issues #269, #344)
- **Applies to:** `src/modules/accounts/domain/account_aggregation.ts`,
  `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts`,
  `src/modules/dashboard/screens/dashboard/dashboard.hook.ts`,
  `src/modules/currency/domain/rate_plausibility.ts`,
  `src/modules/currency/screens/currency/currency.hook.ts`

EGP stays the storage currency. What changes is that the dashboard stops treating it as the
reporting currency too: `computeNetWorth` and both breakdown resolvers now sum into the base the
user chose at N1, count foreign accounts against it, and convert in whichever direction that
implies. Separately, a rate outside `[1, 1000]` is nameable at the field where it is typed, and
nothing else about it changes.

## 1. Where base currency is read, and the rule that generalises it

`useOnboardingStore((s) => s.baseCurrency)`, in five hooks, passed downward as a parameter from
each. This ticket adds two — `dashboard.hook.ts:90` and `currency.hook.ts:37`; the other three are
pre-existing onboarding screens: `welcome.hook.ts:14`, `add_account.hook.ts:21`, `ready.hook.ts:19`.
`grep -rn "useOnboardingStore((s) => s.baseCurrency)" src/` returns exactly those five. **No
`domain/` file imports a store.** `NetWorthInput.baseCurrency` and `buildInfoRows`'s fifth parameter
are both required with no default: 12 failing `computeNetWorth({...})` literals and 25 failing
breakdown call sites are what the enforcement looks like working, and a default is the one
identified way to reopen the write path this ticket rules out.

The discriminator, because five hooks reading a store is otherwise read as licence for any hook to:
**a screen-entry hook reads the store; a shared component hook takes the value as a parameter.**
All five back one-line route re-exports under `src/app/` and have no host to pass from — five for
five, which is what makes this a rule rather than a description of two files.
`use_account_form.hook.ts:14-19` is the other side: two hosts that disagree on the value — Settings
passes `Currency.EGP`, onboarding passes the store's base — and its docblock already says the form
never reads the onboarding store itself. That stays true.

Not done here: moving base currency out of `useOnboardingStore` entirely, filed as #348. Its scope
is four sites — a different set from the five above, not a contradiction of it: this ticket's two,
plus audit M28's two future sites (`settings/screens/settings/index.tsx:36` and
`accounts/screens/accounts/add_account/add_account.hook.ts:11`), neither of which reads the store
today. Both hardcode `Currency.EGP`, which is what makes them M28's to move rather than readers to
count. Sequenced before M28's remaining remediation.

## 2. The fold under a divide, and the rule inside it that has no test

`round2( Σ sign × round2(convertCurrency(...)) )`, in array order, extending ADR
`2026-08-18-starting-net-position.md` §4 from multiply-only to both directions. Per-account
rounding is not stylistic: two EGP 100.00 accounts under a USD base at 48.85 are 2.05 + 2.05 = 4.10
round-then-sum, and 4.09 sum-then-round.

The foreign figures are **one** conversion of the accumulated total in the direction
`base -> foreignCurrencyFor(base)`, never a second per-account pass. Three EGP 100.00 accounts
convert to 2.05 each; 6.15 × 48.85 = 300.4275 rounds to 300.43, while three separate
`roundMoney(2.05 × 48.85)` sum to 300.42.

**The input to that conversion is the raw accumulator — before `roundMoney` and before
`normalizeNegativeZero` — and this rule cannot be given a test.** Measured at P5: converting the
normalised value instead leaves the whole suite green, and brute force over 10 rates × 2-6 accounts
× 0.01-2000.00 found no fixture where `roundMoney(acc × rate) ≠ roundMoney(roundMoney(acc) × rate)`.
It is black-box unfalsifiable. It is therefore a **diff-review invariant**, and the comment at
`dashboard.helpers.ts:134-152` is the only artifact carrying it. Deleting that comment as redundant
loses the rule with CI green.

What the rule protects is the negative-zero guard reaching the foreign figure. A cancelling
portfolio's `netWorth` accumulator is `-2.7755575615628914e-17`; an EGP base divides it, a USD base
multiplies it, both round to `-0`, and the normalisation maps that to `+0`. Feed the
already-normalised value in and both land on `+0` before `roundMoney` sees them — at which point
the suite's negative-zero assertion passes no matter what the guard does.

## 3. `convertCurrency`

```ts
export function convertCurrency(input: {
  amount: number; from: Currency; to: Currency; rate: number;
}): number
```

One bidirectional converter in `account_aggregation.ts`, replacing the private
`convertToBaseCurrency` in `starting_net_position.ts` and the two inline copies, so N4 and the
dashboard cannot drift apart again (ADR `2026-08-18` §5, audit M28). Object parameter, so `from`
and `to` cannot be transposed by position. Both codes go through `assertSupportedCurrency`. The
identity pair returns `amount` untouched, ignoring `rate` — asserted with a deliberately absurd
`rate: 999` rather than left to be inferred.

**It does not round and must not import `@/utils/money`**, per ADR
`2026-08-22-money-rounding-layer.md`: rounding happens once, at the fold. `{ amount: 100, from: EGP,
to: USD, rate: 3 }` returns `33.333333333333336`, which is what makes that prohibition falsifiable
instead of a comment.

Display decimals are unchanged by this ticket: they come from `CURRENCY_CONFIG[base].decimals` via
`formatCurrencyParts`, which is ADR `2026-08-21-currency-aware-display-decimals.md` applied rather
than revisited. Under an EGP base `decimals` stays 0 and `1,500.50` still renders `1,500`; §1 of
that ADR accepted it and named this card.

## 4. The plausibility band warns; it never changes a value

`isRateImplausible(rate)` with `RATE_PLAUSIBLE_MIN = 1` and `RATE_PLAUSIBLE_MAX = 1000`, inclusive
at both ends, in `src/modules/currency/domain/rate_plausibility.ts`. It throws on a non-finite or
non-positive input rather than answering `false`.

**No floor, no clamp, no substitution, and no gate on persistence.** With `0.0001` stored,
`setManualRate` still persists it, `parsePersistedRate` still loads it, `isRateUsable` still accepts
it, and `computeNetWorth` divides by it unmodified. Layla's standing refusal of a display-layer
`RATE_MIN` (ADR `2026-08-26-parse-floor-money-only.md`) is unchanged; this is a warning precisely
because that refusal stands.

The predicate is deliberately **not** in `parseRateText`, **not** in `manualRateSchema.refine`, and
**not** a throw in `setManualRate`. Each of those three converts the warning back into the rejection
that was ruled out. `persistedRatePattern` does not widen either; that is #327's.

One writer, in `currency.hook.ts`: an effect subscribing to the rate field with the store's `rate`
in its dep array, gated on `dirtyFields.rate`. A write after `await fetchRate()` would publish
without re-checking freshness (`.claude/rules/state.md`, request-generation guard) and would still
miss `refreshRateIfStale`, the second of `fetchRate`'s two callers. The dirty gate is what chooses
the subject rather than the dep array: `defaultValues` seeds the field once and nothing writes the
form afterwards, so a refreshed rate would otherwise be measured against stale text.

One string covers both ends of the band. There is no directional branch in the predicate and the app
has no live quote, so "too high" or "too low" would claim knowledge it does not have.

## 5. Accepted residuals

- **A refresh landing under an unsaved out-of-band draft warns about the draft**, not the fetched
  value, which is visible in the rate card above the field. This reaches the Refresh Rate button as
  well as the background path — `shouldRefreshRate`'s manual-override short-circuit covers only the
  second. The alternative, warning when *either* value is out of band, puts a warning under a field
  showing a plausible number.
- **The hero pill and the breakdown-sheet caption render different fields and are not reconciled.**
  17,097.50 (assets) against 12,212.50 (net worth) on the mixed-portfolio fixture; both are correct,
  and pointing the hero at `netWorthForeign` to make them agree compiles with no test failing.
- **A refresh landing while the Settings screen is already open** leaves the warning behind a
  section the user may have collapsed. The accordion opens for an out-of-band stored rate at mount
  only. Deliberately not filed: a controlled accordion would re-open a section the user has just
  closed, which is a worse answer than a warning they can reach.
- **The carousel's "In EGP" row is gated, not mirrored.** An EGP card under a USD base gets no
  "In USD" row; that is new surface, filed as #349 rather than built.
- **`stat_cards.tsx`'s month-spend card keeps its bare `formatAmount`.** A ledger total, not a
  converted pair — filed as #347 with the budget card's three sites of the same class.
- **The rate card prints `0.00` for any stored rate below 0.005**, directly above a warning naming
  that same rate implausible. Pre-existing — `index.tsx:48`'s
  `formatAmount(rate, EXCHANGE_RATE_DECIMALS)`, at `format_amount.ts:25`'s 2 — not
  caused by this ticket and made consequential by it. Filed as #346, together with the warning's
  gold-on-gold contrast against the accent palette already on that screen.
- **Two records still describe the narrow rate gate**: ADR `2026-08-18-starting-net-position.md` §2
  and onboarding `spec.md:165`. Filed as #350; this ticket's supersession notes fixed only what its
  own code made wrong.
