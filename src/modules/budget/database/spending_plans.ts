import type { SQLiteDatabase } from 'expo-sqlite';

import type { SpendingPlan } from '@/modules/budget/entities/budget.entity';

export function monthRange(yearMonth: string): { start: string; endExclusive: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    start: `${yearMonth}-01`,
    endExclusive: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}

export async function getSpendingPlanRows(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<SpendingPlan[]> {
  const range = monthRange(yearMonth);
  return db.getAllAsync<SpendingPlan>(
    `SELECT *
       FROM spending_plans
      WHERE start_date < ?
        AND end_date >= ?
      ORDER BY start_date ASC, name ASC`,
    [range.endExclusive, range.start],
  );
}

export async function getSpendingPlanRowsForRange(
  db: SQLiteDatabase,
  range: { startDate: string; endDate: string },
): Promise<SpendingPlan[]> {
  return db.getAllAsync<SpendingPlan>(
    `SELECT *
       FROM spending_plans
      WHERE start_date <= ?
        AND end_date >= ?
      ORDER BY start_date ASC, name ASC`,
    [range.endDate, range.startDate],
  );
}

export async function getSpendingPlanById(
  db: SQLiteDatabase,
  id: string,
): Promise<SpendingPlan | null> {
  return db.getFirstAsync<SpendingPlan>('SELECT * FROM spending_plans WHERE id = ?', [id]);
}

export async function setSpendingPlanRow(db: SQLiteDatabase, plan: SpendingPlan): Promise<void> {
  await db.runAsync(
    `INSERT INTO spending_plans
       (id, name, start_date, end_date, total_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       start_date = excluded.start_date,
       end_date = excluded.end_date,
       total_amount = excluded.total_amount,
       updated_at = excluded.updated_at`,
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
}

export async function deleteSpendingPlan(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM spending_plans WHERE id = ?', [id]);
}
