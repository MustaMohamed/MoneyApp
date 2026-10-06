# MA-156 — Account balances take their sign from the owned composer, and lint keeps hand-built owned signs out
base: aca9b90e · verify: emulator · flags: money path · expected diff: ~180 lines

## Steps

### 1. The account balance composer lives in the shared amount formatting file
- File: `src/utils/format_amount.ts` (after `formatOwnedAmountParts`, `:110-119`); `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts` (`:8-12`, `:70-92`); `balance_hero.tsx:19-24`, `archive_confirmation.helpers.ts:5`, `adjust_balance_sheet.tsx:21`, all three in that `detail/components/` folder
- Change: `AccountBalanceParts`, `formatAccountBalanceParts` and `formatAccountBalance` move to `format_amount.ts` with names and bodies unchanged, and `balance_hero.helpers.ts` keeps no re-export. The three callers import them from `@/utils/format_amount`. Every argument is required and none takes `null`:
  - `formatAccountBalanceParts(balance: number, currency: Currency): AccountBalanceParts` returns `{ amount: string; code: string; printsAsZero: boolean }`, every field required. The magnitude is `formatCurrencyMagnitude(balance, currency)`, passed to `formatOwnedAmountParts` as its third argument (ADR 2026-10-04 §2).
  - `formatAccountBalance(balance: number, currency: Currency): string` is `amount`, a space, `code`.
- Test: `first` · `__tests__/format_amount.test.ts` takes the two describes at `__tests__/screens/accounts/balance_hero.helpers.test.ts:147-228` verbatim, imported from `@/utils/format_amount`, plus one case: `formatAccountBalance(-0, Currency.EGP)` is `'0 EGP'`. `balance_hero.helpers.test.ts` drops the two names from its import at `:6-11` and keeps its caption and heading cases.

### 2. The list row, the archived card caption and the row label print the composed balance
- File: `src/modules/accounts/screens/accounts/list/components/account_list_row.tsx:57`; `src/modules/accounts/screens/accounts/list/components/archived_card.helpers.ts:21`; `src/modules/accounts/constants/account_row_a11y_label.ts:9-10`
- Change: each reads `current_balance` through the step 1 composer in place of `formatCurrencyParts` or `formatCurrencyAmount`. `AccountListRowBody` takes `amount` and `code` from `formatAccountBalanceParts`, so `lifted_account_row.tsx:36` follows with no edit. `resolveArchivedRowCaption` passes `formatAccountBalance(...)` to `Strings.accountsArchivedRowCaption`. `resolveAccountRowA11yLabel(account: Account): string` ends in `formatAccountBalance(...)`; its three callers (`account_list_row.tsx:166`, `archived_account_row.tsx:43`, onboarding `account_row.tsx:29`) need no edit. No signature changes.
- Test: `first` ·
  - `__tests__/accounts/account_row_a11y_label.test.ts`: a bank named `CIB Current` at `current_balance: -1900` reads `CIB Current, Bank, −1,900 EGP` with U+2212 and holds no U+002D; a USD account at `-42.5` contains `−42.50 USD`. The cases at `:15-38` hold.
  - `__tests__/screens/accounts/archived_card.helpers.test.ts`: the case at `:33-41` expects `Credit Card · ${MINUS_SIGN}2,500 EGP` in place of the `formatCurrencyAmount(-2500, …)` string; a USD bank at `-42.5` reads `Bank · −42.50 USD`. `:12-31` hold.

### 3. The picker rows, the N3 row and the pay sheet's account line print the composed balance
- File: `src/modules/accounts/components/account_row_content.tsx:29`; `src/modules/onboarding/screens/onboarding/more_accounts/components/account_row.tsx:23`; `src/modules/commitments/screens/commitments/detail/components/pay_sheet.tsx:183-186`
- Change: `AccountRowContent` and the pay sheet line render `formatAccountBalance(account.current_balance, account.currency)`; the N3 row takes `amount` and `code` from `formatAccountBalanceParts`. `pay_sheet.tsx:220` prints a converted total, not a balance, and keeps `formatCurrencyAmount`. `AccountRowContent` is mounted at `account_picker_sheet.tsx:55` and `replacement_account_sheet.tsx:131`, so the three pickers (`add_transaction_session.tsx:102`, `commitment_form_body.tsx:483`, `pay_sheet.tsx:280`) and the replacement sheet follow with no edit.
- Test: `none` · three inline calls in `.tsx` with no helper between them and the composer; `.claude/rules/tests.md` allows no new `.tsx` suite. The Screens rows read each.

