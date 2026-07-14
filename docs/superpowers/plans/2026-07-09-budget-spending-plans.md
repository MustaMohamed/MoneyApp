# Budget Spending Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Budget Phase 2 Spending Plans: date-ranged, category-based temporary budgets with optional category allocations and overlap prevention.

**Architecture:** Add spending-plan persistence as separate budget module tables and repository methods, then extend the existing Budget store/hook with plan data and pure view-model helpers. Keep React components presentational and sheet-local UI state in `.state.ts` files; use the existing HeroUI-backed `Sheet`, HeroUI primitives, app tokens, and Budget screen anatomy.

**Tech Stack:** Expo React Native, TypeScript strict, expo-sqlite, Zustand, RHF + Zod, HeroUI Native, `@gorhom/bottom-sheet` scroll views inside sheets, Jest + React Native Testing Library.

---

## File Structure

Create or modify these files only unless a test exposes a necessary local adjustment:

- Create `src/database/migrations/014_create_spending_plans.ts`: append-only DDL for `spending_plans` and `spending_plan_categories`.
- Modify `src/database/migrations/index.ts`: register migration 014.
- Modify `src/modules/budget/entities/budget.entity.ts`: add `SpendingPlan` and `SpendingPlanCategory` entity types.
- Create `src/modules/budget/database/spending_plans.ts`: query functions for plans, categories, saves, deletes, overlap reads, and category-range spend.
- Modify `src/modules/budget/repositories/budget.repository.ts`: expose repository methods for plan CRUD, overlap validation, and plan spend.
- Modify `src/modules/budget/store/budget.store.ts`: keep loaded plans and plan spend in the existing budget store.
- Create `src/modules/budget/screens/budget/spending_plans.helpers.ts`: pure VM derivation for visible plans, summary, allocation helper, date overlap, and validation.
- Modify `src/modules/budget/screens/budget/budget.state.ts`: add plan sheet mode/visibility/target id.
- Modify `src/modules/budget/screens/budget/budget.hook.ts`: derive plans tab state and expose plan actions.
- Create `src/modules/budget/screens/budget/components/spending_plan_card.tsx`: presentational card for each plan.
- Create `src/modules/budget/screens/budget/components/spending_plans_lens.tsx`: presentational Plans tab content.
- Create `src/modules/budget/screens/budget/components/spending_plan_sheet.state.ts`: Zustand state for selected categories, allocation mode, and date picker visibility.
- Create `src/modules/budget/screens/budget/components/spending_plan_sheet.tsx`: create/edit sheet using `Sheet`, `Input`, `Switch`, `PressableFeedback`, and `CategoryPickerSheet`.
- Modify `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx`: support category/plans skeleton footprints or add a `variant` prop.
- Modify `src/modules/budget/screens/budget/index.tsx`: replace Plans placeholder with real lens and sheet.
- Modify `src/constants/strings.ts`: add user-visible strings.
- Create/modify tests listed under each task.

Do not add local `useState` or business logic to Budget components. If UI state is needed, put it in `spending_plan_sheet.state.ts` or `budget.state.ts`.

---

## Task 1: Migration And Entity Types

**Files:**
- Create: `src/database/migrations/014_create_spending_plans.ts`
- Modify: `src/database/migrations/index.ts`
- Modify: `src/modules/budget/entities/budget.entity.ts`
- Test: `__tests__/spending_plans.migration.test.ts`

- [ ] **Step 1: Write the failing migration test**

Create `__tests__/spending_plans.migration.test.ts`:

```ts
import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';

describe('spending plans migration', () => {
  it('creates spending plan tables with category/date indexes', () => {
    const db = new Database(':memory:');
    db.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));

    const planCols = db.prepare(`PRAGMA table_info(spending_plans)`).all() as { name: string }[];
    expect(planCols.map((col) => col.name).sort()).toEqual(
      ['created_at', 'end_date', 'id', 'name', 'start_date', 'total_amount', 'updated_at'].sort(),
    );

    const categoryCols = db.prepare(`PRAGMA table_info(spending_plan_categories)`).all() as {
      name: string;
    }[];
    expect(categoryCols.map((col) => col.name).sort()).toEqual(
      ['allocated_amount', 'category_id', 'plan_id'].sort(),
    );

    const indexes = db.prepare(`PRAGMA index_list(spending_plan_categories)`).all() as {
      name: string;
    }[];
    expect(indexes.map((index) => index.name)).toContain('idx_spending_plan_categories_category');
    expect(indexes.map((index) => index.name)).toContain('idx_spending_plan_categories_plan');

    db.close();
  });

  it('cascades plan categories when a plan is deleted', () => {
    const db = new Database(':memory:');
    db.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));

    const now = '2026-07-09T00:00:00.000Z';
    db.prepare(
      `INSERT INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
       VALUES ('cat_food','Food','expense','food','#fff',0,0,?,?)`,
    ).run(now, now);
    db.prepare(
      `INSERT INTO spending_plans (id,name,start_date,end_date,total_amount,created_at,updated_at)
       VALUES ('plan_trip','Trip','2026-07-18','2026-07-21',8000,?,?)`,
    ).run(now, now);
    db.prepare(
      `INSERT INTO spending_plan_categories (plan_id,category_id,allocated_amount)
       VALUES ('plan_trip','cat_food',3000)`,
    ).run();

    db.prepare(`DELETE FROM spending_plans WHERE id = 'plan_trip'`).run();
    const remaining = db
      .prepare(`SELECT COUNT(*) AS count FROM spending_plan_categories`)
      .get() as { count: number };
    expect(remaining.count).toBe(0);

    db.close();
  });
});
```

- [ ] **Step 2: Run the migration test and verify it fails**

Run:

```bash
npm test -- --ci __tests__/spending_plans.migration.test.ts
```

Expected: FAIL because `spending_plans` does not exist or migration 014 is not registered.

- [ ] **Step 3: Add migration 014**

Create `src/database/migrations/014_create_spending_plans.ts`:

```ts
export const migration014 = {
  version: 14,
  up: `
    CREATE TABLE IF NOT EXISTS spending_plans (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      start_date   TEXT NOT NULL,
      end_date     TEXT NOT NULL,
      total_amount REAL NOT NULL CHECK(total_amount > 0),
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      CHECK(end_date >= start_date)
    );

    CREATE TABLE IF NOT EXISTS spending_plan_categories (
      plan_id          TEXT NOT NULL REFERENCES spending_plans(id) ON DELETE CASCADE,
      category_id      TEXT NOT NULL REFERENCES categories(id),
      allocated_amount REAL CHECK(allocated_amount IS NULL OR allocated_amount >= 0),
      PRIMARY KEY (plan_id, category_id)
    );

    CREATE INDEX IF NOT EXISTS idx_spending_plans_dates
      ON spending_plans(start_date, end_date);

    CREATE INDEX IF NOT EXISTS idx_spending_plan_categories_plan
      ON spending_plan_categories(plan_id);

    CREATE INDEX IF NOT EXISTS idx_spending_plan_categories_category
      ON spending_plan_categories(category_id);
  `,
};
```

Modify `src/database/migrations/index.ts`:

```ts
import { migration014 } from './014_create_spending_plans';

export const MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
  migration010,
  migration011,
  migration012,
  migration013,
  migration014,
];
```

- [ ] **Step 4: Add entity types**

Extend `src/modules/budget/entities/budget.entity.ts`:

```ts
export interface SpendingPlan {
  id: string;
  name: string;
  start_date: string; // 'YYYY-MM-DD'
  end_date: string; // 'YYYY-MM-DD'
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface SpendingPlanCategory {
  plan_id: string;
  category_id: string;
  allocated_amount: number | null;
}
```

- [ ] **Step 5: Run migration tests**

Run:

```bash
npm test -- --ci __tests__/spending_plans.migration.test.ts __tests__/budget.migration.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/database/migrations/014_create_spending_plans.ts src/database/migrations/index.ts src/modules/budget/entities/budget.entity.ts __tests__/spending_plans.migration.test.ts
git commit -m "feat: add spending plan schema"
```

---

## Task 2: Database Query Layer

**Files:**
- Create: `src/modules/budget/database/spending_plans.ts`
- Test: `__tests__/spending_plans.query.test.ts`

- [ ] **Step 1: Write the failing query tests**

Create `__tests__/spending_plans.query.test.ts`:

