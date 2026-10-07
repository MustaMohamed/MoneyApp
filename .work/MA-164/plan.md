# MA-164 — One formatter joins an amount with its currency code
base: 0d4833e458ffdcd72553d303a71ef58c89ada2f1 · verify: none · flags: money path · expected diff: ~245 lines

27 files outside tests. Each file's `~n` is its added lines in that step.

## Steps
### 1. The money formatters return an amount joined to its code for a display, an owned and an owed amount
- File: `src/utils/format_amount.ts` (~32; beside `formatDisplayMagnitude` `:82`, `formatOwnedAmountParts` `:110`, `formatLiabilityAmountParts` `:152`)
- Change: four new exports and one new exported type. No existing export changes its signature or its output. Every argument is required and none takes `null`. Every field and return value is set, never `null` or `undefined`.
  - `DisplayAmountParts` is `{ text: string; withCode: string; printsAsZero: boolean }`. `text` and `printsAsZero` are those of `formatDisplayMagnitude(value, currency)`. `withCode` is `text`, one space, `CURRENCY_CONFIG[currency].code`.
  - `formatDisplayAmountParts(value: number, currency: Currency): DisplayAmountParts`
  - `formatDisplayAmount(value: number, currency: Currency): string` returns that `withCode`.
  - `formatOwnedAmount(value: number, currency: Currency): string` returns `formatOwnedAmountParts(value, currency)` as `value`, one space, `code`. It has no `magnitude` argument, since `formatAccountBalance` is the join at the currency's own decimals.
  - `formatLiabilityAmount(value: number, baseCurrency: Currency): string` returns `formatLiabilityAmountParts(value, baseCurrency)` as `value`, one space, `code`.
- Test: `first` · `__tests__/format_amount.test.ts`, one `describe` per function. The four take one currency, convert nothing and throw nothing, so the worked numbers of `.claude/rules/money.md` are EGP and USD.
  - `formatDisplayAmountParts(1240, EGP)` is `{ text: '1,240', withCode: '1,240 EGP', printsAsZero: false }`; `(0.004, EGP)` is `{ text: '0.00', withCode: '0.00 EGP', printsAsZero: true }`.
  - `formatDisplayAmount`: `(12.5, USD)` `12.50 USD`, `(0.4, EGP)` `0.40 EGP`, `(0, USD)` `0 USD`, `(0, EGP)` `0 EGP`, `(-984, EGP)` `984 EGP`.
  - `formatOwnedAmount`: `(12213, EGP)` `12,213 EGP`, `(-40, USD)` `−40.00 USD` with U+2212 and no U+002D, `(-0.4, EGP)` `−0.40 EGP`, `(-0.004, EGP)` `0.00 EGP`, `(0, USD)` `0 USD`.
  - `formatLiabilityAmount`: `(4885, EGP)` `−4,885 EGP`, `(100, USD)` `−100.00 USD`, `(-100, USD)` `+100.00 USD`, `(0.4, EGP)` `−0.40 EGP`, `(0, EGP)` `0 EGP`.

### 2. Every unsigned display amount takes its code from `formatDisplayAmount` or `formatDisplayAmountParts`
- Files:
  - `src/modules/transactions/screens/transactions/components/tx_delete_dialog.helpers.ts` (~2; `resolveTransactionDeleteBody`, `:17-18`)
  - `src/modules/transactions/screens/transactions/transactions.helpers.ts` (~3; `spokenDayNet`, `:523-527`)
  - `src/modules/commitments/utils/commitment_status.ts` (~3; `formatCommitmentAmount`, `:68-69`)
  - `src/modules/transactions/screens/transactions/detail/detail.helpers.ts` (~3; `transferCellAmountText`, `:119-127`)
  - `src/modules/accounts/utils/account_info_rows.ts` (~4; `signedStatParts`, `:39-49`)
  - `src/modules/transactions/screens/transactions/components/transaction_row.helpers.ts` (~12; `primaryAmountFor` `:176-185`, the label `:267`)