### 4. The opening balance prints the composed sign on the detail facts, the hero caption and the edit form
- File: `src/modules/accounts/screens/accounts/detail/components/account_facts.helpers.ts:63`; `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts:52-55`; `src/modules/accounts/screens/accounts/edit_account/index.tsx:130`
- Change: the fact row's value is `formatAccountBalance(account.opening_balance, currency)`; `amountOrUnset` (`:22-24`) keeps `formatCurrencyAmount`. The caption passes `formatAccountBalanceParts(account.opening_balance, currency).amount` to `Strings.accountHeroOpening`; the available branch (`:40-49`) is untouched. The locked field's `value` is the same `.amount`. `buildAccountFacts(account: Account): AccountFact[]` and `buildHeroCaption(account: Account): HeroCaption` keep their signatures.
- Test: `first` ·
  - `__tests__/screens/accounts/account_facts.helpers.test.ts`: a bank at `opening_balance: -1900` gives `{ label: 'Opening balance', value: '−1,900 EGP' }`; USD at `-42.5` gives `−42.50 USD`. `:50-62` hold.
  - `__tests__/screens/accounts/balance_hero.helpers.test.ts`: `buildHeroCaption` at `opening_balance: -1900` reads `Opening −1,900 EGP`, USD at `-42.5` reads `Opening −42.50 USD`, EGP at `-0.4` reads `Opening 0 EGP`, the first two with U+2212, none with U+002D. `:38-62`, `:81-103` and the archived card cases hold.
  - `edit_account/index.tsx`: `none`, a screen template; the `edit_account.md` row reads it.

### 5. `npm run lint` fails a hand-built owned sign outside the composer's file
- File: `scripts/validate-money-formatting.js`
- Change: a second scan over the same `files` list (`:16-34`), on `stripComments(lines).join('\n')` so a ternary wrapped across lines still matches.
  - A hand-built owned sign is a conditional whose two branches are a minus glyph and an empty string literal, in either order. The minus glyph is the identifier `MINUS_SIGN` or a quoted U+002D or U+2212; quotes are single, double or backtick. At `aca9b90e` it matches two places in `src`: `src/utils/format_amount.ts:116` and `src/modules/transactions/screens/transactions/transactions.helpers.ts:380`.
  - `OWNED_SIGN_ALLOWLIST`, ascending by path, each entry `{ path: string, name?: string }`. `{ path: 'src/modules/transactions/screens/transactions/transactions.helpers.ts', name: 'leftOfIncome' }` covers a match in that file only when the match sits in the value of a property keyed `leftOfIncome`, the hero's percent caption (`leftOfIncome:` at `:377`, the `?` at `:380`). `{ path: 'src/utils/format_amount.ts' }` has no `name` and covers every match in the composer's file.
  - A match sits in a property keyed `name` when, on the stripped text, the stretch from the nearest key `name:` before the match's `?` up to that `?` holds no `,` or `;` at bracket depth 0 and no `)`, `]` or `}` that closes a bracket opened before the key. Depth counts `(`, `[` and `{`. The order of the file's matches decides nothing. At `aca9b90e` the match at `:380` passes this test.
  - Every other match is one stderr line starting `<path>:<line>: builds an owned sign by hand`, `<line>` the 1-indexed line of the match's `?`, and exit 1. The line goes on to name `formatOwnedAmountParts` and `formatAccountBalanceParts`.
  - An entry whose path is untracked, gone from disk or holds no match the entry covers fails as stale, the rule the constructor allowlist follows at `:72-91`. Its wording does not contain `constructs an`, and a named entry's stale line starts `<path>:` and holds the entry's `name`.
  - The success line on stdout (`:98-102`) does not change.
