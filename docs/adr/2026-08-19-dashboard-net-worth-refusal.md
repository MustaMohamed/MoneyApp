# ADR — the dashboard net worth: one sign, rounded arithmetic, and a refusal

- **Date:** 2026-08-19
- **Status:** accepted
- **Ticket:** MA-013 (issue #255), ruling #249
- **Applies to:** `computeNetWorth` in
  `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts`, plus
  `src/modules/accounts/domain/account_aggregation.ts` and
  `src/modules/onboarding/domain/starting_net_position.ts`; and, because section 4 is normative
  about what they render, the four consuming surfaces in
  `src/modules/dashboard/screens/dashboard/components/` — `hero_card.tsx`, `stat_cards.tsx`,
  `net_worth_breakdown_sheet.tsx`, `total_balance_strip.tsx` — with their copy in
  `src/constants/strings.ts`; and, since the P8 cycle-2 fence lift (§4), `account_card.tsx` and the
  `account_carousel.tsx` that passes provenance to it

`2026-08-18-starting-net-position.md` §5 listed four points on which the dashboard's
`computeNetWorth` diverged from N4's `resolveStartingNetPosition` and named #249 as the owner of
reconciling them. This is that reconciliation. It changes money-handling behaviour and reverses a
contract a test recorded, so the decisions are here rather than in a commit message.

The work is split into two chunks. Chunk 1 is the sign, the rounding and the archived
filter, behind an unchanged return shape; chunk 2 is the refusal, the type change and the four
surfaces. Sections 1 to 3 and 5 are chunk 1's decisions, section 4 is chunk 2's. The split is kept
recorded here because section 3 is an argument *about* it.

## 1. Which of the four divergences this closes, and how

| §5 divergence | Closed by |
|---|---|
| Never rounds | Chunk 1. `round2( Σ sign × round2(converted) )`, in array order, per §4 of the prior ADR. |
| No archived filter | Chunk 1, as a contract guarantee. Its in-loop `continue` guard on `a.is_archived` became `accounts.filter((a) => !a.is_archived)` (`dashboard.helpers.ts:63`) in chunk 2, so the foreign count reads the same set the arithmetic does. |
| `rate > 0 ? value / rate : 0` fallback | Chunk 2. Replaced by the refusal and by absent `~USD` fields. |
| Multiplies unconditionally, never divides | **Not closed.** See section 2. |

The credit-card sign now has one owner for aggregations: `resolveAccountAggregationSign`, hoisted out
of the onboarding domain into `src/modules/accounts/domain/account_aggregation.ts` and adopted by both
`computeNetWorth` and `resolveStartingNetPosition`. `normalizeNegativeZero` moves with it, because
chunk 1 cannot satisfy the `-0` contract without it and the alternatives are a dashboard-to-onboarding
import or a second copy.

`resolvePrimaryBalanceDelta` in the transactions domain stays a separate encoding. It signs **writes**,
not aggregations, and unifying the two is out of scope. So the three independent encodings the prior
ADR §1 counted become two, and the split runs along the write/aggregate line by design rather than by
oversight.

That is bookkeeping against the prior ADR's list, **not** an app-wide count. App-wide, five sites still
encode the credit-card rule after this change: `resolveAccountAggregationSign`;
`resolvePrimaryBalanceDelta`; two inline checks in the same file this diff edits —
`computeLiabilitiesBreakdown`'s `type !== AccountType.CreditCard` filter and
`computeDashboardAccountCounts`'s `type === AccountType.CreditCard` bucket, which is a count
aggregation on exactly this rule; and `isCreditCardOnly` at
`src/modules/onboarding/domain/ready_summary_state.ts:57`, which classifies the whole active set on the
same rule to pick N4's accounts-pill glyph. The count is over sites that CLASSIFY accounts on the rule:
icon and label maps, the credit-card form fields, the transaction-shape picker filters and per-account
display colour are not on it. Adopting the resolver at the latter three is out of scope for #255
(spec §7) and owned by a separate ticket. A minus sign is still never derived at the display layer.

## 2. EGP base is a precondition, not a bug to fix

The P1 scope for #255 listed "fix the conversion direction, because `computeNetWorth` multiplies for
USD and never divides". **That item is withdrawn**, and this is where the withdrawal is argued so a
future reader does not re-derive it.

The dashboard has no base currency. `base_currency` is written at `onboarding.repository.ts:34` and
read only at `:51` and in the onboarding store; `computeNetWorth` takes no base parameter and names
every output field `*Egp`. EGP base is therefore an invariant of this function today, and under an EGP
base `exchange_rate` being EGP per USD makes the USD-multiply direction correct. A divide branch would
create a path no supported input reaches, and a `baseCurrency` parameter would promise support that
nothing upstream supplies.

The precondition is now written on the function instead of assumed. Supporting a USD base is audit
M28's work.

## 3. Chunk 1 keeps the return shape unchanged

The sign, rounding and archived work ships behind an identical five-field `NetWorthResult` and an
identical two-parameter signature, even though chunk 2 replaces both a PR later.

That is deliberate. It lets the four consuming surfaces stay untouched until the chunk that actually
redesigns them, and it keeps the risky half of the ticket, the arithmetic, in one PR a reviewer can
hold in their head.

Chunk 1 is *close to* pixel-free, and an earlier draft of this section claimed it was provably so.
That was wrong. Archived rows never reach the function today because `getAccounts` filters them at
SQL, and EGP renders at zero decimals, so 2 dp rounding is usually invisible. Three things break that,
and the third needs no exotic input at all:

1. A caller passes `getByIdsIncludingArchived` output, so the new archived filter has something to
   exclude.
2. EGP's configured decimals move off `0`.
3. **Rounding each converted balance before summing moves the rendered figure by one pound** whenever
   that rounding crosses a half-integer boundary. Every surface renders EGP at zero decimals and
   `Intl` rounds half-expand, so a raw `.4951` and a rounded `.50` are different integers on screen:

| USD balance | rate | raw product | `main` renders | this PR renders |
|---|---|---|---|---|
| 0.01 | 49.99 | 0.4999 | `0` | `1` |
| 10.01 | 49.50 | 495.495 | `495` | `496` |

The new number is the better one — rounded arithmetic is what this ADR exists to introduce. What was
false is the claim of invisibility, and that claim was the argument for chunk 1 skipping emulator
verification.

## 4. The refusal contract

A stored rate counts as usable only when `rate` is finite **and** `rate > 0` **and** the app can say
where the number came from. Provenance has two sufficient sources, and either alone opens the gate:
`rateUpdatedAt !== null`, the marker recording *when* a fetch or a manual save wrote the rate, or
`isManualOverride`, the flag recording *that* the user typed it. The predicate is stated once in the
accounts domain, so the dashboard and N4 cannot drift; the disjunction and the population it exists
for are argued below. Conversion is required only when at least one non-archived account is foreign.
Required and unusable is the refusal outcome, `{ kind: 'rate-needed', foreignCount }`, a union member
with no numeric field, so a formatter structurally cannot be handed a value that does not exist.

Whether the app can state an EGP total and whether it can state the `~USD` equivalent are two
questions with two answers. The EGP total needs a rate only when something is foreign. The `~USD` line
needs a usable rate always, because the conversion is the whole point of it — so on the amount path
`assetsUsd` and `netWorthUsd` are `undefined` exactly when the rate is unusable.

Until chunk 2, `hero_card.tsx:164` keyed that line on `rate > 0`, and `INITIAL_STATE.rate` is `50`,
so every user who had never fetched a rate read a confident `~ N USD` computed from the placeholder.
`hero_card.tsx:224-226` now keys it on the field being absent
(`netWorth.kind === 'amount' && netWorth.assetsUsd !== undefined`), which `rate > 0` could never
express, and `net_worth_breakdown_sheet.tsx:163-165` re-keyed the same way.

The hero does not open the breakdown sheet at all on that outcome: `hero_card.tsx` hands `HeroShell`
no `onPress` when `netWorth.kind === 'rate-needed'`, so the card loses its button role with its press
handler. A sheet that cannot honestly show a breakdown should not open. Rendering only the sheet's
EGP-only rows was the alternative considered and rejected — a refusal fires only when at least one
non-archived account is foreign, so those rows would be a partial total over an incomplete account
set, which spec §7 prohibits by name.

The breakdown sheet still renders the refusal **only** on that outcome and does not render its body.
With the sheet unreachable that suppression is a second guard rather than the primary one, and it
stays: the sheet's `netWorth` prop is public and nothing in its own file makes the state impossible.
`computeLiquidityBreakdown` and `computeLiabilitiesBreakdown` still carry the same PROVENANCE defect
`computeNetWorth` had; left rendering, the sheet would refuse its headline and then print
`100 × 50 = 5000 EGP` underneath it. Suppressing the body closes that incoherence without touching
either helper. Their PROVENANCE gating is #259's, whose scope is widened to cover it.

Their ROUNDING is no longer deferred. Chunk 1 rounds each converted balance in both helpers, on
`computeNetWorth`'s per-value contract, because the exception-3 band above lands inside a single
render: at 9.51 USD and rate 40.01 the sheet showed section header 381, the card's own row 380 and the
total-debt footer 380 for one account. This diff introduced that disagreement, so this diff closes it
(spec §3b, amended and user-approved at P8). Rounding only — nothing else about either helper moves.

**A permanently-refused population exists, and this diff reaches it by widening the gate rather than
by migrating data.** An earlier draft of this section said the opposite — that all four `usd_rate*`
keys arrived in one commit, that "manual override without a marker" was unreachable, and that
`2026-08-18-starting-net-position.md` §3 was superseded. Every part of that was wrong. It rested on
`git log -S` run inside a **shallow clone**, which reports the shallow boundary as the origin of
everything older than it; section 7 records the trap. §3 of the prior ADR stands, is not superseded,
and is not edited from here.

The window is real and it is narrow:

- `currency.store.ts` shipped in **#23** (2026-05-01) writing `usd_rate`, `usd_rate_fetched_at` and
  `usd_rate_manual_override`. There was no `usd_rate_updated_at` key at all.
- The marker first appears in **#85** (2026-05-19), with no backfill.

For those 18 days, using the manual-rate feature exactly as designed durably wrote
`usd_rate_manual_override = 'true'` beside a rate and no marker. (The prior ADR dates the marker's
arrival to #165 rather than #85. The two numbers disagree; the population is the same under either,
and this repository cannot settle the question — again, section 7.)

That population splits, and only one half repairs itself:

- **Fetched, no marker.** `isManualOverride` is false, so `shouldRefreshRate` returns true on a stale
  or absent `lastFetched` and the next online app-open writes the marker. Refused for one launch.
- **Manual, no marker.** `shouldRefreshRate` returns `false` on its **first line** for an override, so
  no background fetch ever runs and nothing writes the marker. Under the narrow gate this user's
  dashboard refused **permanently**, while Settings showed them their own rate in the manual field
  with the override badge lit. `__tests__/currency.store.test.ts`'s `does not fetch a manual override`
  had that mechanism recorded and green the whole time.

**The remedy is to read the provenance already stored, not to invent the provenance that is missing.**
The marker records *when* a rate was verified; the override flag records *that* the user set it.
Either is evidence the number is not the placeholder, so `isRateUsable` accepts either. A backfill
migration would have to stamp a verification time onto a rate whose real one is genuinely unknown —
the substitution `2026-08-18-starting-net-position.md` §2 forbids by name — and would rewrite user
data to work around a predicate. No migration is written, and the prior ADR's "the remedy is a
backfill migration, filed separately" is answered by this diff instead.

**The widening does not loosen the gate against what it exists to stop.** `INITIAL_STATE` is
`rate: 50, rate_updated_at: null, isManualOverride: false`, so the unverified placeholder is refused
by the widened predicate exactly as it was by the narrow one, and an override carrying `0`, `NaN` or
`Infinity` is still refused on the number. Nor can the flag outlive its rate: `loadRate` publishes
`isManualOverride` as `rate !== undefined && manualStr === 'true'`, so an install whose `usd_rate` row
fails to parse falls back to the placeholder with the flag OFF. The single input this admits that the
marker would not is a user who typed `50` themselves — their number, deliberately entered, and
indistinguishable from the placeholder by value alone. Both directions are measured rather than
asserted, by mutating the predicate and recording what dies:

| Mutation | Assertions that fail |
|---|---|
| Narrow it back to `rateUpdatedAt !== null && …` | 5 — the gate's override row, `computeNetWorth`'s and `resolveStartingNetPosition`'s "states the total", the store-hydration row, and `useDashboard`'s. Nothing else in 2706 moves. |
| Drop provenance entirely, `Number.isFinite(rate) && rate > 0` | 17 — every refusal row in both resolver tables, N4's pill and frame rows, the hook's two provenance tests, and the fresh-install row that hydrates the real store. |

The second row is the one that matters for the fear this widening raises. `INITIAL_STATE` is not
copied into a fixture to prove it: `__tests__/currency.store.test.ts` builds the real store over an
empty repository and asks the real predicate, before and after `loadRate`.

`isRateUsable` now takes one `RateProvenance` object rather than two positional arguments, and both
`NetWorthInput` and `StartingNetPositionInput` **extend** that interface. That is not cosmetic: it is
what made every caller a compile error rather than a silent `false`, which is exactly how a
provenance source reaches one resolver and not the other. `dashboard.hook.ts` and N4's `ready.hook.ts`
each select the flag from the currency store alongside the marker.

This ticket's guarantee was scoped to `computeNetWorth`'s consumers, and the two sites that kept
"the dashboard never shows an unverified-rate number" false were fenced to #257: `account_card.tsx`
converted a USD balance at the raw rate, and `hero_card.tsx` printed the rate itself one line under
the refusal. **The user lifted that fence at P8 cycle 2 ("fix all to the end"), and both are closed
here**, because each contradicted a refusal rendered on the same screen — `$100` as `5,000 EGP`
beneath "Exchange rate needed" on the accounts tab, and `1 USD = 50.00 EGP` beneath it on the hero.

Provenance is decided once, in `dashboard.hook.ts`, by the same `isRateUsable` call that feeds
`computeNetWorth`, and passed down to the account cards as a boolean. It is never re-derived at a
display layer as `rate > 0`: `INITIAL_STATE.rate` is 50, so that check calls the placeholder usable.
Only the converted "In EGP" row is gated; the native-currency rows need no rate. #257's remaining
concerns at that line are untouched, as are `computeLiquidityBreakdown` and
`computeLiabilitiesBreakdown` (#259).

### What chunk 2 settled that the above does not already say

**`countForeignAccounts` moved into the accounts domain, and is NOT re-exported from onboarding.**
The gate needs a foreign count, so `computeNetWorth` consumes it, and re-exporting it from
`starting_net_position.ts` would let the dashboard reach it *through* the onboarding domain — the one
direction the hoist exists to forbid, for exactly the reason that file's own comment already gives
about the sign resolver. Its two onboarding importers were repointed at the accounts path instead. It
cannot call `selectActiveAccounts`, which stays in onboarding and has no dashboard consumer, so it
filters `is_archived` inline; behaviour is identical and the archived case is its regression signal.

That argument is about DIRECTION and settles nothing about the barrel: every one of these imports
reaches `domain/` past `src/modules/accounts/index.ts:1`, which declares the module's public API to be
"store, UI components, shared types only", and this diff takes that bypass from 2 deep imports to 8.
Widening the barrel is audit M2's work (effort L, unscheduled) — no import here changes for it.

**The supported-currency vocabulary is a single encoding too, and it is own-property only.**
`assertSupportedCurrency`, its `CURRENCY_LOOKUP` and their 11-line comment were byte-identical in
`account_aggregation.ts` and `starting_net_position.ts`, differing only in the thrown class. The
lookup and the membership test now live once as `isSupportedCurrency`; each domain keeps its own
two-line throw, because spec §6 requires the thrown TYPE to name its domain and four test files
assert `StartingNetPositionError` by name. The test is `Object.hasOwn`, not an index read: the old
`CURRENCY_LOOKUP[currency] !== undefined` resolved through the prototype chain, so `constructor`,
`toString` and every other `Object.prototype` member answered "supported" and was summed as base
currency. Unreachable behind migration 001's `CHECK(currency IN ('EGP','USD'))`, and one word to
close.

**`isRateUsable` is the single encoding of the gate, adopted at both call sites in the same chunk.**
Shipping a shared predicate and leaving N4's inline copy beside it would reproduce, for the rate,
precisely the defect this ticket removes for the sign — so the swap at `resolveStartingNetPosition`
is part of the same diff rather than a follow-up. The gate now cannot drift the way the sign rule did.

**An archived USD wallet must not force a refusal on a portfolio with nothing left to convert.**
`computeNetWorth` drops archived rows before the foreign count as well as before the arithmetic — but
the ORDER is not what defends that, and an earlier draft of this section claimed it was.
`countForeignAccounts` filters `is_archived` itself (`account_aggregation.ts:123-125`), so handing it
the unfiltered array returns the identical count and every row stays green. The two filters are
defence in depth, and `resolveStartingNetPosition` composes exactly the same pair
(`starting_net_position.ts:120-125`); neither is redundant to delete.

The regression signal for the inline filter is `__tests__/accounts/account_aggregation.test.ts`'s
"never counts an archived account", and it is the only one: deleting that predicate alone leaves the
entire dashboard table green. `computeNetWorth`'s own filter has two signals, both in
`dashboard_helpers.test.ts` — the archived-credit-card row, whose 50000 flips the total, and the
archived-USD-wallet row, which is redundant with it rather than near-vacuous. Deleting
`dashboard.helpers.ts:63` alone puts the wallet into the arithmetic at `1000 + roundMoney(500 * 50)`,
so that row reports `assetsEgp` and `netWorthEgp` of 26000 against 1000 expected. Its `kind` stays
`amount` — flipping it to `rate-needed` is what would need both filters gone — but the whole-object
`toStrictEqual` has already failed on the value.

## 5. The reversed contract

`__tests__/screens/dashboard/dashboard_helpers.test.ts` asserted
`returns netWorthUsd=0 when rate=0 to avoid division by zero` (line 103 before #255). That is a
recorded contract, and reversing it is what makes this ADR mandatory rather than optional.

What replaces it is not a refusal. The fixture is a single **EGP** bank account at `rate = 0`, so
nothing needs converting and the outcome stays an amount — `assetsEgp: 5000`, `netWorthEgp: 5000` —
whose `assetsUsd` and `netWorthUsd` are `undefined` because the rate is unusable. Spec §3 row 5's
refusal needs a foreign account this fixture does not have. What the test actually guarded, the
`rate > 0 ? value / rate : 0` fallback, is gone.

Chunk 1 carries the test forward unchanged with a comment saying so. Chunk 2 deletes it and leaves
that comment in its place. It is not deleted silently to go green.

## 6. Two fixtures the arithmetic needs, and why

Both were measured against the shipped `roundMoney` rather than asserted from memory.

- **Round-then-sum.** Two USD wallets of `0.502` at rate `2` convert to `1.004` each, which is `2.00`
  round-then-sum and `2.01` sum-then-round. Delete the per-value `roundMoney` and exactly that row
  goes red. The prior ADR §4 records that the scope spec's nominated `0.005` fixture does **not**
  separate the two orders.
- **Negative zero, at two sites.** `0.30 − 0.10 − 0.20` summed in array order is
  `-2.7755575615628914e-17`, whose `roundMoney` is `-0`. `netWorthUsd` divides that **raw**
  accumulator, before rounding and before normalisation, giving `-5.551115123125783e-19` — also `-0`.
  Divide the already-normalised `netWorthEgp` instead and the `netWorthUsd` assertion yields `+0` and
  can never fail. Each `-0` site needs its own fixture, per the prior ADR §4, and array order is part
  of the contract: a body that grouped or sorted rows first, or that derived `netWorthEgp` as
  `assetsEgp − liabilitiesEgp`, would make both rows tautologies.

## 7. This repository is a shallow clone, and `git log` lies past its boundary

The verification environment for this ticket is a shallow clone.
`git rev-parse --is-shallow-repository` returns `true`, `.git/shallow` contains the single commit
`3e5c9fb`, and `git log --oneline | wc -l` counts 66 on this branch. Everything before that boundary
is absent, not merely unlisted.

`git log -S`, `git log --follow` and `git log -- <path>` do not report that. They terminate at the
boundary and attribute what they cannot see to the boundary commit — so **every** `usd_rate*` key
looks introduced by `3e5c9fb`, and `currency.store.ts` looks created by it. Both are false, and both
were stated as findings in a review of this diff, which then closed a real user-data defect as
unreachable on that basis.

Rules that follow, for anyone verifying here:

- A history claim is not evidence in this environment. `git fetch --unshallow` first, or answer from
  artifacts that live in the tree — migrations, ADRs, tests, PR numbers in commit messages.
- "No commit introduced X before Y" and "no user can have this data" are the two conclusions this
  trap produces, and they are the two that damage users when wrong. Neither may rest on a log read
  here.
