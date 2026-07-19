import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { getSpendingPlanSpend } from '@/modules/budget/database/budget_stats';
import {
  getSpendingPlanCategoryRows,
  replaceSpendingPlanCategoryRows,
} from '@/modules/budget/database/spending_plan_categories';
import {
  deleteSpendingPlan,
  getSpendingPlanRows,
  setSpendingPlanRow,
} from '@/modules/budget/database/spending_plans';
import type { SpendingPlan, SpendingPlanCategory } from '@/modules/budget/entities/budget.entity';

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
    account_id: row.account_id ?? 'acc',
    to_account_id: row.to_account_id ?? null,
    category_id: row.category_id ?? 'cat_plan_food',
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
      `INSERT INTO accounts (id,name,type,currency,opening_balance,current_balance,interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc_card','Card','credit_card','EGP',0,0,0,0,1,?,?)`,
    )
    .run(NOW, NOW);
  realDb
    .prepare(
      `INSERT INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
       VALUES ('cat_plan_food','Food','expense','food','#fff',0,0,?,?),
              ('cat_plan_travel','Travel','expense','car','#fff',0,1,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW);

  const fake = (
    SQLite as unknown as {
      __fakeDb: {
        getAllAsync: jest.Mock;
        runAsync: jest.Mock;
        withTransactionAsync: jest.Mock;
      };
    }
  ).__fakeDb;
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

async function savePlan(plan: SpendingPlan, categories: SpendingPlanCategory[]): Promise<void> {
  await setSpendingPlanRow(db, plan);
  await replaceSpendingPlanCategoryRows(db, plan.id, categories);
}

async function loadPlans(yearMonth: string) {
  const plans = await getSpendingPlanRows(db, yearMonth);
  const categories = await getSpendingPlanCategoryRows(
    db,
    plans.map((plan) => plan.id),
  );
  return plans.map((plan) => ({
    ...plan,
    categories: categories.filter((category) => category.plan_id === plan.id),
  }));
}

describe('spending plan query file', () => {
  it('saves and loads plans that intersect a selected month', async () => {
    await savePlan(
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
        { plan_id: 'plan_trip', category_id: 'cat_plan_food', allocated_amount: 3000 },
        { plan_id: 'plan_trip', category_id: 'cat_plan_travel', allocated_amount: null },
      ],
    );

    const july = await loadPlans('2026-07');
    const august = await loadPlans('2026-08');
    const september = await loadPlans('2026-09');

    expect(july).toHaveLength(1);
    expect(august).toHaveLength(1);
    expect(september).toEqual([]);
    expect(july[0].categories).toEqual([
      { plan_id: 'plan_trip', category_id: 'cat_plan_food', allocated_amount: 3000 },
      { plan_id: 'plan_trip', category_id: 'cat_plan_travel', allocated_amount: null },
    ]);
  });

  it('replaces categories on update', async () => {
    await savePlan(
      {
        id: 'plan_trip',
        name: 'Trip',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 8000,
        created_at: NOW,
        updated_at: NOW,
      },
      [{ plan_id: 'plan_trip', category_id: 'cat_plan_food', allocated_amount: 3000 }],
    );
    await savePlan(
      {
        id: 'plan_trip',
        name: 'Trip updated',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 9000,
        created_at: NOW,
        updated_at: NOW,
      },
      [{ plan_id: 'plan_trip', category_id: 'cat_plan_travel', allocated_amount: 4000 }],
    );

    const rows = await loadPlans('2026-07');
    expect(rows[0].name).toBe('Trip updated');
    expect(rows[0].categories).toEqual([
      { plan_id: 'plan_trip', category_id: 'cat_plan_travel', allocated_amount: 4000 },
    ]);
  });

  it('deletes a plan and cascades category rows', async () => {
    await savePlan(
      {
        id: 'plan_trip',
        name: 'Trip',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 8000,
        created_at: NOW,
        updated_at: NOW,
      },
      [{ plan_id: 'plan_trip', category_id: 'cat_plan_food', allocated_amount: 3000 }],
    );

    await deleteSpendingPlan(db, 'plan_trip');
    expect(await loadPlans('2026-07')).toEqual([]);
  });

  it('allows a category to be deleted and removes its plan assignments', async () => {
    realDb
      .prepare(
        `INSERT INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
         VALUES ('cat_temporary','Temporary','expense','tag','#fff',0,2,?,?)`,
      )
      .run(NOW, NOW);
    await savePlan(
      {
        id: 'plan_temporary',
        name: 'Temporary plan',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 8000,
        created_at: NOW,
        updated_at: NOW,
      },
      [{ plan_id: 'plan_temporary', category_id: 'cat_temporary', allocated_amount: 3000 }],
    );

    expect(() =>
      realDb.prepare("DELETE FROM categories WHERE id = 'cat_temporary'").run(),
    ).not.toThrow();
    expect(
      realDb
        .prepare("SELECT * FROM spending_plan_categories WHERE category_id = 'cat_temporary'")
        .all(),
    ).toEqual([]);
  });

  it('sums only expense spend inside the plan range and categories', async () => {
    await savePlan(
      {
        id: 'plan_spend',
        name: 'Spend plan',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 8000,
        created_at: NOW,
        updated_at: NOW,
      },
      [
        { plan_id: 'plan_spend', category_id: 'cat_plan_food', allocated_amount: null },
        { plan_id: 'plan_spend', category_id: 'cat_plan_travel', allocated_amount: null },
      ],
    );
    tx({
      id: 'in-range-food',
      category_id: 'cat_plan_food',
      egp_amount: 500,
      transaction_date: '2026-07-18',
    });
    tx({
      id: 'in-range-travel',
      category_id: 'cat_plan_travel',
      egp_amount: 700,
      transaction_date: '2026-07-21',
    });
    tx({
      id: 'before-range',
      category_id: 'cat_plan_food',
      egp_amount: 999,
      transaction_date: '2026-07-17',
    });
    tx({
      id: 'wrong-type',
      type: 'income',
      category_id: 'cat_plan_food',
      egp_amount: 999,
      transaction_date: '2026-07-19',
    });

    const spend = await getSpendingPlanSpend(db, ['plan_spend']);

    expect(spend).toEqual({
      plan_spend: { cat_plan_food: 500, cat_plan_travel: 700 },
    });
  });

  it('subtracts card credits from plan spend and clamps category results at zero', async () => {
    await savePlan(
      {
        id: 'plan_credit',
        name: 'Credited plan',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 8000,
        created_at: NOW,
        updated_at: NOW,
      },
      [
        { plan_id: 'plan_credit', category_id: 'cat_plan_food', allocated_amount: null },
        { plan_id: 'plan_credit', category_id: 'cat_plan_travel', allocated_amount: null },
      ],
    );
    tx({ id: 'expense', account_id: 'acc_card', egp_amount: 600 });
    tx({ id: 'credit', account_id: 'acc_card', type: 'income', egp_amount: 150 });
    tx({
      id: 'credit-only',
      account_id: 'acc_card',
      type: 'income',
      category_id: 'cat_plan_travel',
      egp_amount: 150,
    });

    await expect(getSpendingPlanSpend(db, ['plan_credit'])).resolves.toEqual({
      plan_credit: { cat_plan_food: 450, cat_plan_travel: 0 },
    });
  });
});
