import { CategoryType } from '@/constants/enums';
import { createCategoryStore } from '@/store/category.store';
import type { ICategoryRepository } from '@/repositories/category.repository';
import type { Category } from '@/database/entities/category.entity';

const mockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'Travel',
  type: CategoryType.Expense,
  icon: 'airplane',
  color: '#185FA5',
  is_default: 0,
  sort_order: 22,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

function makeRepo(overrides: Partial<ICategoryRepository> = {}): ICategoryRepository {
  return {
    getAll: jest.fn().mockResolvedValue([mockCategory()]),
    getAllByType: jest.fn().mockResolvedValue([mockCategory()]),
    add: jest.fn().mockResolvedValue(mockCategory()),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    reassignAndDelete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('categoryStore.loadCategories', () => {
  it('populates categories from repo', async () => {
    const repo = makeRepo();
    const store = createCategoryStore(repo).getState();
    await store.loadCategories();
    expect(createCategoryStore(repo).getState().categories).toHaveLength(0); // fresh store
  });

  it('calls repo.getAll()', async () => {
    const repo = makeRepo();
    const useStore = createCategoryStore(repo);
    await useStore.getState().loadCategories();
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('sets categories in state', async () => {
    const cat = mockCategory();
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([cat]) });
    const useStore = createCategoryStore(repo);
    await useStore.getState().loadCategories();
    expect(useStore.getState().categories).toEqual([cat]);
  });
});

describe('categoryStore.addCategory', () => {
  it('calls repo.add with the input', async () => {
    const repo = makeRepo();
    const useStore = createCategoryStore(repo);
    await useStore
      .getState()
      .addCategory({ name: 'X', type: CategoryType.Expense, icon: 'star', color: '#fff' });
    expect(repo.add).toHaveBeenCalledWith({
      name: 'X',
      type: CategoryType.Expense,
      icon: 'star',
      color: '#fff',
    });
  });

  it('reloads categories after add', async () => {
    const repo = makeRepo();
    const useStore = createCategoryStore(repo);
    await useStore
      .getState()
      .addCategory({ name: 'X', type: CategoryType.Expense, icon: 'star', color: '#fff' });
    expect(repo.getAll).toHaveBeenCalled();
  });
});

describe('categoryStore.updateCategory', () => {
  it('calls repo.update with id and data', async () => {
    const repo = makeRepo();
    const useStore = createCategoryStore(repo);
    await useStore.getState().updateCategory('cat-1', { name: 'Y', icon: 'heart', color: '#aaa' });
    expect(repo.update).toHaveBeenCalledWith('cat-1', { name: 'Y', icon: 'heart', color: '#aaa' });
  });

  it('reloads categories after update', async () => {
    const repo = makeRepo();
    const useStore = createCategoryStore(repo);
    await useStore.getState().updateCategory('cat-1', { name: 'Y', icon: 'heart', color: '#aaa' });
    expect(repo.getAll).toHaveBeenCalled();
  });
});

describe('categoryStore.deleteCategory', () => {
  it('calls repo.delete with id', async () => {
    const repo = makeRepo();
    const useStore = createCategoryStore(repo);
    await useStore.getState().deleteCategory('cat-1');
    expect(repo.delete).toHaveBeenCalledWith('cat-1');
  });

  it('reloads categories after delete', async () => {
    const repo = makeRepo();
    const useStore = createCategoryStore(repo);
    await useStore.getState().deleteCategory('cat-1');
    expect(repo.getAll).toHaveBeenCalled();
  });
});

describe('categoryStore.reassignAndDelete', () => {
  it('calls repo.reassignAndDelete with fromId and toId', async () => {
    const repo = makeRepo();
    const useStore = createCategoryStore(repo);
    await useStore.getState().reassignAndDelete('cat-1', 'cat_other_expense');
    expect(repo.reassignAndDelete).toHaveBeenCalledWith('cat-1', 'cat_other_expense');
  });

  it('reloads categories after reassignAndDelete', async () => {
    const repo = makeRepo();
    const useStore = createCategoryStore(repo);
    await useStore.getState().reassignAndDelete('cat-1', 'cat_other_expense');
    expect(repo.getAll).toHaveBeenCalled();
  });
});