```ts
import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import {
  deleteSpendingPlan,
  getPlanCategorySpend,
  getSpendingPlanRows,
  setSpendingPlan,
} from '@/modules/budget/database/spending_plans';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;
const NOW = '2026-07-09T00:00:00.000Z';

function tx(row: Partial<Record<string, unknown>>) {
  const data: Record<string, unknown> = {
    id: row.id ?? 'tx',
    type: row.type ?? 'expense',
    amount: row.amount ?? 100,
    currency: row.currency ?? 'EGP',
    egp_amount: row.egp_amount ?? 100,
    exchange_rate: null,
    to_amount: row.to_amount ?? null,
    minimum_payment_snapshot: null,
    account_id: 'acc',
    to_account_id: row.to_account_id ?? null,
    category_id: row.category_id ?? 'cat_food',
    note: null,
    transaction_date: row.transaction_date ?? '2026-07-19',
    transaction_time: '12:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: NOW,
    updated_at: NOW,
  };
  const keys = Object.keys(data);
  realDb
    .prepare(
      `INSERT INTO transactions (${keys.join(',')}) VALUES (${keys.map((key) => '@' + key).join(',')})`,
    )
    .run(data);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.pragma('foreign_keys = ON');
  realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
  realDb
    .prepare(
      `INSERT INTO accounts (id,name,type,currency,opening_balance,current_balance,interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc','Cash','bank','EGP',0,0,0,0,0,?,?)`,
    )
    .run(NOW, NOW);
  realDb
    .prepare(
      `INSERT INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
       VALUES ('cat_food','Food','expense','food','#fff',0,0,?,?),
              ('cat_travel','Travel','expense','car','#fff',0,1,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW);

  const fake = (SQLite as unknown as {
    __fakeDb: {
      getAllAsync: jest.Mock;
      runAsync: jest.Mock;
      withTransactionAsync: jest.Mock;
    };
  }).__fakeDb;
  fake.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });
  fake.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 1 };
  });
  fake.withTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => {
    await fn();
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions');
  realDb.exec('DELETE FROM spending_plan_categories');
  realDb.exec('DELETE FROM spending_plans');
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const db = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getSpendingPlanRows
>[0];

describe('spending plan query file', () => {
  it('saves and loads plans that intersect a selected month', async () => {
    await setSpendingPlan(
      db,
      {
        id: 'plan_trip',
        name: 'Alexandria weekend',
        start_date: '2026-07-30',
        end_date: '2026-08-02',
        total_amount: 8000,
        created_at: NOW,
        updated_at: NOW,
      },
      [
        { plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 },
        { plan_id: 'plan_trip', category_id: 'cat_travel', allocated_amount: null },
      ],
    );

    const july = await getSpendingPlanRows(db, '2026-07');
    const august = await getSpendingPlanRows(db, '2026-08');
    const september = await getSpendingPlanRows(db, '2026-09');

    expect(july).toHaveLength(1);
    expect(august).toHaveLength(1);
    expect(september).toEqual([]);
    expect(july[0].categories).toEqual([
      { plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 },
      { plan_id: 'plan_trip', category_id: 'cat_travel', allocated_amount: null },
    ]);
  });

  it('replaces categories on update', async () => {
    await setSpendingPlan(
      db,
      {
        id: 'plan_trip',
        name: 'Trip',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 8000,
        created_at: NOW,
        updated_at: NOW,
      },
      [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 }],
    );
    await setSpendingPlan(
      db,
      {
        id: 'plan_trip',
        name: 'Trip updated',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 9000,
        created_at: NOW,
        updated_at: NOW,
      },
      [{ plan_id: 'plan_trip', category_id: 'cat_travel', allocated_amount: 4000 }],
    );

    const rows = await getSpendingPlanRows(db, '2026-07');
    expect(rows[0].name).toBe('Trip updated');
    expect(rows[0].categories).toEqual([
      { plan_id: 'plan_trip', category_id: 'cat_travel', allocated_amount: 4000 },
    ]);
  });

  it('deletes a plan and cascades category rows', async () => {
    await setSpendingPlan(
      db,
      {
        id: 'plan_trip',
        name: 'Trip',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 8000,
        created_at: NOW,
        updated_at: NOW,
      },
      [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 }],
    );

    await deleteSpendingPlan(db, 'plan_trip');
    expect(await getSpendingPlanRows(db, '2026-07')).toEqual([]);
  });

  it('sums only expense spend inside the plan range and categories', async () => {
    tx({ id: 'in-range-food', category_id: 'cat_food', egp_amount: 500, transaction_date: '2026-07-18' });
    tx({ id: 'in-range-travel', category_id: 'cat_travel', egp_amount: 700, transaction_date: '2026-07-21' });
    tx({ id: 'before-range', category_id: 'cat_food', egp_amount: 999, transaction_date: '2026-07-17' });
    tx({ id: 'wrong-type', type: 'income', category_id: 'cat_food', egp_amount: 999, transaction_date: '2026-07-19' });

    const spend = await getPlanCategorySpend(db, {
      startDate: '2026-07-18',
      endDate: '2026-07-21',
      categoryIds: ['cat_food', 'cat_travel'],
    });

    expect(spend).toEqual({ cat_food: 500, cat_travel: 700 });
  });
});
```

- [ ] **Step 2: Run the query tests and verify they fail**

Run:

```bash
npm test -- --ci __tests__/spending_plans.query.test.ts
```

Expected: FAIL because `src/modules/budget/database/spending_plans.ts` does not exist.

- [ ] **Step 3: Implement the query file**

Create `src/modules/budget/database/spending_plans.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  SpendingPlan,
  SpendingPlanCategory,
} from '@/modules/budget/entities/budget.entity';

export interface SpendingPlanWithCategories extends SpendingPlan {
  categories: SpendingPlanCategory[];
}

function monthRange(yearMonth: string): { start: string; endExclusive: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    start: `${yearMonth}-01`,
    endExclusive: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}

function inClause(count: number): string {
  return Array(count).fill('?').join(',');
}

export async function getSpendingPlanRows(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<SpendingPlanWithCategories[]> {
  const range = monthRange(yearMonth);
  const plans = await db.getAllAsync<SpendingPlan>(
    `SELECT *
       FROM spending_plans
      WHERE start_date < ?
        AND end_date >= ?
      ORDER BY start_date ASC, name ASC`,
    [range.endExclusive, range.start],
  );
  if (plans.length === 0) return [];

  const ids = plans.map((plan) => plan.id);
  const categories = await db.getAllAsync<SpendingPlanCategory>(
    `SELECT plan_id, category_id, allocated_amount
       FROM spending_plan_categories
      WHERE plan_id IN (${inClause(ids.length)})
      ORDER BY plan_id ASC, category_id ASC`,
    ids,
  );
  const byPlan = new Map<string, SpendingPlanCategory[]>();
  for (const category of categories) {
    const list = byPlan.get(category.plan_id) ?? [];
    list.push(category);
    byPlan.set(category.plan_id, list);
  }

  return plans.map((plan) => ({ ...plan, categories: byPlan.get(plan.id) ?? [] }));
}

export async function setSpendingPlan(
  db: SQLiteDatabase,
  plan: SpendingPlan,
  categories: SpendingPlanCategory[],
): Promise<void> {
  if (!Number.isFinite(plan.total_amount) || plan.total_amount <= 0) {
    throw new Error('Spending plan total amount must be greater than zero');
  }
  if (plan.end_date < plan.start_date) {
    throw new Error('Spending plan end date must be on or after start date');
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO spending_plans
         (id, name, start_date, end_date, total_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        plan.id,
        plan.name,
        plan.start_date,
        plan.end_date,
        plan.total_amount,
        plan.created_at,
        plan.updated_at,
      ],
    );
    await db.runAsync('DELETE FROM spending_plan_categories WHERE plan_id = ?', [plan.id]);
    for (const category of categories) {
      await db.runAsync(
        `INSERT INTO spending_plan_categories (plan_id, category_id, allocated_amount)
         VALUES (?, ?, ?)`,
        [plan.id, category.category_id, category.allocated_amount],
      );
    }
  });
}

export async function deleteSpendingPlan(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM spending_plans WHERE id = ?', [id]);
}

export interface PlanCategorySpendQuery {
  startDate: string;
  endDate: string;
  categoryIds: string[];
}

export async function getPlanCategorySpend(
  db: SQLiteDatabase,
  query: PlanCategorySpendQuery,
): Promise<Record<string, number>> {
  if (query.categoryIds.length === 0) return {};
  const rows = await db.getAllAsync<{ category_id: string; spent: number }>(
    `SELECT category_id, COALESCE(SUM(egp_amount), 0) AS spent
       FROM transactions
      WHERE type = 'expense'
        AND category_id IN (${inClause(query.categoryIds.length)})
        AND transaction_date >= ?
        AND transaction_date <= ?
      GROUP BY category_id`,
    [...query.categoryIds, query.startDate, query.endDate],
  );
  const out: Record<string, number> = {};
  for (const row of rows) out[row.category_id] = row.spent;
  return out;
}
```

- [ ] **Step 4: Run query tests**

Run:

```bash
npm test -- --ci __tests__/spending_plans.query.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/budget/database/spending_plans.ts __tests__/spending_plans.query.test.ts
git commit -m "feat: add spending plan queries"
```

---

## Task 3: Repository And Store

**Files:**
- Modify: `src/modules/budget/repositories/budget.repository.ts`
- Modify: `src/modules/budget/store/budget.store.ts`
- Test: `__tests__/budget.repository.spending_plans.test.ts`
- Test: `__tests__/budget.store.spending_plans.test.ts`

- [ ] **Step 1: Write repository tests first**

Create `__tests__/budget.repository.spending_plans.test.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

import type { SpendingPlan } from '@/modules/budget/entities/budget.entity';
import { BudgetRepository } from '@/modules/budget/repositories/budget.repository';

jest.mock('react-native-uuid', () => ({ v4: jest.fn(() => 'new-plan-id') }));
jest.mock('@/database/client', () => ({ getDb: jest.fn().mockResolvedValue({}) }));
jest.mock('@/modules/budget/database/budget_stats', () => ({
  getCategorySpendByMonth: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/modules/budget/database/budgets', () => ({
  deleteBudgetRow: jest.fn().mockResolvedValue(undefined),
  getBudgetRows: jest.fn().mockResolvedValue([]),
  setBudgetRow: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/modules/budget/database/spending_plans', () => ({
  deleteSpendingPlan: jest.fn().mockResolvedValue(undefined),
  getPlanCategorySpend: jest.fn().mockResolvedValue({}),
  getSpendingPlanRows: jest.fn().mockResolvedValue([]),
  setSpendingPlan: jest.fn().mockResolvedValue(undefined),
}));

const {
  deleteSpendingPlan,
  getPlanCategorySpend,
  getSpendingPlanRows,
  setSpendingPlan,
} = jest.requireMock('@/modules/budget/database/spending_plans') as {
  deleteSpendingPlan: jest.Mock<Promise<void>, [SQLiteDatabase, string]>;
  getPlanCategorySpend: jest.Mock<Promise<Record<string, number>>, [SQLiteDatabase, unknown]>;
  getSpendingPlanRows: jest.Mock<Promise<Array<SpendingPlan & { categories: unknown[] }>>, [SQLiteDatabase, string]>;
  setSpendingPlan: jest.Mock<Promise<void>, [SQLiteDatabase, SpendingPlan, unknown[]]>;
};

const NOW = '2026-07-09T00:00:00.000Z';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date(NOW));
});

afterEach(() => jest.useRealTimers());

describe('BudgetRepository spending plans', () => {
  it('creates a plan with selected categories and allocations', async () => {
    await new BudgetRepository().setSpendingPlan({
      name: 'Alexandria weekend',
      startDate: '2026-07-18',
      endDate: '2026-07-21',
      totalAmount: 8000,
      categories: [
        { categoryId: 'cat_food', allocatedAmount: 3000 },
        { categoryId: 'cat_travel' },
      ],
    });

    expect(setSpendingPlan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'new-plan-id',
        name: 'Alexandria weekend',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 8000,
      }),
      [
        { plan_id: 'new-plan-id', category_id: 'cat_food', allocated_amount: 3000 },
        { plan_id: 'new-plan-id', category_id: 'cat_travel', allocated_amount: null },
      ],
    );
  });

  it('rejects allocations above the plan total', async () => {
    await expect(
      new BudgetRepository().setSpendingPlan({
        name: 'Trip',
        startDate: '2026-07-18',
        endDate: '2026-07-21',
        totalAmount: 5000,
        categories: [
          { categoryId: 'cat_food', allocatedAmount: 3000 },
          { categoryId: 'cat_travel', allocatedAmount: 3000 },
        ],
      }),
    ).rejects.toThrow('Allocations exceed the plan total');
    expect(setSpendingPlan).not.toHaveBeenCalled();
  });

  it('rejects overlapping plans for the same category', async () => {
    getSpendingPlanRows.mockResolvedValueOnce([
      {
        id: 'existing',
        name: 'Existing trip',
        start_date: '2026-07-20',
        end_date: '2026-07-25',
        total_amount: 3000,
        created_at: NOW,
        updated_at: NOW,
        categories: [{ plan_id: 'existing', category_id: 'cat_food', allocated_amount: null }],
      },
    ]);

    await expect(
      new BudgetRepository().setSpendingPlan({
        name: 'New trip',
        startDate: '2026-07-18',
        endDate: '2026-07-21',
        totalAmount: 5000,
        categories: [{ categoryId: 'cat_food' }],
      }),
    ).rejects.toThrow('cat_food overlaps Existing trip');
    expect(setSpendingPlan).not.toHaveBeenCalled();
  });

  it('allows overlapping dates for different categories', async () => {
    getSpendingPlanRows.mockResolvedValueOnce([
      {
        id: 'existing',
        name: 'Existing trip',
        start_date: '2026-07-20',
        end_date: '2026-07-25',
        total_amount: 3000,
        created_at: NOW,
        updated_at: NOW,
        categories: [{ plan_id: 'existing', category_id: 'cat_food', allocated_amount: null }],
      },
    ]);

    await new BudgetRepository().setSpendingPlan({
      name: 'New trip',
      startDate: '2026-07-18',
      endDate: '2026-07-21',
      totalAmount: 5000,
      categories: [{ categoryId: 'cat_travel' }],
    });

    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
  });

  it('loads visible plans and category spend for them', async () => {
    getSpendingPlanRows.mockResolvedValueOnce([
      {
        id: 'plan_trip',
        name: 'Trip',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 8000,
        created_at: NOW,
        updated_at: NOW,
        categories: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 }],
      },
    ]);
    getPlanCategorySpend.mockResolvedValueOnce({ cat_food: 1200 });

    const result = await new BudgetRepository().getSpendingPlansForMonth('2026-07');

    expect(result.plans).toHaveLength(1);
    expect(result.spendByPlanId).toEqual({ plan_trip: { cat_food: 1200 } });
  });

  it('deletes a spending plan by id', async () => {
    await new BudgetRepository().removeSpendingPlan('plan_trip');
    expect(deleteSpendingPlan).toHaveBeenCalledWith(expect.anything(), 'plan_trip');
  });
});
```

- [ ] **Step 2: Run repository tests and verify they fail**

Run:

```bash
npm test -- --ci __tests__/budget.repository.spending_plans.test.ts
```

Expected: FAIL because repository methods do not exist.

- [ ] **Step 3: Extend repository types and methods**

Modify `src/modules/budget/repositories/budget.repository.ts` imports:

```ts
import {
  deleteSpendingPlan,
  getPlanCategorySpend,
  getSpendingPlanRows,
  setSpendingPlan as setSpendingPlanRow,
  type SpendingPlanWithCategories,
} from '@/modules/budget/database/spending_plans';
import type { SpendingPlan } from '@/modules/budget/entities/budget.entity';
```

Add interfaces near `SetBudgetInput`:

```ts
export interface SpendingPlanCategoryInput {
  categoryId: string;
  allocatedAmount?: number;
}

export interface SetSpendingPlanInput {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  categories: SpendingPlanCategoryInput[];
}

export interface SpendingPlansForMonthResult {
  plans: SpendingPlanWithCategories[];
  spendByPlanId: Record<string, Record<string, number>>;
}
```

Add methods to `IBudgetRepository`:

```ts
  getSpendingPlansForMonth(yearMonth: string): Promise<SpendingPlansForMonthResult>;
  setSpendingPlan(input: SetSpendingPlanInput): Promise<void>;
  removeSpendingPlan(id: string): Promise<void>;
```

Add helper functions:

```ts
function normalizePlanName(name: string): string {
  return name.trim();
}

function rangesOverlap(
  left: { startDate: string; endDate: string },
  right: { startDate: string; endDate: string },
): boolean {
  return left.startDate <= right.endDate && left.endDate >= right.startDate;
}

function validateSpendingPlanInput(input: SetSpendingPlanInput): void {
  if (normalizePlanName(input.name).length === 0) throw new Error('Enter a plan name');
  if (input.endDate < input.startDate) throw new Error('End date must be on or after start date');
  if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) {
    throw new Error('Plan total must be greater than zero');
  }
  const unique = new Set(input.categories.map((category) => category.categoryId));
  if (unique.size === 0) throw new Error('Select at least one category');
  if (unique.size !== input.categories.length) throw new Error('Duplicate plan category');
  const allocated = input.categories.reduce(
    (total, category) => total + (category.allocatedAmount ?? 0),
    0,
  );
  if (allocated > input.totalAmount) throw new Error('Allocations exceed the plan total');
}
```

Add class methods:

```ts
  async getSpendingPlansForMonth(yearMonth: string): Promise<SpendingPlansForMonthResult> {
    const db = await getDb();
    const plans = await getSpendingPlanRows(db, yearMonth);
    const spendEntries = await Promise.all(
      plans.map(async (plan) => {
        const categoryIds = plan.categories.map((category) => category.category_id);
        const spend = await getPlanCategorySpend(db, {
          startDate: plan.start_date,
          endDate: plan.end_date,
          categoryIds,
        });
        return [plan.id, spend] as const;
      }),
    );
    return { plans, spendByPlanId: Object.fromEntries(spendEntries) };
  }

  async setSpendingPlan(input: SetSpendingPlanInput): Promise<void> {
    validateSpendingPlanInput(input);
    const db = await getDb();
    const now = new Date().toISOString();
    const yearMonth = input.startDate.slice(0, 7);
    const existingPlans = await getSpendingPlanRows(db, yearMonth);
    const selectedCategoryIds = new Set(input.categories.map((category) => category.categoryId));
    const conflict = existingPlans
      .filter((plan) => plan.id !== input.id)
      .find(
        (plan) =>
          rangesOverlap(
            { startDate: input.startDate, endDate: input.endDate },
            { startDate: plan.start_date, endDate: plan.end_date },
          ) && plan.categories.some((category) => selectedCategoryIds.has(category.category_id)),
      );
    if (conflict) {
      const category = conflict.categories.find((row) => selectedCategoryIds.has(row.category_id));
      throw new Error(`${category?.category_id ?? 'Category'} overlaps ${conflict.name}`);
    }

    const existing = input.id
      ? existingPlans.find((plan) => plan.id === input.id)
      : undefined;
    const planId = input.id ?? String(uuid.v4());
    const plan: SpendingPlan = {
      id: planId,
      name: normalizePlanName(input.name),
      start_date: input.startDate,
      end_date: input.endDate,
      total_amount: input.totalAmount,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    await setSpendingPlanRow(
      db,
      plan,
      input.categories.map((category) => ({
        plan_id: planId,
        category_id: category.categoryId,
        allocated_amount: category.allocatedAmount ?? null,
      })),
    );
  }

  async removeSpendingPlan(id: string): Promise<void> {
    const db = await getDb();
    await deleteSpendingPlan(db, id);
  }
```

Do not add category repository imports to `BudgetRepository`; this layer can report category ids in conflict errors. UI copy can be improved later in the hook/sheet with category metadata if needed.

- [ ] **Step 4: Write store tests**

Create `__tests__/budget.store.spending_plans.test.ts`:

```ts
import { createBudgetStore } from '@/modules/budget/store/budget.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: {
    copyBudgetsToMonth: jest.fn().mockResolvedValue(undefined),
    getRows: jest.fn().mockResolvedValue([]),
    getSpendByMonth: jest.fn().mockResolvedValue({}),
    getSpendingPlansForMonth: jest.fn().mockResolvedValue({ plans: [], spendByPlanId: {} }),
    removeBudget: jest.fn().mockResolvedValue(undefined),
    removeSpendingPlan: jest.fn().mockResolvedValue(undefined),
    setBudget: jest.fn().mockResolvedValue(undefined),
    setSpendingPlan: jest.fn().mockResolvedValue(undefined),
  },
  currentYearMonth: jest.fn(() => '2026-07'),
  lastMonths: jest.fn(() => ['2026-07']),
}));

const { budgetRepository } = jest.requireMock('@/modules/budget/repositories/budget.repository') as {
  budgetRepository: {
    getSpendingPlansForMonth: jest.Mock;
    setSpendingPlan: jest.Mock;
    removeSpendingPlan: jest.Mock;
  };
};

const repo: IAppSettingsRepository = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

describe('budget store spending plans', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads plans with the selected month', async () => {
    budgetRepository.getSpendingPlansForMonth.mockResolvedValueOnce({
      plans: [{ id: 'plan_trip', name: 'Trip', categories: [] }],
      spendByPlanId: { plan_trip: {} },
    });
    const store = createBudgetStore(repo);

    await store.getState().load('2026-08');

    expect(budgetRepository.getSpendingPlansForMonth).toHaveBeenCalledWith('2026-08');
    expect(store.getState().spendingPlans).toEqual([{ id: 'plan_trip', name: 'Trip', categories: [] }]);
    expect(store.getState().spendingPlanSpendById).toEqual({ plan_trip: {} });
  });

  it('saves a plan and reloads the plan start month', async () => {
    const store = createBudgetStore(repo);
    await store.getState().setSpendingPlan({
      name: 'Trip',
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      totalAmount: 8000,
      categories: [{ categoryId: 'cat_food' }],
    });

    expect(budgetRepository.setSpendingPlan).toHaveBeenCalledWith({
      name: 'Trip',
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      totalAmount: 8000,
      categories: [{ categoryId: 'cat_food' }],
    });
    expect(budgetRepository.getSpendingPlansForMonth).toHaveBeenCalledWith('2026-08');
  });

  it('removes a plan and reloads the selected month', async () => {
    const store = createBudgetStore(repo);
    await store.getState().removeSpendingPlan('plan_trip', '2026-08');

    expect(budgetRepository.removeSpendingPlan).toHaveBeenCalledWith('plan_trip');
    expect(budgetRepository.getSpendingPlansForMonth).toHaveBeenCalledWith('2026-08');
  });
});
```

- [ ] **Step 5: Implement store state and actions**

Modify `src/modules/budget/store/budget.store.ts`:

```ts
import type {
  SetBudgetInput,
  SetSpendingPlanInput,
  SpendingPlansForMonthResult,
} from '@/modules/budget/repositories/budget.repository';
```

Add to `BudgetStoreShape`:

```ts
spendingPlans: SpendingPlansForMonthResult['plans'];
spendingPlanSpendById: SpendingPlansForMonthResult['spendByPlanId'];
```

Add to `INITIAL_STATE`:

```ts
spendingPlans: [],
spendingPlanSpendById: {},
```

Update `setData` signature and implementation:

```ts
setData: (
  rows: Budget[],
  spendByMonth: Record<string, Record<string, number>>,
  expectedIncome: number | null,
  spendingPlans: SpendingPlansForMonthResult['plans'],
  spendingPlanSpendById: SpendingPlansForMonthResult['spendByPlanId'],
) => void;
```

In `load`, fetch plans with the same anchor month:

```ts
const [rows, spendByMonth, rawIncome, planResult] = await Promise.all([
  budgetRepository.getRows(),
  budgetRepository.getSpendByMonth(months),
  repo.get(EXPECTED_INCOME_KEY),
  budgetRepository.getSpendingPlansForMonth(anchorMonth),
]);
get().setData(rows, spendByMonth, expectedIncome, planResult.plans, planResult.spendByPlanId);
```

Add actions:

```ts
setSpendingPlan: (input: SetSpendingPlanInput) => Promise<void>;
removeSpendingPlan: (id: string, yearMonth?: string) => Promise<void>;
```

Implement:

```ts
setSpendingPlan: async (input) => {
  await budgetRepository.setSpendingPlan(input);
  await get().load(input.startDate.slice(0, 7));
},
removeSpendingPlan: async (id, yearMonth = currentYearMonth()) => {
  await budgetRepository.removeSpendingPlan(id);
  await get().load(yearMonth);
},
```

- [ ] **Step 6: Run repository and store tests**

Run:

```bash
npm test -- --ci __tests__/budget.repository.spending_plans.test.ts __tests__/budget.store.spending_plans.test.ts __tests__/budget.store.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/budget/repositories/budget.repository.ts src/modules/budget/store/budget.store.ts __tests__/budget.repository.spending_plans.test.ts __tests__/budget.store.spending_plans.test.ts
git commit -m "feat: add spending plan repository state"
```

---

## Task 4: Pure View-Model Helpers

**Files:**
- Create: `src/modules/budget/screens/budget/spending_plans.helpers.ts`
- Test: `__tests__/spending_plans.helpers.test.ts`

- [ ] **Step 1: Write helper tests**

Create `__tests__/spending_plans.helpers.test.ts`:

```ts
import { CategoryType } from '@/constants/enums';
import {
  buildSpendingPlanRows,
  computeAllocationHelper,
  computeSpendingPlansSummary,
  planIntersectsMonth,
  validatePlanDraft,
} from '@/modules/budget/screens/budget/spending_plans.helpers';

const categories = [
  {
    id: 'cat_food',
    name: 'Food',
    type: CategoryType.Expense,
    icon: 'food',
    color: '#f90',
    is_default: 0,
    sort_order: 0,
    budget_group: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'cat_income',
    name: 'Salary',
    type: CategoryType.Income,
    icon: 'cash',
    color: '#0f0',
    is_default: 0,
    sort_order: 1,
    budget_group: null,
    created_at: '',
    updated_at: '',
  },
];

const plan = {
  id: 'plan_trip',
  name: 'Alexandria weekend',
  start_date: '2026-07-30',
  end_date: '2026-08-02',
  total_amount: 8000,
  created_at: '',
  updated_at: '',
  categories: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 }],
};

describe('spending plan helpers', () => {
  it('detects month intersections for cross-month plans', () => {
    expect(planIntersectsMonth(plan, '2026-07')).toBe(true);
    expect(planIntersectsMonth(plan, '2026-08')).toBe(true);
    expect(planIntersectsMonth(plan, '2026-09')).toBe(false);
  });

  it('builds rows with totals and allocation rows', () => {
    const rows = buildSpendingPlanRows({
      plans: [plan],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 1200 } },
      selectedMonth: '2026-07',
    });

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'plan_trip',
        name: 'Alexandria weekend',
        totalAmount: 8000,
        spent: 1200,
        left: 6800,
        pct: 0.15,
        categoryCount: 1,
        allocationRows: [
          expect.objectContaining({
            categoryId: 'cat_food',
            categoryName: 'Food',
            allocatedAmount: 3000,
            spent: 1200,
            pct: 0.4,
          }),
        ],
      }),
    ]);
  });

  it('computes plans summary from visible rows', () => {
    const rows = buildSpendingPlanRows({
      plans: [plan],
      categories,
      spendByPlanId: { plan_trip: { cat_food: 1200 } },
      selectedMonth: '2026-07',
    });
    expect(computeSpendingPlansSummary(rows)).toEqual({
      planned: 8000,
      spent: 1200,
      left: 6800,
      pct: 0.15,
    });
  });

  it('allows allocations below the total and reports buffer', () => {
    expect(computeAllocationHelper(8000, { cat_food: 3000 })).toEqual({
      allocated: 3000,
      buffer: 5000,
      isOver: false,
    });
  });

  it('marks allocations above the total as invalid', () => {
    expect(computeAllocationHelper(5000, { cat_food: 3000, cat_travel: 3000 })).toEqual({
      allocated: 6000,
      buffer: -1000,
      isOver: true,
    });
  });

  it('validates draft fields before save', () => {
    expect(
      validatePlanDraft({
        name: '',
        startDate: '2026-07-20',
        endDate: '2026-07-19',
        totalAmount: 0,
        categoryIds: [],
        allocations: {},
      }),
    ).toEqual({
      name: 'Enter a plan name',
      dates: 'End date must be on or after start date',
      amount: 'Enter a plan amount',
      categories: 'Select at least one category',
    });
  });
});
```

- [ ] **Step 2: Run helper tests and verify they fail**

Run:

```bash
npm test -- --ci __tests__/spending_plans.helpers.test.ts
```

Expected: FAIL because helper file does not exist.

- [ ] **Step 3: Implement helper file**

Create `src/modules/budget/screens/budget/spending_plans.helpers.ts` with:

```ts
import { CategoryType } from '@/constants/enums';
import type { SpendingPlanWithCategories } from '@/modules/budget/database/spending_plans';
import type { Category } from '@/modules/categories/entities/category.entity';

export interface SpendingPlanAllocationRowVM {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  allocatedAmount: number;
  spent: number;
  left: number;
  pct: number;
  isOver: boolean;
}

export interface SpendingPlanRowVM {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  spent: number;
  left: number;
  pct: number;
  isOver: boolean;
  categoryCount: number;
  categoryChips: Array<{ id: string; name: string; icon: string; color: string }>;
  allocationRows: SpendingPlanAllocationRowVM[];
  allocatedTotal: number;
  buffer: number;
}

export interface SpendingPlansSummaryVM {
  planned: number;
  spent: number;
  left: number;
  pct: number;
}

export interface AllocationHelperVM {
  allocated: number;
  buffer: number;
  isOver: boolean;
}

export interface PlanDraftValidationErrors {
  name?: string;
  dates?: string;
  amount?: string;
  categories?: string;
  allocations?: string;
}

function monthRange(yearMonth: string): { start: string; endExclusive: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return { start: `${yearMonth}-01`, endExclusive: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01` };
}

