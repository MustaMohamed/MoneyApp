import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import uuid from 'react-native-uuid';

import { BudgetGroup } from '@/constants/enums';
import { withExclusiveWriteTransactionAsync } from '@/database/client';
import { MIGRATIONS } from '@/database/migrations';
import {
  BudgetNameTakenError,
  BudgetRepository,
} from '@/modules/budget/repositories/budget.repository';
import { exclusiveWriteOnRealDb, getSQLiteParams } from '@/test_helpers/sqlite';

jest.mock('@/database/client', () => ({
  getDb: jest.fn(),
  withExclusiveWriteTransactionAsync: jest.fn(),
}));
jest.mock('react-native-uuid', () => ({ v4: jest.fn() }));

const NOW_ISO = '2026-11-01T00:00:00.000Z';
let realDb: ReturnType<typeof Database>;
let fakeDb: SQLiteDatabase;
let generatedId = 0;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.pragma('foreign_keys = ON');
  realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));

  fakeDb = {
    getAllAsync: jest.fn(async (sql: string, ...rest: unknown[]) =>
      realDb.prepare(sql).all(...getSQLiteParams(rest)),
    ),
    getFirstAsync: jest.fn(async (sql: string, ...rest: unknown[]) => {
      const row = realDb.prepare(sql).get(...getSQLiteParams(rest));
      return row ?? null;
    }),
    runAsync: jest.fn(async (sql: string, ...rest: unknown[]) => {
      const result = realDb.prepare(sql).run(...getSQLiteParams(rest));
      return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
    }),
  } as unknown as SQLiteDatabase;
  jest
    .mocked(withExclusiveWriteTransactionAsync)
    .mockImplementation(exclusiveWriteOnRealDb(realDb, fakeDb));

  const { getDb } = jest.requireMock('@/database/client') as {
    getDb: jest.Mock<Promise<SQLiteDatabase>, []>;
  };
  getDb.mockResolvedValue(fakeDb);
});

beforeEach(() => {
  realDb.exec(
    `DELETE FROM budget_month_settings;
     DELETE FROM budget_month_category_groups;
     DELETE FROM budgets;
     UPDATE categories SET budget_group = 'need' WHERE id = 'cat_health';`,
  );
  generatedId = 0;
  (uuid.v4 as jest.Mock).mockImplementation(() => `generated-${++generatedId}`);
  jest.clearAllMocks();
});

afterAll(() => {
  realDb.close();
});

