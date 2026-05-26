import type { SQLiteDatabase } from 'expo-sqlite';

import { type BudgetGroup } from '@/constants/enums';

import type { Category } from './entities/category.entity';

export async function getCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY type ASC, sort_order ASC');
}

export async function getCategoriesByType(
  db: SQLiteDatabase,
  type: 'expense' | 'income',
): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC',
    [type],
  );
}

export async function addCategory(db: SQLiteDatabase, category: Category): Promise<void> {
  await db.runAsync(
    `INSERT INTO categories (id, name, type, icon, color, is_default, sort_order, budget_group, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category.id,
      category.name,
      category.type,
      category.icon,
      category.color,
      category.is_default,
      category.sort_order,
      category.budget_group,
      category.created_at,
      category.updated_at,
    ],
  );
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: string,
  data: { name: string; icon: string; color: string; updated_at: string },
): Promise<void> {
  await db.runAsync(
    'UPDATE categories SET name = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?',
    [data.name, data.icon, data.color, data.updated_at, id],
  );
}

export async function setCategoryGroup(
  db: SQLiteDatabase,
  categoryId: string,
  group: BudgetGroup | null,
): Promise<void> {
  await db.runAsync('UPDATE categories SET budget_group = ?, updated_at = ? WHERE id = ?', [
    group,
    new Date().toISOString(),
    categoryId,
  ]);
}

export async function deleteCategory(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function reassignCategory(
  db: SQLiteDatabase,
  fromId: string,
  toId: string,
): Promise<void> {
  await db.runAsync('UPDATE transactions SET category_id = ? WHERE category_id = ?', [
    toId,
    fromId,
  ]);
}

export async function getCategoryTransactionCount(db: SQLiteDatabase, id: string): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
    [id],
  );
  return result?.count ?? 0;
}
