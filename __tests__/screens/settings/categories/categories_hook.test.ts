/**
 * Layla's acceptance criteria covered:
 * TC-01, TC-02 — reassign-sheet branch when count > 0
 * TC-03        — direct-delete branch when count = 0
 * TC-04        — PROTECTED_CATEGORY_IDS constant membership
 * TC-06        — name-duplicate error re-throw
 * TC-09        — reassignAndDelete error re-throw + isDeleting finally-block safety
 */

import { signal } from '@preact/signals-react';
import { act, renderHook } from '@testing-library/react-native';

import { CategoryType, PROTECTED_CATEGORY_IDS } from '@/constants/enums';
import { useCategories } from '@/modules/categories/screens/settings/categories/categories.hook';
import { useCategoriesScreenState } from '@/modules/categories/screens/settings/categories/categories.state';
import { useCategoriesScreenStore } from '@/modules/categories/screens/settings/categories/categories.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Category } from '@/modules/categories/store/category.store';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/categories/screens/settings/categories/categories.state', () => ({
  useCategoriesScreenState: jest.fn(),
}));
jest.mock('@/modules/categories/screens/settings/categories/categories.store', () => ({
  useCategoriesScreenStore: jest.fn(),
}));

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

let capturedSetIsDeleting: jest.Mock;
let capturedSetLinkedCount: jest.Mock;
let capturedSetShowDeleteConfirm: jest.Mock;
let capturedSetShowReassignSheet: jest.Mock;
let capturedGetCategoryTransactionCount: jest.Mock;

function setupMocks(
  overrides: {
    isDeleting?: boolean;
    linkedCount?: number;
    categoryToDelete?: Category | null;
    showDeleteConfirm?: boolean;
    showReassignSheet?: boolean;
    addCategory?: jest.Mock;
    reassignAndDelete?: jest.Mock;
    getCategoryTransactionCount?: jest.Mock;
  } = {},
) {
  capturedSetIsDeleting = jest.fn();
  capturedSetLinkedCount = jest.fn();
  capturedSetShowDeleteConfirm = jest.fn();
  capturedSetShowReassignSheet = jest.fn();
  capturedGetCategoryTransactionCount =
    overrides.getCategoryTransactionCount ?? jest.fn().mockResolvedValue(0);

  (useCategoriesScreenState as unknown as jest.Mock).mockReturnValue({
    state: {
      activeTab: signal(CategoryType.Expense),
      showAddSheet: signal(false),
      showDeleteConfirm: signal(overrides.showDeleteConfirm ?? false),
      showReassignSheet: signal(overrides.showReassignSheet ?? false),
      isDeleting: signal(overrides.isDeleting ?? false),
    },
    setActiveTab: jest.fn(),
    setShowAddSheet: jest.fn(),
    setShowDeleteConfirm: capturedSetShowDeleteConfirm,
    setShowReassignSheet: capturedSetShowReassignSheet,
    setIsDeleting: capturedSetIsDeleting,
  });

  (useCategoriesScreenStore as unknown as jest.Mock).mockReturnValue({
    state: {
      editingCategory: signal(null),
      categoryToDelete: signal(overrides.categoryToDelete ?? null),
      linkedCount: signal(overrides.linkedCount ?? 0),
    },
    setEditingCategory: jest.fn(),
    setCategoryToDelete: jest.fn(),
    setLinkedCount: capturedSetLinkedCount,
  });

  (useCategoryStore as unknown as jest.Mock).mockReturnValue({
    state: {
      categories: signal([]),
      hasLoaded: signal(true),
    },
    addCategory: overrides.addCategory ?? jest.fn().mockResolvedValue(undefined),
    updateCategory: jest.fn().mockResolvedValue(undefined),
    deleteCategory: jest.fn().mockResolvedValue(undefined),
    reassignAndDelete: overrides.reassignAndDelete ?? jest.fn().mockResolvedValue(undefined),
    getCategoryTransactionCount: capturedGetCategoryTransactionCount,
  });
}

