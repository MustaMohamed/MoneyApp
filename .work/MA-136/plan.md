# MA-136 — Owned and owed amount composers get one home, and accounts stops reading dashboard for its own rows
base: 2d15f991 · verify: none · flags: money path · expected diff: ~100 lines

## Steps
### 1. The owned composer is exported from `src/utils/format_amount.ts`
- File: `src/utils/format_amount.ts` (add `formatOwnedAmountParts` below `formatDisplayMagnitude`, `:82-98`); delete `src/modules/dashboard/utils/format_owned_amount.ts`; import line only in `src/modules/dashboard/utils/account_card.helpers.ts:19` and, under `src/modules/dashboard/screens/dashboard/components/`, `net_worth_breakdown_sheet.helpers.ts:5`, `net_worth_breakdown_sheet.tsx:16`, `account_card.tsx:16`, `budget_card.tsx:14`, `hero_card.tsx:18`, `stat_cards.tsx:16`, `total_balance_strip.tsx:21`; `__tests__/screens/dashboard/net_worth_breakdown_sheet.helpers.test.ts:10`
- Change: `formatOwnedAmountParts(value: number, currency: Currency): { value: string; code: string }` moves with its body and its one-line comment (`format_owned_amount.ts:5-15`). Both arguments are required, in that order, and no argument or returned field can be `null`. Every importer names `@/utils/format_amount`, merged into the import it already has from that file where one exists, and no re-export stays. The home is the ticket's: Rules line 2 names "the shared amount formatting file", and the Context `Size:` list names `src/utils/format_amount.ts` and no new file under `src/utils/`.
- Test: `none` · Acceptance line 8 bars a new assertion. Guard, import path only: `__tests__/screens/dashboard/net_worth_breakdown_sheet.helpers.test.ts:120-158`.

