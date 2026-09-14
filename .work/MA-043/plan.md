# MA-043 — Key the account lookup by account id and merge across its readers (audit L27)
base: 662bb98ac4bab1bcbd66ad30a887dc829fbba134 · verify: emulator · flags: money path · expected diff: ~190 lines

## Steps
### 1. One merge order, in one helper: cache first, archived list, then active list, so the lists win
- File: `src/modules/accounts/store/account_lookup.helpers.ts` (new)
- Change: `mergeAccountsById(accounts: readonly Account[], archivedAccounts: readonly Account[], lookupById: Readonly<Record<string, Account>>): Map<string, Account>` builds the map from `Object.values(lookupById)`, then `archivedAccounts`, then `accounts`, so a later entry replaces an earlier one with the same id. Pure, no store import; the store and the four readers call it in steps 3 and 4.
- Test: `__tests__/account_lookup.helpers.test.ts`: an id in the cache and the active list resolves to the active row's name; an id in the cache and the archived list resolves to the archived row; a cache-only id survives; an empty everything yields an empty map.

### 2. The list has a fourth banner variant and its one new string
- File: `src/constants/strings.ts` (`:1181`, after `transactionsLoadMoreError`)
- Change: `transactionsAccountLookupError: 'Could not load account details.'`. The only new string on the ticket; the detail keeps `detailRefreshErrorTitle`.
- File: `src/modules/transactions/screens/transactions/components/transaction_load_error.helpers.ts` (`TransactionLoadErrorTitleVariant`, `TRANSACTION_LOAD_ERROR_TITLES`)
- Change: add `'accounts'` mapped to the new string. `TransactionLoadError` (`transaction_load_error.tsx:44-53`) already renders every variant other than `initial` and `pagination` as the floating banner, so it does not change.
- File: `src/modules/transactions/screens/transactions/transactions.presentation.ts` (`TransactionLoadErrorVariant`, `TransactionsPresentationInput`, `buildTransactionsPresentation`)
- Change: `TransactionLoadErrorVariant` gains `'accounts'`; input gains `accountLookupError: boolean`; the ladder at `:35-41` becomes refresh, totals, then `'accounts'` when `accountLookupError`, else `'none'`. `showFirstLoadError` still forces `'none'`.
- File: `src/modules/transactions/screens/transactions/transactions.hook.ts` (`:349-355`, the only call site)
- Change: pass `accountLookupError: false` so the branch typechecks; step 4 replaces the literal with the gated expression.
- Test: `__tests__/screens/transactions/transaction_load_error.helpers.test.ts`: add the `['accounts', Strings.transactionsAccountLookupError]` row (the distinctness case covers it). `__tests__/screens/transactions/transactions_presentation.test.ts`: `input()` gains `accountLookupError: false`; rows for `{ accountLookupError: true }` → `'accounts'`, `{ accountLookupError: true, listStatus: 'refreshErrorWithData' }` → `'refresh'`, `{ accountLookupError: true, totalsStatus: 'firstLoadError' }` → `'totals'`, `{ accountLookupError: true, listStatus: 'firstLoadError', rowCount: 0, hasLoadedOnce: false }` → `'none'`.

### 3. The slot becomes a map keyed by id that only grows, with one error field and the reload generation as its guard
- File: `src/modules/accounts/store/account.store.ts` (`INITIAL_STATE:18-25`, `AccountStore:27-37`, `createAccountStore:39-162`)
- Change: `accountLookup` goes; `INITIAL_STATE` gains `accountLookupById: EMPTY_ACCOUNT_LOOKUP` (exported, `Object.freeze({})` typed `Readonly<Record<string, Account>>`) and `accountLookupError: false`. `lookupRequestId` goes, including its bump in `reset`. `loadAccountLookup(ids)`:
  1. `const generation = loadRequestId;` then `missing` = the deduplicated ids absent from `mergeAccountsById(accounts, archivedAccounts, accountLookupById)` read from `get()` at that moment. `missing.length === 0` returns without a query and without a `set`, so an empty id list, or one already resolved, is a no-op and leaves `accountLookupError` as it was.
  2. Only past that return, if `accountLookupError` is set, `set({ accountLookupError: false })`: the retry clears it before it re-runs, and only a load that queries is a re-run.
  3. `await repo.getByIdsIncludingArchived(missing)`; if `generation !== loadRequestId` after the await, return without publishing. Otherwise functional `set((s) => ({ accountLookupById: { ...s.accountLookupById, ...Object.fromEntries(rows.map((r) => [r.id, r])) } }))`. An id the query returns no row for is not cached; nothing removes an entry.
  4. On rejection: `set({ accountLookupError: true })` only when `generation === loadRequestId`; keep the `console.error` and the rethrow, which the edit form's prerequisite at `transaction_form_prerequisites.hook.ts:30-34` turns into its own error state.
  A lookup that runs before `loadAccounts` has published caches active rows; harmless, because step 1's order lets the lists win on every read.