export function planIntersectsMonth(
  plan: Pick<SpendingPlanWithCategories, 'start_date' | 'end_date'>,
  yearMonth: string,
): boolean {
  const range = monthRange(yearMonth);
  return plan.start_date < range.endExclusive && plan.end_date >= range.start;
}

export function computeAllocationHelper(
  totalAmount: number,
  allocations: Record<string, number | undefined>,
): AllocationHelperVM {
  const allocated = Object.values(allocations).reduce((sum, amount) => sum + (amount ?? 0), 0);
  return { allocated, buffer: totalAmount - allocated, isOver: allocated > totalAmount };
}

export function buildSpendingPlanRows({
  plans,
  categories,
  spendByPlanId,
  selectedMonth,
}: {
  plans: SpendingPlanWithCategories[];
  categories: Category[];
  spendByPlanId: Record<string, Record<string, number>>;
  selectedMonth: string;
}): SpendingPlanRowVM[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  return plans
    .filter((plan) => planIntersectsMonth(plan, selectedMonth))
    .map((plan) => {
      const spend = spendByPlanId[plan.id] ?? {};
      const categoryChips = plan.categories
        .map((row) => categoryById.get(row.category_id))
        .filter((category): category is Category => Boolean(category) && category.type === CategoryType.Expense)
        .map((category) => ({ id: category.id, name: category.name, icon: category.icon, color: category.color }));
      const spent = plan.categories.reduce(
        (total, row) => total + (spend[row.category_id] ?? 0),
        0,
      );
      const allocationRows = plan.categories
        .filter((row) => row.allocated_amount !== null)
        .map((row) => {
          const category = categoryById.get(row.category_id);
          const allocatedAmount = row.allocated_amount ?? 0;
          const categorySpent = spend[row.category_id] ?? 0;
          return {
            categoryId: row.category_id,
            categoryName: category?.name ?? row.category_id,
            icon: category?.icon ?? 'tag',
            color: category?.color ?? '#ffffff',
            allocatedAmount,
            spent: categorySpent,
            left: allocatedAmount - categorySpent,
            pct: allocatedAmount > 0 ? categorySpent / allocatedAmount : 0,
            isOver: categorySpent > allocatedAmount,
          };
        });
      const allocatedTotal = plan.categories.reduce(
        (total, row) => total + (row.allocated_amount ?? 0),
        0,
      );
      return {
        id: plan.id,
        name: plan.name,
        startDate: plan.start_date,
        endDate: plan.end_date,
        totalAmount: plan.total_amount,
        spent,
        left: plan.total_amount - spent,
        pct: plan.total_amount > 0 ? spent / plan.total_amount : 0,
        isOver: spent > plan.total_amount,
        categoryCount: plan.categories.length,
        categoryChips,
        allocationRows,
        allocatedTotal,
        buffer: plan.total_amount - allocatedTotal,
      };
    });
}

