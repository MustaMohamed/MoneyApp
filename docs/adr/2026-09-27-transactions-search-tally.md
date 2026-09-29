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

The hero title carries one applied account's name through `scopedAccountLabel` in `useTransactions`. When `scopedAccountLabel` is set, the hook hands `formatAppliedFilterSummary` the filter with its account ids emptied, so the tally's summary prints the categories and the amount range alone. With two or more accounts `scopedAccountLabel` is unset, and the summary names them first, then the categories and the amount range, as the sheet's summary does. `formatAppliedFilterSummary` itself is unchanged, and the date header's context label reads as before.

## 5. Another query's figures never print

The store holds the last figures it loaded, tagged with their query key. The tally prints them only when that key is the query on screen, a rule `resolveSearchTallyFiguresMode` in `transactions.helpers.ts` decides from the totals status. While another query's load is pending the slot shows the skeleton, and when that load fails it reads `— results in <Month>` with no sum. A refresh of the same query, from a mutation, a focus reload or a pull, keeps its figures while it loads and after it fails. A first load and a first-load failure follow the hero's skeleton and dashes. Only the hero's skeleton disables the search field, so the field stays live while the tally shows its skeleton.

## 6. An amount bound prints the value the filter applies

The sheet accepts amount bounds with cents (`parseDecimalText`). A whole bound prints at `CURRENCY_CONFIG` decimals, EGP 0 and USD 2: `From 1,500 EGP`, `From 500.00 USD`. A bound with a fractional part prints at `MONEY_ROUNDING_DECIMALS`, the 2 dp `roundMoney` persists, so an Up to bound of 99.60 reads `Up to 99.60 EGP`, never `Up to 100 EGP` beside a 99.80 row the filter leaves out. `formatAmountSummary` picks one of the two named constants and passes it to `formatAmount`'s decimals parameter, as `.claude/rules/review.md` item 3 requires. The tally, the date header's context label and the filter sheet all print bounds through it. The sheet refuses a bound with more than 2 decimals (`validateAmountRange`), so a printed bound is always the applied one.

## 7. Text the app scales itself, and the hero's cap

RN sizes a TextView's own paint without the OS font scale unless `adjustsFontSizeToFit` is on (`ReactTextView.java:392-397`), while the text's spans take the OS scale (`TextAttributeProps.kt:162-171`). Android reserves a truncated line's `…` at the paint's size, so above font scale 1 an OS-scaled single line draws its ellipsis past its own box. The tally, the date header and the hero therefore render with `allowFontScaling={false}` at a size the app scales through `scaledFontSize` in `components/transactions_text.geometry.ts`, so paint and spans agree and the ellipsis stays whole. The pattern fixes the size half only: the paint's typeface stays Roboto, so an Inter `…` can still overrun the reserve Roboto's sets, MA-141 (#634).

The tally and the date header scale linearly with no cap. The tally's slot and skeleton bar take `lineHeightFor` of the tally's own scaled size, so box and text match by construction, as in the hero. `DateHeader` has a second consumer: the commitments tab's section headers (`src/modules/commitments/screens/commitments/index.tsx`) take the same app-side scaling, about 29.3 dp high at font scale 2.0 where the OS scale gave 26.3. The hero caps its scale at `TRANSACTIONS_HERO_MAX_FONT_SCALE`, which is `DISPLAY_HEADLINE_MAX_FONT_SCALE` (1.3). Its row heights and skeleton bars come from the same capped sizes, so each box equals its text to the dp, and at 1.3 the hero amount fits the 411 dp width. The cap is a named constant, the text-size counterpart of `.claude/rules/review.md` item 3's named decimals override. The hero's values keep `adjustsFontSizeToFit`, which sizes their paint through the OS scale; that only widens the ellipsis reserve, and the fit still shrinks a long value to its column.
