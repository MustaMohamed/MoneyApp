# MA-047 — Unarchive an account: the write, the archived list and the store slot
base: 4e874579a81d16d5443eb4bcc856a84fdae83eae · verify: none · flags: money path · expected diff: ~80 lines

Names used below: query `setAccountUnarchived` and `getArchivedAccounts`, repository `unarchive` and `getArchived`, store slot `archivedAccounts` with `EMPTY_ARCHIVED_ACCOUNTS`, action `unarchiveAccount`, error `AccountNameTakenError`. MA-048 and MA-049 import these.

## Steps
### 1. The three refusals have three distinguishable classes
- File: `src/modules/accounts/repositories/account.errors.ts` (`AccountNotArchivedError` `:8-13`)
- Change: `AccountNotArchivedError` takes `constructor(message = 'Only an archived account can be deleted')`, so `delete` keeps its message and `unarchive` passes its own (`'Only an archived account can be restored'`). Add `AccountNameTakenError extends Error` with a fixed message and `this.name = 'AccountNameTakenError'`, the same shape as `:1-6`. Class names are the contract; no `Strings` entry, no user copy.
- Test: none at this layer; the types are asserted through step 3's `rejects.toThrow(<Class>)` cases, and `__tests__/account.repository.delete.test.ts:182` keeps passing unchanged.

### 2. The queries: one guarded restore statement and one archived list
- File: `src/modules/accounts/database/accounts.ts` (after `setAccountDeleted` `:129-141`; `getAccounts` `:7-13` is the shape for the list)
- Change: `getArchivedAccounts(db): Promise<Account[]>` is `getAccounts` with `is_archived = 1 AND is_deleted = 0`, same `ORDER BY sort_order ASC, created_at ASC`. `setAccountUnarchived(db, id, updated_at): Promise<number>` runs one `UPDATE accounts SET is_archived = 0, sort_order = (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM accounts WHERE is_archived = 0 AND is_deleted = 0), updated_at = ? WHERE id = ? AND is_archived = 1 AND is_deleted = 0` and returns `result.changes`, as `setAccountDeleted` does. The subquery reads the active rows at statement time, so an empty active list yields 0 and the flag and the position move in one statement. No `current_balance`, no `revolving_balance`, no `balance_review_required` in the SET.
- Test: in step 3's suite, called on the bridged db directly: `setAccountUnarchived` on an active row returns 0 and leaves its `sort_order` and `updated_at` as they were; on a deleted row returns 0. This is the "zero rows is itself a refusal" invariant, and the only place it can be asserted since the repository reads first.

### 3. The repository restores, lists, and refuses with typed errors
- File: `src/modules/accounts/repositories/account.repository.ts` (`IAccountRepository` `:38-49`, `delete` `:100-111` as the shape) and `__tests__/account.store.test.ts` (`makeRepo` `:47-61`)
- Change: `IAccountRepository` gains `getArchived(): Promise<Account[]>` and `unarchive(id: string): Promise<void>`; MA-049 adds its count members to the same block later. `getArchived` delegates to `getArchivedAccounts`. `unarchive(id)`: read `getAccountByIdIncludingArchived`; `!existing || existing.is_deleted === 1` throws `AccountNotFoundError`; `existing.is_archived !== 1` throws `AccountNotArchivedError('Only an archived account can be restored')`; then read `getAccounts(db)` and throw `AccountNameTakenError` when any `a.name.trim().toLowerCase() === existing.name.trim().toLowerCase()`, the comparison at `utils/add_account.schema.ts:34`; then `setAccountUnarchived(db, id, now)` and throw `AccountNotFoundError` when it returns anything but 1. One statement writes, so no `withTransactionAsync`. In the same step add `getArchived: jest.fn().mockResolvedValue([])` and `unarchive: jest.fn().mockResolvedValue(undefined)` to `makeRepo`, or the store suite stops compiling against the widened interface (`makeRepo` is its only structural implementer: `git grep -n IAccountRepository -- src __tests__`).
- Test: new `__tests__/account.repository.unarchive.test.ts`, harness as `account.repository.delete.test.ts:133-162`, rows inserted raw with fixed ids since `react-native-uuid` is mocked to one id (`jest.setup.js:45`), fixed `NOW`. Seed: active `a` (`sort_order` 0), active `b` (`sort_order` 5), archived `z` (`sort_order` 1, name `'Old Wallet'`, `created_at` later than `x`'s, inserted before `x`), archived `x` (`sort_order` 1, name `'Old Card'`), archived `y` (`sort_order` 0, name `'Old Card'` too, `created_at` later than `x`'s, inserted after `x`), deleted `d` (`is_archived` 1, `is_deleted` 1, name `''`). Cases: restoring `x` sets `is_archived` 0, `sort_order` 6 and a new `updated_at`, and `getAll()` now ends with `x`; restoring into an empty active list gives `sort_order` 0; `'missing'` and `d` reject `AccountNotFoundError`; `a` rejects `AccountNotArchivedError` with `sort_order` still 0; an active `' old card '` makes `x` reject `AccountNameTakenError` with `x` still archived at `sort_order` 1; `y` sharing `x`'s name does not block `x`, and after `x` is restored `y` does; `getArchived()` returns `[y, x, z]`, `y` first on `sort_order` and `x` before `z` on the `created_at` tie-break, where the insertion order `z, x, y` is what the query returns with its `ORDER BY` deleted, never `d`, and `[]` on an empty table; archive `a` then `getAll()` excludes it, unarchive it then `getAll()` includes it, the carousel and picker source (`dashboard.repository.ts:55`, `pay_sheet.hook.ts:181`).