### 2. The owed twins sit in the same file
- File: `src/utils/format_amount.ts` (add `formatLiabilityRowValue`, `formatLiabilityAmountParts` below the owned composer); remove both from `src/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet.helpers.ts:48-64`, with the names its `:6-11` import no longer reads; import line only in `net_worth_breakdown_sheet.tsx:21-27` and `stat_cards.tsx:20`; `__tests__/screens/dashboard/net_worth_breakdown_sheet.helpers.test.ts:3-9`
- Change: `formatLiabilityRowValue(balance: number, baseCurrency: Currency): string` and `formatLiabilityAmountParts(value: number, baseCurrency: Currency): { value: string; code: string }` move with bodies unchanged. Arguments are required, in that order, and nothing is nullable. The two-line JSDoc at `:54-55` becomes one line (`CLAUDE.md` § Conventions, as #623 did for the owned one). No re-export stays in the sheet helpers.
- Test: `none` · same Acceptance line. Guard, import path only: the same suite, `:82-118` and `:160-172`.

### 3. The transactions and budget copies call the owned composer
- File: `src/modules/transactions/screens/transactions/transactions.helpers.ts:244-247` (`formatHeroAmount`); `src/modules/budget/screens/budget/category_detail/components/live_month_card.helpers.ts:17-19` (`resolveLiveMonthLeftPresentation`)
- Change: `formatHeroAmount(value)` returns `formatOwnedAmountParts(value, HERO_CURRENCY).value`. `resolveLiveMonthLeftPresentation` sets `text` to `formatOwnedAmountParts(left, Currency.EGP).value`; its signature and its `color` rule stay. `transactions.helpers.ts` changes in its import block and that one body only, since `MINUS_SIGN`, `signAmountText` and `formatDisplayMagnitude` keep readers at `:92-95`, `:250-254`, `:380` and `:524`. `live_month_card.helpers.ts` drops the three imports it no longer reads.
- Test: `none` · same Acceptance line. Guards, unchanged: `__tests__/screens/transactions/transactions_helpers.test.ts:252` (`buildTransactionsHeroModel`, the `in` and `out` figures), `__tests__/screens/budget/live_month_card.helpers.test.ts:7-27`.

### 4. The account detail balance takes its sign from the composer, on its own magnitude
- File: `src/utils/format_amount.ts` (`formatOwnedAmountParts`); `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts:73-86` (`formatAccountBalanceParts`)
- Change: `formatOwnedAmountParts(value: number, currency: Currency, magnitude?: { text: string; printsAsZero: boolean }): { value: string; code: string }`, arguments in that order. `magnitude` is optional and never `null`; omitted, it is `formatDisplayMagnitude(value, currency)`, so every two-argument call prints what it prints at base. Its `text` is the unsigned formatted magnitude and both of its fields are required. The return is `value = signAmountText(magnitude.text, value < 0 ? MINUS_SIGN : '', magnitude.printsAsZero)` and `code = CURRENCY_CONFIG[currency].code`. `formatAccountBalanceParts(balance: number, currency: Currency): AccountBalanceParts` keeps its signature and return type; it keeps `formatAmount(Math.abs(balance), decimals)` as the text and `text === formatAmount(0, decimals)` as `printsAsZero`, passes the pair as `magnitude`, and maps the returned `value` to `amount`. Ticket Context, fourth site: "the composer takes the magnitude and the output stays". The comment at `:78` becomes one line saying why this site formats its own magnitude. Its readers do not change: `balance_hero.tsx:35`, `:80`, `adjust_balance_sheet.tsx:54`, `archive_confirmation.helpers.ts:12`.
- Test: `none` · same Acceptance line. Guards, unchanged: `__tests__/screens/accounts/balance_hero.helpers.test.ts:147-228` (`0.00 USD` at zero and `0 EGP` at `-0.4` both fail if the magnitude becomes `formatDisplayMagnitude`), `__tests__/screens/accounts/archive_confirmation.helpers.test.ts`.

### 5. The account card row builders live in the accounts module's `utils/`
- File: `git mv src/modules/dashboard/utils/account_card.helpers.ts src/modules/accounts/utils/account_card.helpers.ts`; import path only in `src/modules/dashboard/screens/dashboard/components/account_card.tsx:15`, `src/modules/accounts/screens/accounts/list/accounts_list.helpers.ts:6`, `src/modules/accounts/screens/accounts/detail/components/account_facts.helpers.ts:4`; `__tests__/screens/dashboard/account_card.helpers.test.ts:10`
- Change: The file moves with no content edit in this commit, so the rename reads 100% and `git log --follow` reaches #623 and earlier. `buildInfoRows`, `buildMonthRows`, `InfoRow` and `InfoRowKind` keep their names and signatures, and every importer names `@/modules/accounts/utils/account_card.helpers`. `utils/` is the module's shared folder (`docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md:12`). `src/modules/dashboard/utils/` is empty after this step and leaves the tree.
- Test: `none` · same Acceptance line. Guards: `__tests__/screens/dashboard/account_card.helpers.test.ts` (import path only), `__tests__/screens/accounts/accounts_list.helpers.test.ts`, `__tests__/screens/accounts/account_facts.helpers.test.ts`.

### 6. The decision records name the new homes
- File: new `docs/adr/2026-10-03-owned-owed-composers-shared-home.md`, dated the day it is written; `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md:6`, `:12`; `docs/adr/2026-09-07-list-caption-reads-card-rows.md:6`, `:8`, `:14`
- Change: The new record, in the header form of the 2026-09-28 one (Ticket `#624 (MA-136), under #585`), holds four decisions. The owned and owed composers live in `src/utils/format_amount.ts` because dashboard, transactions, budget and accounts all print them, which adds `src/utils/` as a third home and reverses the 2026-09-28 record's §1 for a piece no single module owns. `formatHeroAmount`, `resolveLiveMonthLeftPresentation` and `formatAccountBalanceParts` call the owned composer, and the account detail passes its own magnitude because `formatDisplayMagnitude` would print `0` for `0.00 USD` and `−0.40` for `0 EGP`. Accounts owns the row builders, so dashboard imports accounts for them and accounts no longer imports dashboard for them. Strings are unchanged and tests changed in import paths only. In the 2026-09-28 record, `:6` swaps the two `src/modules/dashboard/utils/` paths for the two new homes, and §1 gains a `**Superseded in part <date> (#624).**` paragraph that names the new record, the house form at `docs/adr/2026-08-18-starting-net-position.md:42`. In the 2026-09-07 record, `:6` names the new path, `:8`'s sentence that the accounts module formats no amount becomes one that says the list screen formats none and the accounts module owns `buildInfoRows`, and `:14` names `account_card.helpers.ts` beside `signedStatParts`.
- Test: `none` · documents. `npm run lint` checks them for the banned certification phrases.

## Decision record
- `docs/adr/2026-10-03-owned-owed-composers-shared-home.md`: the owned and owed composers live in `src/utils/format_amount.ts`, reversing ADR 2026-09-28 §1 for a piece no single module owns, and accounts owns the account card row builders; step 6 adds the file.

## Non-goals
- `useDashboardStore` in `src/modules/accounts/screens/accounts/list/accounts_list.hook.ts:10` stays: screen stores are a new task under #585.
- No lint rule on imports from another module's screens: MA-138 (#626).
- Flow signs stay where they are: `signedStatParts` (`account_card.helpers.ts:35`), `formatSignedAmount` and `formatSignedNet` (`transactions.helpers.ts:91`, `:249`), `stat_tiles.tsx:22`, `month_ledger.tsx:36`. They print `+` and are neither owned nor owed.
- The percent caption at `transactions.helpers.ts:380` keeps its inline sign: it is a share, not an amount.
- `formatAccountBalanceParts` does not switch to `formatDisplayMagnitude`, and the owed composers gain no `magnitude` argument: nothing calls for one.
- No rename of `account_card.helpers.ts` or of any export, and no rewrite of the alias imports inside it.
- No test file moves, and no `describe` block moves between files.
- No other split of `transactions.helpers.ts`: MA-128 (#610).
- `.claude/skills/money-rules/SKILL.md:46`, the export table for `format_amount.ts`, gets no row: no Acceptance line covers it, and it is already short of `MONEY_ROUNDING_DECIMALS` and `formatRateDisplayMagnitude`.
- Comments on lines this plan does not move or edit stay, the JSDoc at `live_month_card.helpers.ts:5-11` included.

## Untested inputs
- `formatOwnedAmountParts` called directly with a `magnitude`: no case names it. `formatAccountBalanceParts` is its only three-argument caller, and `balance_hero.helpers.test.ts:147-228` covers that path (step 4).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- The suites pass at base and at head by design, so these are the checks that differ, each with its base result:
  - `git grep -n "modules/dashboard/utils/" -- src __tests__`: 12 lines at base, none at head.
  - `git grep -n "export function \(formatOwnedAmountParts\|formatLiabilityRowValue\|formatLiabilityAmountParts\)" -- src`: two files at base, three lines in `src/utils/format_amount.ts` at head.
  - `git grep -n "MINUS_SIGN : ''" -- src`: 5 lines at base; at head 2, the composer in `src/utils/format_amount.ts` and the percent caption in `transactions.helpers.ts`.
  - `git grep -n "from '@/modules/dashboard" -- src/modules/accounts`: 3 lines at base; at head 1, `accounts_list.hook.ts` and its store.
  - `git diff -M --name-status origin/main -- src/modules | grep -v '^M'`: empty at base; at head one `R` row, `dashboard/utils/account_card.helpers.ts` to `accounts/utils/account_card.helpers.ts`, and one `D` row, `format_owned_amount.ts`.
  - `git diff origin/main -- __tests__`: empty at base; at head two files, `net_worth_breakdown_sheet.helpers.test.ts` and `account_card.helpers.test.ts`, import lines only.

## Risks
- MA-128 (#610) is unmerged at base and splits `transactions.helpers.ts`. If it merges first, step 3 follows `formatHeroAmount` to the file that holds it and the cited lines shift.
- `format_owned_amount.ts` is folded into `format_amount.ts`, not moved whole, so its one commit of history (#623) ends at the deletion. If review reads Acceptance line 5 as covering it, steps 1, 2 and 6 take a `git mv` target under `src/utils/` as the home instead.
- oxfmt sorts imports (`.oxfmtrc.json`, `sortImports`). A repointed import left unsorted fails `format:check`; run `npm run format` on each touched file.
- A content edit in step 5's commit lowers the rename similarity. The only content change to the moved file is step 1's import line, in its own commit.
- A new importer of `formatOwnedAmountParts`, the liability composers or the row builders that lands on `main` before this merges breaks `typecheck` after the rebase and is repointed the same way.

## Self-assessment
Step 1's home is the choice I am least sure about. The ticket names "the shared amount formatting file" in Rules and lists `src/utils/format_amount.ts` in its `Size:` line, and I read both as putting the composers inside that file. The other reading keeps `format_owned_amount.ts` as a file, moves it whole to `src/utils/` and adds the owed twins to it, which would keep its history under Acceptance line 5 and leave `format_amount.ts` untouched. Both satisfy every other Acceptance line, the strings are the same either way, and the switch costs three steps a path each. Step 4's optional third argument is the second choice a reviewer may weigh: the ticket says the composer takes the magnitude, and I put it on `formatOwnedAmountParts` itself to keep one exported owned composer, where a separate sign helper would add an export.
