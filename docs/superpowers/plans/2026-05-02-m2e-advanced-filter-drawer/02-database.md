# M2e Part 2 — Database & Repository Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-02-m2e-advanced-filter-drawer-design.md` § 5

**Goal:** Widen `TransactionListFilters` to carry the new axes, extend `getTransactions` SQL with optional clauses for accounts (multi-select OR'd over `account_id` and `to_account_id`), categories (multi-select), date range (inclusive `dateFrom`/`dateTo`), and amount range (paired with `currency`). Tighten `toQueryFilters` return type to `Partial<TransactionListFilters>`.

**Tech Stack:** TypeScript strict, expo-sqlite, better-sqlite3 (test-only), Jest.

**Prerequisites:** Part 1 complete.

---

## File Structure (this part)

| File | Purpose | Created/Modified |
|---|---|---|
| `store/transaction.store.ts` | Widen `TransactionListFilters` interface | Modified |
| `database/transactions.ts` | Extend `TransactionListQuery` and `getTransactions` SQL | Modified |
| `app/(app)/(tabs)/transactions/filter/filter.helpers.ts` | Tighten `toQueryFilters` return type back to `Partial<TransactionListFilters>` | Modified |
| `__tests__/database_get_transactions_filter.test.ts` | New SQL filter axis tests against in-memory SQLite | Created |

The repository (`repositories/transaction.repository.ts`) needs **no code change** — `getAll` re-exports the widened type via `TransactionListQuery`.

---

## Task 7: Widen `TransactionListFilters` and `TransactionListQuery`

**Files:**
- Modify: `store/transaction.store.ts`
- Modify: `database/transactions.ts`
- Modify: `app/(app)/(tabs)/transactions/filter/filter.helpers.ts`

This task only widens types — no behavior change. Implementation comes in Task 8.

- [ ] **Step 1: Widen `TransactionListFilters` in `store/transaction.store.ts`**

The existing file imports types only:

```typescript
import type { TransactionType } from '@/constants/enums';
```

Change that import to bring in `Currency` as a value (it's used in type position now, but a value-import keeps it available for any future runtime use):

```typescript
import { Currency, type TransactionType } from '@/constants/enums';
```

Find the existing interface:

```typescript
export interface TransactionListFilters {
  type?: TransactionType;
  search?: string;
}
```

Replace with:

```typescript
export interface TransactionListFilters {
  type?: TransactionType;
  search?: string;
  accountIds?: string[];
  categoryIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  amountCurrency?: Currency;
}
```

- [ ] **Step 2: Widen `TransactionListQuery` in `database/transactions.ts`**

Find the existing interface:

```typescript
export interface TransactionListQuery {
  limit?: number;
  offset?: number;
  type?: TransactionType;
  search?: string;
}
```

Replace with:

```typescript
export interface TransactionListQuery {
  limit?: number;
  offset?: number;
  type?: TransactionType;
  search?: string;
  accountIds?: string[];
  categoryIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  amountCurrency?: Currency;
}
```

The `Currency` import already exists at the top of the file.

- [ ] **Step 3: Tighten `toQueryFilters` return type back to `Partial<TransactionListFilters>`**

In `app/(app)/(tabs)/transactions/filter/filter.helpers.ts`, change:

```typescript
export function toQueryFilters(applied: AdvancedFilters): Record<string, unknown> {
```

back to:

```typescript
export function toQueryFilters(applied: AdvancedFilters): Partial<TransactionListFilters> {
```

(The body is unchanged from Part 1; only the return type changes.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS — all the previously "loose" properties now resolve to real fields on `TransactionListFilters`.

- [ ] **Step 5: Run helpers tests to confirm no behavioral change**

Run: `npx jest __tests__/filter_helpers.test.ts`
Expected: 37 passing.

- [ ] **Step 6: Commit**

```bash
git add store/transaction.store.ts database/transactions.ts app/\(app\)/\(tabs\)/transactions/filter/filter.helpers.ts
git commit -m "feat(m2e): widen TransactionListFilters with multi-axis filter fields"
```

---

## Task 8: TDD `getTransactions` SQL with the new filter axes

**Files:**
- Create: `__tests__/database_get_transactions_filter.test.ts`
- Modify: `database/transactions.ts`

This task drives the SQL extension via tests against an in-memory SQLite DB (better-sqlite3, same pattern as `__tests__/transaction.query_executor.test.ts`).

- [ ] **Step 1: Create the test file with the test fixture and the first scenario (account multi-select)**

Create `__tests__/database_get_transactions_filter.test.ts`:

```typescript
import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { Currency, TransactionType } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { addTransaction, getTransactions } from '@/database/transactions';
import type { Transaction } from '@/database/entities/transaction.entity';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';
const DATE = '2026-05-01';
const TIME = '12:00:00';

function seed() {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES
         ('acc_a','Bank A','bank','EGP',1000,1000,0,0,0,?,?),
         ('acc_b','Bank B','bank','EGP',1000,1000,0,0,1,?,?),
         ('acc_c','USD Wallet','smart_wallet','USD',1000,1000,0,0,2,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW);

  realDb
    .prepare(
      `INSERT OR IGNORE INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
       VALUES
         ('cat_food','Food','expense','food','#C9973A',1,0,?,?),
         ('cat_fun','Entertainment','expense','movie','#C9973A',1,1,?,?),
         ('cat_sal','Salary','income','briefcase','#4CAF82',1,0,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seed();

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        runAsync: jest.Mock;
        getAllAsync: jest.Mock;
        withTransactionAsync: jest.Mock;
      };
    }
  ).__fakeDb;

  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 1 };
  });

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });

  mocked.withTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => {
    await fn();
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions');
  realDb.prepare("UPDATE accounts SET current_balance = 1000").run();
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getTransactions
>[0];

async function insert(overrides: Partial<Transaction> = {}) {
  const tx: Transaction = {
    id: overrides.id ?? `tx-${Math.random().toString(36).slice(2, 9)}`,
    type: TransactionType.Expense,
    amount: 50,
    currency: Currency.EGP,
    egp_amount: 50,
    exchange_rate: null,
    account_id: 'acc_a',
    to_account_id: null,
    category_id: 'cat_food',
    note: null,
    transaction_date: DATE,
    transaction_time: TIME,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
  await addTransaction(mockDb, tx);
  return tx;
}

describe('getTransactions — accountIds filter', () => {
  it('empty accountIds matches all (no constraint)', async () => {
    await insert({ id: 't1', account_id: 'acc_a' });
    await insert({ id: 't2', account_id: 'acc_b' });

    const out = await getTransactions(mockDb, { accountIds: [] });
    expect(out).toHaveLength(2);
  });

  it('single accountId matches only that account', async () => {
    await insert({ id: 't1', account_id: 'acc_a' });
    await insert({ id: 't2', account_id: 'acc_b' });

    const out = await getTransactions(mockDb, { accountIds: ['acc_a'] });
    expect(out.map((t) => t.id).sort()).toEqual(['t1']);
  });

  it('multiple accountIds match any', async () => {
    await insert({ id: 't1', account_id: 'acc_a' });
    await insert({ id: 't2', account_id: 'acc_b' });
    await insert({ id: 't3', account_id: 'acc_c', currency: Currency.USD });

    const out = await getTransactions(mockDb, { accountIds: ['acc_a', 'acc_c'] });
    expect(out.map((t) => t.id).sort()).toEqual(['t1', 't3']);
  });

  it('matches transfers when EITHER source OR destination is in the list', async () => {
    await insert({
      id: 'xfer1',
      type: TransactionType.Transfer,
      account_id: 'acc_a',
      to_account_id: 'acc_b',
      category_id: null,
    });
    // Filtering by acc_b alone should still match this transfer.
    const out = await getTransactions(mockDb, { accountIds: ['acc_b'] });
    expect(out.map((t) => t.id)).toEqual(['xfer1']);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx jest __tests__/database_get_transactions_filter.test.ts -t accountIds`
Expected: At least one FAIL — current SQL ignores `accountIds`.

- [ ] **Step 3: Add the SQL extension to `getTransactions`**

In `database/transactions.ts`, replace the body of `getTransactions` with the extended version. The full new function:

```typescript
function buildInClause(n: number): string {
  return Array(n).fill('?').join(',');
}

export async function getTransactions(
  db: SQLiteDatabase,
  query: TransactionListQuery = {},
): Promise<Transaction[]> {
  const limit = query.limit ?? PAGE_SIZE_DEFAULT;
  const offset = query.offset ?? 0;

  const typeParam: string | null = query.type ?? null;
  const trimmed = query.search?.trim();
  const searchParam: string | null = trimmed && trimmed.length > 0 ? trimmed : null;
  const likePattern = searchParam !== null ? `%${escapeLike(searchParam)}%` : null;

  const accountIds = query.accountIds ?? [];
  const categoryIds = query.categoryIds ?? [];
  const accountListEmpty = accountIds.length === 0 ? 1 : 0;
  const categoryListEmpty = categoryIds.length === 0 ? 1 : 0;
  const accountIn = buildInClause(Math.max(accountIds.length, 1));
  const categoryIn = buildInClause(Math.max(categoryIds.length, 1));
  const accountParams = accountIds.length === 0 ? [''] : accountIds;
  const categoryParams = categoryIds.length === 0 ? [''] : categoryIds;

  const dateFrom = query.dateFrom ?? null;
  const dateTo = query.dateTo ?? null;

  const amountMin = query.amountMin ?? null;
  const amountMax = query.amountMax ?? null;
  const amountCurrency = query.amountCurrency ?? null;

  const sql = `
    SELECT t.* FROM transactions t
    WHERE (? IS NULL OR t.type = ?)
      AND (
        ? IS NULL
        OR t.note LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR EXISTS (
          SELECT 1 FROM accounts a
          WHERE a.id IN (t.account_id, t.to_account_id)
            AND a.name LIKE ? ESCAPE '\\' COLLATE NOCASE
        )
        OR EXISTS (
          SELECT 1 FROM categories c
          WHERE c.id = t.category_id
            AND c.name LIKE ? ESCAPE '\\' COLLATE NOCASE
        )
      )
      AND (
        ? = 1
        OR t.account_id    IN (${accountIn})
        OR t.to_account_id IN (${accountIn})
      )
      AND (
        ? = 1
        OR t.category_id IN (${categoryIn})
      )
      AND (? IS NULL OR t.transaction_date >= ?)
      AND (? IS NULL OR t.transaction_date <= ?)
      AND (? IS NULL OR (t.currency = ? AND t.amount >= ?))
      AND (? IS NULL OR (t.currency = ? AND t.amount <= ?))
    ORDER BY t.transaction_date DESC, t.transaction_time DESC
    LIMIT ? OFFSET ?
  `;

  return db.getAllAsync<Transaction>(sql, [
    typeParam,
    typeParam,
    searchParam,
    likePattern,
    likePattern,
    likePattern,
    accountListEmpty,
    ...accountParams,
    ...accountParams,
    categoryListEmpty,
    ...categoryParams,
    dateFrom,
    dateFrom,
    dateTo,
    dateTo,
    amountMin,
    amountCurrency,
    amountMin,
    amountMax,
    amountCurrency,
    amountMax,
    limit,
    offset,
  ]);
}
```

Add `buildInClause` as a private helper above `getTransactions`. The `escapeLike` and `PAGE_SIZE_DEFAULT` already exist in the file.

- [ ] **Step 4: Run accountIds tests, expect pass**

Run: `npx jest __tests__/database_get_transactions_filter.test.ts -t accountIds`
Expected: 4 passing.

- [ ] **Step 5: Run the existing query executor tests to verify no regression**

Run: `npx jest __tests__/transaction.query_executor.test.ts`
Expected: All passing (no behavior change for empty filters or existing type/search axes).

- [ ] **Step 6: Add categoryIds tests**

Append to `__tests__/database_get_transactions_filter.test.ts`:

```typescript
describe('getTransactions — categoryIds filter', () => {
  it('empty categoryIds matches all', async () => {
    await insert({ id: 't1', category_id: 'cat_food' });
    await insert({ id: 't2', category_id: 'cat_fun' });
    const out = await getTransactions(mockDb, { categoryIds: [] });
    expect(out).toHaveLength(2);
  });

  it('multiple categoryIds match any', async () => {
    await insert({ id: 't1', category_id: 'cat_food' });
    await insert({ id: 't2', category_id: 'cat_fun' });
    await insert({ id: 't3', type: TransactionType.Income, category_id: 'cat_sal' });

    const out = await getTransactions(mockDb, { categoryIds: ['cat_food', 'cat_sal'] });
    expect(out.map((t) => t.id).sort()).toEqual(['t1', 't3']);
  });

  it('does NOT match transactions with NULL category_id', async () => {
    await insert({ id: 'xfer', type: TransactionType.Transfer, category_id: null, to_account_id: 'acc_b' });
    const out = await getTransactions(mockDb, { categoryIds: ['cat_food'] });
    expect(out).toHaveLength(0);
  });
});
```

- [ ] **Step 7: Run categoryIds tests**

Run: `npx jest __tests__/database_get_transactions_filter.test.ts -t categoryIds`
Expected: 3 passing.

- [ ] **Step 8: Add date range tests**

Append:

```typescript
describe('getTransactions — date range filter', () => {
  it('dateFrom alone returns rows on or after that date', async () => {
    await insert({ id: 't1', transaction_date: '2026-04-15' });
    await insert({ id: 't2', transaction_date: '2026-05-01' });
    await insert({ id: 't3', transaction_date: '2026-05-15' });

    const out = await getTransactions(mockDb, { dateFrom: '2026-05-01' });
    expect(out.map((t) => t.id).sort()).toEqual(['t2', 't3']);
  });

  it('dateTo alone returns rows on or before that date', async () => {
    await insert({ id: 't1', transaction_date: '2026-04-15' });
    await insert({ id: 't2', transaction_date: '2026-05-01' });
    await insert({ id: 't3', transaction_date: '2026-05-15' });

    const out = await getTransactions(mockDb, { dateTo: '2026-05-01' });
    expect(out.map((t) => t.id).sort()).toEqual(['t1', 't2']);
  });

  it('dateFrom and dateTo combine for inclusive range', async () => {
    await insert({ id: 't1', transaction_date: '2026-04-15' });
    await insert({ id: 't2', transaction_date: '2026-05-01' });
    await insert({ id: 't3', transaction_date: '2026-05-15' });
    await insert({ id: 't4', transaction_date: '2026-06-01' });

    const out = await getTransactions(mockDb, { dateFrom: '2026-05-01', dateTo: '2026-05-15' });
    expect(out.map((t) => t.id).sort()).toEqual(['t2', 't3']);
  });
});
```

- [ ] **Step 9: Run date range tests**

Run: `npx jest __tests__/database_get_transactions_filter.test.ts -t "date range"`
Expected: 3 passing.

- [ ] **Step 10: Add amount range tests (currency-aware)**

Append:

```typescript
describe('getTransactions — amount range filter (currency-aware)', () => {
  it('amountMin matches only rows of the given currency at or above the threshold', async () => {
    await insert({ id: 'egp_low',  currency: Currency.EGP, amount: 50 });
    await insert({ id: 'egp_hi',   currency: Currency.EGP, amount: 200 });
    await insert({ id: 'usd_hi',   currency: Currency.USD, account_id: 'acc_c', amount: 80 });

    const out = await getTransactions(mockDb, {
      amountMin: 100,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['egp_hi']);
  });

  it('amountMax matches only rows of the given currency at or below the threshold', async () => {
    await insert({ id: 'egp_low',  currency: Currency.EGP, amount: 50 });
    await insert({ id: 'egp_hi',   currency: Currency.EGP, amount: 200 });
    await insert({ id: 'usd_low',  currency: Currency.USD, account_id: 'acc_c', amount: 30 });

    const out = await getTransactions(mockDb, {
      amountMax: 60,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['egp_low']);
  });

  it('USD currency matches only USD rows', async () => {
    await insert({ id: 'egp_50', currency: Currency.EGP, amount: 50 });
    await insert({ id: 'usd_50', currency: Currency.USD, account_id: 'acc_c', amount: 50 });

    const out = await getTransactions(mockDb, {
      amountMin: 10,
      amountCurrency: Currency.USD,
    });
    expect(out.map((t) => t.id)).toEqual(['usd_50']);
  });

  it('amountMin and amountMax combine inside one currency', async () => {
    await insert({ id: 'a', currency: Currency.EGP, amount: 30 });
    await insert({ id: 'b', currency: Currency.EGP, amount: 75 });
    await insert({ id: 'c', currency: Currency.EGP, amount: 250 });
    await insert({ id: 'd', currency: Currency.USD, account_id: 'acc_c', amount: 75 });

    const out = await getTransactions(mockDb, {
      amountMin: 50,
      amountMax: 100,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['b']);
  });
});
```

- [ ] **Step 11: Run amount tests**

Run: `npx jest __tests__/database_get_transactions_filter.test.ts -t "amount range"`
Expected: 4 passing.

- [ ] **Step 12: Add a combined-axes test**

Append:

```typescript
describe('getTransactions — combined axes', () => {
  it('AND-composes type, account, category, date, and amount', async () => {
    // Match target: expense, acc_a, cat_food, 2026-05-10, EGP 100
    await insert({
      id: 'match',
      type: TransactionType.Expense,
      account_id: 'acc_a',
      category_id: 'cat_food',
      transaction_date: '2026-05-10',
      amount: 100,
      currency: Currency.EGP,
    });
    // Same date but wrong account
    await insert({
      id: 'wrong_acc',
      account_id: 'acc_b',
      transaction_date: '2026-05-10',
      amount: 100,
    });
    // Right account but outside date range
    await insert({
      id: 'wrong_date',
      account_id: 'acc_a',
      transaction_date: '2026-04-30',
      amount: 100,
    });

    const out = await getTransactions(mockDb, {
      type: TransactionType.Expense,
      accountIds: ['acc_a'],
      categoryIds: ['cat_food'],
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      amountMin: 50,
      amountMax: 200,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['match']);
  });
});
```

- [ ] **Step 13: Run combined test**

Run: `npx jest __tests__/database_get_transactions_filter.test.ts -t combined`
Expected: 1 passing.

- [ ] **Step 14: Run full filter test file**

Run: `npx jest __tests__/database_get_transactions_filter.test.ts`
Expected: 15 passing total.

- [ ] **Step 15: Run all transaction-related DB tests to verify no regression**

Run: `npx jest __tests__/transaction.query_executor.test.ts __tests__/transaction.repository.test.ts __tests__/transaction.store.test.ts __tests__/database_get_transactions_filter.test.ts`
Expected: All passing.

- [ ] **Step 16: Run the whole suite for safety**

Run: `npm test`
Expected: All passing.

- [ ] **Step 17: Commit**

```bash
git add database/transactions.ts __tests__/database_get_transactions_filter.test.ts
git commit -m "feat(m2e): extend getTransactions SQL with account/category/date/amount filters"
```

---

## Part 2 — Definition of Done

- ✅ `TransactionListFilters` and `TransactionListQuery` widened with the 7 new optional fields.
- ✅ `toQueryFilters` return type tightened back to `Partial<TransactionListFilters>`.
- ✅ `getTransactions` SQL handles all 4 new axes plus combinations, including the OR-over-account_id-and-to_account_id behavior for transfers and currency-paired amount filtering.
- ✅ 15 new SQL filter tests passing in `__tests__/database_get_transactions_filter.test.ts`.
- ✅ All existing tests still pass; `npm test` is green.
- ✅ `npm run typecheck` is green.

Proceed to `03-ui-primitives.md`.