export function computeSpendingPlansSummary(rows: SpendingPlanRowVM[]): SpendingPlansSummaryVM {
  const planned = rows.reduce((total, row) => total + row.totalAmount, 0);
  const spent = rows.reduce((total, row) => total + row.spent, 0);
  return { planned, spent, left: planned - spent, pct: planned > 0 ? spent / planned : 0 };
}

export function validatePlanDraft({
  name,
  startDate,
  endDate,
  totalAmount,
  categoryIds,
  allocations,
}: {
  name: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  categoryIds: string[];
  allocations: Record<string, number | undefined>;
}): PlanDraftValidationErrors {
  const errors: PlanDraftValidationErrors = {};
  if (name.trim().length === 0) errors.name = 'Enter a plan name';
  if (endDate < startDate) errors.dates = 'End date must be on or after start date';
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) errors.amount = 'Enter a plan amount';
  if (categoryIds.length === 0) errors.categories = 'Select at least one category';
  if (computeAllocationHelper(totalAmount, allocations).isOver) {
    errors.allocations = 'Allocations exceed the plan total';
  }
  return errors;
}
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
npm test -- --ci __tests__/spending_plans.helpers.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/budget/screens/budget/spending_plans.helpers.ts __tests__/spending_plans.helpers.test.ts
git commit -m "feat: derive spending plan view models"
```

---

## Task 5: Budget State And Hook Integration

**Files:**
- Modify: `src/modules/budget/screens/budget/budget.state.ts`
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Test: `__tests__/budget.state.spending_plans.test.ts`
- Test: `__tests__/screens/budget/budget_spending_plans_hook.test.ts`

- [ ] **Step 1: Write state tests**

Create `__tests__/budget.state.spending_plans.test.ts`:

```ts
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';

