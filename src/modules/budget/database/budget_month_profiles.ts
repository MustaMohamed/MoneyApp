import type { SQLiteDatabase } from 'expo-sqlite';

import type { BudgetGroup } from '@/constants/enums';

import type {
  BudgetMonthCategoryGroup,
  BudgetMonthGroupMap,
  BudgetMonthSetting,
} from '../entities/budget.entity';

export async function getBudgetMonthIncome(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<number | null> {
  const row = await db.getFirstAsync<Pick<BudgetMonthSetting, 'expected_income'>>(
    'SELECT expected_income FROM budget_month_settings WHERE year_month = ?',
    [yearMonth],
  );
  return row?.expected_income ?? null;
}

export async function setBudgetMonthIncome(
  db: SQLiteDatabase,
  yearMonth: string,
  income: number,
): Promise<void> {
  if (!Number.isFinite(income) || income <= 0) {
    throw new Error('Budget month income must be a finite positive number');
  }

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO budget_month_settings
       (year_month, expected_income, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(year_month) DO UPDATE SET
       expected_income = excluded.expected_income,
       updated_at = excluded.updated_at`,
    [yearMonth, income, now, now],
  );
}

export async function getBudgetMonthCategoryGroups(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<BudgetMonthGroupMap> {
  const rows = await db.getAllAsync<Pick<BudgetMonthCategoryGroup, 'category_id' | 'budget_group'>>(
    `SELECT category_id, budget_group
       FROM budget_month_category_groups
      WHERE year_month = ?`,
    [yearMonth],
  );
  return Object.fromEntries(
    rows.map(({ category_id, budget_group }) => [category_id, budget_group]),
  );
}

export async function snapshotBudgetMonthCategoryGroups(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO budget_month_category_groups
       (year_month, category_id, budget_group, created_at, updated_at)
     SELECT ?, id, budget_group, ?, ?
       FROM categories
      WHERE type = 'expense'
        AND budget_group IS NOT NULL`,
    [yearMonth, now, now],
  );
}

export async function setBudgetMonthCategoryGroup(
  db: SQLiteDatabase,
  yearMonth: string,
  categoryId: string,
  budgetGroup: BudgetGroup,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO budget_month_category_groups
       (year_month, category_id, budget_group, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(year_month, category_id) DO UPDATE SET
       budget_group = excluded.budget_group,
       updated_at = excluded.updated_at`,
    [yearMonth, categoryId, budgetGroup, now, now],
  );
}

export async function copyBudgetMonthCategoryGroups(
  db: SQLiteDatabase,
  sourceYearMonth: string,
  targetYearMonth: string,
  categoryIds: string[],
): Promise<void> {
  if (categoryIds.length === 0) return;

  const placeholders = categoryIds.map(() => '?').join(',');
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO budget_month_category_groups
       (year_month, category_id, budget_group, created_at, updated_at)
     SELECT ?, category_id, budget_group, ?, ?
       FROM budget_month_category_groups
      WHERE year_month = ?
        AND category_id IN (${placeholders})
     ON CONFLICT(year_month, category_id) DO UPDATE SET
       budget_group = excluded.budget_group,
       updated_at = excluded.updated_at`,
    [targetYearMonth, now, now, sourceYearMonth, ...categoryIds],
  );
}
