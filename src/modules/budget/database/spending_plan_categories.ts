import type { SQLiteDatabase } from 'expo-sqlite';

import type { SpendingPlanCategory } from '@/modules/budget/entities/budget.entity';

export interface SpendingPlanCategoryConflict {
  sourcePlanName: string;
  targetPlanName: string;
}

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

export async function getSpendingPlanCategoryReassignmentConflict(
  db: SQLiteDatabase,
  fromCategoryId: string,
  toCategoryId: string,
): Promise<SpendingPlanCategoryConflict | undefined> {
  const row = await db.getFirstAsync<{
    source_plan_name: string;
    target_plan_name: string;
  }>(
    `SELECT source_plan.name AS source_plan_name,
            target_plan.name AS target_plan_name
       FROM spending_plan_categories source_assignment
       JOIN spending_plans source_plan ON source_plan.id = source_assignment.plan_id
       JOIN spending_plan_categories target_assignment
         ON target_assignment.category_id = ?
        AND target_assignment.plan_id != source_assignment.plan_id
       JOIN spending_plans target_plan ON target_plan.id = target_assignment.plan_id
      WHERE source_assignment.category_id = ?
        AND source_plan.start_date <= target_plan.end_date
        AND source_plan.end_date >= target_plan.start_date
      LIMIT 1`,
    [toCategoryId, fromCategoryId],
  );
  return row
    ? { sourcePlanName: row.source_plan_name, targetPlanName: row.target_plan_name }
    : undefined;
}

export async function deleteSoleCategorySpendingPlans(
  db: SQLiteDatabase,
  categoryId: string,
): Promise<void> {
  await db.runAsync(
    `DELETE FROM spending_plans
      WHERE id IN (
        SELECT assignment.plan_id
          FROM spending_plan_categories assignment
         WHERE assignment.category_id = ?
           AND (
             SELECT COUNT(*)
               FROM spending_plan_categories plan_assignment
              WHERE plan_assignment.plan_id = assignment.plan_id
           ) = 1
      )`,
    [categoryId],
  );
}

export async function reassignSpendingPlanCategoryRows(
  db: SQLiteDatabase,
  fromCategoryId: string,
  toCategoryId: string,
): Promise<void> {
  const [sourceRows, targetRows] = await Promise.all([
    db.getAllAsync<SpendingPlanCategory>(
      `SELECT plan_id, category_id, allocated_amount
         FROM spending_plan_categories
        WHERE category_id = ?`,
      [fromCategoryId],
    ),
    db.getAllAsync<SpendingPlanCategory>(
      `SELECT plan_id, category_id, allocated_amount
         FROM spending_plan_categories
        WHERE category_id = ?`,
      [toCategoryId],
    ),
  ]);
  const targetByPlanId = new Map(targetRows.map((row) => [row.plan_id, row]));

  for (const source of sourceRows) {
    const target = targetByPlanId.get(source.plan_id);
    if (target) {
      const mergedAllocation =
        source.allocated_amount === null && target.allocated_amount === null
          ? null
          : (source.allocated_amount ?? 0) + (target.allocated_amount ?? 0);
      await db.runAsync(
        `UPDATE spending_plan_categories
            SET allocated_amount = ?
          WHERE plan_id = ? AND category_id = ?`,
        [mergedAllocation, source.plan_id, toCategoryId],
      );
      await db.runAsync(
        `DELETE FROM spending_plan_categories
          WHERE plan_id = ? AND category_id = ?`,
        [source.plan_id, fromCategoryId],
      );
      continue;
    }
    await db.runAsync(
      `UPDATE spending_plan_categories
          SET category_id = ?
        WHERE plan_id = ? AND category_id = ?`,
      [toCategoryId, source.plan_id, fromCategoryId],
    );
  }
}