function seedBudget(id: string, categoryId: string, name: string, limit: number, month: string) {
  realDb
    .prepare(
      `INSERT INTO budgets (id, category_id, name, limit_amount, effective_from, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, categoryId, name, limit, month, NOW_ISO, NOW_ISO);
}

type BudgetRowState = { id: string; name: string; limit_amount: number };

function readBudgets(categoryId: string, month: string): BudgetRowState[] {
  return realDb
    .prepare(
      `SELECT id, name, limit_amount FROM budgets
        WHERE category_id = ? AND effective_from = ? ORDER BY id`,
    )
    .all(categoryId, month) as BudgetRowState[];
}

function readMonthGroup(month: string, categoryId: string): string | undefined {
  const row = realDb
    .prepare(
      'SELECT budget_group FROM budget_month_category_groups WHERE year_month = ? AND category_id = ?',
    )
    .get(month, categoryId) as { budget_group: string } | undefined;
  return row?.budget_group;
}

function readCategoryDefaultGroup(categoryId: string): string | null {
  const row = realDb
    .prepare('SELECT budget_group FROM categories WHERE id = ?')
    .get(categoryId) as {
    budget_group: string | null;
  };
  return row.budget_group;
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (error: unknown) => error,
  );
}

describe('BudgetRepository.setBudget refuses a same-name sibling inside its write (MA-287 H3)', () => {
  it("adding ' gym ' beside Gym in the same category and month is refused and Gym keeps its limit", async () => {
    seedBudget('gym', 'cat_health', 'Gym', 400, '2026-11');
    const repo = new BudgetRepository();

    const error = await rejectionOf(
      repo.setBudget({ categoryId: 'cat_health', name: ' gym ', limit: 900, yearMonth: '2026-11' }),
    );

    expect(error).toBeInstanceOf(BudgetNameTakenError);
    expect((error as BudgetNameTakenError).budgetName).toBe('gym');
    expect(readBudgets('cat_health', '2026-11')).toEqual([
      { id: 'gym', name: 'Gym', limit_amount: 400 },
    ]);
  });

  it('renaming Yoga onto GYM in the same month is refused with BudgetNameTakenError and both rows stay as they were', async () => {
    seedBudget('gym', 'cat_health', 'Gym', 400, '2026-11');
    seedBudget('yoga', 'cat_health', 'Yoga', 250, '2026-11');
    const repo = new BudgetRepository();

    const error = await rejectionOf(
      repo.setBudget({
        id: 'yoga',
        categoryId: 'cat_health',
        name: 'GYM',
        limit: 300,
        yearMonth: '2026-11',
      }),
    );

    expect(error).toBeInstanceOf(BudgetNameTakenError);
    expect((error as BudgetNameTakenError).budgetName).toBe('GYM');
    expect(readBudgets('cat_health', '2026-11')).toEqual([
      { id: 'gym', name: 'Gym', limit_amount: 400 },
      { id: 'yoga', name: 'Yoga', limit_amount: 250 },
    ]);
  });

  // Paired with a refusal: the self-exclusion only means something once the sibling check exists.
  it('editing Gym under its own name saves, while a new Gym in the same month is still refused', async () => {
    seedBudget('gym', 'cat_health', 'Gym', 400, '2026-11');
    const repo = new BudgetRepository();

    await repo.setBudget({
      id: 'gym',
      categoryId: 'cat_health',
      name: 'Gym',
      limit: 650,
      yearMonth: '2026-11',
    });
    const error = await rejectionOf(
      repo.setBudget({ categoryId: 'cat_health', name: ' GYM ', limit: 900, yearMonth: '2026-11' }),
    );

    expect(error).toBeInstanceOf(BudgetNameTakenError);
    expect(readBudgets('cat_health', '2026-11')).toEqual([
      { id: 'gym', name: 'Gym', limit_amount: 650 },
    ]);
  });

  it('Gym saves in another category and in another month of the same category, while a second Gym in its own month is refused', async () => {
    seedBudget('gym', 'cat_health', 'Gym', 400, '2026-11');
    const repo = new BudgetRepository();

    await repo.setBudget({ categoryId: 'cat_food', name: 'Gym', limit: 100, yearMonth: '2026-11' });
    await repo.setBudget({
      categoryId: 'cat_health',
      name: 'Gym',
      limit: 200,
      yearMonth: '2026-12',
    });
    const error = await rejectionOf(
      repo.setBudget({ categoryId: 'cat_health', name: 'gym', limit: 900, yearMonth: '2026-11' }),
    );

    expect(error).toBeInstanceOf(BudgetNameTakenError);
    expect(readBudgets('cat_food', '2026-11')).toEqual([
      { id: 'generated-1', name: 'Gym', limit_amount: 100 },
    ]);
    expect(readBudgets('cat_health', '2026-12')).toEqual([
      { id: 'generated-2', name: 'Gym', limit_amount: 200 },
    ]);
    expect(readBudgets('cat_health', '2026-11')).toEqual([
      { id: 'gym', name: 'Gym', limit_amount: 400 },
    ]);
  });

  it('copying Gym onto a month holding a same-name budget replaces that limit, while setBudget adding the name there is refused', async () => {
    seedBudget('gym-nov', 'cat_health', 'Gym', 400, '2026-11');
    seedBudget('gym-dec', 'cat_health', 'gym', 150, '2026-12');
    const repo = new BudgetRepository();

    await repo.copyBudgetsToMonth('2026-11', '2026-12', ['gym-nov']);
    const error = await rejectionOf(
      repo.setBudget({ categoryId: 'cat_health', name: 'Gym', limit: 900, yearMonth: '2026-12' }),
    );

    expect(error).toBeInstanceOf(BudgetNameTakenError);
    expect(readBudgets('cat_health', '2026-12')).toEqual([
      { id: 'gym-dec', name: 'Gym', limit_amount: 400 },
    ]);
  });
});

describe('a group set on the sheet binds its month only (MA-287 M9)', () => {
  it("setBudget writes the month's group alone; income snapshots the seeded default and copy carries the source month's group", async () => {
    realDb
      .prepare(
        `INSERT INTO budget_month_category_groups (year_month, category_id, budget_group, created_at, updated_at)
         VALUES ('2026-07', 'cat_health', ?, ?, ?)`,
      )
      .run(BudgetGroup.Need, NOW_ISO, NOW_ISO);
    const repo = new BudgetRepository();

    await repo.setBudget({
      categoryId: 'cat_health',
      name: 'Gym',
      limit: 400,
      yearMonth: '2026-08',
      categoryGroup: BudgetGroup.Want,
    });

    expect(readMonthGroup('2026-08', 'cat_health')).toBe(BudgetGroup.Want);
    expect(readMonthGroup('2026-07', 'cat_health')).toBe(BudgetGroup.Need);
    expect(readCategoryDefaultGroup('cat_health')).toBe(BudgetGroup.Need);

    await repo.setExpectedIncome('2026-09', 1000);
    expect(readMonthGroup('2026-09', 'cat_health')).toBe(BudgetGroup.Need);

    await repo.copyBudgetsToMonth('2026-08', '2026-10', ['generated-1']);
    expect(readMonthGroup('2026-10', 'cat_health')).toBe(BudgetGroup.Want);
  });
});
