# MA-055 — Archived detail data: the two usage counts, the by-id read and the detail's slot
base: 662bb98ac4bab1bcbd66ad30a887dc829fbba134 · verify: none · flags: none · expected diff: ~200 lines

## Steps

### 1. A transaction count by account, either leg, is readable
- File: `src/modules/transactions/database/transactions.ts` (new `getTransactionCountByAccount`, next to `getTransactionsByAccount` at `:252`)
- Change: `getTransactionCountByAccount(db: SQLiteDatabase, accountId: string): Promise<number>`. `SELECT COUNT(*) AS count FROM transactions WHERE account_id = ? OR to_account_id = ?`, `[accountId, accountId]`, through `db.getFirstAsync<{ count: number }>`, returning `row?.count ?? 0` as `getCategoryTransactionCount` does (`src/modules/categories/database/categories.ts:86`). The bare-column predicate is the one `getTransactionsByAccount` already plans against `idx_transactions_account_id` and `idx_transactions_to_account_id`; no function wrap, no `IS NULL OR` chain.
- Test: `__tests__/archived_account_detail.repository.test.ts`, created here. Harness as `__tests__/account.repository.test.ts:11-30`: `getExpoSQLiteTestDatabase` plus `bridgeBetterSQLite` (it bridges `getFirstAsync`; the hand-rolled bridge in `account_activity.repository.test.ts` does not, and a count through it reads `null`). Seed one category and four accounts: `arch` (`is_archived 1, is_deleted 0`), `arch_empty` (same, nothing on it), `gone` (`is_archived 1, is_deleted 1`), `live` (`0, 0`). Seed four transactions: an expense with `account_id = 'arch'`, a transfer `live -> arch` (`to_account_id = 'arch'`), a transfer `arch -> live` (`account_id = 'arch'`), and one expense on `live` alone. Cases, calling the query on `sqlite.database`: `arch` counts 3; `live` counts 3 (the two transfers and its own expense); `arch_empty` and an unknown id count 0.

### 2. An active-commitment count by default account is readable
- File: `src/modules/commitments/database/commitments.ts` (new `getActiveCommitmentCountByAccount`, next to `clearCommitmentAccount` at `:123`)
- Change: `getActiveCommitmentCountByAccount(db: SQLiteDatabase, accountId: string): Promise<number>`. `SELECT COUNT(*) AS count FROM commitments WHERE account_id = ? AND is_active = 1`, same `getFirstAsync` shape and `?? 0` fallback as step 1. The table has no index on `account_id` and the ticket accepts the scan; add none.
- Test: same suite. Seed commitments with the `account.repository.delete.test.ts:115-121` insert: `com-arch-on` (`arch`, `is_active 1`), `com-arch-off` (`arch`, `is_active 0`), `com-live-on` (`live`, `is_active 1`), `com-none` (`account_id NULL`, active). Cases: `arch` counts 1; `live` counts 1; `arch_empty` and an unknown id count 0.

### 3. One read resolves an id into the archived-detail snapshot
- File: `src/modules/accounts/repositories/archived_account_detail.repository.ts` (new)
- Change: shape of `account_activity.repository.ts`. Exports `ArchivedAccountDetailSnapshot { accountId: string; account: Account | undefined; transactionCount: number; activeCommitmentCount: number }`, `ArchivedAccountDetailLoadInput { accountId: string; mutationVersion: number }` (the version is the slot's key only; the read ignores it, as the activity input's comment says; no `now`, nothing here is time-relative), `IArchivedAccountDetailRepository { getSnapshot(input): Promise<ArchivedAccountDetailSnapshot> }`, the class, and the singleton `archivedAccountDetailRepository`. `getSnapshot` awaits `getDb()`, then one `Promise.all` over `getAccountByIdIncludingArchived(db, accountId)`, `getTransactionCountByAccount`, `getActiveCommitmentCountByAccount`. `account` is the row only when `row.is_archived === 1 && row.is_deleted === 0`, otherwise `undefined`; the counts publish as read for every id. Imports the accounts query from `../database/accounts`, never `useAccountStore` or `accountLookup`.
- Test: same suite, `new ArchivedAccountDetailRepository().getSnapshot({ accountId, mutationVersion: 0 })`. Cases: `arch` resolves with `account.id === 'arch'`, `transactionCount 3`, `activeCommitmentCount 1`; `gone` resolves `account undefined`; `live` resolves `account undefined` with its counts still `3` and `1`; an unknown id resolves `account undefined` and both counts `0`; `arch_empty` resolves with the row and both counts `0`.