### 4. The store carries the archived list and the restore action
- File: `src/modules/accounts/store/account.store.ts` (`EMPTY_ACCOUNTS` `:15-16`, `INITIAL_STATE` `:21-27`, `AccountStore` `:29-38`, `loadAccounts` `:49-65`, `archiveAccount` `:107-115`)
- Change: `EMPTY_ARCHIVED_ACCOUNTS`, frozen like `:15-16`; `archivedAccounts: EMPTY_ARCHIVED_ACCOUNTS` in `INITIAL_STATE`; `loadAccounts` destructures a third `Promise.all` member from `repo.getArchived()` and publishes `{ accounts, archivedAccounts, archivedCount, hasLoaded: true, loadError: false }` in the one existing `set` under the same request id; `unarchiveAccount: (id: string) => Promise<void>` on the type, body identical in shape to `archiveAccount`: `repo.unarchive(id)`, then `get().loadAccounts()`, `console.error` and rethrow. Nothing writes `accountLookup` (audit L27). No re-export from `src/modules/accounts/index.ts` or `src/store/account.store.ts`; the archive screens import the store path as `accounts_list.hook.ts:10` does.
- Test: `__tests__/account.store.test.ts`. Initial state has `archivedAccounts` `toBe(EMPTY_ARCHIVED_ACCOUNTS)`; `loadAccounts` publishes what `getArchived` resolves and leaves `accounts` as `getAll` resolves (the picker list never gains an archived row); a `getArchived` rejection sets `loadError` and keeps all three slots (extend the shape of `:161-174`); an older load publishes neither its `archivedAccounts` nor its count (shape of `:285-308`); `unarchiveAccount` delegates with the id and the post-restore reload publishes all three (shape of `:376-389`, with `getArchived` `mockResolvedValueOnce([archived]).mockResolvedValueOnce([])`); a rejected `unarchive` rejects with the same error instance, calls neither `getAll` nor `getArchived`, and leaves `accounts`, `archivedAccounts`, `archivedCount` and `loadError` as loaded; `reset` restores `EMPTY_ARCHIVED_ACCOUNTS`; `EMPTY_ARCHIVED_ACCOUNTS` is frozen.

### 5. No total reads an archived account
- File: none; the cases exist. `computeNetWorth` `__tests__/screens/dashboard/dashboard_helpers.test.ts:139,214`, `computeLiquidityBreakdown` `:705`, `computeLiabilitiesBreakdown` `:864`, `computeDashboardAccountCounts` `:1271`, `countForeignAccounts` `__tests__/accounts/account_aggregation.test.ts:121`.
- Change: none.
- Test: the five cases above plus step 3's `getAll` exclusion case are the regression the Acceptance names; no new describe.

### 6. Decision record
- File: `docs/adr/2026-09-09-account-unarchive-sort-position.md`, header shape as `docs/adr/2026-09-08-account-soft-delete-keeps-history.md:1-6`
- Change: records that a restore sets `is_archived = 0` and `sort_order = MAX(active sort_order) + 1` in one statement, refuses on three read-first typed errors, and reads or writes no balance: the stored balance is the balance at archive time because no transaction or payment can land on an archived account (`transaction.repository.ts:126-127`, `commitment.repository.ts:211-212`). Names the two allocators (add assigns the active count, `use_account_form.hook.ts:50`) and that reconciling them is off this milestone.
- Test: none; a doc.

## Decision record
- `docs/adr/2026-09-09-account-unarchive-sort-position.md`: restore moves the flag and the sort position together, one past the highest active, and touches no balance; step 6 adds the file.

## Non-goals
- The archived card, row unarchive and toast (MA-048); the archived detail and its counts (MA-049); the archive confirmation and button (MA-046).
- Any other write to `sort_order`, drag-to-reorder (MA-016, #382); reconciling add's `accounts.length` allocator with restore's `MAX + 1`.
- Widening the add and edit name checks to archived accounts (audit L12); keying `accountLookup` by owner (MA-043, #441).
- No migration, no column, no archived date, no index; `__tests__/schema.test.ts:70-101` keeps its 19 columns.
- No `Strings` entry: the errors are class names.
- No `withTransactionAsync` around a single statement; no wrapping the two reads in one, matching `delete`.
- No test for the archived refusals in `transaction.repository.ts:126-127` and `commitment.repository.ts:211-212`; the ticket names their absence, not their addition.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gate check, head `__tests__/` over base `src/`: `test -f __tests__/account.repository.unarchive.test.ts __tests__/account.store.test.ts && git checkout 4e874579 -- src && npx jest __tests__/account.repository.unarchive.test.ts __tests__/account.store.test.ts --ci; git checkout HEAD -- src` fails on the missing repository members; the same jest command on head `src/` passes. `dashboard_helpers.test.ts` is unchanged at head (step 5) and stays out of the gate.

## Risks
- The interface widening and `makeRepo` must land in one commit (step 3); split them and typecheck fails between.
- `AccountNotArchivedError` with a message parameter is a reading of "carries its own message"; if the reviewer wanted a new class, step 1 grows by one class and step 3's throw changes name.
- A concurrent add between the name read and the write could seat a duplicate; single local writer today, the same window `delete` accepts.

## Self-assessment
Step 3's name refusal is the least settled piece: the comparison runs over `getAccounts` in JavaScript because SQLite's `LOWER` is ASCII, but the ticket does not say whether the archived account's own stored name is compared trimmed, and I chose to trim both sides as the add schema does. The seed also assumes an archived and a second archived account may share a name, which the schema allows (no UNIQUE, audit L12) and the ticket's "the comparison is over the active list" implies; if the reviewer reads "any account" instead, the `y` cases invert.
