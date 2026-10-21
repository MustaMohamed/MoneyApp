# ADR: Pieces other modules read leave the transactions screens

- **Date:** 2026-10-18
- **Status:** accepted
- **Ticket:** #610 (MA-166), under #585
- **Applies to:** `src/modules/transactions/domain/period_delta.ts`, `src/modules/transactions/domain/expense_share.ts`, `src/modules/transactions/utils/totals_presentation.ts`, `src/modules/transactions/utils/stored_rate_line.ts`, `src/modules/transactions/components/transaction_row.tsx`, `src/modules/transactions/components/transaction_row.helpers.ts`, `src/modules/transactions/components/transaction_row.anim.ts`, `src/modules/transactions/components/transaction_rows_skeleton.tsx`, `src/components/ui/day_card_row.tsx`, `src/components/ui/day_card_row.helpers.ts`, `src/components/ui/day_header.geometry.ts`, `src/modules/transactions/components/exchange_rate_row.tsx`, `src/modules/transactions/components/exchange_rate_row.geometry.ts`, `src/components/ui/detail_row.tsx`, `src/components/ui/detail_rows_card.tsx`, `src/components/ui/detail_row.geometry.ts`, `src/components/ui/date_header.tsx`

Accounts, commitments and dashboard imported rows, cards, a date header, a rate row and totals helpers from inside the transactions screens (audit M4). A change inside a transactions screen folder could break the account detail, the commitments screens or the dashboard card with no warning at the file. This record extends `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md` to the transactions module and fixes where each piece lives.

## 1. Homes

The row family goes to `src/modules/transactions/components/`. `transaction_row.helpers.ts` reads the accounts and categories entities and the transactions domain, so it is module UI and not a shared UI piece. `transaction_row.helpers.ts` is a helper file accounts imports, since `account_activity.helpers.ts` reads `buildTransactionRowPresentation` and `resolveRowTile`, and 2026-09-28 §1 sends such a file to `utils/`. It stays in `components/` because it serves `TransactionRowBody`, which `account_activity_card.tsx` imports beside it, and this ticket moves the row family as one. The day-card pieces go there too. No other module reads them, and the skeleton that reads them lives there.

`ExchangeRateRow` goes to the same folder. Audit M4 recommends `src/components/ui/exchange_rate_row.tsx` (`docs/superpowers/reviews/2026-07-29-full-technical-audit.md:401`). This record departs from it because the row reads `isRateStale` from the currency module and the transactions stored-rate line.

`DetailRow`, `DetailRowsCard` and `DateHeader` go to `src/components/ui/`. They read only shared UI and theme.

The totals helpers split under 2026-09-28 §1. `computeDeltaPct` is a money derivation with no copy and no formatter, so it goes to `domain/`, as `creditUtilization` did under #666. The other totals helpers and `formatStoredRateLine` go to `utils/`. They hold copy and formatters, and no `domain/` file imports either (`git grep -l "constants/strings\|format_amount" -- 'src/modules/*/domain'` prints nothing). `buildTotalsPresentation` moved whole to `utils/` with its body unchanged, though it derives the expense share. This ticket bars added assertions, and `.claude/rules/money.md:22` asks every change in `domain/` for worked-number tests. The share's derivation moves to `domain/` under MA-202 (#771).

**Extended 2026-10-20 (#763, folding #771).** The expense share is derived once, by `expenseSharePercent` in `src/modules/transactions/domain/expense_share.ts`: `null` when the income is 0 cents or less, else the whole percent of the expense cents over the income cents. `buildTotalsPresentation` calls it, keeps the `snapToZero` of the expense and still picks the four states, no income, within income, over income and net credit, from the share and the snapped expense. The worked numbers are in `__tests__/transactions/expense_share.test.ts`.

**Extended 2026-10-21 (#781, MA-207).** The list pieces the commitments list reuses live in `src/components/ui/`: `DayCardRow` with `day_card_row.helpers.ts`, `DayHeader` with `day_header.geometry.ts`, `AccountChips` with `account_chips.helpers.ts` and `account_chips.geometry.ts`, `SearchTally` with `search_tally.helpers.ts`, and `list_text.geometry.ts`, which holds the header's ellipsis reserve and the tally's geometry. MA-209 and MA-211 mount them in the commitments list (epic #777 R25), so for the day-card pieces this supersedes "No other module reads them" above. The header takes the ui-owned `DayHeaderSection` and the tally the ui-owned `SearchTallyModel`; `buildDaySections` and `buildSearchTally` in `transactions.helpers.ts` adapt the transactions aggregate to them. `FLOW_CLASS` moved to `search_tally.helpers.ts` and `HERO_SHELL_MARGIN_BOTTOM` to `account_chips.geometry.ts`, beside their shared readers, and the transactions hero imports both from there. The chip helpers read the accounts entity and `resolveAccountName`, and the chips draw `AccountColorTile`, which reads the accounts constants. A shared ui piece may read a module's entities and constants, as `account_color_tile.tsx:7` does, because `moneyapp/screens-import-boundary` bars only screens folders and no accounts screen change reaches it.

## 2. A shared piece imports nothing from a screen folder

A file in `src/components/` or in a module's `components/`, `utils/` or `domain/` imports nothing from a `screens/` folder. A back import would carry a screen-folder change into the account detail or the pay sheet through the shared piece. So five pieces the ticket did not list moved with their readers: `DayCardRow`, `day_card_row.helpers.ts`, the day header geometry, `formatStoredRateLine` and `RATE_MESSAGE_SLOT_STYLE`. The screens import them from the new paths.

## 3. Moves keep their history and leave no re-export

Whole files moved with `git mv`, and only import specifiers changed in them, so `git log --follow` keeps their history. No old path keeps a re-export, and no new folder has an `index.ts`.

Four files were split. `transactions.helpers.ts` imports back `computeDeltaPct`, `buildTotalsPresentation`, `deltaDisplay` and three types for the hero and the day sections. `transactions_text.geometry.ts`, `detail.geometry.ts` and `transaction_form.geometry.ts` import nothing back. Their readers import the new geometry files.

## 4. Money

The bodies of `computeDeltaPct`, `polarityColor`, `formatSignedAmount`, `buildTotalsPresentation`, `expenseSharePct` and `deltaDisplay` did not change, and `transactions_helpers.test.ts` passes with no assertion changed. `scripts/validate-money-rounding.js` lists `period_delta.ts` and `totals_presentation.ts` under `toCents` and `wholePercentOf`. The `leftOfIncome` owned-sign entry in `scripts/validate-money-formatting.js` stays on `transactions.helpers.ts`, which still builds that figure.

**Extended 2026-10-20 (#763).** `buildTotalsPresentation` now calls `expenseSharePercent` for the share, keeping the snap of the expense and the four states, and `transactions_helpers.test.ts` still passes with no assertion changed. `scripts/validate-money-rounding.js` lists `expense_share.ts` and `period_delta.ts` under `toCents` and `wholePercentOf`, and no longer lists `totals_presentation.ts`, which calls neither.

## 5. Out of scope

A module `components/` folder read across modules is the follow-up task named on #585. `transactions.store` and `transaction_form_host.state`, read from accounts and navigation, left the screen folders for `src/modules/transactions/store/` under #763; `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md` §4 records the homes.
