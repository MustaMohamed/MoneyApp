---
name: moneyapp-testing
description: Use when writing or modifying tests in MoneyApp — repository tests, query tests, migration tests, store tests, or when deciding what to mock, how to test SQL against a real database, or how to test schema changes.
---

# MoneyApp Testing Patterns

## Overview

Logic-only `.ts` tests in `__tests__/` (snake_case) — no `.tsx` render tests. SQL is tested against a **real** SQLite engine (better-sqlite3 in-memory) bridged into the mocked expo-sqlite API, not against mocks of the query layer. The core principle: **a test that mocks the thing it claims to verify is vacuous** (audit M33 found atomicity tests that mocked the transaction wrapper into a pass-through — they'd pass with the logic deleted).

## The bridge pattern (canonical: `__tests__/transaction.repository.test.ts`)

```ts
import Database from 'better-sqlite3';
import { MIGRATIONS } from '@/database/migrations';
import { getExpoSQLiteTestDatabase, getSQLiteParams } from '@/test_helpers/sqlite';

const sqlite = getExpoSQLiteTestDatabase();   // the jest-mocked expo-sqlite surface
let realDb: ReturnType<typeof Database>;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));   // fast schema build — see caveat below
  sqlite.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) =>
    realDb.prepare(sql).run(...getSQLiteParams(rest)));
  // …same for getAllAsync / getFirstAsync; withTransactionAsync maps to real BEGIN/COMMIT
});
```

Fixtures come from `@/test_helpers/transaction.ts` (`makeTestAccount`, `makeTestCategory`, `makeTestTransaction`, …). UUIDs: override the global mock with a counter so each insert is unique.

## Migration testing — the runner caveat

`MIGRATIONS.map(m => m.up).join()` is fine for building schema in repository tests, **but it bypasses `runMigrations`** — the code that actually upgrades every user's database. The audit (H11) found all 35 SQLite suites used the concat shortcut and the runner had zero coverage. Rules:

- Every new migration gets a test that asserts its DDL effect **and** its CHECK constraints match `src/constants/enums.ts`.
- At least one suite must drive the real `runMigrations(db)` through the bridge: fresh db → run → assert `schema_migrations` rows; already-migrated db → run → assert idempotence (no re-application).

## What to mock, what never to mock

| Layer | Mock? |
|---|---|
| expo-sqlite surface | Bridge to real better-sqlite3 (above) — never hand-stub SQL results for repository/query tests |
| `withTransactionAsync` / `withExclusiveTransactionAsync` | **Never pass-through-mock in a test that claims atomicity** — map to real BEGIN/COMMIT so a mid-sequence throw actually rolls back (M33) |
| Time | Fix it: pass explicit ISO strings (`NOW = '2026-05-01T12:00:00.000Z'`); month-end (31st), leap-year, and DST dates are required cases for anything date-arithmetic |
| `react-native-uuid` | Counter mock for deterministic ids |
| Zustand stores in hook tests | `@/test_helpers/mock_zustand_selectors` (`makeMockSelectorStore`) |
| Other modules' repositories | Yes — module boundary is the mock boundary |

## Assert behavior, not source text

Audit M35 found 12 suites asserting raw source strings (exact Tailwind classes, file contents). Those break on refactors that change nothing observable and pass on bugs that change everything. Assert returned values, thrown error types (`TransactionValidationError`, not message text), and database row states after the operation.

## Required edge cases for money/date logic

Zero and negative amounts (must throw) · missing/zero exchange rate with USD involved (must throw) · month-end recurrence (due day 31 in a 30-day month) · empty result sets · a stale/concurrent write racing a newer one (generation guard tests).

## Common mistakes

| Mistake | Reality |
|---|---|
| "Mock the repo, test the store called it" | That tests the call, not the behavior. Bridge a real db for anything asserting data effects. |
| Pass-through transaction mock + "rolls back atomically" assertion | Vacuous — passes with rollback deleted. Use real BEGIN/COMMIT. |
| Schema-by-concat in a migration-runner test | Tests the SQL, not the runner. Drive `runMigrations`. |
| Asserting `toContain('class="p-4"')` on source | Text assertion — brittle and blind. Assert behavior. |
| `new Date()` in fixtures | Nondeterministic. Fixed ISO strings only. |