- Change: no exported signature or type in these six files changes.
  - The first three take the amount from `formatDisplayAmount(value, currency)`. The `~` stays ahead of it in `formatCommitmentAmount`.
  - `transferCellAmountText`, `signedStatParts` and `primaryAmountFor` each make one `formatDisplayAmountParts` call and pass its `withCode` to `signAmountText` with the sign and the `printsAsZero` they pass today. `TransferCellText.accessible` is `withCode`. `InfoRow.amountText` and `primaryAmount` keep the signed `text`.
  - `primaryAmountFor` is private. The row's label takes its signed `withCode` where `:267` joins `primaryAmount` to `code`.
  - `CURRENCY_CONFIG` and `formatDisplayMagnitude` leave each import list this step empties of them.
- Test: `first` · `__tests__/screens/transactions/transaction_row.helpers.test.ts`: cases on `buildTransactionRowPresentation(...).accessibilityLabel` for an income (`+`), a transfer (no sign) and a 0.4 EGP expense (`−0.40 EGP`), each asserting the label holds `primaryAmount`, one space and the code. They pass at base. Cases that pass unchanged pin the other five strings: `__tests__/screens/transactions/tx_delete_dialog.helpers.test.ts`, `__tests__/screens/transactions/transactions_helpers.test.ts` (`composeDayHeaderAccessibilityLabel`, `:989`), `__tests__/screens/commitment_status.test.ts`, `__tests__/screens/transactions/detail/transfer_flow_card.test.ts`, `__tests__/account_info_rows.test.ts`.

### 3. The day header's net, the tally's spoken sum and the hero's spoken Out reach the screen joined
- Files:
  - `src/modules/transactions/screens/transactions/transactions.helpers.ts` (~44; `formatSignedNet` `:249-255`, `TransactionsHeroModel` `:187-205`, `buildTransactionsHeroModel` `:346-386`, `withAccessibilityLabel` `:440-454`, `buildSearchTally` `:482-496`, `DayHeaderFigures` `:499-502`, `dayFigures` `:568-574`)
  - `src/modules/transactions/screens/transactions/components/day_header.tsx` (~1; `:77`)
  - `src/modules/transactions/screens/transactions/components/transactions_hero.tsx` (~1; `:181`)
  - `src/constants/strings.ts` (~2; beside `transactionsHeroUnavailable`, `:1282`)
- Change:
  - `formatSignedNet`, private, also returns `withCode`: the signed net, one space and the code, from one `formatDisplayAmountParts` call. Its sign and polarity rule stay.
  - `DayHeaderFigures`, figures variant, becomes `{ mode: 'figures'; net: string; count: string }`. `currencyCode` goes and `net` is that `withCode` (`−984 EGP`, `0 EGP`). The other two variants stay. `day_header.tsx:77` prints `figures.net` in both modes.
  - `SearchTallyModel` stays. `withAccessibilityLabel(model, spokenSum: string | undefined)` takes the spoken sum as a required second argument, never `null`, and the label's parts are `count`, `label`, `filterSummary` and that string. The two calls with no sum, the `failed` branch and the zero-match branch of `buildSearchTally`, pass `undefined`. The third passes the net's `withCode`.
  - `TransactionsHeroModel` gains `outAccessibilityLabel: string`, required, never `null`. With figures it is `formatOwnedAmount(current.expenseEgp, HERO_CURRENCY)`. Without, it is `Strings.transactionsHeroOutUnavailableA11y(code: string): string`, a new template that returns U+2014, one space and `code`, the form of `netWorthBreakdownForeignUnavailable` at `src/constants/strings.ts:273`. `currencyCode` stays for the code's own text node at `transactions_hero.tsx:210`. `:181` reads the new field.
- Test: `first` · `__tests__/screens/transactions/transactions_helpers.test.ts`
  - New on `buildTransactionsHeroModel`: `outAccessibilityLabel` is `9,400 EGP` for the suite's default input, `−50 EGP` with U+2212 for `expenseEgp: -50`, the card-credit input at `:330`, and `— EGP` in `dashes` mode.
  - New on `buildSearchTally`: the label reads `2 results in September +300 EGP` for a net of 300 and `2 results in September 0 EGP` for 0. Both pass at base.
  - Moved field: the day figures at `:839-844`, `:863-868`, `:891-896`, `:900`, `:904` and `:936` expect `net` with ` EGP` and no `currencyCode`. So does `__tests__/screens/transactions/transactions_hook.test.ts:2001-2006`.
  - `__tests__/screens/transactions.screen.test.tsx`: the typed fixtures at `:167-184`, `:241`, `:436` and `:520` follow the two types. No case is added.

