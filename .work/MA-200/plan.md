# MA-200 — The account lookup keeps what it read when a list load overtakes it
base: b200dd1987b5b81f505179318e46a5204e3636b1 · verify: none · flags: none · expected diff: ~55 lines

## Steps
### 1. A helper drops a row read before its account's delete
- File: `src/modules/accounts/store/account_lookup.helpers.ts` (new export `dropCopiesReadBeforeDelete`)
- Change: `dropCopiesReadBeforeDelete(rows: readonly Account[], deletedIds: ReadonlySet<string>): Account[]`, both arguments required and non-null; returns a new array in input order that keeps a row when `row.is_deleted === 1` or `deletedIds` lacks `row.id`. A delete is terminal: `setAccountDeleted` (`src/modules/accounts/database/accounts.ts:152-164`) has one caller, `account.repository.ts:166`, reached only through the store's two delete actions, so an `is_deleted === 0` row of a deleted id is always the pre-delete copy.
- Test: `first` · `__tests__/account_lookup.helpers.test.ts`, describe `dropCopiesReadBeforeDelete`: keeps the deleted row of a deleted id; drops the `is_deleted: 0` row of a deleted id; keeps active and archived rows of ids not in the set; `[]` returns `[]`.

### 2. The lookup keeps an overtaken read, and an overtaken failure shows as failed
- File: `src/modules/accounts/store/account.store.ts` (`createAccountStore`; `loadAccountLookup` `:120-149`, `refreshDeletedLookup` `:75-90`, `reset` `:183-187`)
- Change: the closure gains `let resetCount = 0` and `const deletedAccountIds = new Set<string>()`. `loadAccountLookup` stamps `resetCount` where it stamps `loadRequestId` today (`:121`); after the read it returns without writing only when `reset` ran since, else it deletes every queried id from `failedLookupIds` and merges `dropCopiesReadBeforeDelete(rows, deletedAccountIds)` into `accountLookupById`. Its catch adds the ids to `failedLookupIds` and sets `accountLookupError: true` unless `reset` ran since, then logs and rethrows as today. `refreshDeletedLookup` adds `id` to `deletedAccountIds` before it drops the cached copy. `reset` also bumps `resetCount` and clears `deletedAccountIds`. The `AccountStore` type, `loadAccountLookup(ids: string[]): Promise<void>`, the flag-clearing check at `:126-129` and `loadAccounts`' `loadRequestId` guard do not change.
- Test: `first` · `__tests__/account.store.test.ts`. Describe `accountStore.loadAccountLookup`: rewrite `discards a lookup that started before the latest account reload` (`:134`) so a lookup overtaken by a `loadAccounts` still in flight publishes `deletedB` and `archivedA`, and both resolve through `mergeAccountsById` once that reload lands; add an overtaken lookup that rejects sets `accountLookupError`, and the next ask for its id clears the flag and queries; add an overtaken lookup that publishes its row while another lookup's outstanding failure keeps the flag `true`; add an id no row holds read once by an overtaken ask and once more by a second ask, 2 calls in all; add a pending lookup that fulfils, and one that rejects, after `reset` leaves `EMPTY_ACCOUNT_LOOKUP` and the flag `false`. Describe `accountStore.deleteAccount`: `it.each` over three orders in which a pending lookup's archived pre-delete copy lands (before the delete's write, between the write and the delete's own read, after that read lands), each ending with `accountLookupById[id]` at `is_deleted: 1`, `name: ''`; add the delete's own lookup, overtaken by a `loadAccounts`, still publishes the deleted row.

### 3. The transaction detail asks the lookup once per load
- File: `src/modules/transactions/screens/transactions/detail/detail.hook.ts` (`askAgainIfMissing` and the chain at `:136-173`)
- Change: delete `askAgainIfMissing` and its comment at `:136`; the lookup becomes one `loadAccountLookup(accountIds)` call whose rejection goes to `logLookupFailure` and which runs `settle` once it fulfils or rejects, keeping the `try` that settles on a synchronous throw. `mergeAccountsById`, `findMissingAccountIds` and `useAccountStore` stay imported for `:243`, `:263` and `:95`.
- Test: `first` · `__tests__/screens/transactions/detail/detail_hook.test.ts`, describe `useTransactionDetail transfer flow lookup (MA-196)`: rewrite `:737` to one call, still drawing `Unknown account` with no amount; rewrite `:754` as a lookup that publishes the deleted counterparty after a deferred: one call, no settled render reads `Unknown account`; rewrite `:772` as a rejection that leaves `accountLookupError` false: one call, the cells draw; rewrite `:877` in `a refresh by reload on a settled transfer with an unknown side never returns to the skeleton` (`:865`) to `lookupsBefore + 1`, so the reload reads `missing-z` once; add `accountLookupError` set `true` before mount while the lookup publishes the deleted counterparty: one call, the To cell reads `Deleted Account`, `refreshError` is `false`.

