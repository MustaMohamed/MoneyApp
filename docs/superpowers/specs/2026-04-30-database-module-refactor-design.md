# Database Module Refactor — Design Spec

**Date:** 2026-04-30
**Status:** Approved

---

## Overview

Refactor the current `db/` module into a structured `database/` module with four distinct layers: migration files, entity types, query executor files, and a database client. This establishes a clean foundation for future domain growth (transactions, budgets, etc.) and enables safe schema evolution via versioned migrations.

---

## Folder Structure

```
database/
  migrations/
    001_create_accounts.ts        ← CREATE TABLE IF NOT EXISTS accounts (...)
    002_create_app_settings.ts    ← CREATE TABLE IF NOT EXISTS app_settings (...)
    index.ts                      ← export const MIGRATIONS = [migration001, migration002]
  entities/
    account.entity.ts             ← Account interface (DB column types)
    app_setting.entity.ts         ← AppSetting interface
  accounts.ts                     ← getAccounts(db), addAccount(db, data)
  app_settings.ts                 ← getSetting(db, key), setSetting(db, key, value)
  client.ts                       ← getDb(), runMigrations()
```

`db/` is deleted. All imports update from `@/db/init` to `@/database/*`.

---

## Layer Responsibilities

### `migrations/`

Each file represents a single, atomic DDL operation. Naming convention: `NNN_<description>.ts` where `NNN` is zero-padded (e.g. `001`, `002`).

Each migration file shape:

```typescript
export const migrationNNN = {
  version: N,
  up: `
    CREATE TABLE IF NOT EXISTS table_name (...);
  `,
};
```

`IF NOT EXISTS` is required on every `CREATE TABLE` — migrations must be idempotent.

`migrations/index.ts` exports the ordered registry:

```typescript
import { migration001 } from './001_create_accounts';
import { migration002 } from './002_create_app_settings';

export const MIGRATIONS = [migration001, migration002];
```

Adding a future migration = create a new numbered file + append to this array.

---

### `entities/`

Type definitions only. No logic, no imports from other `database/` files.

**`account.entity.ts`** — `Account` interface moved from `store/account.store.ts`:

```typescript
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  opening_balance: number;
  current_balance: number;
  color: string | null;
  credit_limit: number | null;
  revolving_balance: number | null;
  minimum_payment: number | null;
  statement_due_day: number | null;
  interest_tracking: 0 | 1;
  apr: number | null;
  is_archived: 0 | 1;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

**`app_setting.entity.ts`**:

```typescript
export interface AppSetting {
  key: string;
  value: string;
}
```

---

### Query Executor Files

Receive `db` as a parameter — no internal `getDb()` calls. This keeps them pure and directly testable.

**Verb convention:**
| Verb | Usage |
|---|---|
| `get*` | Read queries |
| `add*` | INSERT |
| `set*` | INSERT OR REPLACE / UPDATE |
| `update*` | UPDATE (future) |
| `delete*` | DELETE (future) |

**`accounts.ts`:**

```typescript
getAccounts(db: SQLiteDatabase): Promise<Account[]>
addAccount(db: SQLiteDatabase, data: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<void>
```

**`app_settings.ts`:**

```typescript
getSetting(db: SQLiteDatabase, key: string): Promise<string | null>
setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void>
```

---

### `client.ts`

Owns the database connection singleton and migration runner.

**`getDb()`** — unchanged singleton pattern from `db/init.ts`:
- Opens `moneyapp.db` via `SQLite.openDatabaseAsync`
- Enables WAL mode and foreign keys on first open
- Returns the same `Promise<SQLiteDatabase>` on subsequent calls

**`runMigrations(db)`** — called once at app startup (in `_layout.hook.ts`):

1. Create `schema_migrations` table if not exists:
   ```sql
   CREATE TABLE IF NOT EXISTS schema_migrations (
     version    INTEGER PRIMARY KEY,
     applied_at TEXT NOT NULL
   );
   ```
2. Query applied versions: `SELECT version FROM schema_migrations`
3. For each migration in `MIGRATIONS` whose version is not in the applied set:
   - Execute `migration.up` via `db.execAsync`
   - Insert `(version, now)` into `schema_migrations`
4. All steps run inside a single transaction

`initDatabase()` from `db/init.ts` is replaced by `runMigrations()`.

---

## Affected Files

| File | Change |
|---|---|
| `db/init.ts` | Deleted |
| `app/_layout.hook.ts` | Import `getDb`, `runMigrations` from `@/database/client`; call `runMigrations` instead of `initDatabase` |
| `store/account.store.ts` | Import `Account` from `@/database/entities/account.entity`; call `getAccounts` / `addAccount` from `@/database/accounts` |
| `store/onboarding.store.ts` | Call `getSetting` / `setSetting` from `@/database/app_settings` |
| `__tests__/schema.test.ts` | Import `MIGRATIONS` from `@/database/migrations`; join all `up` strings as DDL input |

---

## Testing

`__tests__/schema.test.ts` reconstructs the full DDL by joining migration `up` strings in order:

```typescript
import { MIGRATIONS } from '@/database/migrations';
const SCHEMA_SQL = MIGRATIONS.map(m => m.up).join('\n');
```

All existing test cases continue to pass unchanged — only the DDL source changes.

No new test files are required for this refactor. The query executor functions (`getAccounts`, `addAccount`, etc.) are pure functions that accept a `db` parameter, making them straightforward to test with `better-sqlite3` in a future test pass.

---

## Out of Scope

- Repository layer (planned for a future milestone)
- PIN / biometric logic
- Any new domain tables (transactions, budgets, etc.)
- Query executor unit tests (separate task)
