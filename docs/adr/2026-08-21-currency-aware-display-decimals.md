# ADR — currency-aware display decimals, the signed-zero display guard, and two rate constants

- **Date:** 2026-08-21
- **Status:** accepted
- **Ticket:** MA-016 (issue #270), first execution of backlog Item 4 (consolidate money
  formatting, M1 + M24)
- **Applies to:** `src/utils/format_amount.ts` (chunk A); the 24 call sites chunk A unblocks
  (chunks B, C, D) and `src/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx`
  (chunk D)

## 1. The accepted arithmetic approximation

Moving eleven at-rest amount sites onto `CURRENCY_CONFIG`'s EGP-0dp default makes numbers that are
on screen **together** stop summing to the number displayed for their total, on two surfaces.
Measured, not argued:

**Transactions totals strip + dashboard transactions card.** `netEgp` is derived in JS
(`income − expense`) and all three render side by side.

```
income 1000.40, expense 300.90, net 699.50
today : +1,000.4 / -300.9 / +699.5     arithmetic visibly checks out
after : +1,000   / -301   / +700       1,000 - 301 = 699, but net renders 700
```

**Commitments list — header total above its own rows** (`SectionList`'s `ListHeaderComponent`, so
both are on screen at once).

```
three commitments at 249.50 each
today : rows 249.5 / 249.5 / 249.5  total 748.5    sums
after : rows 250   / 250   / 250    total 749      3 x 250 = 750, total shows 749
```

**This is accepted, not fixed.** `.claude/rules/review.md` item 3 already rules a sub-pound gap
between two display paths as rounding order, not drift, when the underlying data is exact at 2dp
and only the render approximates. It is also not a new class of defect this ticket introduces —
`stat_cards.tsx:336/362/380` renders a JS-accumulated `netWorthEgp` at 0dp EGP on one card on
`main` today, with the identical shape.

Two alternatives were considered and rejected:

- **(b) Round rows and header independently at their own precision.** Ships `250 / 250 / 250`
  above `748.5` — rows and header in different files, disagreeing more visibly than rows and
  header both showing `749`.
- **(c) Derive the displayed total from the displayed parts** (sum the rounded rows and print
  that). This is display-layer recomputation of a value the domain already owns — exactly what
  `review.md` item 3's opening sentence forbids — and it needs a bare-literal override to do it,
  which `review.md:13` also forbids.

Adopting `CURRENCY_CONFIG`'s default and accepting the gap is the smallest change that keeps one
number's derivation in one place.

## 2. The `-0` display guard — two populations, one rule

Routing signed amounts through `CURRENCY_CONFIG`'s decimals newly manifests `Intl`'s `-0` /
`-0.00` rendering on more surfaces than before. There are two populations, and only one belongs to
this layer:

| population | example | who owns it | what the display layer does |
|---|---|---|---|
| **Exact `-0` reaching a formatter** | `roundMoney(-0.001)` → `-0` | `normalizeNegativeZero`, applied as the last domain op | **nothing** — it is a *domain defect* when it happens, and hiding it deletes the only evidence |
| **A nonzero negative that rounds to zero at display precision** | `-0.4` @0dp, `-0.004` @2dp | nobody — new in MA-016 | **strips the sign** — no domain function can touch these; the value is genuinely nonzero and must stay nonzero for sums and sign colours downstream |

**The rule, verbatim:** *the display layer will not invent a sign the precision cannot support,
and will not repair a sign the domain produced. An exact `-0` at a formatter stays visible,
because it is somebody else's bug.*

What the guard strips, measured against the live formatter:

| input | decimals | formatted today | after the guard |
|---|---|---|---|
| `-0.4` | 0 | `-0` | `0` |
| `-0.001` | 0 | `-0` | `0` |
| `-0.004` | 2 | `-0.00` | `0.00` |
| `-0.001` | 2 | `-0.00` | `0.00` |
| `-1e-7` | 3 | `-0.000` | `0.000` |

What it must NOT do — case 1, the deliberate pass-through:

| input | decimals | must stay |
|---|---|---|
| `-0` | 0 | `-0` |
| `-0` | 2 | `-0.00` |

