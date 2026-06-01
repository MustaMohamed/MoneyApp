import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

import type { Category } from '@/modules/categories/entities/category.entity';
import {
  CategoryRepository,
  type ICategoryRepository,
  type NewCategoryInput,
  type UpdateCategoryInput,
} from '@/modules/categories/repositories/category.repository';

export type { Category, NewCategoryInput, UpdateCategoryInput };

export const EMPTY_CATEGORIES: Category[] = [];
Object.freeze(EMPTY_CATEGORIES);
const INITIAL_CATEGORIES = EMPTY_CATEGORIES;

type CategorySignalState = {
  categories: ReadonlySignal<Category[]>;
  hasLoaded: ReadonlySignal<boolean>;
};

export class CategoryStore {
  private readonly categories = signal(INITIAL_CATEGORIES);
  private readonly hasLoaded = signal(false);

  readonly state: CategorySignalState = {
    categories: this.categories,
    hasLoaded: this.hasLoaded,
  };

  private loadRequestId = 0;

  constructor(private readonly repository: ICategoryRepository = new CategoryRepository()) {}

  loadCategories = async (): Promise<void> => {
    await this.syncCategories();
  };

  private syncCategories = async (): Promise<void> => {
    const requestId = ++this.loadRequestId;

    try {
      const categories = await this.repository.getAll();
      if (requestId === this.loadRequestId) {
        batch(() => {
          this.categories.value = categories;
          this.hasLoaded.value = true;
        });
      }
    } catch (err) {
      console.error('[categoryStore] loadCategories failed:', err);
      throw err;
    }
  };

  addCategory = async (data: NewCategoryInput): Promise<void> => {
    try {
      await this.repository.add(data);
      await this.syncCategories();
    } catch (err) {
      console.error('[categoryStore] addCategory failed:', err);
      throw err;
    }
  };

  updateCategory = async (id: string, data: UpdateCategoryInput): Promise<void> => {
    try {
      await this.repository.update(id, data);
      await this.syncCategories();
    } catch (err) {
      console.error('[categoryStore] updateCategory failed:', err);
      throw err;
    }
  };

  deleteCategory = async (id: string): Promise<void> => {
    try {
      await this.repository.delete(id);
      await this.syncCategories();
    } catch (err) {
      console.error('[categoryStore] deleteCategory failed:', err);
      throw err;
    }
  };

  reassignAndDelete = async (fromId: string, toId: string): Promise<void> => {
    try {
      await this.repository.reassignAndDelete(fromId, toId);
      await this.syncCategories();
    } catch (err) {
      console.error('[categoryStore] reassignAndDelete failed:', err);
      throw err;
    }
  };

  getCategoryTransactionCount = (id: string): Promise<number> =>
    this.repository.getTransactionCount(id);

  reset = () => {
    this.loadRequestId += 1;
    batch(() => {
      this.categories.value = INITIAL_CATEGORIES;
      this.hasLoaded.value = false;
    });
  };
}

const categoryStore = new CategoryStore(new CategoryRepository());

export function createCategoryStore(repo: ICategoryRepository): CategoryStore {
  return new CategoryStore(repo);
}

export function useCategoryStore(): CategoryStore {
  return categoryStore;
}
