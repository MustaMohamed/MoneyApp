# MA-062 — Transactions: "Unnamed account" on the form's From and To rows, the filter options and both summaries
base: efd1d2da07a95a38698fd0c1b1e6e43c2f60f1e6 · verify: emulator · flags: none · expected diff: ~40 lines

Resolver: `resolveAccountName(account: Account | undefined): string` in `src/utils/account_name.ts` (unknown → `Strings.unknownAccount`, `is_deleted === 1` → `Strings.deletedAccount`, `name.trim() === ''` → `Strings.unnamedAccount` at `src/constants/strings.ts:894`, else the stored name). Every step below reads it; none adds a branch or a string.

## Steps
### 1. The four helpers already on the resolver prove the blank case
- File: tests only, no source change
- Change: none. `src/utils/format_transaction_title.ts:26-27`, `components/transaction_row.helpers.ts:83,88`, `detail/detail.helpers.ts:158-159` already call `resolveAccountName`; the deleted-account blocks in each suite are the template (an account with `name: ''`, `is_deleted: 0`).
- Test: `__tests__/format_transaction_title.test.ts`, a `blank-named accounts (MA-062)` describe beside the MA-020 one at `:134`: an expense subtitle reads `Strings.unnamedAccount`; a transfer with a blank source and a named target reads `` `${Strings.unnamedAccount} → Vodafone Cash` ``. `__tests__/screens/transactions/transaction_row.helpers.test.ts` beside `:231`: expense context is `Strings.unnamedAccount`, transfer context is `` `${Strings.unnamedAccount} → ${Strings.unnamedAccount}` `` for two blank accounts. `__tests__/screens/transactions/detail/detail_helpers.test.ts` beside `:271`: single-account `accountLabel` is `Strings.unnamedAccount`; transfer with a blank destination reads `` `USD wallet → ${Strings.unnamedAccount}` ``. All three suites already import `Strings` and build accounts through `makeTestAccount` or a local `account()` alias of it.

### 2. The applied summary reads labels through a second, label-valued map
- File: `src/modules/transactions/screens/transactions/filter/filter.helpers.ts` (`NamedEntity`, `:85`; `formatAppliedFilterSummary`, `:113-116`)
- Change: add `export function labelAccountsById(accountsById: ReadonlyMap<string, Account>): ReadonlyMap<string, NamedEntity>`, a new `Map` whose value per id is `{ name: resolveAccountName(account) }`. Imports `resolveAccountName` from `@/utils/account_name` and `type Account` from `@/modules/accounts/entities/account.entity`; no cycle (`account_name.ts` imports only `Strings` and the `Account` type). `formatAppliedFilterSummary`'s signature and the category map stay as they are.
- Test: `__tests__/screens/transactions/filter/filter_helpers.test.ts`, in the `formatAppliedFilterSummary` describe at `:61`: `labelAccountsById(new Map([['a1', makeTestAccount({ id: 'a1', name: '' })], ['a2', makeTestAccount({ id: 'a2', name: 'Wallet' })]]))` fed to `formatAppliedFilterSummary` with `accountIds: ['a1', 'a2']` returns `` `${Strings.unnamedAccount}, Wallet` ``; a deleted entry (`is_deleted: 1`) reads `Strings.deletedAccount`. Adds the `Strings` and `makeTestAccount` (`@/test_helpers/transaction`) imports.

### 3. The transactions hook feeds the label map to the summary and the Account map to the rows
- File: `src/modules/transactions/screens/transactions/transactions.hook.ts` (`accountsById`, `:312-315`; `appliedFilterSummary`, `:324-327`)
- Change: `const accountLabelsById = useMemo(() => labelAccountsById(accountsById), [accountsById]);` directly under `accountsById`; `formatAppliedFilterSummary(appliedFilters, accountLabelsById, categoriesById)` with `accountLabelsById` in the deps. `state.accountsById` (`:456`) keeps its `Map<string, Account>` type: `index.tsx:93-94` hands its values to `TransactionRow`, which reads `is_deleted`, and `findMissingAccountIds` (`:317`) takes `ReadonlyMap<string, Account>`. `labelAccountsById` joins the existing `./filter/filter.helpers` import at `:27-31`.
- Test: `__tests__/screens/transactions/transactions_hook.test.ts`, new case in `useTransactions screen orchestration`: `setupStores({}, { accounts: [makeTestAccount({ id: 'account-1', name: '' })] })`, then inside `act` `useTransactionsScreenStore.getState().setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['account-1'] })`; `result.current.state.appliedFilterSummary` is `Strings.unnamedAccount` and `result.current.state.accountsById.get('account-1')?.name` is `''`. `makeTestAccount`, `Strings` and `EMPTY_FILTERS` are already imported (`:4,11-14,21`).

### 4. The draft summary reads the label
- File: `src/modules/transactions/screens/transactions/filter/filter.hook.ts` (`accountSummary`, `:68-73`)
- Change: `.map((account) => resolveAccountName(account))` replaces `.map((account) => account.name)`; import `resolveAccountName` from `@/utils/account_name`. The `.filter` on `draft.accountIds` stays on `account.id`.
- Test: `__tests__/screens/transactions/filter/filter_hook.test.ts`: `beforeEach` adds `useAccountStore.getState().reset()`; new case sets `useAccountStore.setState({ accounts: [makeTestAccount({ id: 'a1', name: '' }), makeTestAccount({ id: 'a2', name: 'Wallet' })] })` (the store is the real one in this suite, nothing mocks it), `toggleAccountId('a1')` then `('a2')`, and `result.current.state.accountSummary` is `` `${Strings.unnamedAccount}, Wallet` `` per `formatSelectionSummary`. Adds the `useAccountStore`, `Strings` and `makeTestAccount` imports.

