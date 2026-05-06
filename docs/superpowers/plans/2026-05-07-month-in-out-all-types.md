# Month In/Out: Count All Transaction Types — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `getAccountsStats()` so Month In/Out and Week In/Out count all four transaction types (income, expense, transfer, cc_payment), not just income and expense.

**Architecture:** Rewrite the single SQL query in `database/account_stats.ts` as a UNION ALL with two legs — Leg 1 handles `account_id` rows (income → in, everything else → out), Leg 2 handles `to_account_id` rows (transfer/cc_payment → in using `to_amount`). Outer query sums both legs per account. Function signature and return type unchanged — zero downstream changes.

**Tech Stack:** expo-sqlite · better-sqlite3 (tests) · Jest

**Spec:** `docs/superpowers/specs/2026-05-07-month-in-out-all-types-design.md`

---

## File Map

- **Modify:** `database/account_stats.ts` — rewrite SQL query and parameter bindings
- **Create:** `__tests__/account_stats.query_executor.test.ts` — new test file for `getAccountsStats()`

---

### Task 1: Create test file with setup and first test (transfer counts in Month In/Out)

**Files:**
- Create: `__tests__/account_stats.query_executor.test.ts`

This test file follows the same better-sqlite3 pattern used in `__tests__/transaction.query_executor.test.ts`: a real in-memory SQLite DB with migrations applied, wired into the expo-sqlite mock.

- [ ] **Step 1: Write the test file with setup + first test**

```typescript
import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { getAccountsStats } from '@/database/account_stats';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';
const DATE = '2026-05-01';
const TIME = '12:00:00';

function seedAccounts() {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
     VALUES
       ('acc_bank','Checking','bank','EGP',10000,10000,0,0,0,?,?),
       ('acc_wallet','Wallet','physical_wallet','EGP',0,0,0,0,1,?,?),
       ('acc_usd','USD Account','bank','USD',500,500,0,0,2,?,?),
       ('acc_cc','Credit Card','credit_card','EGP',0,0,0,0,3,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW);
}

function insertTx(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    id: 'tx-1',
    type: 'expense',
    amount: 100,
    currency: 'EGP',
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc_bank',
    to_account_id: null,
    category_id: null,
    note: null,
    transaction_date: DATE,
    transaction_time: TIME,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
  realDb
    .prepare(
      `INSERT INTO transactions
       (id,type,amount,currency,egp_amount,exchange_rate,
        to_amount,minimum_payment_snapshot,
        account_id,to_account_id,category_id,note,
        transaction_date,transaction_time,created_at,updated_at)
       VALUES (@id,@type,@amount,@currency,@egp_amount,@exchange_rate,
        @to_amount,@minimum_payment_snapshot,
        @account_id,@to_account_id,@category_id,@note,
        @transaction_date,@transaction_time,@created_at,@updated_at)`,
    )
    .run(defaults);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seedAccounts();

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        getAllAsync: jest.Mock;
      };
    }
  ).__fakeDb;

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions');
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getAccountsStats
>[0];

describe('getAccountsStats — transfer counts', () => {
  it('transfer out appears in source month_out, transfer in appears in destination month_in', async () => {
    insertTx({
      id: 'tx-transfer-1',
      type: 'transfer',
      amount: 3000,
      currency: 'EGP',
      egp_amount: 3000,
      to_amount: 3000,
      account_id: 'acc_bank',
      to_account_id: 'acc_wallet',
    });

    const stats = await getAccountsStats(mockDb, ['acc_bank', 'acc_wallet']);

    expect(stats['acc_bank'].month_out).toBe(3000);
    expect(stats['acc_bank'].month_in).toBe(0);
    expect(stats['acc_wallet'].month_in).toBe(3000);
    expect(stats['acc_wallet'].month_out).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/account_stats.query_executor.test.ts --no-coverage`

Expected: FAIL — the current query filters `type IN ('income', 'expense')`, so transfer rows are excluded. Both `month_out` and `month_in` will be 0 instead of 3000.

