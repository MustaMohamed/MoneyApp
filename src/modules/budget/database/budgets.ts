import type { SQLiteDatabase } from 'expo-sqlite';

import type { Budget } from '../entities/budget.entity';

export async function getBudgetRows(db: SQLiteDatabase): Promise<Budget[]> {
  return db.getAllAsync<Budget>(
    'SELECT * FROM budgets ORDER BY category_id ASC, effective_from ASC, name ASC',
  );
}

// One write path for set / edit: INSERT OR REPLACE collapses a second same
// category/month/name change onto the same named monthly budget.
export async function setBudgetRow(db: SQLiteDatabase, row: Budget): Promise<void> {
  if (typeof row.limit_amount !== 'number' || !Number.isFinite(row.limit_amount)) {
    throw new Error('Budget limit amount must be a finite number');
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO budgets
       (id, category_id, name, limit_amount, effective_from, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.category_id,
      row.name,
      row.limit_amount,
      row.effective_from,
      row.created_at,
      row.updated_at,
    ],
  );
}

export async function deleteBudgetRow(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}