### 4. Every owned and owed amount takes its code from `formatOwnedAmount` or `formatLiabilityAmount`
- Files:
  - `src/modules/dashboard/screens/dashboard/components/account_card.tsx` (~2; `ownedAmountText` `:25-28`, `:133`)
  - `src/modules/dashboard/screens/dashboard/components/budget_card.tsx` (~3; `:76`, `:134`)
  - `src/modules/dashboard/screens/dashboard/components/hero_card.tsx` (~4; `:115-118`, `:232-233`)
  - `src/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet.helpers.ts` (~4; `resolveNetWorthForeignCaption`, `:9-23`)
  - `src/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet.tsx` (~8; `:130-131`, `:159-163`, `:216-220`, `:244`)
  - `src/modules/accounts/utils/account_info_rows.ts` (~8; the `inBase` row, `:191-215`)
  - `src/modules/accounts/screens/accounts/list/accounts_list.helpers.ts` (~4; `composeCaption`, `:69-76`)
  - `src/constants/strings.ts` (~6; `:262-265`, `:385-386`)
- Change:
  - Three templates lose their `code` parameter and take the amount joined. Their text stays. `dashboardBreakdownAssetsHeader(amount: string, count: number)`, `dashboardBreakdownLiabilitiesHeader(amount: string, count: number)`, `accountCaptionSmartWallet(amount: string, rate: string)`. Arguments in that order, all required, none `null`.
  - The sheet passes `formatOwnedAmount(amount.assets, baseCurrency)` and `formatLiabilityAmount(amount.liabilities, baseCurrency)`. Its Total debt line at `:244` reads `formatLiabilityAmountParts(amount.liabilities, baseCurrency).value`, the call base makes at `:131`, so that export keeps a reader in `src/`.
  - The `inBase` row's `value` is `formatOwnedAmount` of the base equivalent, and its `amountText` stays `formatOwnedAmountParts(...).value`. One `baseEquivalent` result feeds both.
  - `composeCaption` passes the `inBase` row's `value` to the template, where it passes `amountText` and the code today.
  - `account_card.tsx` drops `ownedAmountText` for a direct `formatOwnedAmount` call. The other three sites call it in place of their join.
- Test: `first`
  - `__tests__/screens/dashboard/net_worth_breakdown_sheet.helpers.test.ts:40-57`: the two header cases call the two-argument templates with a joined amount and expect the four strings they expect today.
  - `__tests__/screens/dashboard/budget_card.test.tsx`: one case, a summary with `left: -2000` prints `−2,000 EGP` with U+2212.
  - `__tests__/screens/dashboard/hero_card.test.tsx`: one case, `baseProps` with `netWorth.assetsForeign: -176` prints `−176.00 USD` with U+2212.
  - The two render additions pass at base and fall under the Render-suite policy: Acceptance lines 4 and 5 name both strings, each is composed in its `.tsx` (`budget_card.tsx:134`, `hero_card.tsx:233`), neither asserts a style, no file is new.
  - Cases that pass unchanged pin the rest: the caption cases in the helpers file (`:10-37`), `__tests__/screens/accounts/accounts_list.helpers.test.ts:97`, `:103` and `:109`, `__tests__/account_info_rows.test.ts`, `__tests__/screens/dashboard/budget_card.test.tsx:66`, `__tests__/screens/dashboard/hero_card.test.tsx:177`.

### 5. The seven sites a joined formatter already covers call it
- Files:
  - `src/modules/accounts/utils/account_info_rows.ts` (~4; `amountParts`, `:28-36`)
  - `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts` (~7; `buildHeroCaption`, `:24-25`, `:38-42`, `:49-52`)
  - `src/constants/strings.ts` (~3; `:407`, `:409-410`)
  - `src/modules/accounts/screens/accounts/detail/components/archive_confirmation.helpers.ts` (~5; `:12-17`)
  - `src/modules/budget/screens/budget/spending_plans.helpers.ts` (~3; `:414`)
  - `src/modules/dashboard/screens/dashboard/components/stat_cards.tsx` (~5; `:220-227`, `:302`)
  - `src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx` (~3; `:110`)
  - `scripts/validate-structural-guards.js` (~3; the `BUDGET_PICKER` row, `:211-217`)
