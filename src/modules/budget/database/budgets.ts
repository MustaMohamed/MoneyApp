import type { SQLiteDatabase } from 'expo-sqlite';

import type { Budget } from '../entities/budget.entity';

export async function getBudgetRows(db: SQLiteDatabase): Promise<Budget[]> {
  return db.getAllAsync<Budget>(
    'SELECT * FROM budgets ORDER BY category_id ASC, effective_from ASC, name ASC',
  );
}

export async function getBudgetRowById(db: SQLiteDatabase, id: string): Promise<Budget | null> {
  const rows = await db.getAllAsync<Budget>('SELECT * FROM budgets WHERE id = ?', [id]);
  return rows[0] ?? null;
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

// Preserve row identity on edits and natural-key copy-over updates so linked
// transactions keep their budget_id foreign key assignment.
export async function setBudgetRow(db: SQLiteDatabase, row: Budget): Promise<void> {
  if (
    typeof row.limit_amount !== 'number' ||
    !Number.isFinite(row.limit_amount) ||
    row.limit_amount <= 0
  ) {
    throw new Error('Budget limit amount must be a finite positive number');
  }

  await db.runAsync(
    `INSERT INTO budgets
       (id, category_id, name, limit_amount, effective_from, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       category_id = excluded.category_id,
       name = excluded.name,
       limit_amount = excluded.limit_amount,
       effective_from = excluded.effective_from,
       updated_at = excluded.updated_at
     ON CONFLICT(category_id, effective_from, name) DO UPDATE SET
       name = excluded.name,
       limit_amount = excluded.limit_amount,
       updated_at = excluded.updated_at`,
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
