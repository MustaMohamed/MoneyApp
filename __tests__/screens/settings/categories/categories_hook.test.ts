/**
 * Task 6 — MobX shared category store + Signals local settings state.
 *
 * Layla's acceptance criteria covered:
 * TC-01, TC-02 — reassign-sheet branch when count > 0
 * TC-03        — direct-delete branch when count = 0
 * TC-04        — PROTECTED_CATEGORY_IDS guard historical membership
 * TC-06        — name-duplicate error re-throw
 * TC-09        — reassignAndDelete error re-throw + isDeleting safety
 */

import { act, renderHook } from '@testing-library/react-native';

import { CategoryType, PROTECTED_CATEGORY_IDS } from '@/constants/enums';
import { useCategories } from '@/modules/categories/screens/settings/categories/categories.hook';
import {
  type Category,
  type CategoryStore,
  useCategoryStore,
} from '@/modules/categories/store/category.store';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));

const mockedUseCategoryStore = useCategoryStore as jest.MockedFunction<typeof useCategoryStore>;

const fakeExpenseCategory: Category = {
  id: 'cat_food',
  name: 'Food',
  type: CategoryType.Expense,
  icon: 'food-fork-drink',
  color: '#C9973A',
  is_default: 1,
  sort_order: 1,
  budget_group: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function createStore(overrides: Partial<CategoryStore> = {}) {
  const store = {
    categories: [],
    hasLoaded: true,
    addCategory: jest.fn().mockResolvedValue(undefined),
    updateCategory: jest.fn().mockResolvedValue(undefined),
    deleteCategory: jest.fn().mockResolvedValue(undefined),
    reassignAndDelete: jest.fn().mockResolvedValue(undefined),
    getCategoryTransactionCount: jest.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as CategoryStore;

  mockedUseCategoryStore.mockReturnValue(store);
  return store;
}

describe('PROTECTED_CATEGORY_IDS constant membership (TC-04)', () => {
  const isInProtectedList = (id: string): boolean =>
    (PROTECTED_CATEGORY_IDS as readonly string[]).includes(id);

  it('cat_other_expense is in PROTECTED_CATEGORY_IDS', () => {
    expect(isInProtectedList('cat_other_expense')).toBe(true);
  });

  it('cat_other_income is in PROTECTED_CATEGORY_IDS', () => {
    expect(isInProtectedList('cat_other_income')).toBe(true);
  });

  it('cat_groceries is NOT in PROTECTED_CATEGORY_IDS', () => {
    expect(isInProtectedList('cat_groceries')).toBe(false);
  });

  it('cat_food is NOT in PROTECTED_CATEGORY_IDS', () => {
    expect(isInProtectedList('cat_food')).toBe(false);
  });
});

describe('useCategories — linkedCount + isDeleting in hook state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createStore();
  });

  it('exposes linkedCount in state (default 0)', () => {
    const { result } = renderHook(() => useCategories());

    expect(result.current.state.linkedCount.value).toBe(0);
  });

  it('exposes isDeleting in state (default false)', () => {
    const { result } = renderHook(() => useCategories());

    expect(result.current.state.isDeleting.value).toBe(false);
  });

  it('handleDeletePress calls getCategoryTransactionCount with correct id (TC-03)', async () => {
    const store = createStore();
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(store.getCategoryTransactionCount).toHaveBeenCalledWith('cat_food');
  });

  it('handleDeletePress opens DeleteConfirmationDialog when count = 0 (TC-03)', async () => {
    createStore({
      getCategoryTransactionCount: jest.fn().mockResolvedValue(0),
    } as Partial<CategoryStore>);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(result.current.state.showDeleteConfirm.value).toBe(true);
    expect(result.current.state.showReassignSheet.value).toBe(false);
  });

  it('handleDeletePress opens ReassignSheet when count > 0 (TC-01, TC-02)', async () => {
    createStore({
      getCategoryTransactionCount: jest.fn().mockResolvedValue(47),
    } as Partial<CategoryStore>);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(result.current.state.showReassignSheet.value).toBe(true);
    expect(result.current.state.showDeleteConfirm.value).toBe(false);
  });

  it('handleDeletePress stores the count in linkedCount before branching', async () => {
    createStore({
      getCategoryTransactionCount: jest.fn().mockResolvedValue(47),
    } as Partial<CategoryStore>);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(result.current.state.linkedCount.value).toBe(47);
  });

  it('handleDeletePress sets isDeleting while count query is pending and clears it after', async () => {
    let resolveCount!: (value: number) => void;
    const pendingCount = new Promise<number>((resolve) => {
      resolveCount = resolve;
    });
    createStore({
      getCategoryTransactionCount: jest.fn().mockReturnValue(pendingCount),
    } as Partial<CategoryStore>);
    const { result } = renderHook(() => useCategories());

    let pendingDelete!: Promise<void>;
    act(() => {
      pendingDelete = result.current.handleDeletePress(fakeExpenseCategory);
    });
    expect(result.current.state.isDeleting.value).toBe(true);

    await act(async () => {
      resolveCount(0);
      await pendingDelete;
    });

    expect(result.current.state.isDeleting.value).toBe(false);
  });

  it('handleDeletePress clears isDeleting when count query throws (TC-09)', async () => {
    createStore({
      getCategoryTransactionCount: jest.fn().mockRejectedValue(new Error('DB error')),
    } as Partial<CategoryStore>);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await expect(result.current.handleDeletePress(fakeExpenseCategory)).rejects.toThrow(
        'DB error',
      );
    });

    expect(result.current.state.isDeleting.value).toBe(false);
    expect(result.current.state.showDeleteConfirm.value).toBe(false);
    expect(result.current.state.showReassignSheet.value).toBe(false);
  });
});

describe('useCategories — handleSave name-duplicate error (TC-06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-throws when addCategory rejects with a duplicate name error', async () => {
    const dupError = new Error('A category named "Food" already exists in expense');
    createStore({ addCategory: jest.fn().mockRejectedValue(dupError) } as Partial<CategoryStore>);

    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await expect(
        result.current.handleSave({
          name: 'Food',
          type: CategoryType.Expense,
          icon: 'food-fork-drink',
          color: '#C9',
        }),
      ).rejects.toThrow('already exists');
    });
  });
});

describe('useCategories — handleReassignConfirm error propagation (TC-09)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-throws when reassignAndDelete rejects', async () => {
    const dbError = new Error('DB write failed');
    createStore({
      getCategoryTransactionCount: jest.fn().mockResolvedValue(1),
      reassignAndDelete: jest.fn().mockRejectedValue(dbError),
    } as Partial<CategoryStore>);

    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    await act(async () => {
      await expect(result.current.handleReassignConfirm('cat_other_expense')).rejects.toThrow(
        'DB write failed',
      );
    });
  });
});