### 4. The edit sheet asks the lookup once per load
- File: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_prerequisites.helpers.ts` (`ensureTransactionFormPrerequisite` `:21-30`) and `transaction_form_prerequisites.hook.ts` (`loadPrerequisites` `:30-34`)
- Change: the helper's signature becomes `(isReady: () => boolean, load: () => Promise<void>, attempts: number = MAX_LOAD_ATTEMPTS): Promise<void>`, `attempts` optional and non-null; the helpers file exports `ACCOUNT_LOOKUP_ATTEMPTS = 1`, and the hook's lookup prerequisite passes it as the third argument. The account and category list prerequisites keep the default of 2. The hook is the helper's only caller.
- Test: `first` · `__tests__/screens/transactions/transaction_form/transaction_form_prerequisites.test.ts`: add a lookup that resolves without publishing the edited transaction's account: one call, status `error`; add `toHaveBeenCalledTimes(1)` to `hydrates an archived account required by Edit` (`:145`).

### 5. ADR 2026-09-15 records the kept read
- File: `docs/adr/2026-09-15-account-lookup-keyed-by-id.md` (§3)
- Change: an `**Amended 2026-10-18, MA-200 (#766).**` paragraph closing §3, in the form §4's amendment uses: an overtaken lookup publishes every row it read except an `is_deleted = 0` copy of an id the store deleted, which `refreshDeletedLookup` records before it drops the cached copy; only `reset` discards a lookup in flight; a failed read sets `accountLookupError` whether or not a reload overtook it; the detail and the edit sheet ask once per load.
- Test: `none` · a doc; `npm run lint` checks its phrasing.

### 6. ADR 2026-10-17 drops the detail's second ask
- File: `docs/adr/2026-10-17-transfer-flow-cells.md` (§3 and What this does not decide)
- Change: an `**Amended 2026-10-18, MA-200 (#766).**` paragraph closing §3: the hook asks once and settles on fulfil or reject, and since the store keeps an overtaken read the skeleton holds until the overtaken accounts draw. A matching one-line amendment in What this does not decide: the repeat moved into the store as a kept read, and an id no row holds is read once per ask.
- Test: `none` · a doc; `npm run lint` checks its phrasing.

## Non-goals
- The transfer flow card's cells (MA-196).
- A cache of ids no row holds (ADR 2026-09-15 §2 keeps no cache of misses); an in-flight flag in the store.
- `transactions.hook.ts` and `account_detail.hook.ts`: each asks once per effect run already (`transactions.hook.ts:350`, `:622` on Try again; `account_detail.hook.ts:183`); no change.
- `loadAccounts`' generation guard and the list prerequisites' two attempts.
- The detail's refresh error floating while its lookup is in flight under another screen's outstanding failure (ADR 2026-09-15 §3, unchanged).

## Untested inputs
- The transactions list, its Try again, and the account detail's activity reach the kept read only through step 2's store cases; their hooks do not change and get no case.
- A `loadAccounts` that overtakes a lookup and then rejects: step 2 publishes the lookup's rows either way, and no case drives the rejection.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- A soft delete added outside `deleteAccount` and `deleteAccountMovingCommitments` would let a pre-delete copy land: `deletedAccountIds` only knows the ids `refreshDeletedLookup` saw.
- With the generation guard gone, only `reset` discards an in-flight lookup; `reset` has no caller under `src/` at b200dd19, so its cases are the only proof.
- Step 2's three-order delete case needs microtask flushing between the delete's write and its own read; a test that resolves the pending lookup too early tests the first order three times.

## Self-assessment
Step 2 is the one I am least sure of. It swaps a timing guard for a fact-based filter, and that holds on two facts: a delete never reverts (`setAccountDeleted`'s predicate and the repository's `is_deleted === 1` refusals), and the lists override every non-deleted copy in `mergeAccountsById`. If either fact breaks, a stale name and filled tile come back on a deleted account. The three-order delete case is the test that would catch it, and it is also the case most easily written so it never reaches the middle order.
