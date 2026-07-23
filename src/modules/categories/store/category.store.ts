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

const INITIAL_STATE = { categories: [] as Category[], hasLoaded: false, loadError: false };

type CategoryStore = typeof INITIAL_STATE & {
  loadCategories: () => Promise<void>;
  addCategory: (data: NewCategoryInput) => Promise<void>;
  updateCategory: (id: string, data: UpdateCategoryInput) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reassignAndDelete: (fromId: string, toId: string) => Promise<void>;
  getCategoryTransactionCount: (id: string) => Promise<number>;
  reset: () => void;
};

export function createCategoryStore(repo: ICategoryRepository) {
  let requestGeneration = 0;
  let lifecycleGeneration = 0;
  let sharedLoadPromise: Promise<void> | undefined;

  return createMoneyAppSelectors(
    create<CategoryStore>((set) => {
      const loadOwned = (force: boolean): Promise<void> => {
        if (!force && sharedLoadPromise) return sharedLoadPromise;

        const ownerGeneration = ++requestGeneration;
        set({ loadError: false });

        let request!: Promise<void>;
        request = (async () => {
          try {
            const categories = await repo.getAll();
            if (ownerGeneration !== requestGeneration) return;
            set({ categories, hasLoaded: true, loadError: false });
          } catch (error) {
            if (ownerGeneration !== requestGeneration) return;
            set({ loadError: true });
            console.error('[categoryStore] loadCategories failed:', error);
            throw error;
          } finally {
            if (sharedLoadPromise === request) sharedLoadPromise = undefined;
          }
        })();

        sharedLoadPromise = request;
        return request;
      };

      const mutateAndReload = async (operation: () => Promise<unknown>, label: string) => {
        const ownerLifecycle = lifecycleGeneration;
        try {
          await operation();
          if (ownerLifecycle !== lifecycleGeneration) return;
          await loadOwned(true);
        } catch (error) {
          if (ownerLifecycle !== lifecycleGeneration) return;
          console.error(`[categoryStore] ${label} failed:`, error);
          throw error;
        }
      };

      return {
        ...INITIAL_STATE,

        loadCategories: () => loadOwned(false),

        addCategory: (data) => mutateAndReload(() => repo.add(data), 'addCategory'),

        updateCategory: (id, data) =>
          mutateAndReload(() => repo.update(id, data), 'updateCategory'),

        deleteCategory: (id) => mutateAndReload(() => repo.delete(id), 'deleteCategory'),

        reassignAndDelete: (fromId, toId) =>
          mutateAndReload(() => repo.reassignAndDelete(fromId, toId), 'reassignAndDelete'),

        getCategoryTransactionCount: (id) => repo.getTransactionCount(id),

        reset: () => {
          requestGeneration += 1;
          lifecycleGeneration += 1;
          sharedLoadPromise = undefined;
          set(INITIAL_STATE);
        },
      };
    }),
  );
}

export const useCategoryStore = createCategoryStore(new CategoryRepository());
