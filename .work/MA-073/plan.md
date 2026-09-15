# MA-073 — Transactions: "Unnamed account" on the archived-account notice and its edit and delete error
base: c9f41e99 · verify: emulator · flags: none · expected diff: ~25 lines

Contract decision: `TransactionAccountArchivedError` takes a full `Account` and resolves the label once, in its constructor, through `resolveAccountName`. The field is renamed `accountName` → `accountLabel` so the type says what it carries. Both throw sites (`transaction.repository.ts:128`, `:132`) already pass a full `Account`, so they do not change; the add refusal at `:128` sees `is_deleted` and gets "Deleted Account" from the resolver's ordering with no branch of its own. The alternative, resolving at the throw sites and keeping `Pick<Account, 'name'>`, leaves no test at the form helper that can fail on this ticket, which Acceptance asks for. The repository already imports `Strings` (`transaction.repository.ts:4`), so the errors file pulling `@/utils/account_name` sets no new layering precedent.

## Steps
### 1. Every constructor call site builds a full `Account`, ahead of the widening
- File: `__tests__/screens/transactions/transactions_hook.test.ts:230`, `__tests__/screens/transactions/detail/detail_hook.test.ts:657`, `__tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts:270`, `__tests__/screens/transactions/transaction_form/transaction_form.helpers.test.ts:96,107`
- Change: `{ name: 'Old Card' }` → `makeTestAccount({ name: 'Old Card' })`. `transaction_form.helpers.test.ts` gains the `@/test_helpers/transaction` import; the other three already have it.
- Test: none, this step is the existing tests; `makeTestAccount({ name: 'Old Card' })` already satisfies `Pick<Account, 'name'>`, so the branch is green at this commit and their assertions on `Strings.transactionAccountArchived('Old Card')` stay byte-identical.

### 2. The error carries the resolved label, and a blank or deleted archived account resolves through the shared rule
- File: `src/modules/transactions/repositories/transaction.errors.ts` (`TransactionAccountArchivedError`, `:22-32`)
- Change: constructor parameter `account: Account`; field `readonly accountLabel: string` set to `resolveAccountName(account)` (import from `@/utils/account_name`). Remove `accountName`. `role` and the `message` stay as they are.
- Test: `__tests__/transaction.repository.test.ts`, written first, in the archived-refusal describe near `:1000`. `expectArchivedRefusal` matches `{ role, accountLabel }` instead of `{ role, accountName }` (its four callers pass 'Bank'/'Savings' unchanged). Add two cases: `UPDATE accounts SET name = '   ', is_archived = 1 WHERE id = 'acc1'` then `repo.update(tx.id, expenseEdit)` refuses with `accountLabel === Strings.unnamedAccount` and `storedAmount` unchanged; `setAccountFlags('acc1', { archived: 1, deleted: 1 })` then `repo.add(baseInput)` refuses with `accountLabel === Strings.deletedAccount`. `afterEach` restores `name = 'Bank'` alongside the flags. Both fail at base (base stores the raw name).

### 3. The form helper's error line reads the label (one commit with step 2)
- File: `src/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers.ts` (`resolveArchivedAccountLine`, `:127-131`)
- Change: `error.accountName` → `error.accountLabel`. `resolveTransactionSaveError` and `resolveTransactionDeleteError` (and their consumers, `transactions.hook.ts:469`, `detail.hook.ts`, the edit hook) are untouched.
- Test: `__tests__/screens/transactions/transaction_form/transaction_form.helpers.test.ts`, written first, next to the two MA-053 cases at `:96-115`: `new TransactionAccountArchivedError('source', makeTestAccount({ name: '  ', is_archived: 1 }))` through `resolveTransactionSaveError` and `resolveTransactionDeleteError` both read `Strings.transactionAccountArchived(Strings.unnamedAccount)`. Fails at base with the blank line.

### 4. The detail notice reads the resolver
- File: `src/modules/transactions/screens/transactions/detail/detail.hook.ts:268` (`archivedAccountLine`)
- Change: `Strings.transactionAccountArchived(archivedLeg.name)` → `Strings.transactionAccountArchived(resolveAccountName(archivedLeg))`; import `resolveAccountName` from `@/utils/account_name`. `archivedLeg` is already the full `Account` from `accountsById` and is frozen (`isFrozenAccount`, `:184`), so the resolver never takes its deleted branch here.
- Test: `__tests__/screens/transactions/detail/detail_hook.test.ts`, written first, in `useTransactionDetail archived account (MA-053)` after the case at `:596`: `accountLookupById = { 'account-1': makeTestAccount({ id: 'account-1', name: '   ', is_archived: 1 }) }`, expect `archivedAccountLine` to be `Strings.transactionAccountArchived(Strings.unnamedAccount)` and `isEditable`/`isDeletable` false. Fails at base with the blank line.

## Screens
- Transaction detail, a transaction whose source account is archived with a blank stored name (`UPDATE accounts SET name = '', is_archived = 1, is_deleted = 0 WHERE id = ?` by SQL, then open the transaction): the archived notice reads "Unnamed account is archived. Restore it to change this transaction." with edit and delete hidden. One shot. The named-archived notice, the deleted branch and the edit/delete error text are asserted in steps 2, 3 and 4 and are not shot.

## Non-goals
- The transaction form's From and To rows, the filter options and both summaries (MA-062, #465).
- Names of only invisible characters (MA-070, #487).
- Changing `resolveAccountName`'s signature (it takes `Account | undefined`; the error carries the full row instead), `Strings.transactionAccountArchived`'s copy, or the throw sites in `transaction.repository.ts`.
- Trimming or rewriting any stored name; the label is never written and never compared with a stored name.
- The commitment pay path's own refusal (`commitment.repository.ts:212`) and the list-row, title and transfer-card labels, which already read the resolver.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gate check: `npm test -- --ci __tests__/screens/transactions/transaction_form/transaction_form.helpers.test.ts __tests__/screens/transactions/detail/detail_hook.test.ts __tests__/transaction.repository.test.ts` (all three `test -f` at HEAD) is red after the step-2/3/4 tests land and green after their changes.

## Risks
- Amended: steps reordered so the test-site move (`makeTestAccount`, green at HEAD) lands first and the widening lands with the helper read in one commit; a step-1 commit of the old order failed `typecheck` on `{ name: 'Old Card' }` and `error.accountName`.
- A caller of `TransactionAccountArchivedError` outside the eight sites above (`grep -rn TransactionAccountArchivedError src __tests__` at HEAD lists exactly those) would break typecheck on the widened parameter.
- If the reviewer wants the error class free of `Strings`, the fallback is resolving at the two throw sites with `{ name: resolveAccountName(account) }`; step 1 and the helper-level blank test then move to the repository test only.
- The repository test's `afterEach` resets flags but not `name`; the step-2 blank case must restore `'Bank'` or the later 'Bank' assertions in the same describe fail on order.

## Self-assessment
Step 2 is the one I am least sure about: resolving the label inside a repository-layer error class puts user copy one layer lower than the MA-053 design, which stored the raw name and applied `Strings` in the presentation helpers. I chose it because it is the only shape where the form helper's own test can fail on this change, which Acceptance names, and because the repository already imports `Strings`. If the review prefers the presentation layer to own the label, the error should carry `account: Account` and the helper call `resolveAccountName(error.account)`; that is a rename of one field either way and the tests stay the same.
