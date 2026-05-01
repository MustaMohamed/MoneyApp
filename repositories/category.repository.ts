import uuid from 'react-native-uuid';

import {
  addCategory,
  deleteCategory,
  getCategories,
  getCategoriesByType,
  reassignCategory,
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

    const category: Category = {
      id,
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
      is_default: 0,
      sort_order: maxOrder + 1,
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

  async reassignAndDelete(fromId: string, toId: string): Promise<void> {
    const db = await getDb();
    await reassignCategory(db, fromId, toId); // no-op in M2a
    await deleteCategory(db, fromId);
  }
}
