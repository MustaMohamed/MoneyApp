# ADR: the accounts list caption is a selection over the dashboard card's rows

- **Date:** 2026-09-07
- **Status:** accepted
- **Ticket:** MA-024 (#398), under MA-015 (#381)
- **Applies to:** `src/modules/accounts/screens/accounts/list/accounts_list.helpers.ts`, `src/modules/accounts/screens/accounts/list/accounts_list.hook.ts`, and `buildInfoRows` in `src/modules/dashboard/screens/dashboard/components/account_card.tsx`

The accounts list row now carries a live figure line under the name, one per account type. The figures are the dashboard card's, read from the card's own rows. The accounts module computes, converts, rounds and formats no amount.

## 1. The caption is a selection, not a second computation

`buildInfoRows(account, rate, stats, isRateUsable, baseCurrency)` stays the only place a caption figure is computed or formatted. Every row it returns now carries a `kind` (`limit`, `available`, `monthIn`, `inBase`, …) and an `amountText`, which is `value` without the currency code. `resolveAccountCaption` indexes the rows by `kind`, reads `amountText ?? value`, and joins the text into one of the five templates in `constants/strings.ts`. It calls no formatter for an amount, and the card and the list are therefore byte-equal on the same account.

The alternative the ticket sketched, giving each row an `amount: number` and reformatting it in the list with `formatCurrencyParts`, is refused. Two rows would drift under it. The savings change row (`account_card.tsx`, `signedStatParts`) and the base-equivalent row (`formatOwnedAmountParts`) both go through `formatDisplayMagnitude`, which escalates a sub-unit EGP figure to 2dp: the card prints `0.40` where a plain `formatCurrencyParts` at EGP's 0dp prints `0`. Both also compose a zero-gated sign, which the list would have had to compose a second time. Reformatting a number is a second derivation path, which is the drift `.claude/rules/review.md` item 3 names.

`amountText` is built from the same `formatCurrencyParts` call as `value`, in `amountParts` and `signedStatParts`, so the two cannot diverge by editing one and not the other. `__tests__/screens/dashboard/account_card.helpers.test.ts` asserts `value === amountText + ' ' + code` over every row of all five types, both currencies and both bases.

## 2. The rate gate is `isRateUsable`, read once in the list hook

`accounts_list.hook.ts` reads `rate`, `isManualOverride` and `rate_updated_at` from `useCurrencyStore` and calls `isRateUsable` once, exactly as `dashboard.hook.ts:157` does. The store's placeholder rate is 50, so a bare `rate > 0` would accept a rate the user never set; nothing in the list re-derives provenance from the number.

`formatRateDisplayMagnitude` throws a `RangeError` on a non-positive rate. The helper reaches it only inside the smart-wallet branch, and only when `buildInfoRows` emitted an `inBase` row, which it emits only when `isRateUsable` is true. The gate that suppresses the conversion is therefore the same gate that protects the formatter.

## 3. A smart wallet without a usable equivalent takes the bank caption

A smart wallet in the base currency, or one whose rate is unusable, gets no `inBase` row and falls through to `Month in <amount> · out <amount>` — the Bank/SmartWallet default that `buildInfoRows` already returns for it. The screen never shows a caption with a missing figure, an "unavailable" placeholder, or a rate the user has not set.

## 4. The figures come from the dashboard's snapshot, not a loader of the list's own

`statsMap` is read as `useDashboardStore((s) => s.snapshot?.statsMap)`. The list adds no focus effect, no request and no staleness gate: the dashboard owns that snapshot and refreshes it on its own focus, and `invalidate()` on blur bumps the request generation without clearing `snapshot`, so the figures survive the trip into the list. An absent snapshot means zeros, which is `buildInfoRows`'s own `stats ?? { month_in: 0, … }` fallback and what the dashboard card shows in the same state. A second loader here would be the focus-reload churn class (`.claude/rules/review.md` item 2) with two owners of one snapshot.

## 5. The a11y label keeps the type

`resolveAccountRowA11yLabel` is untouched: the announced label is still name, type label, balance. The caption is visual only. A screen-reader user hearing "Month in 22,300, out 14,950" in place of "Bank" would lose the one word that says what the row is, and the figures are already on the account's detail screen.
