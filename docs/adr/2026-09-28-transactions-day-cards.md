# ADR: The day header prints the month aggregate's day net and count

- **Date:** 2026-09-28
- **Status:** accepted
- **Ticket:** MA-092
- **Applies to:** `groupTransactionsByDate` in `src/utils/group_transactions_by_date.ts`; `buildDaySections` and `composeDayHeaderAccessibilityLabel` in `src/modules/transactions/screens/transactions/transactions.helpers.ts`; `useTransactions` in `transactions.hook.ts`; `DayHeader` in `components/day_header.tsx`; `resolveDayHeaderGeometry` in `components/transactions_text.geometry.ts`

Each day in the transactions list opens under a header that reads the day, the day's net in EGP and a count pill. The header replaces `DateHeader` in this list; the commitments list keeps `DateHeader` unchanged.

## 1. The figures are the aggregate's day entry, never the loaded rows

A section's net and count are the `days` entry of the month aggregate (the 2026-09-24 transactions-month-aggregate ADR) whose `date` equals the section's key, the rows' `transaction_date`. No code sums the rows on screen, so a day whose rows straddle a page boundary reads its full net from the first page, and the ledger rule the aggregate applies holds: transfers and card payments count 0, a card credit reduces the net.

## 2. Another query's figures never print, and a missing day never reads 0

The header reads the figures only when the held aggregate's `queryKey` is the query on screen, the same gate `resolveSearchTallyFiguresMode` applies to the tally. While that load is pending every header reads the skeleton; after it failed, the dash. A day the held aggregate has no entry for reads the skeleton while a reload is due or running, and the dash after a failed load. It never reads `0 EGP` (user ruling, missing-day figures, 2026-09-28).

## 3. The net is signed, not coloured

The net goes through the same private `formatSignedNet` the hero's Net and the tally use: `formatDisplayMagnitude` at EGP's 0 dp, `PLUS_SIGN` above 0, U+2212 below 0, no sign when the text prints as zero. It draws in `text-content-secondary`; polarity reads from the sign alone, under the money-colour ADR's rule that colour is for actionable states. The day net is EGP only, since the aggregate sums `egp_amount`.

## 4. The failed header prints the dash alone

After a failed load the header prints `—` with no currency code and no count pill (user ruling, failed day header, 2026-09-28).

## 5. The label

Today and Yesterday read the word alone. Other days read `<Ddd> <d> <Mmm>`, and a day outside the current year carries the year, `<Ddd> <d> <Mmm> <yyyy>` (user ruling, day label, 2026-09-28). The stored strings are `Today` and `Yesterday`; the header's `uppercase` class draws the capitals. The weekday comes from `toLocaleDateString('en-US', { weekday: 'short' })`, the Hermes Intl dependency `fullMonthName` already has.

## 6. One accessibility item

The header root is `accessible` with one composed label, so a screen reader reads it as a single item: `Yesterday, minus 984 EGP, 3 transactions`, `Today, minus 85 EGP, 1 transaction`, `Yesterday, loading`, `Yesterday, total unavailable`. `composeDayHeaderAccessibilityLabel` builds it from the label and the unformatted figures; the sign is spoken as `minus` or `plus`, a net that prints as zero has no sign word, and no glyph reaches the label (user ruling, spoken day header, 2026-09-28).

## 7. The header scales its own text, uncapped

Every text takes `allowFontScaling={false}` and a size from `resolveDayHeaderGeometry(fontScale)`: `Type.caption` times the OS font scale with no cap, its `lineHeightFor` line box, a pill of that line box plus `Spacing.xxxs` above and below, and a fixed height of `Spacing.md` + the pill + `Spacing.xs` in all three modes. The fixed height keeps the pinned header from jumping when the figures land. The label takes the remaining width and ends in an ellipsis; the net and the pill never shrink.

## 8. Why not `SectionHeader`

The shared `SectionHeader` has no slot for a net, leaves scaling to the OS and has no opaque background, which a header pinned over scrolling rows needs.