### 4. The detail owns a slot for that read
- File: `src/modules/accounts/screens/accounts/detail/archived_account_detail.store.ts` (new)
- Change: copy `account_activity.store.ts:46-119` with the names swapped and the statuses the ticket names: `ArchivedAccountDetailStatus = 'idle' | 'loading' | 'ready' | 'error'`. Shape `{ snapshot, status, requestedKey, requestGeneration }`, actions `ensure`, `retry`, `reset`, factory `createArchivedAccountDetailStore(repository: IArchivedAccountDetailRepository)`, singleton `useArchivedAccountDetailStore` on `archivedAccountDetailRepository`, wrapped in `createMoneyAppSelectors`. Invariants kept from the precedent: key `${accountId}:${mutationVersion}`; an in-flight request on the same key returns its promise; `ensure` on the fresh key with a matching `snapshot.accountId` returns without reading, `retry` always reads; one `set` at request start (`snapshot: undefined, status: 'loading'`) and one at settle; the generation is re-checked before both settle publications; the rejection logs `console.error('[archivedAccountDetailStore] snapshot request failed:', error)` and publishes `status: 'error'`; `reset` bumps the generation, clears `freshKey` and `inFlight`, publishes `INITIAL_STATE`. Wire nothing into `account_detail.hook.ts`; MA-056 owns the reads and the unmount reset.
- Test: `__tests__/screens/accounts/archived_account_detail.store.test.ts`, the six cases of `account_activity.store.test.ts` against an injected `IArchivedAccountDetailRepository` with deferred promises: snapshot and status publish together (`seen` records exactly `loading` without snapshot then `ready` with it); a slower first response is dropped after a newer key started; the same key at the same version reads once; a bumped version and a different id each read again under `loading`; a rejected read logs and publishes `error` and `retry` clears it; a response after `reset` lands on `idle` with no snapshot. Plus one case in the step 1 suite: `createArchivedAccountDetailStore(new ArchivedAccountDetailRepository()).getState().ensure({ accountId: 'arch', mutationVersion: 0 })` on the bridged database publishes `ready` with `transactionCount 3`, so the slot is exercised end to end once.

## Non-goals
- The archived screen, banner, hero, fact rows, unarchive action, not-found state (MA-056), and any edit to `account_detail.hook.ts` or `index.tsx` to read or reset the new slot.
- Delete account and its warning (MA-038); it reads these counts, this task does not call it.
- The archived list and `archivedAccounts` in `account.store.ts` (MA-047, landed); keying `accountLookup` by owner (MA-043).
- A migration, an index on `commitments.account_id`, a snapshot column, an archived date.
- A count query on `commitment_payments`; the ticket counts commitments only.
- Reusing `getTransactionCountByAccount` inside `AccountRepository.delete`; MA-038 decides that.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gate check: `npx jest __tests__/archived_account_detail.repository.test.ts __tests__/screens/accounts/archived_account_detail.store.test.ts` fails at base (suites absent) and passes at head; `test -f` both paths first.

## Risks
- MA-056 may want the slot under an `archived/` screen folder rather than `detail/`; a move then is a rename, not a rewrite.
- `getFirstAsync` on the real device returns `null` for a `COUNT(*)` only if the statement fails; the `?? 0` fallback masks nothing observable but is the categories precedent.
- If MA-038 wants `deleted` ids to still carry counts for its warning, step 3 already returns them for every id; no change needed.

## Self-assessment
Step 4's status names are the one place this plan departs from the precedent it copies: the activity slot publishes `initialLoading` and `initialError`, the ticket names `loading` and `error`, and I followed the ticket. If MA-056's canvas or its hook expects the activity slot's names for a shared status type, the implementer renames four string literals and the test's expectations; nothing else in the plan depends on them.