- Change:
  - `amountParts`: `value` is `formatCurrencyAmount(value, currency, decimals)` and `amountText` is `formatCurrencyParts(value, currency, decimals).value`, the same three arguments in the same order. Its comment at `:28` says so.
  - `accountHeroOpening(amount: string)` and `accountHeroAvailable(avail: string, limit: string)` lose their `currency` parameter. Opening passes `formatAccountBalance(account.opening_balance, currency)`. Available passes `formatCurrencyAmount(available, currency)` and the limit as today. The comment at `:24` goes with the reason it gives.
  - The archive line passes `formatAccountBalance(account.current_balance, account.currency)` and keeps its gate on `formatAccountBalanceParts(...).printsAsZero`.
  - The flexible row and the picker's limit are `formatCurrencyAmount(amount, Currency.EGP)`.
  - Each month-spend row carries `formatCurrencyAmount(leg.magnitude, currency)` beside its parts, and the label at `:302` is that string, one space and the state word.
  - The guard row requires `Strings.currencyEgp` in the picker, which this step removes. Its `required` becomes `holds(identifier('formatCurrencyAmount'), ...)`, its `rule` and `needs` name the formatter, and `banned: [literal('} EGP')]` stays. Ticket Decisions 2026-10-07, the line ending `team-decided, test approach · /prep`, rules that the guard follows the picker onto the formatter, keeps its ban, and its seed changes with it.
- Test: `first`
  - `__tests__/scripts/validate_structural_guards.test.ts:407-412`: the picker's `REQUIRED` seed swaps out `formatCurrencyAmount` and expects the script's new missing-text.
  - `__tests__/screens/dashboard/stat_cards.test.tsx`: one case, the two month-spend figures are labelled `3,000 EGP Spent` and `20.00 USD Spent` for the suite's `baseProps`.
  - `__tests__/screens/transactions/transaction_form/budget_picker_sheet.test.tsx`: one assertion in the long-list case, the row of `budget-12` prints `512 EGP`.
  - The two render additions pass at base and fall under the Render-suite policy: Acceptance line 9 names both strings, each is composed in its `.tsx`, neither asserts a style, no file is new.
  - Cases that pass unchanged pin the rest: `__tests__/screens/accounts/balance_hero.helpers.test.ts`, `__tests__/screens/accounts/archive_confirmation.helpers.test.ts`, `__tests__/spending_plans.helpers.test.ts:601`, `__tests__/account_info_rows.test.ts`.

### 6. The skill table and the decision record name the joined forms, and the two records it corrects point at it
- Files:
  - `.claude/skills/money-rules/SKILL.md` (~6; the export table, `:46-69`)
  - `docs/adr/2026-10-04-owned-owed-composers-shared-home.md` (~3; §1, `:10-12`)
  - `docs/adr/2026-10-06-account-balances-owned-composer.md` (~2; below `:8`)
  - `docs/adr/2026-09-07-list-caption-reads-card-rows.md` (~2; §1, below `:16`)
