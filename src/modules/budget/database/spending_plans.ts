import type { SQLiteDatabase } from 'expo-sqlite';

import type { SpendingPlan, SpendingPlanCategory } from '@/modules/budget/entities/budget.entity';

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

async function hydratePlans(
  db: SQLiteDatabase,
  plans: SpendingPlan[],
): Promise<SpendingPlanWithCategories[]> {
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
  return hydratePlans(db, plans);
}

export async function getSpendingPlanRowsForRange(
  db: SQLiteDatabase,
  range: { startDate: string; endDate: string },
): Promise<SpendingPlanWithCategories[]> {
  const plans = await db.getAllAsync<SpendingPlan>(
    `SELECT *
       FROM spending_plans
      WHERE start_date <= ?
        AND end_date >= ?
      ORDER BY start_date ASC, name ASC`,
    [range.endDate, range.startDate],
  );
  return hydratePlans(db, plans);
}

export async function getSpendingPlanById(
  db: SQLiteDatabase,
  id: string,
): Promise<SpendingPlanWithCategories | null> {
  const plans = await db.getAllAsync<SpendingPlan>('SELECT * FROM spending_plans WHERE id = ?', [
    id,
  ]);
  const hydrated = await hydratePlans(db, plans);
  return hydrated[0] ?? null;
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
