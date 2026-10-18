# ADR: Pieces other modules read leave the transactions screens

- **Date:** 2026-10-18
- **Status:** accepted
- **Ticket:** #610 (MA-166), under #585
- **Applies to:** `src/modules/transactions/domain/period_delta.ts`, `src/modules/transactions/utils/totals_presentation.ts`, `src/modules/transactions/utils/stored_rate_line.ts`, `src/modules/transactions/components/transaction_row.tsx`, `src/modules/transactions/components/transaction_row.helpers.ts`, `src/modules/transactions/components/transaction_row.anim.ts`, `src/modules/transactions/components/transaction_rows_skeleton.tsx`, `src/modules/transactions/components/day_card_row.tsx`, `src/modules/transactions/components/day_card_row.helpers.ts`, `src/modules/transactions/components/day_header.geometry.ts`, `src/modules/transactions/components/exchange_rate_row.tsx`, `src/modules/transactions/components/exchange_rate_row.geometry.ts`, `src/components/ui/detail_row.tsx`, `src/components/ui/detail_rows_card.tsx`, `src/components/ui/detail_row.geometry.ts`, `src/components/ui/date_header.tsx`

Accounts, commitments and dashboard imported rows, cards, a date header, a rate row and totals helpers from inside the transactions screens (audit M4). A change inside a transactions screen folder could break the account detail, the commitments screens or the dashboard card with no warning at the file. This record extends `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md` to the transactions module and fixes where each piece lives.

## 1. Homes

The row family goes to `src/modules/transactions/components/`. `transaction_row.helpers.ts` reads the accounts and categories entities and the transactions domain, so it is module UI and not a shared UI piece. The day-card pieces go there too. No other module reads them, and the skeleton that reads them lives there.

`ExchangeRateRow` goes to the same folder. It reads `isRateStale` from the currency module and the transactions stored-rate line.

`DetailRow`, `DetailRowsCard` and `DateHeader` go to `src/components/ui/`. They read only shared UI and theme.

The totals helpers split under 2026-09-28 §1. `computeDeltaPct` is a money derivation with no copy and no formatter, so it goes to `domain/`, as `creditUtilization` did under #666. The other totals helpers and `formatStoredRateLine` go to `utils/`. They hold copy and formatters, and no `domain/` file imports either (`git grep -l "constants/strings\|format_amount" -- 'src/modules/*/domain'` prints nothing). `buildTotalsPresentation` stays whole in `utils/`. It returns copy and class names and calls the money helpers for its share, as `budgetBandColor` in `src/modules/budget/utils/budget_summary.ts` calls `compareToPercent` and `exceedsToCent`.

## 2. A shared piece imports nothing from a screen folder

A file in `src/components/` or in a module's `components/`, `utils/` or `domain/` imports nothing from a `screens/` folder. A back import would carry a screen-folder change into the account detail or the pay sheet through the shared piece. So five pieces the ticket did not list moved with their readers: `DayCardRow`, `day_card_row.helpers.ts`, the day header geometry, `formatStoredRateLine` and `RATE_MESSAGE_SLOT_STYLE`. The screens import them from the new paths.

## 3. Moves keep their history and leave no re-export

Whole files moved with `git mv`, and only import specifiers changed in them, so `git log --follow` keeps their history. No old path keeps a re-export, and no new folder has an `index.ts`.

Four files were split. `transactions.helpers.ts` imports back `computeDeltaPct`, `buildTotalsPresentation`, `deltaDisplay` and three types for the hero and the day sections. `transactions_text.geometry.ts`, `detail.geometry.ts` and `transaction_form.geometry.ts` import nothing back. Their readers import the new geometry files.

## 4. Money

The bodies of `computeDeltaPct`, `polarityColor`, `formatSignedAmount`, `buildTotalsPresentation`, `expenseSharePct` and `deltaDisplay` did not change, and `transactions_helpers.test.ts` passes with no assertion changed. `scripts/validate-money-rounding.js` lists `period_delta.ts` and `totals_presentation.ts` under `toCents` and `wholePercentOf`. The `leftOfIncome` owned-sign entry in `scripts/validate-money-formatting.js` stays on `transactions.helpers.ts`, which still builds that figure.

## 5. Out of scope

`transactions.store` and `transaction_form_host.state`, read from accounts and navigation, stay in the screen folders. They are the follow-up task named on #585.