- Change:
  - The table gains a row for each of the four functions and a type row for `DisplayAmountParts`, in the form of the `AccountBalanceParts` row at `:69`. Its `formatAccountBalanceParts` row at `:57` names the dashboard account card's call as `formatOwnedAmount`.
  - §1 gains one paragraph headed `**Extended 2026-10-07 (#687).**`, the form `:20` took for #667. It records the four functions, that a flow sign goes on the joined string through `signAmountText` with the same call's `printsAsZero`, that a dash beside a code is no join and takes no formatter at its three sites, `netWorthBreakdownForeignUnavailable`, `transactionsHeroOutUnavailableA11y` and the inline template at `src/modules/commitments/screens/commitments/components/commitment_row.tsx:49`, the five templates that lost a parameter, `DayHeaderFigures` without `currencyCode`, `TransactionsHeroModel.outAccessibilityLabel`, and the two calls ADR 2026-10-06 names that moved: the hero's opening caption in its §2 to `formatAccountBalance` and the dashboard account card in its §5 to `formatOwnedAmount`.
  - The same paragraph names what moved under `docs/adr/2026-09-07-list-caption-reads-card-rows.md` §1. `amountParts` and the `inBase` row each make two formatter calls on the same arguments, where its `:16` records one call for `value` and `amountText`. `__tests__/account_info_rows.test.ts:422-443` holds `value` equal to `amountText`, one space and the code on every row. The smart wallet caption reads the `inBase` row's `value`, where its `:12` records `amountText ?? value`.
  - ADR 2026-10-06 gains one line below its opening paragraph at `:8`, headed `**Superseded in part 2026-10-07 (#687).**`, the form of `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md:18`. It names the three places the record no longer holds, the opening caption's row in §2 (`:30`), the dashboard account card in §5 (`:46`) and the formatter list of the plain-formatter scan in §6 (`:71`), which step 7 widens, and it points at `docs/adr/2026-10-04-owned-owed-composers-shared-home.md` §1. No other line of that record changes.
  - ADR 2026-09-07 gains one line in the same form at the end of its §1, below `:16`. It names the smart wallet caption's read at `:12` and the one-call sentence at `:16`, and points at the same §1. No other line of that record changes.
- Test: `none` · the four files are prose. `npm run lint` scans them for the `unslop` phrases.

### 7. `npm run lint` fails a hand join of an amount and a code, and a display formatter on a balance column
- Files:
  - `scripts/validate-money-formatting.js` (~42; `PLAIN_BALANCE` `:34-35`, the scan loop `:152-174`, the stale loop `:176-187`)
  - `docs/adr/2026-10-04-owned-owed-composers-shared-home.md` (~10; `:6`, §1 below the paragraph step 6 adds)
  - `.claude/skills/money-rules/SKILL.md` (~1; the lint paragraph below the export table, `:73`)
- Change:
  - `HAND_JOIN` is `/\} \$\{[^}]*(?:code|Code|urrency)[^}]*\}/g`, the closing search's pattern: two template slots one space apart, the second naming `code`, `Code` or `urrency`. It runs through `matchAll` on the text the other two scans read at `:153`, each tracked `src` file's comment-stripped lines joined, so a second slot that oxfmt wraps over lines matches. A match starts at the `}` that closes the first slot, and the report carries that character's line.
  - `HAND_JOIN_ALLOWLIST` holds three entries, ascending by path, in the `{ path, name? }` form of `OWNED_SIGN_ALLOWLIST` at `:38-44`. `name` narrows an entry through `sitsInProperty(text, match.index, name)`.
    - `{ path: 'src/constants/strings.ts', name: 'n4CaptionConverted' }` covers a count and a code. It is narrowed to the key because five of the 23 lines the scan reports at base sit in that file.
    - `{ path: 'src/modules/commitments/screens/commitments/filter/filter.helpers.ts' }` covers the three joins of `formatCommitmentAmountSummary`.
    - `{ path: 'src/utils/format_amount.ts' }` covers the five joined formatters.
  - A match no entry covers is one stderr line, and the run exits 1:
    ```
    <path>:<line>: joins an amount to a currency code by hand — use `formatCurrencyAmount`, `formatDisplayAmount`, `formatOwnedAmount`, `formatLiabilityAmount` or `formatAccountBalance` from src/utils/format_amount.ts instead; a match that joins no amount takes a HAND_JOIN_ALLOWLIST entry in scripts/validate-money-formatting.js (docs/adr/2026-10-04-owned-owed-composers-shared-home.md)
    ```
  - A stale entry fails the run in the two forms of `:176-187`, with `a hand join` for `an owned sign`, `joins none there` for `builds none there` and `HAND_JOIN_ALLOWLIST` for the list's name. The summary line at `:194-198` and its two counts stay.
  - `PLAIN_BALANCE`'s alternation gains `DisplayAmount`, `DisplayAmountParts` and `DisplayMagnitude`, so `formatDisplayAmount(account.current_balance, account.currency)` fails lint. Its report text stays. The widened pattern matches no call in `src` at head.
  - The record's `Applies to` line at `:6` gains the script. §1 gains, below step 6's paragraph, the scan in the form of ADR 2026-10-06 §6: the pattern and the text it reads, the report, the three entries with the reason for each, stale entries, the three names `PLAIN_BALANCE` gained, and the shapes `HAND_JOIN` does not read. Those are a join through `.join(' ')`, a `+` concatenation, a JSX text node, a code ahead of the amount, a literal code such as `EGP`, and a second slot that names its code without `code`, `Code` or `urrency`.
  - The skill's lint paragraph names the three added formatters in its balance-column sentence and gains the hand-join rule, its allowlist and ADR 2026-10-04 §1.