- File: `src/modules/transactions/screens/transactions/transactions.hook.ts` (`:91-93`, `:307-310`)
- File: `src/modules/transactions/screens/transactions/detail/detail.hook.ts` (`:48-50`, `:151-154`)
- File: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts` (`:123-128`, `:191-194`)
- File: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_prerequisites.helpers.ts` (`getMissingTransactionFormAccountIds:27-35`)
- File: `src/modules/onboarding/domain/starting_net_position.ts` (`:42`)
- Change: the comment names the removed field; rewrite it as "The store's lookup cache carries archived rows, so the filter is needed here as well as in SQL."
- Change, all four readers: read `accounts`, `archivedAccounts`, `accountLookupById` (the three hooks through their existing `useShallow`; the helper through `getState()`) and build the map with `mergeAccountsById`; the prerequisites helper filters on `.has`. No other line in these files changes in this step.
- Test, written first: `__tests__/account.store.test.ts:78-126` replaced by, on `createAccountStore(makeRepo(...))`: two loads with different ids leave both rows in `accountLookupById`; a load whose ids are all in `accounts` or `archivedAccounts` (published by `loadAccounts` with the repo's `getAll`/`getArchived` mocked) or already cached calls `getByIdsIncludingArchived` never; `loadAccountLookup([])` leaves `accountLookupById` the same reference and calls nothing; a lookup started on a deferred `getByIdsIncludingArchived` before `loadAccounts()` is called, with `loadAccounts()` then called and awaited, and the lookup resolved last, leaves `accountLookupById` empty, `getByIdsIncludingArchived` called once (a lookup started while a reload is in flight shares its generation and publishes; that is the guard's contract, not a case here); a rejected lookup sets `accountLookupError` and rethrows, the next load that queries clears it before querying, and a succeeding one leaves it false; a load whose ids are all resolved, and `loadAccountLookup([])`, leave `accountLookupError` true; `reset()` returns `accountLookupById` to `EMPTY_ACCOUNT_LOOKUP` and `accountLookupError` to false (extend `:138-140`). Mock and `setState` shapes: `transactions_hook.test.ts:141-146` and `detail_hook.test.ts:128-132` add `archivedAccounts: []`, `accountLookupById: {}`, `accountLookupError: false`; `transaction_form_prerequisites.test.ts:67,152`, `transaction_form_host_state.test.ts:63,130`, `edit_transaction.hook.test.ts:92` write `accountLookupById: { [row.id]: row }` in place of the array.

### 4. The list shows the lookup error as its floating banner and retries the lookup
- File: `src/modules/transactions/screens/transactions/transactions.hook.ts` (`:91-93`, `:349-355`, `retryFailedLoads:387-397`)
- Change: `accountLookupError` joins the `useShallow` read. The `accountLookupError: false` literal from step 2 becomes `accountLookupError && transactionAccountIds.some((id) => !accountsById.has(id))`, so the shared field paints this screen only while one of its visible rows is unresolved. `retryFailedLoads` adds a third branch: when that gated flag is set, `loadAccountLookup(transactionAccountIds).catch(() => {})`; the gate guarantees a missing id, so the store queries and clears the field before it does. The effect at `:232-234` stays as it is: the field now carries the rejection it swallows. `index.tsx:221-226` and the strings of the other variants are unchanged.
- Test: `__tests__/screens/transactions/transactions_hook.test.ts`, next to the totals cases at `:747-773`: with `transactions: [TRANSACTION]`, `status: 'ready'` and the mock store at `accountLookupError: true`, `loadErrorVariant` is `'accounts'`; then, once the hook has settled, `loadAccountLookup.mockClear()`, `await retryFailedLoads()`, and assert `toHaveBeenCalledTimes(1)` with `['account-1']`, so the mount effect's own call at `:232-234` cannot satisfy it; with the same error but `accountLookupById: { 'account-1': row }`, the variant is `'none'`.

### 5. The detail shows the lookup error as its floating error, with `reload` as the retry
- File: `src/modules/transactions/screens/transactions/detail/detail.hook.ts` (`:48-50`, `:157-164`, `:234-247`)
- Change: `accountLookupError` joins the `useShallow` read. `hasUnresolvedAccount` = `currentTx !== null` and `account_id` or a non-null `to_account_id` is absent from `accountsById`. `currentRefreshError` becomes `(activeId === id && refreshError) || (accountLookupError && hasUnresolvedAccount)`; it feeds `resolveDetailViewState` and `state.refreshError` as today, so `index.tsx:156` renders `DetailLoadError floating onRetry={reload}` with no change. `reload` re-runs the effect at `:58-109`, whose `loadAccountLookup` call queries the still-missing ids, which the gate guarantees exist, and clears the field before it does. The catch at `:81-86` keeps its log.
- Test: `__tests__/screens/transactions/detail/detail_hook.test.ts`: the account store mock becomes a mutable `accountStoreState` like `transactionStoreState`, and `loadAccountLookup` merges fixture rows for the requested ids into a new `accountLookupById` object. Cases: `accountLookupError: true` with `account-1` unresolved gives `state.refreshError` true and `viewState` `'refreshErrorWithData'`; the same error with `account-1` in `accountLookupById` gives false. Two copies, after the pattern at `:430-449`: `lower` on a Transfer to `archived-a`, `upper` on a Transfer to `deleted-b`, source account in `accounts`; after both are ready and rerendered, each `derived.transferFlow` is non-null and `derived.accountLabel` names its own destination; after `upper` unmounts and `lower` refocuses and rerenders, `lower` still names `archived-a` with a non-null `transferFlow`. The existing `:250-262` case stays: the label is `Strings.unknownAccount` while the mock rejects.