- [ ] **Step 3: Commit the failing test**

```bash
git add __tests__/account_stats.query_executor.test.ts
git commit -m "test: add failing test for transfer in account stats"
```

---

### Task 2: Rewrite the SQL query to UNION ALL

**Files:**
- Modify: `database/account_stats.ts:34-53`

- [ ] **Step 1: Replace the SQL query and parameter bindings**

Replace the entire `db.getAllAsync(...)` call (lines 34–53) with:

```typescript
  const rows = await db.getAllAsync<{
    account_id: string;
    month_in: number;
    month_out: number;
    week_in: number;
    week_out: number;
  }>(
    `SELECT account_id,
       SUM(month_in)  AS month_in,
       SUM(month_out) AS month_out,
       SUM(week_in)   AS week_in,
       SUM(week_out)  AS week_out
     FROM (
       /* Leg 1: account_id rows — income IN, everything else OUT */
       SELECT
         account_id,
         SUM(CASE WHEN type = 'income'  AND transaction_date >= ? THEN amount ELSE 0 END) AS month_in,
         SUM(CASE WHEN type != 'income' AND transaction_date >= ? THEN amount ELSE 0 END) AS month_out,
         SUM(CASE WHEN type = 'income'  AND transaction_date >= ? THEN amount ELSE 0 END) AS week_in,
         SUM(CASE WHEN type != 'income' AND transaction_date >= ? THEN amount ELSE 0 END) AS week_out
       FROM transactions
       WHERE account_id IN (${placeholders})
         AND transaction_date >= ?
       GROUP BY account_id

       UNION ALL

       /* Leg 2: to_account_id rows — transfer/cc_payment IN */
       SELECT
         to_account_id AS account_id,
         SUM(CASE WHEN transaction_date >= ? THEN COALESCE(to_amount, amount) ELSE 0 END) AS month_in,
         0 AS month_out,
         SUM(CASE WHEN transaction_date >= ? THEN COALESCE(to_amount, amount) ELSE 0 END) AS week_in,
         0 AS week_out
       FROM transactions
       WHERE to_account_id IN (${placeholders})
         AND type IN ('transfer', 'cc_payment')
         AND transaction_date >= ?
       GROUP BY to_account_id
     )
     GROUP BY account_id`,
    [
      /* Leg 1 params */
      monthStart, monthStart, weekStart, weekStart,
      ...accountIds, earliest,
      /* Leg 2 params */
      monthStart, weekStart,
      ...accountIds, earliest,
    ],
  );
```

- [ ] **Step 2: Run the failing test to verify it passes**

Run: `npx jest __tests__/account_stats.query_executor.test.ts --no-coverage`

Expected: PASS — transfer now appears in source `month_out` and destination `month_in`.

- [ ] **Step 3: Commit**

```bash
git add database/account_stats.ts
git commit -m "fix: count transfers and cc_payments in Month In/Out stats"
```

---

### Task 3: Add CC payment test

**Files:**
- Modify: `__tests__/account_stats.query_executor.test.ts`

- [ ] **Step 1: Add CC payment test**

Append this describe block after the transfer test:

```typescript
describe('getAccountsStats — cc_payment counts', () => {
  it('cc_payment out appears in paying account month_out, in appears in CC account month_in', async () => {
    insertTx({
      id: 'tx-cc-1',
      type: 'cc_payment',
      amount: 1500,
      currency: 'EGP',
      egp_amount: 1500,
      to_amount: 1500,
      minimum_payment_snapshot: 200,
      account_id: 'acc_bank',
      to_account_id: 'acc_cc',
    });

    const stats = await getAccountsStats(mockDb, ['acc_bank', 'acc_cc']);

    expect(stats['acc_bank'].month_out).toBe(1500);
    expect(stats['acc_bank'].month_in).toBe(0);
    expect(stats['acc_cc'].month_in).toBe(1500);
    expect(stats['acc_cc'].month_out).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx jest __tests__/account_stats.query_executor.test.ts --no-coverage`

