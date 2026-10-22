# ADR: A write waits for the write lock by one bound, taken at BEGIN IMMEDIATE

- **Date:** 2026-10-22
- **Status:** accepted
- **Ticket:** #821 (MA-235)
- **Applies to:** `src/database/write_lock.ts`, `src/database/client.ts`, `src/modules/commitments/database/commitment_payments.ts`, `src/modules/commitments/repositories/commitment.repository.ts`, `src/modules/budget/repositories/budget.repository.ts`, `src/modules/accounts/repositories/account.repository.ts`, `src/modules/categories/repositories/category.repository.ts`, `src/modules/transactions/repositories/transaction.repository.ts`

A write that landed while another connection held the write lock failed at once with `database is locked`. No connection set a busy timeout, and each exclusive transaction opened its own connection with no wait and with foreign keys off. Housekeeping re-runs after each mutation, so a Pay, an Edit or a budget save could fail against it (#821, PR #818 verifier finding V11).

## 1. One bound, set where a connection opens

`WRITE_LOCK_WAIT_MS` in `src/database/write_lock.ts` is the one wait bound, 2500 ms. `openConnection` in `src/database/client.ts` applies it with `PRAGMA busy_timeout` as the first statement on every connection, the main one from `getDb()` and each exclusive transaction's own. No call site sets a timeout of its own.

The value matches the busy timeout of Android's framework `SQLiteConnection`. A write waiting on the main connection holds that connection, so every read on it waits behind the write, up to the same bound. A longer bound freezes screens as well as saves.

## 2. Every connection runs foreign keys on and WAL

The same statement sets `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` on every connection. An exclusive transaction's connection used to run with foreign keys off, because the PRAGMA at open reached only the main connection and neither native build sets `SQLITE_DEFAULT_FOREIGN_KEYS`. The Decision of 2026-10-22 on #821 turns them on at the one connection-opening step. `PRAGMA foreign_keys` is a no-op inside a transaction, so the helper that opens the connection sets it before its BEGIN.

## 3. Every transaction begins BEGIN IMMEDIATE through the client helpers

- `withWriteTransactionAsync(db, task)` runs `task` on the main connection.
- `withExclusiveWriteTransactionAsync(task)` opens a connection through `openConnection`, runs `task(txn)` on it and closes it in a `finally`.

Both begin with `BEGIN IMMEDIATE`, which takes the write lock before the task's first statement. SQLite calls no busy handler for a transaction that has already read: a plain `BEGIN`, a read, then a write fails `SQLITE_BUSY` at once, whatever the timeout. A `BEGIN IMMEDIATE` that gives up after the wait rejects with SQLite's busy error and runs no `ROLLBACK`, so the caller sees the busy error, not a no-transaction error. A task or `COMMIT` error rolls back and rethrows.

Both helpers live in `client.ts` beside `openConnection`. A suite that mocks `@/database/client` re-exports the helper it reaches through `jest.requireActual`.

`db.withTransactionAsync` and `db.withExclusiveTransactionAsync` begin a plain `BEGIN`, and the first rolls back even when its `BEGIN` failed (`node_modules/expo-sqlite/src/SQLiteDatabase.ts:141-149`, `:184`). No app code calls them, and structural guard T5 (`scripts/validate-structural-guards.js`) keeps it so.

The main connection runs `execAsync`, `runAsync`, `getFirstAsync` and `getAllAsync` one at a time. `getDb()` wraps the connection so each of these calls starts once the previous one has settled, fulfilled or rejected, and returns its own result. An expo read steps its first row in one native call and finalizes the statement one or two native calls later (`SQLiteDatabase.ts:379-389`, `:438-447`); Android leaves a `SQLITE_ROW` statement un-reset (`android/src/main/java/expo/modules/sqlite/SQLiteModule.kt:418-428`). Until then the connection holds a read transaction, and SQLite runs the busy handler only from no transaction (`vendor/sqlite3/sqlite3.c:75258-75259`), so a `BEGIN IMMEDIATE` or an autocommit write issued in that window failed at 0 ms. No transaction holds the queue between its statements, and no exclusive connection is queued. The order has a cost: a read on the main connection now waits for every earlier call to prepare, run, read and finalize, where two native reads used to interleave step by step; a queue of writes alone would reopen the window, because the write is the call that fails. Guard T6 refuses the other connection methods in app code, so no call skips the queue.

## 4. No patch and no retry

expo-sqlite is not patched: `SQLiteOpenOptions` has no timeout or pragma field, and the helpers reach every connection the app writes through. Nothing retries a write. A write still blocked past the bound rejects once with nothing written, and its caller's existing error field shows the rejection. A write that fails for any other reason fails at once, as before.
