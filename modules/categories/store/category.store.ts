import { create } from 'zustand';

import type { Category } from '@/modules/categories/entities/category.entity';
import {
  CategoryRepository,
  type ICategoryRepository,
  type NewCategoryInput,
  type UpdateCategoryInput,
} from '@/modules/categories/repositories/category.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type { Category, NewCategoryInput, UpdateCategoryInput };

const INITIAL_STATE = { categories: [] as Category[], hasLoaded: false };

interface CategoryStore {
  state: typeof INITIAL_STATE;
  loadCategories: () => Promise<void>;
  addCategory: (data: NewCategoryInput) => Promise<void>;
  updateCategory: (id: string, data: UpdateCategoryInput) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reassignAndDelete: (fromId: string, toId: string) => Promise<void>;
  getCategoryTransactionCount: (id: string) => Promise<number>;
  reset: () => void;
}

export function createCategoryStore(repo: ICategoryRepository) {
  return createMoneyAppSelectors(
    create<CategoryStore>((set, get) => ({
      state: INITIAL_STATE,

      loadCategories: async () => {
        try {
          const categories = await repo.getAll();
          set((s) => ({ state: { ...s.state, categories, hasLoaded: true } }));
        } catch (err) {
          console.error('[categoryStore] loadCategories failed:', err);
          throw err;
        }
      },

      addCategory: async (data) => {
        try {
          await repo.add(data);
          await get().loadCategories();
        } catch (err) {
          console.error('[categoryStore] addCategory failed:', err);
          throw err;
        }
      },

      updateCategory: async (id, data) => {
        try {
          await repo.update(id, data);
          await get().loadCategories();
        } catch (err) {
          console.error('[categoryStore] updateCategory failed:', err);
          throw err;
        }
      },

      deleteCategory: async (id) => {
        try {
          await repo.delete(id);
          await get().loadCategories();
        } catch (err) {
          console.error('[categoryStore] deleteCategory failed:', err);
          throw err;
        }
      },

      reassignAndDelete: async (fromId, toId) => {
        try {
          await repo.reassignAndDelete(fromId, toId);
          await get().loadCategories();
        } catch (err) {
          console.error('[categoryStore] reassignAndDelete failed:', err);
          throw err;
        }
      },

      getCategoryTransactionCount: (id) => repo.getTransactionCount(id),

      reset: () => set({ state: INITIAL_STATE }),
    })),
  );
}

export const useCategoryStore = createCategoryStore(new CategoryRepository());
