# MA-053 — Editing a transaction still moves an archived account's balance
base: 662bb98ac4bab1bcbd66ad30a887dc829fbba134 · verify: emulator · flags: money path, user copy · expected diff: ~120 lines outside tests and docs

## Steps
### 1. The transactions module has a typed refusal that names the account
- File: `src/modules/transactions/repositories/transaction.errors.ts`
- Change: add `TransactionAccountArchivedError extends TransactionValidationError` with `readonly role: 'source' | 'destination'`, `readonly accountId: string`, `readonly accountName: string`; constructor `(role, account: Pick<Account, 'id' | 'name'>)`, message `` `${role} account is archived` `` (the string `git grep "account is archived"` finds today), `issues` left `[]`, `this.name` set like its siblings. Subclassing keeps every `catch` that reasons about `TransactionValidationError` valid; the name travels in the error because the repository is the only layer that read the row.
- Test: `none`; the class is exercised by steps 2 and 5.

### 2. `add`, `update` and `delete` refuse an archived leg before any write
- File: `src/modules/transactions/repositories/transaction.repository.ts` (`requireSelectableAccount` `:125`, `add` `:265`, `delete` `:342`, `update` `:369`)
- Change: `requireSelectableAccount` throws `TransactionAccountArchivedError(role, account)` on its unchanged predicate `is_archived === 1` (add's refusal "as today"). Add `requireUnfrozenAccount(account, role)` with predicate `is_archived === 1 && is_deleted === 0`, the one `setAccountDeleted` and `setAccountUnarchived` use; call it in `delete` and `update` on `source` and, when present, `destination`, right after the two `loadAccount` calls and before `validateNormalizedInput` or `toPolicyCommand`. Nothing else in either method moves. `applyAccountDelta` and the policy resolvers are untouched.
- Test: `__tests__/transaction.repository.test.ts`, new `describe('archived accounts are frozen history (MA-053)')` with an `afterEach` that runs `UPDATE accounts SET is_archived = 0, is_deleted = 0` on `acc1` and `acc2` (the suite's `beforeEach` resets balances only). Cases, each asserting the throw is `TransactionAccountArchivedError` with `role` and `accountName`, the row unchanged and both balances unchanged: update refused on the source leg (`acc1` archived); delete refused on the source leg; update refused on a transfer's destination leg (`acc1 → acc2`, `acc2` archived); delete refused on that destination leg; add refused with the same class on source and on destination (untested today); the carve-out: `is_archived = 1, is_deleted = 1` on `acc1`, update and delete both succeed and `acc1`'s balance moves; the restore: archive `acc1`, refusal, `is_archived = 0`, the same update succeeds.

### 3. The accounts module has a typed refusal for an archived account
- File: `src/modules/accounts/repositories/account.errors.ts`
- Change: add `AccountArchivedError extends Error`, default message `'An archived account is frozen; restore it first'`, `this.name` set like its siblings. No strings entry: the classes are the contract (MA-047 record §2).
- Test: `none`; exercised by step 4.

### 4. Adjust balance refuses an archived or deleted account and writes nothing
- File: `src/modules/accounts/repositories/account.repository.ts` (`adjustBalance` `:135`), `src/modules/accounts/database/accounts.ts` (`setAccountBalance` `:164`)
- Change: `adjustBalance` reads the row with `getAccountByIdIncludingArchived` first; missing or `is_deleted === 1` throws `AccountNotFoundError`, `is_archived === 1` throws `AccountArchivedError`, the shape `unarchive` and `delete` already use. `setAccountBalance`'s `WHERE` gains `AND is_archived = 0 AND is_deleted = 0`, so the statement cannot land on a frozen row even without the read; its `changes !== 1` throw stays.
- Test: `__tests__/account.repository.test.ts`, inside `AccountRepository.adjustBalance — TC-M15-03`: archived (`repo.archive(id)`, then `balance_review_required = 1` by SQL) rejects with `AccountArchivedError` and `current_balance`, `balance_review_required`, `updated_at` all unchanged; deleted (`repo.archive` then `repo.delete`) rejects with `AccountNotFoundError`, balance unchanged; a missing id rejects with `AccountNotFoundError`.

### 5. One line of copy, and two mappers that produce it
- File: `src/constants/strings.ts` (next to `transactionSaveError` `:473`), `src/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers.ts` (`resolveTransactionSaveError` `:126`)
- Change: `txAccountArchived: (name: string) => \`${name} is archived. Restore it to change this transaction.\`` (team-decided at delivery; states what is true and the way out, no apology, no retry). `resolveTransactionSaveError` checks `instanceof TransactionAccountArchivedError` first and returns `Strings.txAccountArchived(error.accountName)`; it must run before the `issues` branch, since the subclass carries `issues: []` and would otherwise fall to the generic string. Add `resolveTransactionDeleteError(error: unknown): string` beside it: the same class maps to the same line, anything else to `Strings.errDeleteFailed`. The add path (`add_transaction.hook.ts:472`) and the edit form (`edit_transaction.hook.ts:382`) already call the save mapper and need no edit.
- Test: `__tests__/screens/transactions/transaction_form/transaction_form.helpers.test.ts`: the save mapper returns the line for `TransactionAccountArchivedError('source', { id: 'a', name: 'Old Card' })` and still the generic string for a bare `TransactionValidationError`; the delete mapper returns the line for the class and `Strings.errDeleteFailed` for `new Error('x')`. `__tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts`, beside `shows a save error and preserves edits after update rejection` (`:249`): `installMockUpdateTransaction` rejecting with the class, `state.errorMessage` is the line and the edits stay.

### 6. The list's swipe delete shows the line
- File: `src/modules/transactions/screens/transactions/transactions.hook.ts` (`deleteErrorMessage` `:447`)
- Change: `deleteErrorMessage: deleteAction.error ? resolveTransactionDeleteError(deleteAction.error) : undefined`, imported from `./transaction_form/transaction_form.helpers`. `useConfirmAction` already keeps the payload pending on a rejection, so the sheet stays open with the line; nothing else on the screen changes.
- Test: `__tests__/screens/transactions/transactions_hook.test.ts`, in `useTransactions screen orchestration`: `setupStores({ deleteTransaction: jest.fn().mockRejectedValue(new TransactionAccountArchivedError(...)) })`, request then confirm, `state.deleteErrorMessage` is the line and `state.pendingDeleteId` is still `'tx-1'`; a plain `Error` still yields `Strings.errDeleteFailed`.

### 7. The detail hides Edit and Delete on an archived leg and says why
- File: `src/modules/transactions/screens/transactions/detail/detail.hook.ts` (`isEditable`/`isDeletable` `:245`, `confirmDelete` `:191`), `src/modules/transactions/screens/transactions/detail/components/action_row.tsx`, `src/modules/transactions/screens/transactions/detail/index.tsx` (`editable` `:41`, the `ActionRow` branch `:134`)
- Change: the hook derives `archivedLeg` from `accountsById`: the source account, else the destination, whose `is_archived === 1 && is_deleted === 0`; `isEditable` and `isDeletable` become `!isCommitmentOwned && archivedLeg === undefined`; `openEdit` and `openDeleteConfirm` gate on those instead of `isCommitmentOwned` alone; the returned state adds `archivedAccountLine: archivedLeg ? Strings.txAccountArchived(archivedLeg.name) : undefined`; `confirmDelete`'s alert uses `resolveTransactionDeleteError(e)`. `ActionRow` gets a third exclusive prop shape `{ notice: string }` that renders the line as `Text` (`text-muted`, `Type.meta` with `lineHeightFor`) in the same padded container at `DETAIL_ACTION_MIN_HEIGHT`, no button. `index.tsx` passes `editable={hasDetailContent && state.isEditable}` and branches commitment-owned, then `state.archivedAccountLine`, then delete. The `TxDeleteConfirmSheet` already sits behind `state.isDeletable`. No badge on the list row.
- Test: `__tests__/screens/transactions/detail/detail_hook.test.ts`, new describe: with `accountLookup` holding `account-1` at `is_archived: 1, is_deleted: 0`, `isEditable` and `isDeletable` are `false`, `archivedAccountLine` is the line with the account's name, `openEdit` does not call the form host, `openDeleteConfirm` leaves `confirmVisible` false; the same with `is_deleted: 1` keeps both `true` and the line `undefined`; a transfer whose destination is archived hides both; `deleteTransaction` rejecting with the class alerts the line. Rendering of `ActionRow`'s new shape: `none`, render suites are closed to additions.

### 8. The decision record, and the unarchive record points at it
- File: `docs/adr/2026-09-15-archived-account-is-frozen-history.md` (new), `docs/adr/2026-09-09-account-unarchive-sort-position.md` §4 (`:44`)
- Change: the new record, in the house shape (Date, Status, Ticket #458 MA-053 under #378, Applies to), states the rule: archived is frozen history; no write moves the balance of an archived, undeleted account; `add`, `update`, `delete` and `adjustBalance` refuse with `TransactionAccountArchivedError` / `AccountArchivedError`; the predicate is `is_archived = 1 AND is_deleted = 0` and why the deleted carve-out exists (soft-delete record §1); the way to change history is restore, change, archive again; `markAsPaid` unchanged; no recompute, no snapshot column. In the unarchive record §4 replace the second paragraph ("That is not a freeze…balance at archive time") with two sentences: the balance on restore is the balance at archive time, and the rule lives in the new record. The frozen spec under `docs/superpowers/` is not edited.
- Test: `none`, documentation.

## Screens
- Transaction detail, a transaction whose account was archived after it was written: header without the Edit pencil, no Delete button, the line naming the account in its place. One shot.

## Decision record
- `docs/adr/2026-09-15-archived-account-is-frozen-history.md`: no write moves the balance of an archived, undeleted account; restore first. Step 8 adds it.

## Non-goals
- The archived account detail, its hero label and counts (MA-055, MA-056); the archived card and unarchive from a row (MA-048).
- Hiding or badging the swipe actions on a list row with an archived leg; the row is unchanged and the repository refuses.
- Any predicate on `applyAccountDelta`, and any change to `markAsPaid`'s archived refusal or the pay sheet's copy.
- Recomputing a balance from history, a snapshot column, an archived date, a migration.
- Copy for `AccountArchivedError` on the adjust sheet: the sheet is unreachable for an archived account today and keeps `adjustBalanceSaveError`.
- Widening add and edit name checks to archived accounts (audit L12); reversing a legacy card payment (audit M23).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gate check at base vs head: `npx jest __tests__/transaction.repository.test.ts -t "frozen history"` fails at base (no such class) and passes at head; `test -f` every jest path above before citing it.

## Risks
- MA-043 (#441) rewrites the account lookup the detail reads archived state from; whichever lands second rebases step 7.
- The detail's `accountsById` is empty until the lookup resolves, so Edit can show for one frame before hiding; the repository refuses regardless, and the copy still surfaces through step 5.
- The repository guards read outside `withTransactionAsync`; an archive landing between the read and the write goes through, the same window `unarchive` accepts with one local writer.
- Extending `TransactionValidationError` means the mapper order in step 5 is load-bearing; reversing the two checks silently returns the retry string.

## Self-assessment
Step 7 is the one I am least sure about. The hook change and the `index.tsx` branch are mechanical, but `ActionRow`'s third exclusive prop shape has no logic test because render suites are closed, so its only proof is the emulator shot and `tsc` on the discriminated props. The name-in-the-error decision in step 1 is the other judgement call: it lets four screens print the same line without a lookup, at the cost of the error carrying display data; for a deleted account reached through `add` the name is `''`, which no picker can produce today.