- Test: `first` · `__tests__/scripts/validate_money_formatting.test.ts`. The interface is the script's stderr and exit code, stated above.
  - A `describe` in the form of `:535-604`. `it.each` fails four shapes, each at the line its first slot closes: a magnitude beside `CURRENCY_CONFIG[currency].code`; the two parts of `formatOwnedAmountParts` joined by the caller; `formatAmount(...)` beside `Strings.currencyEgp` with the second slot wrapped over three lines; a string template that takes `amount` and `currency` apart and joins them. Each case holds the `<path>:<line>:` prefix, the five formatter names, `HAND_JOIN_ALLOWLIST`, the record's path, neither other report, and exit 1.
  - `expectQuietBeside` passes four shapes beside a control that fails: a `formatDisplayAmount` call; a dash beside a code, `` `— ${code}` ``; two slots that name no code, `` `${count} ${label}` ``; the join inside a comment.
  - Through a copied script, the form of `:480-532`: a `src/constants/strings.ts` whose `n4CaptionConverted` holds the count join and whose next key joins an amount to a code fails at the second key's line alone. One with no join under `n4CaptionConverted` prints the stale line that names the key.
  - In the form of `:235-245`: a listing without `src/constants/strings.ts` prints that entry's not-tracked line.
  - `plainBalance` at `:536-565` gains one row per added name: `formatDisplayAmount` on `current_balance`, `formatDisplayAmountParts` on `opening_balance`, `formatDisplayMagnitude` on `opening_balance`.
  - The stub listing of `runGuardOverFixtures` at `:52-54` also echoes `src/constants/strings.ts` and the filter helpers path, as it echoes the two paths the other allowlists name. Without them every quiet case and `:260-290` print two stale lines against a `stderr` held to `''`.
  - `:248-258`, the run with no stub, passes unchanged and holds the four exempt lines quiet at head.

## Decision record
- `docs/adr/2026-10-04-owned-owed-composers-shared-home.md`: an amount meets its currency code in `src/utils/format_amount.ts` alone, through four joined forms beside `formatCurrencyAmount` and `formatAccountBalance`, and `npm run lint` fails a hand join outside that file. Step 6 extends §1, and its paragraph names what moved under ADR 2026-09-07 §1. Step 7 adds the scan to §1. The ticket's `Size:` line names this file and no new record.

