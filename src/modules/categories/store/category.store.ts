import { makeAutoObservable, observable, runInAction } from 'mobx';

import type { Category } from '@/modules/categories/entities/category.entity';
import {
  categoryRepository,
  type ICategoryRepository,
  type NewCategoryInput,
  type UpdateCategoryInput,
} from '@/modules/categories/repositories/category.repository';

export type { Category, NewCategoryInput, UpdateCategoryInput };

export class CategoryStore {
  categories: Category[] = [];

  hasLoaded = false;

  constructor(private readonly repository: ICategoryRepository = categoryRepository) {
    makeAutoObservable<CategoryStore, 'repository'>(
      this,
      {
        categories: observable.ref,
        repository: false,
      },
      { autoBind: true },
    );
  }

  async loadCategories(): Promise<void> {
    try {
      const categories = await this.repository.getAll();
      runInAction(() => {
        this.categories = categories;
        this.hasLoaded = true;
      });
    } catch (err) {
      console.error('[categoryStore] loadCategories failed:', err);
      throw err;
    }
  }

  async addCategory(data: NewCategoryInput): Promise<void> {
    try {
      await this.repository.add(data);
      await this.loadCategories();
    } catch (err) {
      console.error('[categoryStore] addCategory failed:', err);
      throw err;
    }
  }

  async updateCategory(id: string, data: UpdateCategoryInput): Promise<void> {
    try {
      await this.repository.update(id, data);
      await this.loadCategories();
    } catch (err) {
      console.error('[categoryStore] updateCategory failed:', err);
      throw err;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
      await this.loadCategories();
    } catch (err) {
      console.error('[categoryStore] deleteCategory failed:', err);
      throw err;
    }
  }

  async reassignAndDelete(fromId: string, toId: string): Promise<void> {
    try {
      await this.repository.reassignAndDelete(fromId, toId);
      await this.loadCategories();
    } catch (err) {
      console.error('[categoryStore] reassignAndDelete failed:', err);
      throw err;
    }
  }

  getCategoryTransactionCount(id: string): Promise<number> {
    return this.repository.getTransactionCount(id);
  }

  reset(): void {
    this.categories = [];
    this.hasLoaded = false;
  }
}

export function createCategoryStore(repo: ICategoryRepository): CategoryStore {
  return new CategoryStore(repo);
}

export const categoryStore = new CategoryStore(categoryRepository);

export function useCategoryStore(): CategoryStore {
  return categoryStore;
}
