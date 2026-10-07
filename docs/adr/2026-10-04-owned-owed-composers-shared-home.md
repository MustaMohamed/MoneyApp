# ADR: The owned and owed composers live in the shared amount formatting file

- **Date:** 2026-10-04
- **Status:** accepted
- **Ticket:** #624 (MA-136), under #585
- **Applies to:** `src/utils/format_amount.ts`, `src/modules/accounts/utils/account_info_rows.ts`, `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts`, `src/modules/transactions/screens/transactions/transactions.helpers.ts`, `src/modules/budget/screens/budget/category_detail/components/live_month_card.helpers.ts`, `scripts/validate-money-formatting.js`

The owned-sign composer sat in dashboard's `utils/`, its owed twins in the net worth sheet helpers, and transactions, budget and the account detail each composed the same owned sign on their own. A change to the sign rule (ADR 2026-08-27 decision 1, the zero-gated sign of #332) had five places to land. The account card row builders sat in dashboard while accounts read them and they read accounts' store type and domain.

## 1. The owned and owed composers live in `src/utils/format_amount.ts`

`formatOwnedAmountParts`, `formatLiabilityRowValue` and `formatLiabilityAmountParts` sit together in `src/utils/format_amount.ts`, beside `formatDisplayMagnitude` and `signAmountText`, which they call. Dashboard, transactions, budget and accounts all print an owned amount, so no single module owns the composer. That adds `src/utils/` as a third home beside a module's `utils/` and shared UI, and reverses ADR 2026-09-28 §1 for a piece no single module owns. `format_owned_amount.ts` was folded into the file, not moved whole, so its one commit of history (#623) ends at its deletion. The dashboard module keeps no re-export.

**Extended 2026-10-07 (#687).** An amount meets its currency code in `src/utils/format_amount.ts` alone. Four joined forms sit beside `formatCurrencyAmount` and `formatAccountBalance`: `formatDisplayAmountParts`, which returns `DisplayAmountParts` (`text`, `withCode`, `printsAsZero`), `formatDisplayAmount`, `formatOwnedAmount` and `formatLiabilityAmount`. A flow sign goes on the joined string through `signAmountText` with the same call's `printsAsZero`. A dash beside a code is no join and takes no formatter at its three sites: `netWorthBreakdownForeignUnavailable`, `transactionsHeroOutUnavailableA11y`, which this ticket adds, and the inline template at `src/modules/commitments/screens/commitments/components/commitment_row.tsx:49`. Five templates lost a parameter and take the amount joined: `dashboardBreakdownAssetsHeader`, `dashboardBreakdownLiabilitiesHeader`, `accountCaptionSmartWallet`, `accountHeroOpening` and `accountHeroAvailable`. `DayHeaderFigures` carries its net joined and has no `currencyCode`, and `TransactionsHeroModel.outAccessibilityLabel` holds what the hero's Out speaks. Two calls ADR 2026-10-06 names moved: the hero's opening caption in its §2 calls `formatAccountBalance`, and the dashboard account card in its §5 calls `formatOwnedAmount`. Under `docs/adr/2026-09-07-list-caption-reads-card-rows.md` §1, `amountParts` and the `inBase` row each make two formatter calls on the same arguments, where that record has one call for `value` and `amountText`; `__tests__/account_info_rows.test.ts` holds `value` equal to `amountText`, a space and the code on every row. The smart wallet caption reads the `inBase` row's `value`, where that record has `amountText ?? value`.

**A hand join fails lint (#687).** `scripts/validate-money-formatting.js` runs `HAND_JOIN`, `/\} \$\{[^}]*(?:code|Code|urrency)[^}]*\}/g`, over each tracked `src` file's comment-stripped lines, joined: two template slots one space apart, the second naming `code`, `Code` or `urrency`. A second slot that oxfmt wraps over lines matches. The report is one stderr line per match, `<path>:<line>: joins an amount to a currency code by hand`, at the line where the first slot closes, naming `formatCurrencyAmount`, `formatDisplayAmount`, `formatOwnedAmount`, `formatLiabilityAmount` and `formatAccountBalance`; exit 1.

`HAND_JOIN_ALLOWLIST` holds three entries:

- `src/constants/strings.ts`, in the `n4CaptionConverted` property alone, which joins a count to a code. The entry is narrowed to the key because five of the 23 lines the scan reports at `0d4833e4` sit in that file.
- `src/modules/commitments/screens/commitments/filter/filter.helpers.ts`, the whole file, for the three joins of `formatCommitmentAmountSummary`, which prints its numbers through no formatter.
- `src/utils/format_amount.ts`, the whole file, for the one template the joined formatters share.

An entry whose file is not tracked, or that covers no match, fails the run in the two forms a stale `OWNED_SIGN_ALLOWLIST` entry takes. The balance-column scan of ADR 2026-10-06 §6 gained three names, `formatDisplayAmount`, `formatDisplayAmountParts` and `formatDisplayMagnitude`, so an unsigned display formatter on `.current_balance` or `.opening_balance` fails as well.

`HAND_JOIN` reads template literals alone and does not see these shapes:

- A join through `.join(' ')`, the shape of the search tally's label before this ticket.
- A `+` concatenation.
- A JSX text node between two expressions.
- A code ahead of the amount.
- A literal code such as `EGP`.
- A second slot that names its code without `code`, `Code` or `urrency`.

## 2. The three copies call the owned composer

`formatHeroAmount` (transactions hero), `resolveLiveMonthLeftPresentation` (category detail live month card) and `formatAccountBalanceParts` (account detail balance, adjust balance sheet, archive confirmation) take their sign from `formatOwnedAmountParts`.

The account detail passes `formatCurrencyMagnitude(balance, currency)`, the magnitude at the currency's own decimals, as the optional third argument. `formatDisplayMagnitude` prints an exact zero at 0dp and escalates a sub-unit amount to 2dp, so on its default magnitude the hero would print `0 USD` for `0.00 USD` and `−0.40 EGP` for `0 EGP` at a balance of −0.4. Every two-argument call prints what it printed before.

**Extended 2026-10-06 (#667).** `formatAccountBalanceParts` and `formatAccountBalance` moved from `balance_hero.helpers.ts` into `src/utils/format_amount.ts`, and nine more sites that print an account balance call them. `npm run lint` fails a hand-built owned sign outside that file. `docs/adr/2026-10-06-account-balances-owned-composer.md` records both.

## 3. Accounts owns the account card row builders

`buildInfoRows`, `buildMonthRows`, `InfoRow` and `InfoRowKind` moved with `git mv` to `src/modules/accounts/utils/account_info_rows.ts`, so `git log --follow` keeps their history. Dashboard's account card imports them from accounts, and accounts no longer imports dashboard for them. The one accounts import of dashboard left is `useDashboardStore` in `accounts_list.hook.ts`, a screen store, which ADR 2026-09-28 §4 leaves to a task under #585.

## 4. Strings and assertions are unchanged

Every screen prints the same string for the same amount and currency. Tests changed in import lines and file location only. The composer cases moved verbatim from `net_worth_breakdown_sheet.helpers.test.ts` to `format_amount.test.ts`, and the row builders' suite moved to `__tests__/account_info_rows.test.ts`; no assertion was added, edited or removed.