## Non-goals
- The strings and their voice, MA-097 (#553). The delete dialog's sentences, MA-093 (#549).
- The four joins the closing search still prints: `src/constants/strings.ts:121` and `src/modules/commitments/screens/commitments/filter/filter.helpers.ts:50`, `:53`, `:55`.
- A dash beside a code, `src/modules/commitments/screens/commitments/components/commitment_row.tsx:49` and `src/constants/strings.ts:273`. The templates with a literal `EGP`, among them `addTxBudgetOptionAccessibility` at `src/constants/strings.ts:1354`, which the picker's spoken label keeps.
- The renders that draw the code in its own text node. `SearchTallyModel.sum`, `TransactionsHeroModel.currencyCode` and `InfoRow.amountText` keep their fields.
- `budgetPlansCardBalanceA11y` (`src/constants/strings.ts:645`) and the income sheet's field label (`src/modules/budget/screens/budget/components/income_sheet.tsx:15`), which join in other shapes.
- No existing export of `src/utils/format_amount.ts` changes.
- ADR 2026-10-06 and ADR 2026-09-07 take one dated line each and no other edit.
- `PLAIN_BALANCE` does not name `formatOwnedAmount` or `formatOwnedAmountParts`. `src/modules/dashboard/screens/dashboard/components/account_card.tsx` passes `account.current_balance` to `formatOwnedAmount`, and ADR 2026-10-06 §5 keeps that card on the owned composer.
- No scan for a join through `.join(' ')`, `+` or a JSX text node, and no oxlint plugin rule.

## Untested inputs
- `account_card.tsx:133`, the carousel balance: no suite renders `AccountCard` and a new `.tsx` file is forbidden. Step 4.
- `net_worth_breakdown_sheet.tsx:159-163` and `:216-220`, the arguments the sheet passes to the two header templates, and `:244`, the Total debt value: no suite renders the sheet. Step 4.
- `day_header.tsx:77` and `transactions_hero.tsx:181`, the two bindings: `__tests__/screens/transactions.screen.test.tsx` mocks both components at `:74` and `:117`. Step 3.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Once, after step 5: `git grep -nE '\} \$\{[^}]*(code|Code|urrency)[^}]*\}' -- src ':!src/utils/format_amount.ts'` prints four lines, the four under Non-goals. It prints 27 at base.
- Once, after step 7: `node scripts/validate-money-formatting.js` exits 0. `HAND_JOIN` with the three entries reports 23 lines over `git archive 0d4833e4 src` and none over head, where its 9 matches are all covered.

## Risks
- Step 3 adds a `Strings` key under a ticket whose Copy is `none`. The string it returns is the one the hero speaks today, `— EGP`.
- `tsc` covers `__tests__/**` (`tsconfig.json`), so the type changes of step 3 and the template parameters of steps 4 and 5 fail `npm run typecheck` until the fixtures and calls named in the same step change with them.
- A merge to `main` that edits `transactions.helpers.ts`, `transaction_row.helpers.ts` or `strings.ts` before this branch rebases moves the cited lines. The symbols are the reference.
- The closing search reads one line at a time. A hand join that oxfmt wraps over two lines does not print, so the diff is read for one as well.
- `HAND_JOIN` reads template literals alone. A join through `.join(' ')`, `+` or a JSX text node passes lint, as the search tally's label did at base.
- The `filter.helpers.ts` entry covers its whole file, so a second hand join there passes. The ticket names no issue for the filter summary, and the entry carries none.
- `sitsInProperty` reads text. A `,` or `;` in the words of `n4CaptionConverted`'s template, ahead of the join, takes the entry's cover away and that line fails lint.
- Step 7 edits the stub listing in a suite Acceptance line 8 does not name. No existing case there changes what it expects.

## Amendments
- 2026-10-07 · step 3 · `withAccessibilityLabel` takes `spokenSum: string | undefined` as a required argument and the two no-sum calls pass `undefined`; optional, a `figures` call compiled without its sum (V7 in `~/.ship/MoneyApp/MA-164/findings/verify-c1.md`)
- 2026-10-07 · step 4 · the Total debt line reads `formatLiabilityAmountParts(...).value` as at base; on `formatLiabilityRowValue` the parts export had no reader in `src/` (V4)
- 2026-10-07 · step 6 · ADR 2026-10-06 and ADR 2026-09-07 take one dated line each that points at ADR 2026-10-04 §1, and that paragraph's dash sentence names the commitment row's template; four statements in the two records were false at head and neither pointed at the correction (V2)
- 2026-10-07 · step 7 · new step, `HAND_JOIN` with its allowlist and three more names in `PLAIN_BALANCE`; no scan failed a new hand join, and `formatDisplayAmount` on a balance column passed lint (V9, V8). The Non-goal against a lint rule goes, and the header counts 27 files and ~245 lines

## Self-assessment
Step 7 is the one I am least sure about. `HAND_JOIN` is the closing search's pattern run on joined text, and with the three entries it reports 0 lines over head and 23 over base, but it reads template literals alone. The join that the closing search missed, the search tally's label, went through a named array and a later `.join(' ')`. No text pattern ties that array to its join without also firing on every dependency list that names a currency, so the shape stays unread and the record lists it. Both `.join(' ')` calls in `src` at head join text. If triage wants that shape read, it is a second scan with its own allowlist and its own lines against the gate. The second doubt is step 3's ~44: oxfmt breaks each no-sum call over ten lines once it takes a second argument, and that reflow is ~20 of the lines.