beforeEach(() => useBudgetState.getState().reset());

describe('budget state spending plan sheet', () => {
  it('opens add and edit plan modes without touching category budget sheet mode', () => {
    useBudgetState.getState().openAddPlan();
    expect(useBudgetState.getState()).toEqual(
      expect.objectContaining({
        planSheetVisible: true,
        planSheetMode: 'add',
        targetPlanId: undefined,
      }),
    );

    useBudgetState.getState().openEditPlan('plan_trip');
    expect(useBudgetState.getState()).toEqual(
      expect.objectContaining({
        planSheetVisible: true,
        planSheetMode: 'edit',
        targetPlanId: 'plan_trip',
      }),
    );
  });

  it('closes and resets target plan id', () => {
    useBudgetState.getState().openEditPlan('plan_trip');
    useBudgetState.getState().closePlan();

    expect(useBudgetState.getState()).toEqual(
      expect.objectContaining({
        planSheetVisible: false,
        targetPlanId: undefined,
      }),
    );
  });
});
```

- [ ] **Step 2: Implement budget state fields/actions**

Modify `BudgetStateShape` in `budget.state.ts`:

```ts
export type SpendingPlanSheetMode = 'add' | 'edit';

planSheetVisible: boolean;
planSheetMode: SpendingPlanSheetMode;
targetPlanId: string | undefined;
```

Add initial values:

```ts
planSheetVisible: false,
planSheetMode: 'add',
targetPlanId: undefined,
```

Add actions to `BudgetState` and store body:

```ts
openAddPlan: () => void;
openEditPlan: (planId: string) => void;
closePlan: () => void;
```

```ts
openAddPlan: () =>
  set({
    planSheetVisible: true,
    planSheetMode: 'add',
    targetPlanId: undefined,
  }),
