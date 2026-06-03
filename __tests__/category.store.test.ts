import { CategoryType } from '@/constants/enums';
import type { Category } from '@/modules/categories/entities/category.entity';
import type {
  ICategoryRepository,
  NewCategoryInput,
  UpdateCategoryInput,
} from '@/modules/categories/repositories/category.repository';
import { CategoryStore } from '@/modules/categories/store/category.store';

const categoryInput: NewCategoryInput = {
  name: 'X',
  type: CategoryType.Expense,
  icon: 'star',
  color: '#fff',
};

const categoryUpdate: UpdateCategoryInput = {
  name: 'Y',
  icon: 'heart',
  color: '#aaa',
};

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CategoryStore.loadCategories', () => {
  it('starts unloaded so screens do not show empty states before category data settles', () => {
    const store = new CategoryStore(makeRepo());

    expect(store.categories).toEqual([]);
    expect(store.hasLoaded).toBe(false);
  });

  it('loads repo categories and marks the store loaded', async () => {
    const categories = [mockCategory()];
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue(categories) });
    const store = new CategoryStore(repo);

    await store.loadCategories();

    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.categories).toEqual(categories);
    expect(store.hasLoaded).toBe(true);
  });

  it('logs and rethrows repo errors without marking loaded', async () => {
    const error = new Error('db fail');
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(error) });
    const store = new CategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.loadCategories()).rejects.toThrow('db fail');

    expect(consoleSpy).toHaveBeenCalledWith('[categoryStore] loadCategories failed:', error);
    expect(store.categories).toEqual([]);
    expect(store.hasLoaded).toBe(false);
    consoleSpy.mockRestore();
  });
});

describe('CategoryStore.addCategory', () => {
  it('calls repo.add with the input', async () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);

    await store.addCategory(categoryInput);

    expect(repo.add).toHaveBeenCalledWith(categoryInput);
  });

  it('reloads categories after add', async () => {
    const categories = [mockCategory({ id: 'cat-after-add' })];
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue(categories) });
    const store = new CategoryStore(repo);

    await store.addCategory(categoryInput);

    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.categories).toEqual(categories);
    expect(store.hasLoaded).toBe(true);
  });

  it('logs and rethrows add errors without reloading', async () => {
    const error = new Error('add fail');
    const repo = makeRepo({ add: jest.fn().mockRejectedValue(error) });
    const store = new CategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.addCategory(categoryInput)).rejects.toThrow('add fail');

    expect(consoleSpy).toHaveBeenCalledWith('[categoryStore] addCategory failed:', error);
    expect(repo.getAll).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('rethrows reload errors after add', async () => {
    const error = new Error('reload fail');
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(error) });
    const store = new CategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.addCategory(categoryInput)).rejects.toThrow('reload fail');

    expect(repo.add).toHaveBeenCalledWith(categoryInput);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith('[categoryStore] loadCategories failed:', error);
    expect(consoleSpy).toHaveBeenCalledWith('[categoryStore] addCategory failed:', error);
    consoleSpy.mockRestore();
  });
});

describe('CategoryStore.updateCategory', () => {
  it('calls repo.update with id and data', async () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);

    await store.updateCategory('cat-1', categoryUpdate);

    expect(repo.update).toHaveBeenCalledWith('cat-1', categoryUpdate);
  });

  it('reloads categories after update', async () => {
    const repo = makeRepo();
    const store = new CategoryStore(repo);

    await store.updateCategory('cat-1', categoryUpdate);

    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('logs and rethrows update errors', async () => {
    const error = new Error('update fail');
    const repo = makeRepo({ update: jest.fn().mockRejectedValue(error) });
    const store = new CategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.updateCategory('cat-1', categoryUpdate)).rejects.toThrow('update fail');

    expect(consoleSpy).toHaveBeenCalledWith('[categoryStore] updateCategory failed:', error);
    expect(repo.getAll).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('CategoryStore.deleteCategory', () => {
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

    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('logs and rethrows delete errors', async () => {
    const error = new Error('delete fail');
    const repo = makeRepo({ delete: jest.fn().mockRejectedValue(error) });
    const store = new CategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.deleteCategory('cat-1')).rejects.toThrow('delete fail');

    expect(consoleSpy).toHaveBeenCalledWith('[categoryStore] deleteCategory failed:', error);
    expect(repo.getAll).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('CategoryStore.reassignAndDelete', () => {
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

    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('logs and rethrows reassign errors', async () => {
    const error = new Error('reassign fail');
    const repo = makeRepo({
      reassignAndDelete: jest.fn().mockRejectedValue(error),
    });
    const store = new CategoryStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.reassignAndDelete('cat-1', 'cat_other_expense')).rejects.toThrow(
      'reassign fail',
    );

    expect(consoleSpy).toHaveBeenCalledWith('[categoryStore] reassignAndDelete failed:', error);
    expect(repo.getAll).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('CategoryStore.getCategoryTransactionCount', () => {
  it('delegates to repo.getTransactionCount and returns the count', async () => {
    const repo = makeRepo({ getTransactionCount: jest.fn().mockResolvedValue(7) });
    const store = new CategoryStore(repo);

    const count = await store.getCategoryTransactionCount('cat-1');

    expect(repo.getTransactionCount).toHaveBeenCalledWith('cat-1');
    expect(count).toBe(7);
  });
});

describe('CategoryStore.reset', () => {
  it('restores initial state', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([{ id: 'c1' } as Category]),
    });
    const store = new CategoryStore(repo);
    await store.loadCategories();
    expect(store.categories).toHaveLength(1);

    store.reset();

    expect(store.categories).toEqual([]);
    expect(store.hasLoaded).toBe(false);
  });
});