Expected: PASS — cc_payment is already handled by the UNION ALL query.

- [ ] **Step 3: Commit**

```bash
git add __tests__/account_stats.query_executor.test.ts
git commit -m "test: add cc_payment account stats test"
```

---

### Task 4: Add cross-currency transfer test

**Files:**
- Modify: `__tests__/account_stats.query_executor.test.ts`

- [ ] **Step 1: Add cross-currency test**

Append this describe block:

```typescript
describe('getAccountsStats — cross-currency transfer', () => {
  it('source uses amount (USD), destination uses to_amount (EGP)', async () => {
    insertTx({
      id: 'tx-cross-1',
      type: 'transfer',
      amount: 200,
      currency: 'USD',
      egp_amount: 10000,
      exchange_rate: 50,
      to_amount: 10000,
      account_id: 'acc_usd',
      to_account_id: 'acc_bank',
    });

    const stats = await getAccountsStats(mockDb, ['acc_usd', 'acc_bank']);

    expect(stats['acc_usd'].month_out).toBe(200);
    expect(stats['acc_usd'].month_in).toBe(0);
    expect(stats['acc_bank'].month_in).toBe(10000);
    expect(stats['acc_bank'].month_out).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx jest __tests__/account_stats.query_executor.test.ts --no-coverage`

Expected: PASS — Leg 2 uses `COALESCE(to_amount, amount)` which picks `to_amount = 10000` for the destination.

- [ ] **Step 3: Commit**

```bash
git add __tests__/account_stats.query_executor.test.ts
git commit -m "test: add cross-currency transfer account stats test"
```

---

### Task 5: Add multi-leg summation test (income + transfer to same account)

**Files:**
- Modify: `__tests__/account_stats.query_executor.test.ts`

- [ ] **Step 1: Add summation test**

Append this describe block:

```typescript
describe('getAccountsStats — multi-leg summation', () => {
  it('income + transfer to same account sums correctly in month_in', async () => {
    insertTx({
      id: 'tx-income-1',
      type: 'income',
      amount: 5000,
      currency: 'EGP',
      egp_amount: 5000,
      account_id: 'acc_bank',
    });

    insertTx({
      id: 'tx-transfer-in-1',
      type: 'transfer',
      amount: 2000,
      currency: 'EGP',
      egp_amount: 2000,
      to_amount: 2000,
      account_id: 'acc_wallet',
      to_account_id: 'acc_bank',
    });

    const stats = await getAccountsStats(mockDb, ['acc_bank', 'acc_wallet']);

    expect(stats['acc_bank'].month_in).toBe(7000);
    expect(stats['acc_bank'].month_out).toBe(0);
    expect(stats['acc_wallet'].month_in).toBe(0);
    expect(stats['acc_wallet'].month_out).toBe(2000);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx jest __tests__/account_stats.query_executor.test.ts --no-coverage`

Expected: PASS — outer GROUP BY sums Leg 1 income (5000) + Leg 2 transfer in (2000) = 7000.

- [ ] **Step 3: Commit**

```bash
git add __tests__/account_stats.query_executor.test.ts
git commit -m "test: add multi-leg summation account stats test"
```

---

### Task 6: Run full test suite and verify coverage

**Files:** None — verification only.

- [ ] **Step 1: Run the new test file**

Run: `npx jest __tests__/account_stats.query_executor.test.ts --no-coverage -v`

Expected: All 4 test suites pass (transfer, cc_payment, cross-currency, multi-leg).

- [ ] **Step 2: Run full test suite with coverage**

Run: `npm run test:coverage`

Expected: All tests pass. Coverage thresholds met (80% lines / 95% functions / 100% branches). `database/account_stats.ts` is included in coverage collection via `database/**/*.ts`.

- [ ] **Step 3: Commit if any adjustments were needed**

Only if previous steps required fixes. Otherwise, skip this step.