openEditPlan: (planId) =>
  set({
    planSheetVisible: true,
    planSheetMode: 'edit',
    targetPlanId: planId,
  }),
closePlan: () => set({ planSheetVisible: false, targetPlanId: undefined }),
```

- [ ] **Step 3: Run state tests**

Run:

```bash
npm test -- --ci __tests__/budget.state.spending_plans.test.ts __tests__/budget.state.test.ts
```

Expected: PASS.

- [ ] **Step 4: Write hook integration tests**

Create `__tests__/screens/budget/budget_spending_plans_hook.test.ts` following the existing `__tests__/screens/budget/budget_month_actions.hook.test.ts` mock style. Mock category store with one expense category, budget store with one `spendingPlans` row and `spendingPlanSpendById`, then render `useBudget()` with `renderHook` imported from `@testing-library/react-native`.

Required assertions:

```ts
expect(result.current.state.spendingPlanRows[0]).toEqual(
  expect.objectContaining({
    id: 'plan_trip',
    name: 'Alexandria weekend',
    totalAmount: 8000,
    spent: 1200,
    left: 6800,
  }),
);
expect(result.current.state.spendingPlansSummary).toEqual({
  planned: 8000,
  spent: 1200,
  left: 6800,
  pct: 0.15,
});
expect(result.current.state.hasSpendingPlans).toBe(true);
```

- [ ] **Step 5: Integrate hook state and actions**

Modify `budget.hook.ts`:

```ts
import {
  buildSpendingPlanRows,
  computeSpendingPlansSummary,
} from '@/modules/budget/screens/budget/spending_plans.helpers';
```

Read store state:

```ts
const {
  budgetRows,
  spendByMonth,
  budgetLoaded,
  expectedIncome,
  spendingPlans,
  spendingPlanSpendById,
} = useBudgetStore(
  useShallow((s) => ({
    budgetRows: s.rows,
    spendByMonth: s.spendByMonth,
    budgetLoaded: s.loaded,
    expectedIncome: s.expectedIncome,
    spendingPlans: s.spendingPlans,
    spendingPlanSpendById: s.spendingPlanSpendById,
  })),
);
```

Read actions:

```ts
const setSpendingPlan = useBudgetStore.getState().setSpendingPlan;
const removeSpendingPlan = useBudgetStore.getState().removeSpendingPlan;
const openAddPlan = useBudgetState.getState().openAddPlan;
const openEditPlan = useBudgetState.getState().openEditPlan;
```

Derive rows and summary:

```ts
const spendingPlanRows = useMemo(
  () =>
    buildSpendingPlanRows({
      plans: spendingPlans,
      categories,
      spendByPlanId: spendingPlanSpendById,
      selectedMonth,
    }),
  [categories, selectedMonth, spendingPlanSpendById, spendingPlans],
);

const spendingPlansSummary = useMemo(
  () => computeSpendingPlansSummary(spendingPlanRows),
  [spendingPlanRows],
);
```

When `setSelectedMonth` runs, the existing `load(month)` call reloads plans for that month through the store.

Return state:

```ts
spendingPlanRows,
spendingPlansSummary,
hasSpendingPlans: spendingPlanRows.length > 0,
```

Return actions:

```ts
openAddPlan,
openEditPlan,
setSpendingPlan,
removeSpendingPlan,
```

- [ ] **Step 6: Run hook/state tests**

Run:

```bash
npm test -- --ci __tests__/budget.state.spending_plans.test.ts __tests__/screens/budget/budget_spending_plans_hook.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/budget/screens/budget/budget.state.ts src/modules/budget/screens/budget/budget.hook.ts __tests__/budget.state.spending_plans.test.ts __tests__/screens/budget/budget_spending_plans_hook.test.ts
git commit -m "feat: connect spending plans to budget hook"
```

---

## Task 6: Spending Plan Sheet State And Form

**Files:**
- Create: `src/modules/budget/screens/budget/components/spending_plan_sheet.state.ts`
- Create: `src/modules/budget/screens/budget/components/spending_plan_sheet.tsx`
- Create/modify: `src/utils/schemas/budget.schema.ts`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/screens/budget/spending_plan_sheet.state.test.ts`
- Test: `__tests__/screens/budget/spending_plan_sheet.test.tsx`

- [ ] **Step 1: Add strings**

Add these keys in `src/constants/strings.ts` near the budget strings:

```ts
budgetPlanSetTitle: 'Create plan',
budgetPlanEditTitle: 'Edit plan',
budgetPlanNameLabel: 'Plan name',
budgetPlanNamePlaceholder: 'e.g. Alexandria weekend',
budgetPlanAmountLabel: 'Plan total',
budgetPlanStartDate: 'Start date',
budgetPlanEndDate: 'End date',
budgetPlanCategories: 'Categories',
budgetPlanPickCategories: 'Pick categories',
budgetPlanAllocateByCategory: 'Allocate by category',
budgetPlanAllocationHelper: (allocated: string, total: string, buffer: string) =>
  `${allocated} of ${total} allocated · ${buffer} buffer`,
budgetPlanAllocationOver: 'Allocations exceed the plan total.',
budgetPlanSave: 'Save plan',
budgetPlanNameRequired: 'Enter a plan name',
budgetPlanAmountRequired: 'Enter a plan amount',
budgetPlanAmountInvalid: 'Enter a valid plan amount',
budgetPlanDateInvalid: 'End date must be on or after start date',
budgetPlanCategoryRequired: 'Select at least one category',
```

If `Strings` is a plain object without function-valued strings, use a helper function inside the sheet instead of adding `budgetPlanAllocationHelper`.

- [ ] **Step 2: Write state tests**

Create `__tests__/screens/budget/spending_plan_sheet.state.test.ts`:

