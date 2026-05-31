import type { SQLiteDatabase } from 'expo-sqlite';

import type { Budget } from '../entities/budget.entity';

export async function getBudgetRows(db: SQLiteDatabase): Promise<Budget[]> {
  return db.getAllAsync<Budget>(
    'SELECT * FROM budgets ORDER BY category_id ASC, effective_from ASC',
  );
}

// One write path for set / edit / remove: every change is an effective-dated upsert.
// limit_amount = null is a "removed" tombstone. INSERT OR REPLACE collapses a
// second same-month change onto the same (category_id, effective_from) row.
export async function setBudgetRow(db: SQLiteDatabase, row: Budget): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO budgets
       (id, category_id, limit_amount, effective_from, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [row.id, row.category_id, row.limit_amount, row.effective_from, row.created_at, row.updated_at],
  );
}
