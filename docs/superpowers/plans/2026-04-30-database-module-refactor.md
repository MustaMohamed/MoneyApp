# Database Module Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `db/` with a structured `database/` module containing versioned migrations, typed entity interfaces, and domain query executor files.

**Architecture:** Versioned migrations tracked via a `schema_migrations` table. Each migration is a single idempotent DDL operation. Query executors receive `db` as a parameter and own all SQL for their domain table. Stores call executors instead of running inline SQL.

**Tech Stack:** expo-sqlite v14, TypeScript strict, better-sqlite3 (tests only), Zustand v5.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `database/migrations/001_create_accounts.ts` | Single DDL for accounts table |
| Create | `database/migrations/002_create_app_settings.ts` | Single DDL for app_settings table |
| Create | `database/migrations/index.ts` | Ordered MIGRATIONS registry |
| Create | `database/entities/account.entity.ts` | Account interface (DB columns) |
| Create | `database/entities/app_setting.entity.ts` | AppSetting interface |
| Create | `database/client.ts` | getDb() singleton + runMigrations(db) |
| Create | `database/accounts.ts` | getAccounts(db), addAccount(db, account) |
| Create | `database/app_settings.ts` | getSetting(db, key), setSetting(db, key, value) |
| Modify | `store/account.store.ts` | Import from database/, re-export Account |
| Modify | `store/onboarding.store.ts` | Import from database/ |
| Modify | `app/_layout.hook.ts` | Use runMigrations instead of initDatabase |
| Modify | `__tests__/schema.test.ts` | Import MIGRATIONS instead of SCHEMA_SQL |
| Modify | `__tests__/account.store.test.ts` | Import MIGRATIONS instead of SCHEMA_SQL |
| Modify | `jest.config.js` | collectCoverageFrom: db/** → database/** |
| Delete | `db/init.ts` | Replaced by database/ module |

---

### Task 1: Create feature branch

- [ ] **Step 1: Create and switch to branch**

```bash
git checkout -b refactor/database-module
```

Expected: `Switched to a new branch 'refactor/database-module'`

---

### Task 2: Create migration files

**Files:**
- Create: `database/migrations/001_create_accounts.ts`
- Create: `database/migrations/002_create_app_settings.ts`
- Create: `database/migrations/index.ts`

- [ ] **Step 1: Create `database/migrations/001_create_accounts.ts`**

```typescript
export const migration001 = {
  version: 1,
  up: `
    CREATE TABLE IF NOT EXISTS accounts (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      type              TEXT NOT NULL
                          CHECK(type IN ('bank','smart_wallet','physical_wallet','physical_savings','credit_card')),
      currency          TEXT NOT NULL CHECK(currency IN ('EGP','USD')),
      opening_balance   REAL NOT NULL DEFAULT 0,
      current_balance   REAL NOT NULL DEFAULT 0,
      color             TEXT,
      credit_limit      REAL,
      revolving_balance REAL,
      minimum_payment   REAL,
      statement_due_day INTEGER,
      interest_tracking INTEGER NOT NULL DEFAULT 0,
      apr               REAL,
      is_archived       INTEGER NOT NULL DEFAULT 0,
      sort_order        INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL
    );
  `,
};
```

- [ ] **Step 2: Create `database/migrations/002_create_app_settings.ts`**

```typescript
export const migration002 = {
  version: 2,
  up: `
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `,
};
```

- [ ] **Step 3: Create `database/migrations/index.ts`**

```typescript
import { migration001 } from './001_create_accounts';
import { migration002 } from './002_create_app_settings';

export const MIGRATIONS = [migration001, migration002];
```

---

### Task 3: Create entity files

**Files:**
- Create: `database/entities/account.entity.ts`
- Create: `database/entities/app_setting.entity.ts`

- [ ] **Step 1: Create `database/entities/account.entity.ts`**

```typescript
import { AccountType, Currency } from '@/constants/enums';

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

- [ ] **Step 2: Create `database/entities/app_setting.entity.ts`**

```typescript
export interface AppSetting {
  key: string;
  value: string;
}
```

---

### Task 4: Create `database/client.ts`

**Files:**
- Create: `database/client.ts`

- [ ] **Step 1: Create `database/client.ts`**

```typescript
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from './migrations';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('moneyapp.db');
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      return db;
    })();
  }
  return dbPromise;
}

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations',
  );
  const appliedVersions = new Set(applied.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.up);
        await db.runAsync(
          'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
          migration.version,
          new Date().toISOString(),
        );
      });
    }
  }
}
```

---

### Task 5: Create `database/accounts.ts`

**Files:**
- Create: `database/accounts.ts`

- [ ] **Step 1: Create `database/accounts.ts`**

```typescript
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Account } from './entities/account.entity';

export async function getAccounts(db: SQLiteDatabase): Promise<Account[]> {
  return db.getAllAsync<Account>(
    'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY sort_order ASC, created_at ASC',
  );
}

export async function addAccount(db: SQLiteDatabase, account: Account): Promise<void> {
  await db.runAsync(
    `INSERT INTO accounts (
      id, name, type, currency,
      opening_balance, current_balance,
      color, credit_limit, revolving_balance, minimum_payment,
      statement_due_day, interest_tracking, apr,
      is_archived, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account.id,
      account.name,
      account.type,
      account.currency,
      account.opening_balance,
      account.current_balance,
      account.color,
      account.credit_limit,
      account.revolving_balance,
      account.minimum_payment,
      account.statement_due_day,
      account.interest_tracking,
      account.apr,
      account.is_archived,
      account.sort_order,
      account.created_at,
      account.updated_at,
    ],
  );
}
```

---

### Task 6: Create `database/app_settings.ts`

**Files:**
- Create: `database/app_settings.ts`

- [ ] **Step 1: Create `database/app_settings.ts`**

```typescript
import type { SQLiteDatabase } from 'expo-sqlite';

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    key,
    value,
  );
}
```

---

### Task 7: Update `store/account.store.ts`

**Files:**
- Modify: `store/account.store.ts`

Three app files import `Account` from `@/store/account.store` (`ready.helpers.ts`, `account_row.tsx`, `add_account.hook.ts`). The store re-exports `Account` from the entity so those consumers need no changes.

- [ ] **Step 1: Replace `store/account.store.ts` with the updated version**

```typescript
import uuid from 'react-native-uuid';
import { create } from 'zustand';

import { addAccount as dbAddAccount, getAccounts } from '@/database/accounts';
import { getDb } from '@/database/client';
import type { Account } from '@/database/entities/account.entity';

export type { Account };

interface AccountState {
  accounts: Account[];
  loadAccounts: () => Promise<void>;
  addAccount: (data: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => Promise<Account>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],

  loadAccounts: async () => {
    try {
      const db = await getDb();
      const rows = await getAccounts(db);
      set({ accounts: rows });
    } catch (err) {
      console.error('[accountStore] loadAccounts failed:', err);
      throw err;
    }
  },

  addAccount: async (data) => {
    try {
      const db = await getDb();
      const id = uuid.v4() as string;
      const now = new Date().toISOString();

      const account: Account = {
        ...data,
        id,
        current_balance: data.opening_balance,
        is_archived: 0,
        created_at: now,
        updated_at: now,
      };

      await dbAddAccount(db, account);
      await get().loadAccounts();

      return account;
    } catch (err) {
      console.error('[accountStore] addAccount failed:', err);
      throw err;
    }
  },
}));
```

---

### Task 8: Update `store/onboarding.store.ts`

**Files:**
- Modify: `store/onboarding.store.ts`

Replace the two inline `db.runAsync('INSERT OR REPLACE INTO app_settings ...')` calls with `setSetting`. The SQL strings are identical so the existing onboarding store tests continue to pass without changes.

- [ ] **Step 1: Update imports at the top of `store/onboarding.store.ts`**

Replace:
```typescript
import { getDb } from '@/db/init';
```
With:
```typescript
import { setSetting } from '@/database/app_settings';
import { getDb } from '@/database/client';
```

- [ ] **Step 2: Update `setBaseCurrency` to use `setSetting`**

Replace:
```typescript
const db = await getDb();
await db.runAsync(
  'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
  'base_currency',
  currency,
);
```
With:
```typescript
const db = await getDb();
await setSetting(db, 'base_currency', currency);
```

- [ ] **Step 3: Update `completeOnboarding` to use `setSetting`**

Replace:
```typescript
const db = await getDb();
await db.runAsync(
  'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
  'onboarding_complete',
  'true',
);
```
With:
```typescript
const db = await getDb();
await setSetting(db, 'onboarding_complete', 'true');
```

- [ ] **Step 4: Run onboarding store tests to verify they still pass**

```bash
npx jest __tests__/onboarding.store.test.ts --no-coverage
```

Expected: All tests PASS. The mock's `runAsync` is still called with the same SQL string (`INSERT OR REPLACE INTO app_settings`), so the `expect.stringContaining(...)` assertions hold.

---

### Task 9: Update `app/_layout.hook.ts`

**Files:**
- Modify: `app/_layout.hook.ts`

- [ ] **Step 1: Update `app/_layout.hook.ts`**

Replace the full file content:
```typescript
import '@/utils/zod_config';
import { useEffect } from 'react';
import { getDb, runMigrations } from '@/database/client';
import { loadOnboardingState } from '@/store/onboarding.store';
import { useLayoutStore } from './_layout.store';

export function useLayoutInit() {
  const setReady = useLayoutStore((s) => s.setReady);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        await runMigrations(db);
        await loadOnboardingState();
      } catch {
        // Surface splash and let app render in degraded state
      } finally {
        setReady(true);
      }
    })();
  }, [setReady]);
}
```

---

### Task 10: Update `__tests__/schema.test.ts`

**Files:**
- Modify: `__tests__/schema.test.ts`

- [ ] **Step 1: Update the import and DDL construction in `__tests__/schema.test.ts`**

Replace:
```typescript
import { SCHEMA_SQL } from '@/db/init';
```
With:
```typescript
import { MIGRATIONS } from '@/database/migrations';

const SCHEMA_SQL = MIGRATIONS.map((m) => m.up).join('\n');
```

The `withDb()` function and all test cases remain unchanged.

- [ ] **Step 2: Run schema tests to verify they pass**

```bash
npx jest __tests__/schema.test.ts --no-coverage
```

Expected: All 6 test cases PASS.

---

### Task 11: Update `__tests__/account.store.test.ts`

**Files:**
- Modify: `__tests__/account.store.test.ts`

- [ ] **Step 1: Update the import in `__tests__/account.store.test.ts`**

Replace:
```typescript
import { SCHEMA_SQL } from '@/db/init';
```
With:
```typescript
import { MIGRATIONS } from '@/database/migrations';
```

- [ ] **Step 2: Update the `beforeAll` schema setup**

Replace:
```typescript
realDb = new Database(':memory:');
realDb.exec(SCHEMA_SQL);
```
With:
```typescript
realDb = new Database(':memory:');
realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
```

- [ ] **Step 3: Run account store tests to verify they pass**

```bash
npx jest __tests__/account.store.test.ts --no-coverage
```

Expected: All test cases PASS.

---

### Task 12: Update `jest.config.js` coverage paths

**Files:**
- Modify: `jest.config.js`

- [ ] **Step 1: Update `collectCoverageFrom` to cover `database/` instead of `db/`**

Replace:
```javascript
'db/**/*.ts',
```
With:
```javascript
'database/**/*.ts',
```

---

### Task 13: Run the full test suite

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All test suites PASS. If any test fails, check the import path in the failing file — a stray `@/db/init` import is the most likely cause.

---

### Task 14: Delete `db/init.ts` and verify

- [ ] **Step 1: Delete the old file**

```bash
rm db/init.ts && rmdir db
```

- [ ] **Step 2: Run the full test suite again**

```bash
npx jest --no-coverage
```

Expected: All test suites PASS. No file should still import from `@/db/init`.

- [ ] **Step 3: TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

### Task 15: Commit

- [ ] **Step 1: Stage all changes**

```bash
git add database/ store/account.store.ts store/onboarding.store.ts app/_layout.hook.ts __tests__/schema.test.ts __tests__/account.store.test.ts jest.config.js
git rm db/init.ts
```

- [ ] **Step 2: Commit**

```bash
git commit -m "refactor: replace db/ with structured database/ module

- Versioned migrations tracked in schema_migrations table
- Separate DDL per migration (001_create_accounts, 002_create_app_settings)
- Entity interfaces in database/entities/
- Query executors (getAccounts, addAccount, getSetting, setSetting)
- Stores call executors instead of inline SQL
- All existing tests pass unchanged"
```