### 6. Decision record
- File: `docs/adr/2026-09-15-account-lookup-keyed-by-id.md` (new)
- Change: the record named under Decision record below, in the shape of `docs/adr/2026-09-09-account-unarchive-sort-position.md`, ~30 lines.
- Test: none, a document.

## Screens
Seed: one active EGP account, one archived USD account, one Transfer from the EGP account to the USD account, and one Transfer to an account soft-deleted afterwards. Force the error states with a one-line rejection at the top of `loadAccountLookup`, as the `loadError` pattern did.
- Transactions list: the two transfer rows naming the archived and the deleted account with the USD leg labelled `USD` and 2 decimals, before opening a detail, while a detail is open above it, and after returning; the floating `Could not load account details.` banner with the rows behind it reading `Unknown account`; the banner gone after Retry with the force removed.
- Transaction detail, tabbed (`/transactions/detail/<id>` from the list): the transfer block and the `A → B` account row for the archived counterparty; the same after the stacked path below and two Backs; the floating `Could not refresh this transaction.` error over the content, transfer block replaced by its skeleton, under the force; gone after Retry.
- Transaction detail, stacked (source account → activity row, `account_detail.hook.ts:246`): its own counterparty named and its transfer block shown while the tabbed copy is mounted below.

## Decision record
- `docs/adr/2026-09-15-account-lookup-keyed-by-id.md`: the lookup is a by-id cache that only grows within a session, the active and archived lists win over it, and it only ever feeds display, the currency a transfer leg formats with; an unresolved row still falls back to EGP at `transaction_row.helpers.ts:111` and `detail.helpers.ts:147`, and the new banner is what tells the user why. Step 6 adds the file.

## Non-goals
- The pay sheet's slot (MA-050, #452) and the commitment edit screen's (MA-051, #453) stay owner-keyed.
- The detail's private `withEntry` in `detail.state.ts:50` and `detail.store.ts` stays; MA-050 or MA-051 moves it.
- `resolveAccountName` and the deleted-account wording (MA-020, #386) are unchanged.
- The account detail's by-id read and slot (MA-055, #460).
- No eviction, no refresh on an account write, no cached misses, no change to `getAccountsByIdsIncludingArchived` (`accounts.ts:31-43`), no migration.
- No new component, no change to `LoadErrorAlert`, `TransactionLoadError` or `DetailLoadError`; the detail's title stays `detailRefreshErrorTitle`.
- `archivedAccounts` is not added to `src/modules/accounts/index.ts`; readers import the store.
- The EGP fallback for an unresolved transfer leg stays; nothing recomputes an amount.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The edit form's prerequisite failure sets the shared field too; the list under the sheet shows the banner if it carries the same unresolved id. Accepted by the one-field rule; the form's own error state is unchanged.
- The two-copy detail test runs against the mocked account store, so only `__tests__/account.store.test.ts` proves the merge itself; a regression in the store's `set` would pass step 5's test.
- An id with no row in `accounts` is re-queried on every load; unreachable through the FK, so no miss cache.
- LSP `findReferences` on the store fields returned the declaration only; the consumer list is `git grep -n "accountLookup" src __tests__`: six `src` files, eight test files, all named above.
- Step 3 is one commit across five `src` files and six test files, because the field rename does not typecheck half-applied.
- Amended after the second review: step 4's retry test clears the mock before the retry so the mount effect's call cannot satisfy it; step 3's discard test states the order, lookup started before `loadAccounts()` is called; step 3 rewrites the `starting_net_position.ts:42` comment that named the old field.
- Amended after review: step 2 now passes `accountLookupError: false` at the presentation call site so steps 2 and 3 typecheck; step 3 clears the error only on a load that queries, so a no-query load or an empty id list leaves the banner up until a real retry.

## Self-assessment
Step 5's gate is the step I am least sure of. The ticket says the detail shows its floating error "when a lookup fails"; the plan shows it only while the transaction on screen has an unresolved account, because the field is shared and a copy whose accounts resolved should not wear another screen's failure. That reading makes the retry meaningful on every screen that shows the banner, but a reviewer holding the acceptance line literally may want the ungated field, which is a one-expression change in steps 4 and 5 and no test beyond dropping the "resolved → none" cases.