### 5. The filter option and its accessibility label read the label
- File: `src/modules/transactions/screens/transactions/filter/components/account_accordion.tsx` (`:32,34`)
- Change: `label: resolveAccountName(account)` and `accessibilityLabel: Strings.filterAccountAccessibility(resolveAccountName(account))`; import `resolveAccountName`. `id` and `selected` stay on `account.id`, so the checkbox still reaches the account.
- Test: none. `.tsx`, no render tests (`.claude/rules/tests.md`); the resolver is covered by `__tests__/account_name.test.ts` and `Strings.filterAccountAccessibility` is a template literal. The emulator walk shoots it.

### 6. The form's From and To rows read the label
- File: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx` (`:181`, `:213`)
- Change: `value={selectedAccount ? resolveAccountName(selectedAccount) : Strings.addTxPickAccountTitle}` and `value={selectedToAccount ? resolveAccountName(selectedToAccount) : Strings.addTxPickToTitle}`; import `resolveAccountName`. `FormPickerRow` builds its default `accessibilityLabel` from `value` (`components/form_picker_row.tsx:29`), so the a11y label follows. The edit session renders the same body locked (`edit_transaction_session.tsx:53,62-64`); nothing else changes.
- Test: none. `.tsx`, no render tests; `__tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx` is a settled legacy suite, do not extend it.

### 7. Search on "Unnamed" matches no blank-named account
- File: tests only, no source change
- Change: none. `src/modules/transactions/database/transactions.ts:160-161` keeps its `LIKE` on the stored name.
- Test: `__tests__/database_get_transactions_filter.test.ts`, one case in `getTransactions — expanded search projection` (`:242`) beside the destination-account case at `:293`: insert an account `acc_blank` with `name` `''` through `realDb` in the seed's column shape (`:19-27`; the accounts table is not cleared by the `beforeEach` at `:63`, so the case deletes `acc_blank` in a `finally`), `insert({ id: 'blank-row', account_id: 'acc_blank' })`, then `getTransactions(mockDb, { search: 'Unnamed' })` returns `[]` and `getTransactions(mockDb, { accountIds: ['acc_blank'] })` returns `['blank-row']`, so the empty search result is not an absent row.

## Screens
- Seed on the device DB: `UPDATE accounts SET name = '' WHERE id = '<an active account id>'`, then `am force-stop` and relaunch (the account store caches names).
- Transactions tab, filter sheet: Accounts accordion expanded, the blank account's option reads "Unnamed account"; after selecting it the accordion summary reads "Unnamed account"; after Apply the date header context reads "Unnamed account".
- Add-transaction form: From row after picking the blank account in the picker (the picker itself is MA-059's); switch to Transfer and pick it as To, the To row reads "Unnamed account".

## Non-goals
- `Strings.unnamedAccount`, the resolver and `account_picker_sheet.tsx` (MA-059). Dashboard (MA-060), onboarding (MA-061), commitments and its own `selectedNames` in `src/modules/commitments/screens/commitments/filter/filter.helpers.ts:141` (MA-063).
- Search matching the label: `src/modules/transactions/database/transactions.ts:160-161` stays a `LIKE` on the stored name.
- Changing `formatAppliedFilterSummary`'s `NamedEntity` parameter to `Account`; the categories map shares it.
- Trimming or rewriting any stored name; no repository or migration change.
- Pre-filling a form field with the label.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gate check: steps 2 to 4 tests fail at base (`labelAccountsById` does not exist; `accountSummary` and `appliedFilterSummary` read `''`). Steps 1 and 7 pass at base by design; they guard the resolver route and the raw search, as the ticket asks.

## Risks
- `filter_hook.test.ts` uses the real `useAccountStore`; if its module import pulls a repository that needs the SQLite bridge, the new case needs the `@/test_helpers/sqlite` setup or a store mock. Today the suite renders the hook with that import in place, so the import itself is known to load.
- `attachMockSelectorStore` in `transactions_hook.test.ts` serves `accounts` through a selector mock; if `mergeAccountsById` reads a field the override omits, `accountsById` stays empty and the step 3 test reads `null`. The override merges over the default fields, so all four are present.

- Amended after review: the search shot left Screens for a step 7 unit test in `database_get_transactions_filter.test.ts`; a unit test asserts it, so the walk must not.

## Self-assessment
Step 3 is the least sure: the transactions hook test harness mocks three stores through selector functions and rebuilds them per `setupStores` call, and the applied-summary assertion depends on the memo chain `accounts → accountsById → accountLabelsById → appliedFilterSummary` re-running after `setAppliedFilters` inside `act`. An existing case at `:264-272` already drives `setAppliedFilters` the same way and observes the effect, so the shape is proven; what is unproven is whether the summary is readable on `result.current` synchronously after that `act` or needs a `waitFor`. The implementer should reach for `waitFor` first if the assertion reads `null`.