What it must NOT do — case 2, genuinely negative values whose magnitude rounds to non-zero, all
surviving byte-identical:

| input | decimals | must stay |
|---|---|---|
| `-0.4` | 2 | `-0.40` |
| `-0.01` | 2 | `-0.01` |
| `-0.005` | 2 | `-0.01` |
| `-0.5` | 0 | `-1` (half-expand) |
| `-0.9` | 0 | `-1` |
| `-0.001` | 3 | `-0.001` |
| `-1234.5` | 2 | `-1,234.50` |
| `-1` | 0 | `-1` |

**Division of labour is explicit and neither half is redundant.** `normalizeNegativeZero`
(`src/modules/accounts/domain/account_aggregation.ts`) runs at the numeric layer, before
comparisons, and owns exact `-0`. The signed-zero guard in `formatAmount` runs at the format
layer, before pixels, and owns a nonzero value that rounds to zero at display precision. Deleting
either is a defect. **Widening the format-layer guard to also catch exact `-0` is also a
defect** — it launders a domain bug that should be visible, and it blinds the three tests that
exist to catch that exact regression:

- `__tests__/starting_net_position.test.ts:285`
- `__tests__/approximation_pill.test.ts:184`
- `__tests__/screens/dashboard/dashboard_helpers.test.ts:498`

Each asserts that a raw `-0` reaching a formatter still renders with its sign, sitting under an
"and therefore renders X, which is what the user sees" assertion, sitting under an
`Object.is(domainValue, 0)` row. A guard that fires on every signed-zero string turns all three
red and makes the assertions above them vacuous — passing whether or not the domain still
normalises. The narrowed guard preserves the whole chain with zero edits to any of the three.

## 3. Two decimals constants, allowed to diverge

- **`EXCHANGE_RATE_DECIMALS`** (`src/utils/format_amount.ts`) owns rate precision for
  `formatExchangeRate` and for every rate site that keeps its own surrounding string:
  `transaction_row.helpers.ts:135`, `detail.helpers.ts:152`, `currency/index.tsx:38`. It also
  backs `hero_card.tsx:249`, the one rate site that adopts `formatExchangeRate` wholesale.
- **`RATE_PREVIEW_AMOUNT_DECIMALS`**, declared locally in `exchange_rate_row.tsx` beside
  `STALE_THRESHOLD_DAYS`, owns one pre-confirmation **EGP amount** — the live preview of
  `roundMoney(amount * rate)` a user is actively verifying while typing a rate. It is not a rate.

Both are `2` today, and that agreement is coincidence, not a shared contract. A rate is an
EGP-per-USD ratio; the preview is a stored-currency amount someone reads mid-entry, and its
final decimal count is @marcus's call, out of scope for this ticket (`spec.md` §2, §4.2).
Declaring it locally rather than importing `EXCHANGE_RATE_DECIMALS` means that later ruling moves
one number, not every rate display in the app — following the precedent `review.md:13` names by
example, `N4_HERO_AMOUNT_DECIMALS` living beside its own surface
(`src/modules/onboarding/screens/onboarding/ready/ready.geometry.ts:261`), not in `format_amount.ts`.
This satisfies `review.md:13`'s requirement that a `decimals` override be a named constant
recorded in an ADR — the obligation `exchange_rate_row.tsx`'s prior bare literal never discharged.

## 4. What MA-016 does not close

- **Excludes M24 (#274)** — `formatAmount`'s per-call `Intl.NumberFormat` allocation
  ("module-hoisted instances"), a different change to a different problem.
- **Does not close M22.** Four live `formatAmount`-at-0dp-on-USD sites remain outside this ticket
  and outside its guard: `stat_cards.tsx:249`, `account_card.tsx:107/149/154/178/183/296`,
  `balance_hero.tsx:64` (#277).
- **The in/out line is: files this ticket already opens.** `hero_card.tsx:225` is in because
  chunk D opens that file anyway; the four sites above are out because nothing else in this
  ticket touches those files.

Do not amend `docs/adr/2026-08-18-starting-net-position.md` §6 from here — it is stale for a
separate reason (#276), not this ticket's.
