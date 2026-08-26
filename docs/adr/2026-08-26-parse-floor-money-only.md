# ADR — the parse floor is money-only; the resolvers bound their outputs

- **Date:** 2026-08-26
- **Status:** accepted (P1 gate, W2E)
- **Ticket:** W2E (issues #305, #307, #301)
- **Applies to:** `src/modules/transactions/domain/transaction_amounts.ts`,
  `src/utils/parse_decimal.ts`, `src/modules/accounts/utils/add_account.schema.ts`,
  `src/modules/transactions/screens/transactions/filter/filter.helpers.ts`,
  `src/modules/transactions/database/transactions.ts`,
  `src/modules/accounts/components/account_form/account_form.helpers.ts`

## Decision

1. `MIN_MONEY_AMOUNT` bounds **money text only**. `parseNonNegativeDecimal`/`parsePositiveDecimal`
   are money parsers; every non-money value (exchange rate, APR, day-of-month, filter bound, search
   text) parses through `parseDecimalText` (or `parseRateText`) plus a site-correct bound.
   `docs/adr/2026-08-22-money-rounding-layer.md` §5 named this leak as #305; this record closes it,
   and §5 is amended in the same commit — its five-field enumeration is now three, and its
   `apr: '0.005'` rejection claim no longer holds.
2. **Exchange rate** (EGP per USD) is valid iff finite and `> 0`. No parse-layer magnitude bound on
   the write path — magnitude safety there is the resolvers' job (3). This does not extend to every
   consumer of the stored rate: `computeNetWorth`
   (`src/modules/dashboard/screens/dashboard/dashboard.helpers.ts`) divides by the same stored rate
   with no bound of its own, unchanged by this diff and unbounded on `main` before it too — tracked
   on #257, not fixed here (Layla's P1 ruling refused a display-layer `RATE_MIN`).
3. **The resolvers bound their outputs.** `resolveTransactionAmounts` and
   `resolveCommitmentPaymentAmounts` throw `TransactionAmountError` when any computed, rounded leg
   is non-finite or exceeds `Number.MAX_SAFE_INTEGER`. Invariant, scoped to these two resolvers: no
   leg they compute reaches a caller non-finite or above `Number.MAX_SAFE_INTEGER`. Upper-bound
   precedent: `budget_month_profiles.ts`'s income guard. This does not extend to every write path:
   `account_form.helpers.ts:85`'s `requiredAmount` → `accounts.ts:87,:97-98` binds `opening_balance`/
   `current_balance` via `runAsync` with no magnitude bound of its own (`REAL NOT NULL DEFAULT 0`,
   no `CHECK` — `001_create_accounts.ts:10-11`), unchanged by this diff and unbounded on `main`
   before it too — not fixed here.
4. **APR** is a percentage in `[0, 100]` with a stated precision of 2 dp, quantized half-even.
   Quantization under a stated precision is not a silent bump; the floor's reject-don't-round rule
   applies to money amounts, not percentages.

## Why

MA-018 put the money floor inside the shared parsers, making "below the money floor" and "not a
number" indistinguishable for five value classes that are not money (#305). Removing the floor from
rate parsing reopens the path from a tiny typed rate to an absurd computed amount on the **write
path** (`egp / rate` inside the resolvers); the output guard closes that path at the layer that owns
amount validity there, and also closes the pre-existing hole where a huge typed amount was never
output-checked. It does not close the same path on the **display** side: any direct consumer of the
stored rate — `computeNetWorth` is the one identified — carries no magnitude bound, and carried none
before this diff either.

## Consequences

- A rate the field accepts can still fail at save time — by design; the error names the conversion,
  not the field.
- `parsePositiveDecimal`'s floor is now load-bearing *only* for money text; new non-money numeric
  fields must start from `parseDecimalText`.
- The six `assertStorable` call sites in `transaction_amounts.ts` are hand-maintained, one per
  computed leg — a seventh leg added to either resolver compiles unguarded unless someone adds the
  call.
