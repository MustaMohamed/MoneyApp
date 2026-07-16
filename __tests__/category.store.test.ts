import { CategoryType } from '@/constants/enums';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { ICategoryRepository } from '@/modules/categories/repositories/category.repository';
import { createCategoryStore } from '@/modules/categories/store/category.store';

const mockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'Travel',
  type: CategoryType.Expense,
  icon: 'airplane',
  color: '#185FA5',
  is_default: 0,
  sort_order: 22,
  budget_group: null,
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
    getTransactionCount: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe('categoryStore.loadCategories', () => {
  it('starts unloaded so screens do not show empty states before category data settles', () => {
    const repo = makeRepo();
    const useStore = createCategoryStore(repo);

    expect(useStore.getState().hasLoaded).toBe(false);
  });

  it('marks categories loaded after repo data settles', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([]) });
    const useStore = createCategoryStore(repo);

    await useStore.getState().loadCategories();

    expect(useStore.getState().hasLoaded).toBe(true);
  });

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

describe('categoryStore — error branches', () => {
  it('loadCategories propagates repo errors', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('db fail')) });
    const useStore = createCategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(useStore.getState().loadCategories()).rejects.toThrow('db fail');
    expect(useStore.getState().loadError).toBe(true);
    expect(useStore.getState().hasLoaded).toBe(false);
    consoleSpy.mockRestore();
  });

  it('addCategory propagates errors', async () => {
    const repo = makeRepo({ add: jest.fn().mockRejectedValue(new Error('add fail')) });
    const useStore = createCategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      useStore
        .getState()
        .addCategory({ name: 'X', type: CategoryType.Expense, icon: 'star', color: '#fff' }),
    ).rejects.toThrow('add fail');
    consoleSpy.mockRestore();
  });

  it('updateCategory propagates errors', async () => {
    const repo = makeRepo({ update: jest.fn().mockRejectedValue(new Error('update fail')) });
    const useStore = createCategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      useStore.getState().updateCategory('cat-1', { name: 'Y', icon: 'heart', color: '#aaa' }),
    ).rejects.toThrow('update fail');
    consoleSpy.mockRestore();
  });

  it('deleteCategory propagates errors', async () => {
    const repo = makeRepo({ delete: jest.fn().mockRejectedValue(new Error('delete fail')) });
    const useStore = createCategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(useStore.getState().deleteCategory('cat-1')).rejects.toThrow('delete fail');
    consoleSpy.mockRestore();
  });

  it('reassignAndDelete propagates errors', async () => {
    const repo = makeRepo({
      reassignAndDelete: jest.fn().mockRejectedValue(new Error('reassign fail')),
    });
    const useStore = createCategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      useStore.getState().reassignAndDelete('cat-1', 'cat_other_expense'),
    ).rejects.toThrow('reassign fail');
    consoleSpy.mockRestore();
  });
});

describe('categoryStore.getCategoryTransactionCount', () => {
  it('delegates to repo.getTransactionCount and returns the count', async () => {
    const repo = makeRepo({ getTransactionCount: jest.fn().mockResolvedValue(7) });
    const useStore = createCategoryStore(repo);
    const count = await useStore.getState().getCategoryTransactionCount('cat-1');
    expect(repo.getTransactionCount).toHaveBeenCalledWith('cat-1');
    expect(count).toBe(7);
  });
});

describe('categoryStore.reset', () => {
  it('restores INITIAL_STATE', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([{ id: 'c1' } as Category]),
    });
    const useStore = createCategoryStore(repo);
    await useStore.getState().loadCategories();
    expect(useStore.getState().categories).toHaveLength(1);

    useStore.getState().reset();

    expect(useStore.getState()).toMatchObject({ categories: [], hasLoaded: false });
  });
});
