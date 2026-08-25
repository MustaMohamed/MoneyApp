---
name: money-rules
description: Use when writing or reviewing any code that computes, converts, rounds, stores, or displays money in MoneyApp — transaction amounts, commitment payments, balances, budget math, currency previews, EGP/USD conversion, exchange rates, or Intl formatting.
---

# MoneyApp Money Rules

## Overview

EGP is the ledger base currency; USD is the only foreign currency; `exchange_rate` means **EGP per USD**. Two domain functions own every amount derivation, and one rounding function owns precision. Display code never re-derives what a domain function already computes.

## The iron rule: derive display from the write path

**Any money the user sees before confirming must come from the same domain function that will perform the write.** The audit found three independent preview bugs (H6, M18, M19 — up to 50x overstated confirmations) and every one was an inline `amount * rate` re-computation drifting from the domain function.

```tsx
// ❌ WRONG — inline math, wrong currency direction, wrong label (audit H6)
const convertedTotal = amountWatch * state.exchangeRateValue;
// … rendered as `${numberFmt.format(convertedTotal)} ${selectedAccount.currency}`

// ✅ RIGHT — the preview IS the write path's output
const { accountNativeAmount, accountCurrency } = resolveCommitmentPaymentAmounts({
  amount: amountWatch,
  commitmentCurrency: commitment.currency,
  accountCurrency: selectedAccount.currency,
  exchangeRate: state.exchangeRateValue,
});
// render: formatCurrencyAmount(accountNativeAmount, accountCurrency)
```

## The two domain functions (`src/modules/transactions/domain/transaction_amounts.ts`)

| Function | Input | Output | Throws |
|---|---|---|---|
| `resolveTransactionAmounts` | type, amount (source currency), sourceCurrency, destinationCurrency?, exchangeRate? | `{ egpAmount, toAmount, exchangeRate }` | `TransactionAmountError` on amount ≤ 0, missing destination for Transfer/CCPayment, missing/non-positive rate when USD involved |
| `resolveCommitmentPaymentAmounts` | amount (commitment currency), commitmentCurrency, accountCurrency, exchangeRate? | `{ accountNativeAmount, accountCurrency, egpAmount, exchangeRate }` | same validation |

Conversion directions (rate = EGP per USD): USD → EGP is `amount * rate`; EGP → USD is `amount / rate`. `egpAmount` is always the persisted ledger value; `toAmount`/`accountNativeAmount` is what actually moves on the destination/paying account.

## Rounding — `roundMoney` (`src/utils/money.ts`)

Banker's rounding (round-half-even) to 2 dp. Apply to **every persisted monetary field** and the live EGP preview. Round at the domain-function layer, not in the UI, and never sum-then-round what was persisted round-then-summed (the domain functions already do this correctly — another reason not to bypass them).

## Formatting — `src/utils/format_amount.ts`

All eight exports, as of this commit:

| Export | What it is |
|---|---|
| `formatAmount(value, decimals = 0)` | grouped magnitude, no currency code; strips a signed zero that a nonzero value rounded into |
| `formatCurrencyAmount(value, currency, decimals?)` | `formatAmount` + the currency code; decimals default to `CURRENCY_CONFIG[currency].decimals`. Defined as the join of `formatCurrencyParts` |
| `formatCurrencyParts(value, currency, decimals?)` | `{ value, code }` — the same decimals rule as `formatCurrencyAmount`, for the two-node splits where the code renders in its own `<Text>` |
| `formatCurrencyTotals(totals: Map<Currency, number>)` | one `formatCurrencyAmount` join per currency present, `'X  ·  Y'`; the em-dash placeholder for an empty map |
| `formatDisplayMagnitude(value, currency)` | `{ text, printsAsZero }` — absolute magnitude for composed-sign sites, escalating to 2 dp when currency precision would print a real value as `0` |
| `formatExchangeRate(rate)` | `48.60 EGP/USD`; owns rate precision — `.claude/rules/ui.md` names it canonical for rates |
| `formatExchangeRateSentence(rate)` | `1 USD = 48.60 EGP`; the labelled-row long form beside a rate chip's compact `formatExchangeRate` |
| `EXCHANGE_RATE_DECIMALS` | the 2 dp that `formatExchangeRate` and `formatExchangeRateSentence` apply |

Decimals for an amount come from `CURRENCY_CONFIG` (`src/constants/currency.ts` — EGP 0, USD 2; plain `formatAmount` defaults to 0 dp and truncates cents if you skip `formatCurrencyAmount` — audit M22). A screen may override only by passing a **named constant** to a formatter's own `decimals` parameter — never a bare literal — recorded in an ADR. Shipped precedent: `N4_HERO_AMOUNT_DECIMALS` (`src/modules/onboarding/screens/onboarding/ready/ready.geometry.ts`), approved at `docs/adr/2026-08-18-starting-net-position.md` §6. This must not contradict `.claude/rules/review.md` item 3, which is the authority on decimal counts.

Never construct `Intl.NumberFormat` outside `src/utils/format_amount.ts`, full stop — `npm run lint` rejects the constructor at **any** scope, not just top-level. Use a formatter from this file instead.

## Sign conventions

- Credit-card accounts are **liabilities**: they subtract from net worth (business rule 7); `revolving_balance` tracks carried debt, and CC transaction deltas flow through `resolvePrimaryBalanceDelta` in `transaction_policy.ts` — account-type-aware signs, never hand-signed.
- Balance changes go through resolved `AccountDelta`s (`resolveCreateDeltas` / `resolveUpdateDeltas` / `resolveDeleteDeltas`), which are invertible — never write `current_balance` arithmetic inline.

## Common mistakes

| Mistake | Reality |
|---|---|
| "It's just a preview label, inline math is fine" | Previews drift from writes — three audit findings, one 50x overstatement. Use the domain function. |
| Multiplying by rate for both directions | EGP → USD divides. Check which side is USD before touching the rate. |
| `formatAmount(usdValue)` | Renders 0 dp — cents silently vanish. Use `formatCurrencyAmount`. |
| Guarding division with `?? 0` | `x / 0` = Infinity reaching the UI. The domain functions validate rate > 0; keep that property. |
| Hand-signing a credit-card delta | Sign is account-type-dependent; `resolvePrimaryBalanceDelta` owns it. |
