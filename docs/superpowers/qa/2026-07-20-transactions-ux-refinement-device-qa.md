# Transactions UX Refinement Device QA

Run this matrix on one Android device and one iOS device before merge. Repeat the layout checks with the smallest supported display and a large accessibility font setting where available.

## Ledger

- [ ] First load shows the summary and row skeletons in the same outer geometry as loaded content, with no vertical jump when data appears.
- [ ] Pull-to-refresh keeps the current rows and summary visible, shows the native refresh indicator, and does not flash first-load skeletons.
- [ ] Switching month or transaction type never shows rows or totals owned by the previous query.
- [ ] Summary states are clear for no income, expenses within income, expenses above income, and credits exceeding expenses.
- [ ] The expense rail is capped inside the card and its overflow marker never changes card height.
- [ ] Long category/account names and large amounts remain inside fixed icon, content, and value columns.
- [ ] Notes wrap below the row without moving the amount column.
- [ ] USD rows show the original amount and EGP equivalent; transfers show both source and destination native amounts.
- [ ] Card credits use the blue Card credit identity rather than the green Income identity.
- [ ] Commitment-owned rows have no edit/delete swipe actions and open the owning commitment from detail.
- [ ] Pagination failure keeps loaded rows visible and exposes one retryable error without covering the global add button.

## Search And Filters

- [ ] Search finds note, category, budget, source account, destination account, transaction type, and exact formatted amount values.
- [ ] Monthly totals remain month-owned and do not change when search or filters change.
- [ ] Invalid, negative, malformed, and reversed amount ranges keep the typed text, show inline errors, and disable Apply.
- [ ] Reset is enabled only when a draft filter differs from the default state.
- [ ] The search field, clear control, filter button, and active-filter badge remain aligned at large font sizes.

## Add And Edit

- [ ] The date trigger stays compact when opened.
- [ ] On iOS, changing the date does not update the form until Done; Cancel preserves the original date.
- [ ] On Android, a selected date applies once and the native picker closes.
- [ ] A long budget list scrolls inside the sheet, selected state is visible, and the empty state is clear.
- [ ] The keyboard and sticky Save footer do not cover the note, validation message, or final form row.
- [ ] Saving locks dismissal and shows the existing loading state until completion.

## Detail

- [ ] Initial detail load uses a geometry-matched skeleton; refresh keeps the existing detail visible.
- [ ] Standard, transfer, card credit, budget-owned, and commitment-owned details show the correct source and amounts.
- [ ] Missing budget or account metadata degrades to unavailable/unknown labels without replacing a valid transaction with an error screen.
- [ ] Transfer account buttons open the correct source and destination accounts.
- [ ] Back navigation restores the ledger query and scroll position without a visible jump.

## Accessibility

- [ ] Screen reader announces the summary expense share as progress.
- [ ] Transaction rows announce title, account path, amounts, and ownership.
- [ ] Date and budget rows announce button/selected states.
- [ ] All touch targets remain usable with large text and no text clips or overlaps.

Record device models, OS versions, and any failed step in the PR before approval.