```ts
import { useSpendingPlanSheetState } from '@/modules/budget/screens/budget/components/spending_plan_sheet.state';

beforeEach(() => useSpendingPlanSheetState.getState().reset());

describe('useSpendingPlanSheetState', () => {
  it('initialises add mode dates and selected categories', () => {
    useSpendingPlanSheetState.getState().initAddMode({
      month: '2026-07',
      firstCategoryId: 'cat_food',
    });

    expect(useSpendingPlanSheetState.getState()).toEqual(
      expect.objectContaining({
        startDate: '2026-07-01',
        endDate: '2026-07-01',
        selectedCategoryIds: ['cat_food'],
        allocateByCategory: false,
      }),
    );
  });

  it('toggles categories and clears removed allocations', () => {
    const state = useSpendingPlanSheetState.getState();
    state.initAddMode({ month: '2026-07', firstCategoryId: 'cat_food' });
    state.setAllocation('cat_food', 3000);
    state.toggleCategoryId('cat_food');

    expect(useSpendingPlanSheetState.getState().selectedCategoryIds).toEqual([]);
    expect(useSpendingPlanSheetState.getState().allocations).toEqual({});
  });

  it('resets sheet-local values', () => {
    useSpendingPlanSheetState.getState().initAddMode({ month: '2026-07', firstCategoryId: 'cat_food' });
    useSpendingPlanSheetState.getState().reset();
    expect(useSpendingPlanSheetState.getState().selectedCategoryIds).toEqual([]);
  });
});
```

- [ ] **Step 3: Implement sheet state**

Create `src/modules/budget/screens/budget/components/spending_plan_sheet.state.ts`:

```ts
import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface SpendingPlanSheetStateShape {
  startDate: string;
  endDate: string;
  selectedCategoryIds: string[];
  allocations: Record<string, number | undefined>;
  allocateByCategory: boolean;
  pickerExpanded: boolean;
  datePickerTarget: 'start' | 'end' | null;
}

type SpendingPlanSheetState = SpendingPlanSheetStateShape & {
  initAddMode: (input: { month: string; firstCategoryId?: string }) => void;
  initEditMode: (input: {
    startDate: string;
    endDate: string;
    categoryIds: string[];
    allocations: Record<string, number | undefined>;
  }) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  toggleCategoryId: (id: string) => void;
  setAllocation: (categoryId: string, amount: number | undefined) => void;
  setAllocateByCategory: (enabled: boolean) => void;
  openPicker: () => void;
  closePicker: () => void;
  openDatePicker: (target: 'start' | 'end') => void;
  closeDatePicker: () => void;
  reset: () => void;
};

const INITIAL_STATE: SpendingPlanSheetStateShape = {
  startDate: '',
  endDate: '',
  selectedCategoryIds: [],
  allocations: {},
  allocateByCategory: false,
  pickerExpanded: false,
  datePickerTarget: null,
};

export const useSpendingPlanSheetState = createMoneyAppSelectors(
  create<SpendingPlanSheetState>((set) => ({
    ...INITIAL_STATE,
    initAddMode: ({ month, firstCategoryId }) =>
      set({
        ...INITIAL_STATE,
        startDate: `${month}-01`,
        endDate: `${month}-01`,
        selectedCategoryIds: firstCategoryId ? [firstCategoryId] : [],
      }),
    initEditMode: ({ startDate, endDate, categoryIds, allocations }) =>
      set({
        ...INITIAL_STATE,
        startDate,
        endDate,
        selectedCategoryIds: categoryIds,
        allocations,
        allocateByCategory: Object.values(allocations).some((amount) => amount !== undefined),
      }),
    setStartDate: (date) => set({ startDate: date }),
    setEndDate: (date) => set({ endDate: date }),
    toggleCategoryId: (id) =>
      set((state) => {
        const selected = state.selectedCategoryIds.includes(id);
        const selectedCategoryIds = selected
          ? state.selectedCategoryIds.filter((categoryId) => categoryId !== id)
          : [...state.selectedCategoryIds, id];
        const allocations = { ...state.allocations };
        if (selected) delete allocations[id];
        return { selectedCategoryIds, allocations };
      }),
    setAllocation: (categoryId, amount) =>
      set((state) => ({ allocations: { ...state.allocations, [categoryId]: amount } })),
    setAllocateByCategory: (enabled) => set({ allocateByCategory: enabled }),
    openPicker: () => set({ pickerExpanded: true }),
    closePicker: () => set({ pickerExpanded: false }),
    openDatePicker: (target) => set({ datePickerTarget: target }),
    closeDatePicker: () => set({ datePickerTarget: null }),
    reset: () => set(INITIAL_STATE),
  })),
);
```

- [ ] **Step 4: Add schema helpers**

Extend `src/utils/schemas/budget.schema.ts`:

```ts
export const spendingPlanFormSchema = z.object({
  nameText: z.string().trim().min(1, Strings.budgetPlanNameRequired),
  totalText: z
    .string()
    .min(1, Strings.budgetPlanAmountRequired)
    .refine((s) => {
      const n = parseLimit(s);
      return Number.isFinite(n) && n > 0;
    }, Strings.budgetPlanAmountInvalid),
});

export type SpendingPlanFormValues = z.infer<typeof spendingPlanFormSchema>;
```

- [ ] **Step 5: Write sheet render/submit tests**

Create `__tests__/screens/budget/spending_plan_sheet.test.tsx` with mocks similar to `set_budget_sheet.test.tsx`. Required cases:

```ts
it('does not render when closed', () => {
  // planSheetVisible=false -> queryByText('Create plan') is null
});

it('submits a simple plan with selected categories', async () => {
  // open add mode, enter name and amount, press Save plan
  // expect setSpendingPlan({ name, startDate, endDate, totalAmount, categories: [{ categoryId }] })
});

it('blocks save when allocations exceed total', async () => {
  // enable allocate by category, set total 5000 and allocation 6000
  // expect error text 'Allocations exceed the plan total.'
  // expect setSpendingPlan not called
});
```

- [ ] **Step 6: Implement `SpendingPlanSheet`**

Create `src/modules/budget/screens/budget/components/spending_plan_sheet.tsx` using these constraints:

- Use `Sheet` from `@/components/ui/sheet`.
- Use `BottomSheetScrollView` from `@gorhom/bottom-sheet`.
- Use HeroUI `Input`, `PressableFeedback`, and `Switch`.
- Use `CategoryPickerSheet` for selecting expense categories; for multi-select, pass selected categories through state and close only when the user closes the picker.
- Wire `useBottomSheetAwareHandlers()` to all `Input` fields.
- Do not use local `useState`.
- Initial form values come from `planSheetMode` and `targetPlanId`.
- On submit, call `useBudgetStore.getState().setSpendingPlan`.
- On close/save, call `useBudgetState.getState().closePlan()`.

The save payload shape:

```ts
await setSpendingPlan({
  id: isEdit ? editingPlan?.id : undefined,
  name: values.nameText,
  startDate,
  endDate,
  totalAmount: parseLimit(values.totalText),
  categories: selectedCategoryIds.map((categoryId) => ({
    categoryId,
    allocatedAmount: allocateByCategory ? allocations[categoryId] : undefined,
  })),
});
```

Allocation inputs use compact amount fields matching the current budget sheet input height (`h-7`, `Type.bodyStrong`, `height: ms(28)`).

- [ ] **Step 7: Run sheet tests**

Run:

```bash
npm test -- --ci __tests__/screens/budget/spending_plan_sheet.state.test.ts __tests__/screens/budget/spending_plan_sheet.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/constants/strings.ts src/utils/schemas/budget.schema.ts src/modules/budget/screens/budget/components/spending_plan_sheet.state.ts src/modules/budget/screens/budget/components/spending_plan_sheet.tsx __tests__/screens/budget/spending_plan_sheet.state.test.ts __tests__/screens/budget/spending_plan_sheet.test.tsx
git commit -m "feat: add spending plan sheet"
```

---

## Task 7: Plans Tab UI

**Files:**
- Create: `src/modules/budget/screens/budget/components/spending_plan_card.tsx`
- Create: `src/modules/budget/screens/budget/components/spending_plans_lens.tsx`
- Modify: `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx`
- Modify: `src/modules/budget/screens/budget/index.tsx`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/screens/budget/spending_plans_lens.test.tsx`
- Test: `__tests__/screens/budget/budget_screen.test.tsx`

- [ ] **Step 1: Add remaining strings**

Add:

```ts
budgetPlansEmptyTitle: 'No spending plans',
budgetPlansEmptyBody: 'Create a short-term plan for travel, a week, or another temporary period.',
budgetPlansCreateAction: 'Create plan',
budgetPlansSummaryPlanned: 'Planned',
budgetPlansSummarySpent: 'Spent',
budgetPlansSummaryLeft: 'Left',
budgetPlansDateRange: (start: string, end: string) => `${start} - ${end}`,
budgetPlansCategoriesCount: (count: number) => `${count} categories`,
budgetPlansAllocationBuffer: (amount: string) => `${amount} buffer`,
```

If function-valued strings do not fit the existing object, keep formatting helpers in `spending_plan_card.tsx`.

- [ ] **Step 2: Write lens/card tests**

Create `__tests__/screens/budget/spending_plans_lens.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';

