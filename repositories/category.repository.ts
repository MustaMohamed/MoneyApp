import uuid from 'react-native-uuid';

import {
  addCategory,
  deleteCategory,
  getCategories,
  getCategoriesByType,
  updateCategory,
} from '@/database/categories';
import { getDb } from '@/database/client';
import type { Category } from '@/database/entities/category.entity';

export type NewCategoryInput = Pick<Category, 'name' | 'type' | 'icon' | 'color'>;
export type UpdateCategoryInput = Pick<Category, 'name' | 'icon' | 'color'>;

export interface ICategoryRepository {
  getAll(): Promise<Category[]>;
  getAllByType(type: 'expense' | 'income'): Promise<Category[]>;
  add(data: NewCategoryInput): Promise<Category>;
  update(id: string, data: UpdateCategoryInput): Promise<void>;
  delete(id: string): Promise<void>;
  reassignAndDelete(fromId: string, toId: string): Promise<void>;
}

export class CategoryRepository implements ICategoryRepository {
  async getAll(): Promise<Category[]> {
    const db = await getDb();
    return getCategories(db);
  }

  async getAllByType(type: 'expense' | 'income'): Promise<Category[]> {
    const db = await getDb();
    return getCategoriesByType(db, type);
  }

  async add(data: NewCategoryInput): Promise<Category> {
    const db = await getDb();
    const id = String(uuid.v4());
    const now = new Date().toISOString();

    const existing = await getCategoriesByType(db, data.type);
    const maxOrder = existing.reduce((max, c) => Math.max(max, c.sort_order), -1);

    // Name uniqueness check scoped to (name, type) — backstop in case the Zod
    // schema in the UI layer is bypassed.
    const trimmedName = data.name.trim();
    const duplicate = existing.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicate) {
      throw new Error(`A category named "${trimmedName}" already exists in ${data.type}`);
    }

    const category: Category = {
      id,
      name: trimmedName,
      type: data.type,
      icon: data.icon,
      color: data.color,
      is_default: 0,
      sort_order: maxOrder + 1,
      budget_group: null,
      created_at: now,
      updated_at: now,
    };
    await addCategory(db, category);
    return category;
  }

  async update(id: string, data: UpdateCategoryInput): Promise<void> {
    const db = await getDb();
    await updateCategory(db, id, { ...data, updated_at: new Date().toISOString() });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await deleteCategory(db, id);
  }

  /**
   * Atomically reassigns all transactions and commitments from `fromId` to
   * `toId`, then deletes the source category. All three SQL statements run
   * inside a single `db.withTransactionAsync` so a failure at any step leaves
   * the database in its pre-operation state (TC-09).
   *
   * Commitments are included because `commitments.category_id` is NOT NULL and
   * has no FK ON DELETE behaviour — leaving it pointing at a deleted category
   * would create a dangling reference (TC-02 / Layla §3.4).
   */
  async reassignAndDelete(fromId: string, toId: string): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE transactions SET category_id = ? WHERE category_id = ?', [
        toId,
        fromId,
      ]);
      await db.runAsync('UPDATE commitments SET category_id = ? WHERE category_id = ?', [
        toId,
        fromId,
      ]);
      await db.runAsync('DELETE FROM categories WHERE id = ?', [fromId]);
    });
  }
}
