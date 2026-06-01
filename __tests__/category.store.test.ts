import { CategoryType } from '@/constants/enums';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { ICategoryRepository } from '@/modules/categories/repositories/category.repository';
import { CategoryStore, EMPTY_CATEGORIES } from '@/modules/categories/store/category.store';

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe('categoryStore.loadCategories', () => {
  it('starts unloaded so screens do not show empty states before category data settles', () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);

    expect(store.state.categories.value).toBe(EMPTY_CATEGORIES);
    expect(store.state.hasLoaded.value).toBe(false);
  });

  it('marks categories loaded after repo data settles', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([]) });
    const store = new CategoryStore(repo);

    await store.loadCategories();

    expect(store.state.hasLoaded.value).toBe(true);
  });

  it('calls repo.getAll and sets categories in state', async () => {
    const cat = mockCategory();
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([cat]) });
    const store = new CategoryStore(repo);

    await store.loadCategories();

    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.state.categories.value).toEqual([cat]);
  });

  it('does not let an older load overwrite a newer load result', async () => {
    const firstLoad = deferred<Category[]>();
    const secondLoad = deferred<Category[]>();
    const repo = makeRepo({
      getAll: jest
        .fn()
        .mockReturnValueOnce(firstLoad.promise)
        .mockReturnValueOnce(secondLoad.promise),
    });
    const store = new CategoryStore(repo);

    const firstRequest = store.loadCategories();
    const secondRequest = store.loadCategories();

    const newerCategory = mockCategory({ id: 'newer' });
    secondLoad.resolve([newerCategory]);
    await secondRequest;
    expect(store.state.categories.value).toEqual([newerCategory]);

    firstLoad.resolve([mockCategory({ id: 'older' })]);
    await firstRequest;

    expect(store.state.categories.value).toEqual([newerCategory]);
  });
});

describe('categoryStore.addCategory', () => {
  it('calls repo.add with the input', async () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);
    await store.addCategory({ name: 'X', type: CategoryType.Expense, icon: 'star', color: '#fff' });
    expect(repo.add).toHaveBeenCalledWith({
      name: 'X',
      type: CategoryType.Expense,
      icon: 'star',
      color: '#fff',
    });
  });

  it('reloads categories after add', async () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);
    await store.addCategory({ name: 'X', type: CategoryType.Expense, icon: 'star', color: '#fff' });
    expect(repo.getAll).toHaveBeenCalled();
  });
});

describe('categoryStore.updateCategory', () => {
  it('calls repo.update with id and data', async () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);
    await store.updateCategory('cat-1', { name: 'Y', icon: 'heart', color: '#aaa' });
    expect(repo.update).toHaveBeenCalledWith('cat-1', { name: 'Y', icon: 'heart', color: '#aaa' });
  });

  it('reloads categories after update', async () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);
    await store.updateCategory('cat-1', { name: 'Y', icon: 'heart', color: '#aaa' });
    expect(repo.getAll).toHaveBeenCalled();
  });
});

describe('categoryStore.deleteCategory', () => {
  it('calls repo.delete with id', async () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);
    await store.deleteCategory('cat-1');
    expect(repo.delete).toHaveBeenCalledWith('cat-1');
  });

  it('reloads categories after delete', async () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);
    await store.deleteCategory('cat-1');
    expect(repo.getAll).toHaveBeenCalled();
  });
});

describe('categoryStore.reassignAndDelete', () => {
  it('calls repo.reassignAndDelete with fromId and toId', async () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);
    await store.reassignAndDelete('cat-1', 'cat_other_expense');
    expect(repo.reassignAndDelete).toHaveBeenCalledWith('cat-1', 'cat_other_expense');
  });

  it('reloads categories after reassignAndDelete', async () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);
    await store.reassignAndDelete('cat-1', 'cat_other_expense');
    expect(repo.getAll).toHaveBeenCalled();
  });
});

describe('categoryStore — error branches', () => {
  it('loadCategories propagates repo errors', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('db fail')) });
    const store = new CategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.loadCategories()).rejects.toThrow('db fail');
    consoleSpy.mockRestore();
  });

  it('addCategory propagates errors', async () => {
    const repo = makeRepo({ add: jest.fn().mockRejectedValue(new Error('add fail')) });
    const store = new CategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      store.addCategory({ name: 'X', type: CategoryType.Expense, icon: 'star', color: '#fff' }),
    ).rejects.toThrow('add fail');
    consoleSpy.mockRestore();
  });

  it('updateCategory propagates errors', async () => {
    const repo = makeRepo({ update: jest.fn().mockRejectedValue(new Error('update fail')) });
    const store = new CategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      store.updateCategory('cat-1', { name: 'Y', icon: 'heart', color: '#aaa' }),
    ).rejects.toThrow('update fail');
    consoleSpy.mockRestore();
  });

  it('deleteCategory propagates errors', async () => {
    const repo = makeRepo({ delete: jest.fn().mockRejectedValue(new Error('delete fail')) });
    const store = new CategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.deleteCategory('cat-1')).rejects.toThrow('delete fail');
    consoleSpy.mockRestore();
  });

  it('reassignAndDelete propagates errors', async () => {
    const repo = makeRepo({
      reassignAndDelete: jest.fn().mockRejectedValue(new Error('reassign fail')),
    });
    const store = new CategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.reassignAndDelete('cat-1', 'cat_other_expense')).rejects.toThrow(
      'reassign fail',
    );
    consoleSpy.mockRestore();
  });
});

describe('categoryStore.getCategoryTransactionCount', () => {
  it('delegates to repo.getTransactionCount and returns the count', async () => {
    const repo = makeRepo({ getTransactionCount: jest.fn().mockResolvedValue(7) });
    const store = new CategoryStore(repo);
    const count = await store.getCategoryTransactionCount('cat-1');
    expect(repo.getTransactionCount).toHaveBeenCalledWith('cat-1');
    expect(count).toBe(7);
  });
});

describe('categoryStore.reset', () => {
  it('restores initial state', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([{ id: 'c1' } as Category]),
    });
    const store = new CategoryStore(repo);
    await store.loadCategories();
    expect(store.state.categories.value).toHaveLength(1);

    store.reset();

    expect(store.state.categories.value).toBe(EMPTY_CATEGORIES);
    expect(store.state.hasLoaded.value).toBe(false);
  });

  it('prevents pending loads from writing after reset', async () => {
    const load = deferred<Category[]>();
    const repo = makeRepo({ getAll: jest.fn().mockReturnValueOnce(load.promise) });
    const store = new CategoryStore(repo);

    const request = store.loadCategories();
    store.reset();

    load.resolve([mockCategory()]);
    await request;

    expect(store.state.categories.value).toBe(EMPTY_CATEGORIES);
    expect(store.state.hasLoaded.value).toBe(false);
  });
});
