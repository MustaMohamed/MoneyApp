import Database from 'better-sqlite3';
import {
  openDatabaseAsync,
  type SQLiteBindValue,
  type SQLiteDatabase,
  type SQLiteRunResult,
} from 'expo-sqlite';

import { BudgetGroup } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import {
  copyBudgetMonthCategoryGroups,
  getBudgetMonthCategoryGroups,
  getBudgetMonthIncome,
  setBudgetMonthCategoryGroup,
  setBudgetMonthIncome,
  snapshotBudgetMonthCategoryGroups,
} from '@/modules/budget/database/budget_month_profiles';

type SqlMockArgs = [source: string, params?: SQLiteBindValue[]];

interface ExpoSQLiteTestAdapter {
  __fakeDb: {
    getAllAsync: jest.Mock<Promise<unknown[]>, SqlMockArgs>;
    getFirstAsync: jest.Mock<Promise<unknown>, SqlMockArgs>;
    runAsync: jest.Mock<Promise<SQLiteRunResult>, SqlMockArgs>;
  };
  __reset: () => void;
}

interface IncomeAuditRow {
  created_at: string;
  expected_income: number;
  updated_at: string;
}

const sqlite = jest.requireMock<ExpoSQLiteTestAdapter>('expo-sqlite');
const NOW = '2026-07-16T00:00:00.000Z';
let realDb: ReturnType<typeof Database>;
let db: SQLiteDatabase;

beforeAll(async () => {
  realDb = new Database(':memory:');
  realDb.pragma('foreign_keys = ON');
  realDb.exec(MIGRATIONS.map(({ up }) => up).join('\n'));
  realDb
    .prepare<[string, string, string, string, string, string, string, string]>(
      `INSERT INTO categories
       (id, name, type, icon, color, is_default, sort_order, budget_group, created_at, updated_at)
       VALUES
       ('cat_profile_need', 'Need', 'expense', 'home', '#fff', 0, 100, 'need', ?, ?),
       ('cat_profile_savings', 'Savings', 'expense', 'bank', '#fff', 0, 101, 'savings', ?, ?),
       ('cat_profile_ungrouped', 'Ungrouped', 'expense', 'tag', '#fff', 0, 102, NULL, ?, ?),
       ('cat_profile_income', 'Income', 'income', 'cash', '#fff', 0, 103, 'want', ?, ?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW);

  const fake = sqlite.__fakeDb;
  fake.getAllAsync.mockImplementation(async (sql, params = []) => {
    return realDb.prepare<SQLiteBindValue[], unknown>(sql).all(...params);
  });
  fake.getFirstAsync.mockImplementation(async (sql, params = []) => {
    return realDb.prepare<SQLiteBindValue[], unknown>(sql).get(...params) ?? null;
  });
  fake.runAsync.mockImplementation(async (sql, params = []) => {
    const result = realDb.prepare<SQLiteBindValue[]>(sql).run(...params);
    return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
  });
  db = await openDatabaseAsync(':memory:');
});

beforeEach(() => {
  realDb.exec('DELETE FROM budget_month_category_groups; DELETE FROM budget_month_settings');
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

describe('budget month profile queries', () => {
  it('gets and sets income for the exact requested month', async () => {
    await setBudgetMonthIncome(db, '2026-06', 18_000);
    await setBudgetMonthIncome(db, '2026-07', 25_000);

    expect(await getBudgetMonthIncome(db, '2026-06')).toBe(18_000);
    expect(await getBudgetMonthIncome(db, '2026-07')).toBe(25_000);
    expect(await getBudgetMonthIncome(db, '2026-08')).toBeNull();
  });

  it('updates an existing month income without replacing its creation timestamp', async () => {
    realDb
      .prepare(
        `INSERT INTO budget_month_settings
         (year_month, expected_income, created_at, updated_at)
         VALUES ('2026-07', 20000, 'created-before', 'updated-before')`,
      )
      .run();

    await setBudgetMonthIncome(db, '2026-07', 30_000);

    const row = realDb
      .prepare<[], IncomeAuditRow>(
        `SELECT expected_income, created_at, updated_at
         FROM budget_month_settings WHERE year_month = '2026-07'`,
      )
      .get();
    expect(row).toMatchObject({
      expected_income: 30_000,
      created_at: 'created-before',
    });
    expect(row?.updated_at).not.toBe('updated-before');
  });

  it.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    9_007_199_254_740_992,
  ])('rejects non-finite, non-positive, or unsafe income %s', async (income) => {
    await expect(setBudgetMonthIncome(db, '2026-07', income)).rejects.toThrow(
      'Budget month income must be a finite positive safe number',
    );
    expect(await getBudgetMonthIncome(db, '2026-07')).toBeNull();
  });

  it('snapshots grouped expense categories without overwriting existing rows', async () => {
    realDb
      .prepare(
        `INSERT INTO budget_month_category_groups
         (year_month, category_id, budget_group, created_at, updated_at)
         VALUES ('2026-07', 'cat_profile_need', 'want', ?, ?)`,
      )
      .run(NOW, NOW);

    await snapshotBudgetMonthCategoryGroups(db, '2026-07');

    const groups = await getBudgetMonthCategoryGroups(db, '2026-07');
    expect(groups.cat_profile_need).toBe(BudgetGroup.Want);
    expect(groups.cat_profile_savings).toBe(BudgetGroup.Savings);
    expect(groups.cat_profile_ungrouped).toBeUndefined();
    expect(groups.cat_profile_income).toBeUndefined();
  });

  it('explicitly sets and updates one selected-month category group', async () => {
    await setBudgetMonthCategoryGroup(db, '2026-07', 'cat_profile_need', BudgetGroup.Need);
    await setBudgetMonthCategoryGroup(db, '2026-07', 'cat_profile_need', BudgetGroup.Want);

    expect(await getBudgetMonthCategoryGroups(db, '2026-07')).toMatchObject({
      cat_profile_need: BudgetGroup.Want,
    });
    expect(await getBudgetMonthCategoryGroups(db, '2026-06')).toEqual({});
  });

  it('rejects an income category without writing a month group', async () => {
    await expect(
      setBudgetMonthCategoryGroup(db, '2026-07', 'cat_profile_income', BudgetGroup.Want),
    ).rejects.toThrow('Budget month category group requires an expense category');

    expect(await getBudgetMonthCategoryGroups(db, '2026-07')).toEqual({});
  });

  it('copies only selected category groups into the target month and preserves the source', async () => {
    const insert = realDb.prepare<[string, string, string, string, string]>(
      `INSERT INTO budget_month_category_groups
       (year_month, category_id, budget_group, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    insert.run('2026-06', 'cat_profile_need', 'need', NOW, NOW);
    insert.run('2026-06', 'cat_profile_savings', 'savings', NOW, NOW);
    insert.run('2026-07', 'cat_profile_need', 'want', NOW, NOW);

    await copyBudgetMonthCategoryGroups(db, '2026-06', '2026-07', ['cat_profile_need']);

    expect(await getBudgetMonthCategoryGroups(db, '2026-07')).toEqual({
      cat_profile_need: BudgetGroup.Need,
    });
    expect(await getBudgetMonthCategoryGroups(db, '2026-06')).toEqual({
      cat_profile_need: BudgetGroup.Need,
      cat_profile_savings: BudgetGroup.Savings,
    });
  });

  it('does nothing when no category groups are selected for copy', async () => {
    await copyBudgetMonthCategoryGroups(db, '2026-06', '2026-07', []);

    expect(await getBudgetMonthCategoryGroups(db, '2026-07')).toEqual({});
  });
});
