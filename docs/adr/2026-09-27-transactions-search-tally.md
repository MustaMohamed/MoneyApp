# ADR: The search tally prints the month aggregate's match count and net

- **Date:** 2026-09-27
- **Status:** accepted
- **Ticket:** MA-121
- **Applies to:** `buildSearchTally` and `SearchTallyModel` in `src/modules/transactions/screens/transactions/transactions.helpers.ts`; `formatAppliedFilterSummary` in `src/modules/transactions/screens/transactions/filter/filter.helpers.ts`; `useTransactions` in `src/modules/transactions/screens/transactions/transactions.hook.ts`; `SearchTally` in `src/modules/transactions/screens/transactions/components/search_tally.tsx`

A line under the search field reads how many rows match the applied search and filters this month, their summed EGP net, and the applied-filter summary. It reads `<n> results in <Month>`, `1 result in <Month>` or `No results in <Month>`, with the net at the right edge. The copy is the canvas Copy note's, approved on the 2026-09-27 review.

## 1. The figures are the aggregate's, unchanged

The count is `matchCount` and the sum is `matchNetEgp` from `getMonthAggregate` (the 2026-09-24 transactions-month-aggregate ADR). The tally does no arithmetic of its own, so it follows the ledger rule the aggregate applies: transfers and card payments count 0 in the sum, and a card credit reduces Out. One EGP figure exists, so the tally has no USD sum.

## 2. The sum is a net, signed and coloured as the hero's Net

The sum goes through `formatDisplayMagnitude` at EGP's 0 dp, with `PLUS_SIGN` above 0, U+2212 `MINUS_SIGN` below 0 and no sign when the text prints as zero. Its colour follows the money-colour ADR's decision 5, the same as the hero's Net: success above 0, danger below, foreground at zero. The sign and polarity rule is one private function in `transactions.helpers.ts` that both `heroNet` and `buildSearchTally` call. At 0 matches the line prints no sum and no currency code.

## 3. When the line is on

The line shows while a search, one applied account or a sheet filter is on. A search counts once it is debounced and trimmed, the same string the aggregate ran with, so whitespace alone leaves the line off. A type tab alone leaves the line off. With nothing on, the slot stays at its height with no text, so the list does not shift when the line appears. While the month's figures load for the first time, the slot shows one skeleton bar.

## 4. The summary leaves out a lone account

The hero title already carries one applied account's name, so the tally's summary omits it through `formatAppliedFilterSummary`'s `omitSingleAccount` option. Two or more accounts print by name, then categories and the amount range, as the sheet's summary does. The date header's context label keeps calling the function without the option and reads as before.

## 5. A failed load for another query reads the dash form

When the aggregate fails for the query on screen while the store still holds figures from an earlier query, the tally reads `— results in <Month>` with no sum, since printing the held figures would show another query's count. A failed refresh of the same query keeps its figures. While a new query's load is in flight the previous figures stay on the line; marking them as stale belongs to MA-107.