describe('useCategories — linkedCount + isDeleting in hook state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('exposes linkedCount in state (default 0)', () => {
    const { result } = renderHook(() => useCategories());
    expect(result.current.state.linkedCount).toBe(0);
  });

  it('exposes isDeleting in state (default false)', () => {
    const { result } = renderHook(() => useCategories());
    expect(result.current.state.isDeleting).toBe(false);
  });

  it('handleDeletePress calls getCategoryTransactionCount with correct id (TC-03)', async () => {
    capturedGetCategoryTransactionCount.mockResolvedValueOnce(0);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(capturedGetCategoryTransactionCount).toHaveBeenCalledWith('cat_food');
  });

  it('handleDeletePress opens DeleteConfirmationDialog when count = 0 (TC-03)', async () => {
    capturedGetCategoryTransactionCount.mockResolvedValueOnce(0);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(capturedSetShowDeleteConfirm).toHaveBeenCalledWith(true);
    expect(capturedSetShowReassignSheet).not.toHaveBeenCalledWith(true);
  });

  it('handleDeletePress opens ReassignSheet when count > 0 (TC-01, TC-02)', async () => {
    capturedGetCategoryTransactionCount.mockResolvedValueOnce(47);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(capturedSetShowReassignSheet).toHaveBeenCalledWith(true);
    expect(capturedSetShowDeleteConfirm).not.toHaveBeenCalledWith(true);
  });

  it('handleDeletePress stores the count in linkedCount before branching', async () => {
    capturedGetCategoryTransactionCount.mockResolvedValueOnce(47);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(capturedSetLinkedCount).toHaveBeenCalledWith(47);
  });

  it('handleDeletePress calls setIsDeleting(true) then setIsDeleting(false) — finally block', async () => {
    capturedGetCategoryTransactionCount.mockResolvedValueOnce(0);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(capturedSetIsDeleting).toHaveBeenNthCalledWith(1, true);
    expect(capturedSetIsDeleting).toHaveBeenNthCalledWith(2, false);
  });

  it('handleDeletePress calls setIsDeleting(false) in finally even when count query throws (TC-09)', async () => {
    capturedGetCategoryTransactionCount.mockRejectedValueOnce(new Error('DB error'));
    const { result } = renderHook(() => useCategories());

    let thrown: Error | undefined;
    await act(async () => {
      try {
        await result.current.handleDeletePress(fakeExpenseCategory);
      } catch (err) {
        thrown = err as Error;
      }
    });

    expect(thrown?.message).toBe('DB error');
    expect(capturedSetIsDeleting).toHaveBeenNthCalledWith(1, true);
    expect(capturedSetIsDeleting).toHaveBeenNthCalledWith(2, false);
    expect(capturedSetShowDeleteConfirm).not.toHaveBeenCalledWith(true);
    expect(capturedSetShowReassignSheet).not.toHaveBeenCalledWith(true);
  });
});

describe('useCategories — handleSave name-duplicate error (TC-06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-throws when addCategory rejects with a duplicate name error', async () => {
    const dupError = new Error('A category named "Food" already exists in expense');
    setupMocks({ addCategory: jest.fn().mockRejectedValue(dupError) });

    const { result } = renderHook(() => useCategories());

    await expect(
      act(async () => {
        await result.current.handleSave({
          name: 'Food',
          type: CategoryType.Expense,
          icon: 'food-fork-drink',
          color: '#C9',
        });
      }),
    ).rejects.toThrow('already exists');
  });
});

describe('useCategories — handleReassignConfirm error propagation (TC-09)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-throws when reassignAndDelete rejects', async () => {
    const dbError = new Error('DB write failed');
    setupMocks({
      reassignAndDelete: jest.fn().mockRejectedValue(dbError),
      categoryToDelete: fakeExpenseCategory,
    });

    const { result } = renderHook(() => useCategories());

    await expect(
      act(async () => {
        await result.current.handleReassignConfirm('cat_food');
      }),
    ).rejects.toThrow('DB write failed');
  });
});
