import type { SQLiteDatabase } from 'expo-sqlite';

import type { Budget } from '../entities/budget.entity';

export async function getBudgetRows(db: SQLiteDatabase): Promise<Budget[]> {
  return db.getAllAsync<Budget>(
    'SELECT * FROM budgets ORDER BY category_id ASC, effective_from ASC, name ASC',
  );
}

export async function getBudgetRowById(db: SQLiteDatabase, id: string): Promise<Budget | null> {
  return db.getFirstAsync<Budget>('SELECT * FROM budgets WHERE id = ?', [id]);
}

export async function getBudgetRowsForCategoryMonth(
  db: SQLiteDatabase,
  categoryId: string,
  yearMonth: string,
): Promise<Budget[]> {
  return db.getAllAsync<Budget>(
    `SELECT * FROM budgets
      WHERE category_id = ? AND effective_from = ?
      ORDER BY name COLLATE NOCASE ASC`,
    [categoryId, yearMonth],
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
