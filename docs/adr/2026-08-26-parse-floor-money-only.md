# The parse floor is money-only; the resolvers bound their outputs

Date: 2026-08-26 · Status: accepted (P1 gate, W2E) · Supersedes nothing; composes with 2026-08-22-money-rounding-layer §5.

## Decision

1. `MIN_MONEY_AMOUNT` bounds **money text only**. `parseNonNegativeDecimal`/`parsePositiveDecimal` are money parsers; every non-money value (exchange rate, APR, day-of-month, filter bound, search text) parses through `parseDecimalText` (or `parseRateText`) plus a site-correct bound. The 2026-08-22 ADR §5 named this leak as #305; this record closes it.
2. **Exchange rate** (EGP per USD) is valid iff finite and `> 0`. No parse-layer magnitude bound — magnitude safety is the resolvers' job (3).
3. **The resolvers bound their outputs.** `resolveTransactionAmounts` and `resolveCommitmentPaymentAmounts` throw `TransactionAmountError` when any computed, rounded leg is non-finite or exceeds `Number.MAX_SAFE_INTEGER`. Invariant: no computed money value above `MAX_SAFE_INTEGER` or non-finite ever reaches a `db.runAsync` bind. Upper-bound precedent: `budget_month_profiles.ts` income guard.
4. **APR** is a percentage in `[0, 100]` with a stated precision of 2 dp, quantized half-even. Quantization under a stated precision is not a silent bump; the floor's reject-don't-round rule applies to money amounts, not percentages.

## Why

MA-018 put the money floor inside the shared parsers, making "below the money floor" and "not a number" indistinguishable for four value classes that are not money (#305). Removing the floor from rate parsing reopens the path from a tiny typed rate to an absurd computed amount (`egp / rate`); the output guard closes that path at the layer that owns amount validity, and also closes the pre-existing hole where a huge typed amount was never output-checked.

## Consequences

- A rate the field accepts can still fail at save time — by design; the error names the conversion, not the field.
- `parsePositiveDecimal`'s floor is now load-bearing *only* for money text; new non-money numeric fields must start from `parseDecimalText`.
