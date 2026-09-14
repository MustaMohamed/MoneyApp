# MA-059 — Accounts: "Unnamed account" on the list row, its accessibility label, the detail header and hero, the archive title and the picker
base: 662bb98ac4bab1bcbd66ad30a887dc829fbba134 · verify: emulator · flags: user copy · expected diff: ~20 lines

## Steps
### 1. The copy exists once, beside the other two fallbacks
- File: `src/constants/strings.ts` (`unknownAccount`, `strings.ts:871-873`)
- Change: add `unnamedAccount: 'Unnamed account'` directly after `deletedAccount`. Nothing else in the file moves.
- Test: `__tests__/account_name.test.ts`: `Strings.unnamedAccount` is byte-exact `'Unnamed account'`; widen "keeps the two fallbacks distinct" to three, pairwise.

### 2. The resolver decides the blank case, last
- File: `src/utils/account_name.ts` (`resolveAccountName`, `account_name.ts:5-8`)
- Change: after the `undefined` and `is_deleted === 1` branches, return `Strings.unnamedAccount` when `account.name.trim() === ''`, else `account.name`. Order is the invariant: unknown, deleted, blank, stored name. Update the one-line JSDoc to name the third fallback.
- Test: `__tests__/account_name.test.ts`: invert `:26` so a live `''` reads `Strings.unnamedAccount`; add a whitespace-only live name (`'   '`) reading `Strings.unnamedAccount`; keep `:23-25` (blank-named deleted reads `Strings.deletedAccount`); add a live name with surrounding spaces reading the stored string untrimmed, so the resolver never rewrites a real name.

### 3. The row accessibility label reads the resolver
- File: `src/modules/accounts/constants/account_row_a11y_label.ts` (`resolveAccountRowA11yLabel`, `:9`)
- Change: replace `${account.name}` with `${resolveAccountName(account)}` (import from `@/utils/account_name`). The N3 onboarding row (`onboarding/.../more_accounts/components/account_row.tsx:8`) imports this function, so its label lands here; its visible title (`account_row.tsx:48`) stays raw for MA-061.
- Test: `__tests__/accounts/account_row_a11y_label.test.ts`: a `name: ''` Bank account at 4500 EGP announces `${Strings.unnamedAccount}, Bank, 4,500 EGP`; the existing `:30` exact-string case keeps passing.

### 4. The five accounts-module sites read the resolver
- File: `src/modules/accounts/screens/accounts/list/components/account_list_row.tsx:63` (row title); `src/modules/accounts/screens/accounts/detail/index.tsx:74` (`StackHeader` `title`); `src/modules/accounts/screens/accounts/detail/components/balance_hero.tsx:61` (hero name); `src/modules/accounts/screens/accounts/detail/components/archive_confirmation_dialog.tsx:34` (`Strings.accountDetailArchiveTitle(...)` argument); `src/modules/accounts/components/account_picker_sheet.tsx:67` (option label, `item`)
- Change: each raw `.name` read becomes `resolveAccountName(account)` (or `item`) with the import from `@/utils/account_name`. `balance_hero.tsx` and `archive_confirmation_dialog.tsx` type `Account` from `store/account.store`, which re-exports the entity type (`account.store.ts:13`), so the signature already matches. No other line in these files changes: `account_detail.hook.ts:159,166` (rename field), `account_name_taken.ts:6`, `account.repository.ts:116` stay raw.
- Test: `__tests__/screens/accounts/account_detail_archive.strings.test.ts`: `Strings.accountDetailArchiveTitle(Strings.unnamedAccount)` is `'Archive Unnamed account?'`. The row title, header, hero and picker option have no logic-only test to add (render tests are forbidden by `.claude/rules/tests.md`); step 3's label and step 2's resolver assert the rule they render, and the emulator pass covers the pixels.

### 5. The activity card gains its blank case, no source change
- File: `__tests__/screens/accounts/account_activity.helpers.test.ts` (beside `:140`)
- Change: none in `src/`; `account_activity.helpers.ts:63` already reads the resolver.
- Test: a live `name: ''` payer on a CC payment to the open card reads `context` `From ${Strings.unnamedAccount}`.

## Screens
- `/accounts`: the list row for the SQL-seeded blank account (`UPDATE accounts SET name = '' WHERE id = ?`, push-back recipe in the `emulator-verify` skill) reads "Unnamed account"; shot on the way in.
- `/accounts/[id]` for that account: header and hero read "Unnamed account"; the archive dialog open, titled "Archive Unnamed account?"; the rename field open reads empty.
- Transaction form, From row: the picker open with the blank account's option reading "Unnamed account".

## Non-goals
- Dashboard card and net worth rows (MA-060), onboarding N3 row title (MA-061), transaction form, filters and summaries (MA-062), commitment form, pay sheet, detail row, filters and summary (MA-063): no branch, no copy, no edit.
- The archived card's row title, names summary and restored toast (MA-048, #449): its plan reads the shared label; this branch does not touch `account_list_row.tsx` beyond `:63` nor the archived card.
- Rejecting a blank name at the form (MA-054, #459): the two schemas, `account_form.helpers.ts:65` and `account_detail.hook.ts:174` are untouched.
- Trimming, pre-filling or comparing the fallback anywhere: the rename field, `isAccountNameTaken`, restore, search and sort keep reading the stored name.
- Adding a blank case to the transactions-side tests (`format_transaction_title`, `transaction_row.helpers`, `detail_helpers`): MA-062.
- Any migration, repository write or money computation.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Gate at base vs head: `npx jest __tests__/account_name.test.ts __tests__/accounts/account_row_a11y_label.test.ts` fails at 662bb98a on the new cases and passes at head. `test -f` both paths before publishing.
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-048 (#449, Planned) adds `accountsArchivedRestored(name)` to `strings.ts`; whichever merges second rebases one hunk in that file.
- A user-typed name "Unnamed account" is indistinguishable from a blank one on every label; accepted by the ticket.
- Every existing `name: ''` fixture in `__tests__/` is a deleted account (`grep -rn "name: ''" __tests__`), so step 2 breaks only `account_name.test.ts:26`; a fixture added elsewhere with a live blank name would now read the fallback.

## Self-assessment
Step 4 is the one I am least sure about, on placement rather than logic: five one-line edits across five files with no test of their own, so the only proof that a site was rerouted is the emulator shot and a reviewer's grep for `.name` under `src/modules/accounts`. `grep -rn "\.name\b" src/modules/accounts --include=*.tsx` after the step should leave only the rename field plumbing in `account_detail.hook.ts` and the archived card sites that MA-048 owns; anything else still raw is a missed site.