- Test: `first` · `__tests__/scripts/validate_money_formatting.test.ts`, through `runGuardOverFixtures` (`:42-55`), whose stub also echoes the transactions helpers path so its status 0 cases stay at 0.
  - Fires, status 1 and `<fixture>:<line>: builds an owned sign by hand` in stderr: `value < 0 ? MINUS_SIGN : ''`; `` `${v < 0 ? '-' : ''}${text}` ``; the reverse order `v >= 0 ? '' : MINUS_SIGN`; a ternary whose `? MINUS_SIGN` and `: ''` sit on their own lines, reported at the `?` line. Each fails at base, where the script exits 0 on the same fixture.
  - Quiet, status 0 and empty stderr: `formatOwnedAmountParts(value, currency).value`; `positive ? PLUS_SIGN : MINUS_SIGN`; `signAmountText(text, MINUS_SIGN)`; the pattern inside a comment; `date ? formatShortDate(date) : '-'`.
  - The HEAD case at `:160-169` stays green with the composer's file and the percent caption on disk.
  - In a copied-script root, as `:243-267` builds one, the stub's listing holds a fake `src/modules/transactions/screens/transactions/transactions.helpers.ts`, and every case is status 1, asserted on stderr. A match in `leftOfIncome` and a second below the property fail at the second's line. A match above the property and one in `leftOfIncome` fail at the first's line, and stderr holds no `<path>:<line>:` for the line of the match in `leftOfIncome`. A file whose only match is outside `leftOfIncome` fails at that match's line and as stale. A file with no match fails as stale.

