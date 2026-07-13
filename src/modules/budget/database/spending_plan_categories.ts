import type { SQLiteDatabase } from 'expo-sqlite';

import type { SpendingPlanCategory } from '@/modules/budget/entities/budget.entity';

function placeholders(count: number): string {
  return Array(count).fill('?').join(',');
}

export async function getSpendingPlanCategoryRows(
  db: SQLiteDatabase,
  planIds: string[],
): Promise<SpendingPlanCategory[]> {
  if (planIds.length === 0) return [];
  return db.getAllAsync<SpendingPlanCategory>(
    `SELECT plan_id, category_id, allocated_amount
       FROM spending_plan_categories
      WHERE plan_id IN (${placeholders(planIds.length)})
      ORDER BY plan_id ASC, category_id ASC`,
    planIds,
  );
}

export async function replaceSpendingPlanCategoryRows(
  db: SQLiteDatabase,
  planId: string,
  categories: SpendingPlanCategory[],
): Promise<void> {
  await db.runAsync('DELETE FROM spending_plan_categories WHERE plan_id = ?', [planId]);
  for (const category of categories) {
    await db.runAsync(
      `INSERT INTO spending_plan_categories (plan_id, category_id, allocated_amount)
       VALUES (?, ?, ?)`,
      [category.plan_id, category.category_id, category.allocated_amount],
    );
  }
}

export async function reassignSpendingPlanCategoryRows(
  db: SQLiteDatabase,
  fromCategoryId: string,
  toCategoryId: string,
): Promise<void> {
  await db.runAsync(
    `DELETE FROM spending_plan_categories
      WHERE category_id = ?
        AND plan_id IN (
          SELECT plan_id FROM spending_plan_categories WHERE category_id = ?
        )`,
    [fromCategoryId, toCategoryId],
  );
  await db.runAsync('UPDATE spending_plan_categories SET category_id = ? WHERE category_id = ?', [
    toCategoryId,
    fromCategoryId,
  ]);
}
