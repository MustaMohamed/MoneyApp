---
paths:
  - "src/modules/**/domain/**"
  - "src/utils/money.ts"
  - "src/utils/format_amount.ts"
---

# Money domain rules

**Load the `money-rules` skill before changing anything here** — it carries the two resolver contracts, conversion directions, and the sign conventions. This file is only the non-negotiables.

You are editing the code every money display in the app is supposed to derive from. Two functions own every amount derivation:

- `resolveTransactionAmounts` and `resolveCommitmentPaymentAmounts` (`src/modules/transactions/domain/transaction_amounts.ts`)
- `resolvePrimaryBalanceDelta` and the `AccountDelta` resolvers (`transaction_policy.ts`) own balance signs — credit cards are liabilities, so signs are account-type-dependent and never hand-written.

- **Changing a resolver changes every preview that calls it.** Before altering a signature or a rounding point, list every file that references them, from the repo root: `git grep -l 'resolveTransactionAmounts\|resolveCommitmentPaymentAmounts' -- src`. The iron rule elsewhere in the app — *displayed money comes from the same function that performs the write* — only holds if these stay the single derivation point.
- **Rate direction is not symmetric.** `exchange_rate` is EGP per USD: USD→EGP multiplies, EGP→USD divides. A flat `amount × rate` is correct in exactly one of the four currency pairs.
- **Validation is load-bearing, not defensive.** These functions throw on amount ≤ 0, missing destination, and missing/non-positive rate when USD is involved. Never soften a throw into a `?? 0` fallback — that puts `Infinity` on screen.
- **Round at this layer, once.** `roundMoney` (banker's, 2dp) applies to every persisted monetary field; never sum-then-round what was persisted round-then-summed.

Every change here needs a test with worked numbers for all four currency pairs, plus the throw cases — see the `moneyapp-testing` rules.