### 6. Each screen has its overdrawn state in its features file
- File: `.claude/skills/emulator-verify/features/accounts_list.md`, `account_detail.md`, `edit_account.md`, `onboarding.md`, `commitment_detail.md`, `transaction_form.md`, `add_commitment.md`, `archived_account.md` (each file's `States` table)
- Change: eight new rows and one edited row, frame `no frame, MA-156`, named as in Screens below. Every Proof reads the balance with U+2212 in `mqa read` and finds no U+002D before the same digits (`grep -c -- '-1,900'` is 0).
  - The overdrawn seed, described in the `accounts_list.md` row and cited by the others: on a copy from `mqa seed --save`, built with `better-sqlite3` under `PRAGMA journal_mode=DELETE`, an active EGP bank `Walk Overdrawn` with `current_balance` and `opening_balance` `-1900`, an archived EGP bank `Walk Old Overdrawn` with `is_archived = 1` and `current_balance` `-2500`, one more active non-card account, and one active commitment with a cycle due paid from `Walk Old Overdrawn`. No app flow writes a negative `opening_balance` (`account_form.helpers.ts:23-27`), so the seed is its only source.
  - `accounts_list.md` · `overdrawn bank row`: the seed, `mqa open /accounts`. The row's label reads `Walk Overdrawn, Bank, −1,900 EGP` and its value text `−1,900`.
  - `accounts_list.md` · `archived card expanded, overdrawn`: the seed, `$MQA tap 'Archived'`. The archived row's caption reads `Bank · −2,500 EGP` and its label `Walk Old Overdrawn, Bank, −2,500 EGP`.
  - `account_detail.md` · `bank overdrawn`, the existing row at `:20`: Force becomes the seed's `Walk Overdrawn`; Proof adds the caption `Opening −1,900 EGP` and the `Opening balance` fact `−1,900 EGP` to the hero's sign.
  - `edit_account.md` · `bank overdrawn, locked opening balance`: `$MQA open /accounts/<Walk Overdrawn's id>/edit`. The `Opening balance` field reads `−1,900`; one shot of the locked row.
  - `onboarding.md` · `N3 row, overdrawn account`: `$MQA reset`, then the file's Gotcha on the developer-menu intro, which is `$MQA up --ready 'label="Continue"'`, `$MQA tap 'label="Continue"'` on the intro, `$MQA key 4`, `$MQA open /welcome` and `$MQA park`. N1 `Continue`, save one EGP bank on N2, then on N3 `$MQA seed --save <file.db>`, set that row's `current_balance` to `-1900` on the host, and `$MQA up --seed <file.db> --ready 'label="Review setup"'`, which pushes the file and reopens the app in one call. `mqa seed <file.db>` exits 1 on N3, since it waits for the tab bar (`mqa.sh:607`). The step is in SecureStore (`onboarding.repository.ts:27-28`), so the app reopens on N3. The row's label reads `<name>, Bank, −1,900 EGP` and its value text `−1,900`; one shot of the row.
  - `commitment_detail.md` · `pay sheet, overdrawn account`: the seed's commitment from the list, `$MQA tap 'label="Mark as Paid"'`. The commitment stays on the archived `Walk Old Overdrawn`, which the `archived_account.md` row needs, so the detail reads `DEFAULT ACCOUNT, None` and the sheet prefills the first active account by `sort_order` (`pay_sheet.hook.ts:277-283`, beside `pay_sheet.tsx`; `src/modules/accounts/database/accounts.ts:7-13`). For this row the seed's description also gives `Walk Overdrawn` a `sort_order` below every other active account's, so the sheet opens with it on the account line, under the heading `PAY FROM ACCOUNT`. The line has no label of its own and reads as its children's texts joined, so its selector is `~Walk Overdrawn, −1,900 EGP`; `label="Walk Overdrawn"` is the name text, which takes no tap. The Proof reads `−1,900 EGP` on the line as the sheet opens, then `$MQA tap '~Walk Overdrawn, −1,900 EGP'` and reads it on `id="account-picker-row-<Walk Overdrawn's id>"`. It makes no pick, since that row is already the selected one. One shot of the account line and one of the picker row. This is the one shot of `AccountRowContent`.
  - `transaction_form.md` · `To picker, overdrawn account`: `add transfer, To row` with the other account as From, `$MQA tap 'id="to-account-row"'`. `account-picker-row-<Walk Overdrawn's id>` reads `−1,900 EGP`; no shot, the row is the component shot on `commitment_detail.md`.
  - `add_commitment.md` · `account picker, overdrawn account`: `mqa open /commitments/add`, `$MQA tap 'label="Default Account"'` (`commitment_form_body.tsx:386`). Same read, no shot.
  - `archived_account.md` · `replacement sheet, overdrawn candidate`: the path of `replacement sheet, large font` on `Walk Old Overdrawn`. `replacement-account-row-<Walk Overdrawn's id>` reads `−1,900 EGP`; no shot.
- Test: `none` · recipe rows the render pass and the lens run.

### 7. The decision is on record, and the record and the skill that list the composers name the new home
- File: `docs/adr/2026-10-06-account-balances-owned-composer.md` (new); `docs/adr/2026-10-04-owned-owed-composers-shared-home.md` (§2); `.claude/skills/money-rules/SKILL.md` (the export table `:46-66`, the lint paragraph `:70`)
- Change: the new record states the two functions and their signatures from step 1, the nine sites of steps 2 to 4, that a credit card's balance is owned on its own rows (ADR 2026-08-27 decision 3), that an exact `-0` balance now prints `0` at these sites as it does on the detail hero, the sites left on other formatters with the reason for each (Non-goals below), and step 5's pattern, its two allowlist entries, the property test the named one applies and the shapes it cannot see (Untested inputs below). The older record gets one `**Extended 2026-10-06 (#667).**` paragraph, the form `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md:20` uses, naming the new record. The skill's table gains a row each for `formatAccountBalanceParts`, `formatAccountBalance` and `AccountBalanceParts` (type), the last in the form of the `AmountSign` (type) row at `:66`, the `formatCurrencyMagnitude` row names `formatAccountBalanceParts` as its caller, and the paragraph on the `Intl.NumberFormat` lint gains one sentence on the owned-sign lint.
- Test: `none` · prose; `npm run lint` checks its wording.

## Screens
- `emulator-verify/features/accounts_list.md`: `overdrawn bank row` · new, step 6
- `emulator-verify/features/accounts_list.md`: `archived card expanded, overdrawn` · new, step 6
- `emulator-verify/features/account_detail.md`: `bank overdrawn` · Force and Proof extended in step 6
- `emulator-verify/features/edit_account.md`: `bank overdrawn, locked opening balance` · new, step 6
- `emulator-verify/features/onboarding.md`: `N3 row, overdrawn account` · new, step 6
- `emulator-verify/features/commitment_detail.md`: `pay sheet, overdrawn account` · new, step 6
- `emulator-verify/features/transaction_form.md`: `To picker, overdrawn account` · new, step 6
- `emulator-verify/features/add_commitment.md`: `account picker, overdrawn account` · new, step 6
- `emulator-verify/features/archived_account.md`: `replacement sheet, overdrawn candidate` · new, step 6

## Decision record
- `docs/adr/2026-10-06-account-balances-owned-composer.md`: every site that prints an account balance calls `formatAccountBalanceParts` or `formatAccountBalance` in `src/utils/format_amount.ts`, and `npm run lint` fails a hand-built owned sign outside that file, with the transactions hero's `leftOfIncome` percent exempt by a named entry; step 7 adds the file.

## Non-goals
- The account info rows' money math: MA-155, merged as #671.
- Lint on imports from another module's screens: MA-138 (#626).
- The N4 hero and pill (`ready.helpers.ts:33`, `:38`, `:85`) stay on the plain formatters: they print the starting net position, and ADR 2026-08-21 §2 keeps an exact `-0` visible there.
- The dashboard account card (`account_card.tsx:25-28`) and the net worth sheet rows already call `formatOwnedAmountParts`; their escalating magnitude stays.
- The credit limit and minimum payment facts (`account_facts.helpers.ts:22-24`), the available caption (`balance_hero.helpers.ts:40-49`) and the pay sheet's converted total (`pay_sheet.tsx:220`) are not balances and keep their formatters.
- `transactions.helpers.ts:380` is not rewritten or moved; the allowlist names it.
- No oxlint plugin rule and no `.oxlintrc.json` change. Flow signs (`PLUS_SIGN` against `MINUS_SIGN`) are not linted.
- No new `.tsx` test and no case added to `__tests__/screens/commitments/pay_sheet_converted_total.test.tsx`.

## Untested inputs
- The five `.tsx` call sites (list row value, picker row line, N3 row value, pay sheet account line, locked opening balance) have no Jest case; steps 2, 3 and 4. The Screens rows read each.
- A sign built without a ternary (an `if` that assigns `MINUS_SIGN`, a named empty-string constant, a concatenation) passes the scan; step 5.
- The property test reads text and has no syntax tree. It misreads a string literal in the `leftOfIncome` value that holds a bracket, a `,` or a `;` ahead of the sign, and a ternary whose false branch follows a bare `leftOfIncome`; step 5.
- TalkBack's reading of U+2212 in the row label; step 2. Device QA.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- A commit that lands on main before this PR and adds a third match of step 5's pattern turns `npm run lint` red on the rebase.
- `findReferences` returned nothing from the LSP server at this checkout; the caller lists in steps 1 to 3 come from `incomingCalls` and `git grep`.
- `onboarding.md` · `N3 row, overdrawn account`: the force rests on a database push leaving the SecureStore step at N3.
- `commitment_detail.md` · `pay sheet, overdrawn account`: the sheet's account row has no testID or label of its own (`pay_sheet.tsx:163-167`), so its selector is its children's texts, the balance among them, and it shows `Walk Overdrawn` unpicked only through the hook's fallback to the first active account (`pay_sheet.hook.ts:277-283`).
- `account_detail.md` · `bank overdrawn`: the caption and the fact need a negative `opening_balance`, which only the seed writes.

## Self-assessment
Step 5 is the one I am least sure of. The ticket names the script in its `Size:` line and asks for the percent caption to be exempt by name, and I read that as a named allowlist entry that covers the matches inside the `leftOfIncome` property of `transactions.helpers.ts`, with the composer's file exempt whole. The script has no syntax tree, so it finds the property by counting brackets from the key, and it counts a bracket, comma or semicolon inside a string literal there as code. An oxlint rule on the syntax tree could exempt by the `leftOfIncome` property key with no counting, the way `NAV_OPTION_STYLE_KEYS` exempts three keys in `scripts/oxlint-plugin-moneyapp.js:3-7`, at the cost of `.oxlintrc.json` overrides for tests and for the composer's file; I kept the script because the ticket sized it and its fixture suite already exists. Either way the scan sees ternaries only. Step 6 is second: the probe ran three of its nine rows, the N3 row, the pay sheet and the account detail, and the other six were written from source and the features files, with no run behind them.