import { SpendingPlansLens } from '@/modules/budget/screens/budget/components/spending_plans_lens';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

describe('SpendingPlansLens', () => {
  const summary = { planned: 8000, spent: 1200, left: 6800, pct: 0.15 };
  const row = {
    id: 'plan_trip',
    name: 'Alexandria weekend',
    startDate: '2026-07-18',
    endDate: '2026-07-21',
    totalAmount: 8000,
    spent: 1200,
    left: 6800,
    pct: 0.15,
    isOver: false,
    categoryCount: 2,
    categoryChips: [
      { id: 'cat_food', name: 'Food', icon: 'food', color: '#f90' },
      { id: 'cat_travel', name: 'Travel', icon: 'car', color: '#09f' },
    ],
    allocationRows: [
      {
        categoryId: 'cat_food',
        categoryName: 'Food',
        icon: 'food',
        color: '#f90',
        allocatedAmount: 3000,
        spent: 1200,
        left: 1800,
        pct: 0.4,
        isOver: false,
      },
    ],
    allocatedTotal: 3000,
    buffer: 5000,
  };

  it('renders summary and plan cards', () => {
    const { getByText } = render(
      <SpendingPlansLens
        rows={[row]}
        summary={summary}
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(getByText('Alexandria weekend')).toBeTruthy();
    expect(getByText('8,000')).toBeTruthy();
    expect(getByText('1,200')).toBeTruthy();
    expect(getByText('Food')).toBeTruthy();
  });

  it('renders empty state and create action', () => {
    const onCreate = jest.fn();
    const { getByText } = render(
      <SpendingPlansLens
        rows={[]}
        summary={{ planned: 0, spent: 0, left: 0, pct: 0 }}
        onCreate={onCreate}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Create plan'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Implement card and lens**

Create `spending_plan_card.tsx`:

- Props: `row: SpendingPlanRowVM`, `onEdit: (id: string) => void`, `onDelete: (id: string) => void`.
- Use `PressableFeedback` for the row/card press.
- Use `BudgetBar` for progress with `budgetBandColor(row.pct)`.
- Use `formatAmount`, `formatShortDate`, `remainingLabel`.
- Render allocation rows only when `row.allocationRows.length > 0`.
- Keep styles tokenized via `Colors`, `FontFamily`, `Radius`, `Spacing`, `Type`, `ms`.

Create `spending_plans_lens.tsx`:

- Props: `summary`, `rows`, `onCreate`, `onEdit`, `onDelete`.
- Render a `SummaryCard`-compatible card or a small local summary card labelled Planned/Spent/Left.
- Render `BudgetToolRail` only from `index.tsx`, not inside the lens.
- Render `EmptyState` with budget variant or a local plan empty state with a create action.

- [ ] **Step 4: Replace Plans placeholder in screen**

Modify `index.tsx`:

- Import `SpendingPlansLens` and `SpendingPlanSheet`.
- In the `plans` branch, render summary/tool rail and `SpendingPlansLens`.
- The Plan tool button should call `openAddPlan`, not only switch to the tab, when the current tab is already `plans`.
- Keep the Categories tab category action calling `openAdd`.
- Render `<SpendingPlanSheet ... />` next to `<SetBudgetSheet />`.

Expected routing:

```tsx
const openPlanTool = useCallback(() => {
  if (state.lensTab === 'plans') openAddPlan();
  else setLensTab('plans');
}, [openAddPlan, setLensTab, state.lensTab]);
```

- [ ] **Step 5: Update skeletons**

Modify `BudgetScreenSkeleton` to accept:

```ts
export function BudgetScreenSkeleton({ variant = 'categories' }: { variant?: 'categories' | 'plans' })
```

For `plans`, render:

- summary card skeleton with same height as real Plans summary,
- tool rail skeleton,
- two plan-card skeletons with compact allocation row placeholders.

In `index.tsx`, call:

```tsx
<BudgetScreenSkeleton variant={state.lensTab === 'plans' ? 'plans' : 'categories'} />
```

- [ ] **Step 6: Update budget screen tests**

Modify `__tests__/screens/budget/budget_screen.test.tsx` mocks:

- Mock `SpendingPlansLens` and `SpendingPlanSheet`.
- Add `spendingPlanRows`, `spendingPlansSummary`, `hasSpendingPlans` to `baseState`.
- Replace the placeholder test with a real Plans lens test:

```ts
it('renders spending plans from the plans tab', () => {
  mockUseBudget({
    hasLoaded: true,
    lensTab: 'plans',
    hasSpendingPlans: true,
    spendingPlanRows: [{ id: 'plan_trip', name: 'Alexandria weekend' } as never],
    spendingPlansSummary: { planned: 8000, spent: 1200, left: 6800, pct: 0.15 },
  });

  const { getByText, queryByText } = render(<BudgetScreen />);

  expect(getByText('tab:plans')).toBeTruthy();
  expect(getByText('plans-lens:1')).toBeTruthy();
  expect(queryByText('Temporary budgets')).toBeNull();
});
```

- [ ] **Step 7: Run UI tests**

Run:

```bash
npm test -- --ci __tests__/screens/budget/spending_plans_lens.test.tsx __tests__/screens/budget/budget_screen.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/constants/strings.ts src/modules/budget/screens/budget/components/spending_plan_card.tsx src/modules/budget/screens/budget/components/spending_plans_lens.tsx src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx src/modules/budget/screens/budget/index.tsx __tests__/screens/budget/spending_plans_lens.test.tsx __tests__/screens/budget/budget_screen.test.tsx
git commit -m "feat: render spending plans tab"
```

---

## Task 8: Integration Hardening And Local CI

**Files:**
- Modify only files identified by failing verification commands; do not change unrelated passing areas.
- Test: existing budget, database, screen, and full CI parity.

- [ ] **Step 1: Run targeted budget suite**

Run:

```bash
npm test -- --ci __tests__/spending_plans.migration.test.ts __tests__/spending_plans.query.test.ts __tests__/budget.repository.spending_plans.test.ts __tests__/budget.store.spending_plans.test.ts __tests__/spending_plans.helpers.test.ts __tests__/budget.state.spending_plans.test.ts __tests__/screens/budget/budget_spending_plans_hook.test.ts __tests__/screens/budget/spending_plan_sheet.state.test.ts __tests__/screens/budget/spending_plan_sheet.test.tsx __tests__/screens/budget/spending_plans_lens.test.tsx __tests__/screens/budget/budget_screen.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run existing affected tests**

Run:

```bash
npm test -- --ci __tests__/budget.migration.test.ts __tests__/budgets.query.test.ts __tests__/budget.repository.test.ts __tests__/budget.store.test.ts __tests__/budget.helpers.test.ts __tests__/budget.state.test.ts __tests__/screens/budget/set_budget_sheet.test.tsx __tests__/screens/budget/budget_tool_rail.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run full unit suite**

Run:

```bash
npm test -- --ci
```

Expected: PASS.

- [ ] **Step 4: Run format, lint, and typecheck**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
```

Expected: all PASS.

- [ ] **Step 5: Run pre-push CI parity before any PR push**

Run:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ CI parity green — safe to push"
```

Expected: command exits 0 and prints `✓ CI parity green — safe to push`.

- [ ] **Step 6: Commit final fixes if any**

If Step 1-5 required fixes:

```bash
git add <changed-files>
git commit -m "fix: harden spending plans"
```

If no fixes were needed, do not create an empty commit.

---

## Manual Device QA Gate

After implementation and PR checks are green, ask the user to run device QA. Required cases:

- Create a simple plan with name, date range, amount, and two categories.
- Confirm the plan appears in every selected month it intersects.
- Add expense transactions in range/category and confirm spent/left update.
- Add income/transfer/cc payment in range and confirm they do not affect plan spend.
- Create a plan with allocations below total and confirm buffer is allowed.
- Try allocations above total and confirm save is blocked.
- Try overlapping same category/date with another plan and confirm save is blocked.
- Try overlapping different category/date and confirm save is allowed.
- Refresh the Budget screen and confirm skeleton size does not shift the cards.

---

## Self-Review Notes

- Spec coverage: migration, data model, category/date spend, allocation validation, overlap prevention, Plans tab UI, create/edit sheet, skeletons, and tests are covered.
- Code standards: plan keeps components presentational and moves UI state to Zustand `.state.ts`; all sheets use the existing HeroUI-backed `Sheet`.
- Critical triggers: no new dependency, no native code change, no data-loss migration, no existing monthly budget migration.
