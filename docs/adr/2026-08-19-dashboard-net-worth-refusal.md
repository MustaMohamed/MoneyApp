# ADR — the dashboard net worth: one sign, rounded arithmetic, and a refusal

- **Date:** 2026-08-19
- **Status:** accepted
- **Ticket:** MA-013 (issue #255), ruling #249
- **Applies to:** `computeNetWorth` in
  `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts` and
  `src/modules/accounts/domain/account_aggregation.ts`

`2026-08-18-starting-net-position.md` §5 listed four points on which the dashboard's
`computeNetWorth` diverged from N4's `resolveStartingNetPosition` and named #249 as the owner of
reconciling them. This is that reconciliation. It changes money-handling behaviour and reverses a
contract a test recorded, so the decisions are here rather than in a commit message.

The work ships in two chunks. Chunk 1 is the sign, the rounding and the archived filter, behind an
unchanged return shape. Chunk 2 is the refusal and the type change. Sections 1 to 3 and 5 are chunk 1;
section 4 is written against chunk 2 and marked as such.

## 1. Which of the four divergences this closes, and how

| §5 divergence | Closed by |
|---|---|
| Never rounds | Chunk 1. `round2( Σ sign × round2(converted) )`, in array order, per §4 of the prior ADR. |
| No archived filter | Chunk 1. `if (a.is_archived) continue;` before every other step, as a contract guarantee. |
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
oversight. A minus sign is still never derived at the display layer.

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

That is deliberate. It makes chunk 1 provably pixel-free — archived rows never reach the function
today because `getAccounts` filters them at SQL, and EGP renders at zero decimals, so 2 dp rounding is
invisible — which lets the four consuming surfaces stay untouched until the chunk that actually
redesigns them. It also keeps the risky half of the ticket, the arithmetic, in one PR a reviewer can
hold in their head.

The claim rests on those two facts rather than on the arithmetic being identical. If a caller ever
passes `getByIdsIncludingArchived` output, or EGP's configured decimals move off `0`, chunk 1 stops
being invisible.

## 4. The refusal contract (implemented by chunk 2)

A stored rate counts as usable only when `rateUpdatedAt !== null` **and** `rate` is finite **and**
`rate > 0` — character for character the gate N4 already applies, stated once in the accounts domain so
the two cannot drift. Conversion is required only when at least one non-archived account is foreign.
Required and unusable is the refusal outcome, `{ kind: 'rate-needed', foreignCount }`, a union member
with no numeric field, so a formatter structurally cannot be handed a value that does not exist.

Whether the app can state an EGP total and whether it can state the `~USD` equivalent are two
questions with two answers. The EGP total needs a rate only when something is foreign. The `~USD` line
needs a verified rate always, because the conversion is the whole point of it — so on the amount path
`assetsUsd` and `netWorthUsd` are `undefined` exactly when the rate is unusable. Today
`hero_card.tsx:164` keys that line on `rate > 0`, and `INITIAL_STATE.rate` is `50`, so every user who
has never fetched a rate reads a confident `~ N USD` computed from the placeholder.

The breakdown sheet renders the refusal **only** on that outcome and does not render its body.
`computeLiquidityBreakdown` and `computeLiabilitiesBreakdown` carry the same provenance and rounding
defects `computeNetWorth` had and are out of scope here; left rendering, the sheet would refuse its
headline and then print `100 × 50 = 5000 EGP` underneath it. Suppressing the body closes that
incoherence without touching either helper. Those two get their own ticket.

The pre-#165 install population that lands on a permanent false refusal is **accepted**, unchanged
from `2026-08-18-starting-net-position.md` §3. Those installs hydrate a real, user-entered rate
alongside a null marker and stay refused until the user re-saves a rate. **Do not loosen the gate to
make them show a number** — loosening it re-admits the unverified `50`, which is the entire thing the
gate exists to keep off the screen. The remedy is a backfill migration, filed separately.

This ticket's guarantee is scoped to `computeNetWorth`'s consumers. It is not "the dashboard never
shows an unverified-rate number", which stays false while #257 is open: `account_card.tsx:139`
converts a USD card balance at the raw rate and `hero_card.tsx:180` prints the rate itself.

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
