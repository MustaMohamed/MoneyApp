/**
 * Task 5 — Group C
 *
 * Store/state shape tests are in this file alongside hook integration tests.
 * jest.mock is hoisted, so shape tests use jest.requireActual() to access
 * the real Zustand store instances. Hook integration tests use the mocked
 * versions (standard pattern from settings_categories.hook.test.ts).
 *
 * Layla's acceptance criteria covered:
 * TC-01, TC-02 — reassign-sheet branch when count > 0
 * TC-03        — direct-delete branch when count = 0
 * TC-04        — PROTECTED_CATEGORY_IDS guard (edit/delete affordance)
 * TC-06        — name-duplicate error re-throw
 * TC-09        — reassignAndDelete error re-throw + isDeleting finally-block safety
 */

// ---------------------------------------------------------------------------
// Mock declarations — hoisted to top by Babel/jest
// ---------------------------------------------------------------------------
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/database/client', () => ({ getDb: jest.fn() }));
jest.mock('@/modules/categories/database/categories', () => ({
  getCategoryTransactionCount: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/categories/screens/settings/categories/categories.state', () => ({
  useCategoriesScreenState: jest.fn(),
}));
jest.mock('@/modules/categories/screens/settings/categories/categories.store', () => ({
  useCategoriesScreenStore: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { act, renderHook } from '@testing-library/react-native';

import { CategoryType, PROTECTED_CATEGORY_IDS } from '@/constants/enums';
import { getDb } from '@/database/client';
import { getCategoryTransactionCount } from '@/modules/categories/database/categories';
import { useCategories } from '@/modules/categories/screens/settings/categories/categories.hook';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Category } from '@/modules/categories/store/category.store';

// Real Zustand stores — bypassing the mock for shape tests
const realCategoriesStore = jest.requireActual<
  typeof import('@/modules/categories/screens/settings/categories/categories.store')
>('@/modules/categories/screens/settings/categories/categories.store');
const realCategoriesState = jest.requireActual<
  typeof import('@/modules/categories/screens/settings/categories/categories.state')
>('@/modules/categories/screens/settings/categories/categories.state');
const { useCategoriesScreenStore: realScreenStore } = realCategoriesStore;
const { useCategoriesScreenState: realScreenState } = realCategoriesState;

// Mocked versions for hook integration — cast through unknown to jest.Mock
const mockedState = jest.requireMock<{ useCategoriesScreenState: jest.Mock }>(
  '@/modules/categories/screens/settings/categories/categories.state',
).useCategoriesScreenState;
const mockedStore = jest.requireMock<{ useCategoriesScreenStore: jest.Mock }>(
  '@/modules/categories/screens/settings/categories/categories.store',
).useCategoriesScreenStore;

// ---------------------------------------------------------------------------
// useCategoriesScreenStore — linkedCount (Task 5.3)
// These tests use the REAL store (via jest.requireActual)
// ---------------------------------------------------------------------------

describe('useCategoriesScreenStore — linkedCount', () => {
  beforeEach(() => {
    realScreenStore.getState().reset();
  });

  it('has linkedCount of 0 in initial state', () => {
    const { state } = realScreenStore.getState();
    expect(state.linkedCount).toBe(0);
  });

  it('setLinkedCount updates linkedCount', () => {
    realScreenStore.getState().setLinkedCount(47);
    expect(realScreenStore.getState().state.linkedCount).toBe(47);
  });

  it('setLinkedCount to 0 is valid', () => {
    realScreenStore.getState().setLinkedCount(47);
    realScreenStore.getState().setLinkedCount(0);
    expect(realScreenStore.getState().state.linkedCount).toBe(0);
  });

  it('reset sets linkedCount back to 0', () => {
    realScreenStore.getState().setLinkedCount(47);
    realScreenStore.getState().reset();
    expect(realScreenStore.getState().state.linkedCount).toBe(0);
  });

  it('reset preserves all other INITIAL_STATE fields (editingCategory, categoryToDelete)', () => {
    realScreenStore.getState().setLinkedCount(12);
    realScreenStore.getState().reset();
    const { state } = realScreenStore.getState();
    expect(state.editingCategory).toBeNull();
    expect(state.categoryToDelete).toBeNull();
    expect(state.linkedCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// useCategoriesScreenState — isDeleting (Task 5.4)
// These tests use the REAL state store (via jest.requireActual)
// ---------------------------------------------------------------------------

describe('useCategoriesScreenState — isDeleting', () => {
  beforeEach(() => {
    realScreenState.getState().reset();
  });

  it('has isDeleting of false in initial state', () => {
    const { state } = realScreenState.getState();
    expect(state.isDeleting).toBe(false);
  });

  it('setIsDeleting(true) sets isDeleting to true', () => {
    realScreenState.getState().setIsDeleting(true);
    expect(realScreenState.getState().state.isDeleting).toBe(true);
  });

  it('setIsDeleting(false) clears isDeleting back to false', () => {
    realScreenState.getState().setIsDeleting(true);
    realScreenState.getState().setIsDeleting(false);
    expect(realScreenState.getState().state.isDeleting).toBe(false);
  });

  it('reset sets isDeleting back to false', () => {
    realScreenState.getState().setIsDeleting(true);
    realScreenState.getState().reset();
    expect(realScreenState.getState().state.isDeleting).toBe(false);
  });

  it('reset preserves all other INITIAL_STATE fields', () => {
    realScreenState.getState().setIsDeleting(true);
    realScreenState.getState().setShowAddSheet(true);
    realScreenState.getState().setShowDeleteConfirm(true);
    realScreenState.getState().setShowReassignSheet(true);
    realScreenState.getState().setActiveTab(CategoryType.Income);
    realScreenState.getState().reset();
    const { state } = realScreenState.getState();
    expect(state.isDeleting).toBe(false);
    expect(state.showAddSheet).toBe(false);
    expect(state.showDeleteConfirm).toBe(false);
    expect(state.showReassignSheet).toBe(false);
    expect(state.activeTab).toBe('expense');
  });
});

// ---------------------------------------------------------------------------
// TC-04: PROTECTED_CATEGORY_IDS constant — membership tests
//
// Note: As of the is_default reversal, the UI protection gate is now
// category.is_default === 1, NOT membership in PROTECTED_CATEGORY_IDS.
// PROTECTED_CATEGORY_IDS is retained as a documented historical artifact.
// These tests verify the constant's own membership — separate from UI behavior.
// ---------------------------------------------------------------------------

describe('PROTECTED_CATEGORY_IDS constant membership (TC-04)', () => {
  const isInProtectedList = (id: string): boolean =>
    (PROTECTED_CATEGORY_IDS as readonly string[]).includes(id);

  it('cat_other_expense is in PROTECTED_CATEGORY_IDS', () => {
    expect(isInProtectedList('cat_other_expense')).toBe(true);
  });

  it('cat_other_income is in PROTECTED_CATEGORY_IDS', () => {
    expect(isInProtectedList('cat_other_income')).toBe(true);
  });

  it('cat_groceries is NOT in PROTECTED_CATEGORY_IDS (but is still UI-protected via is_default=1)', () => {
    expect(isInProtectedList('cat_groceries')).toBe(false);
  });

  it('cat_food is NOT in PROTECTED_CATEGORY_IDS (but is still UI-protected via is_default=1)', () => {
    expect(isInProtectedList('cat_food')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration — useCategories hook (Task 5.6)
// ---------------------------------------------------------------------------

const fakeExpenseCategory: Category = {
  id: 'cat_food',
  name: 'Food',
  type: 'expense' as any,
  icon: 'food-fork-drink',
  color: '#C9973A',
  is_default: 1,
  sort_order: 1,
  budget_group: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

// Captured action fns so tests can inspect what was called
let capturedSetIsDeleting: jest.Mock;
let capturedSetLinkedCount: jest.Mock;
let capturedSetShowDeleteConfirm: jest.Mock;
let capturedSetShowReassignSheet: jest.Mock;

function setupMocks(
  overrides: {
    isDeleting?: boolean;
    linkedCount?: number;
    categoryToDelete?: Category | null;
    showDeleteConfirm?: boolean;
    showReassignSheet?: boolean;
    addCategory?: jest.Mock;
    reassignAndDelete?: jest.Mock;
  } = {},
) {
  capturedSetIsDeleting = jest.fn();
  capturedSetLinkedCount = jest.fn();
  capturedSetShowDeleteConfirm = jest.fn();
  capturedSetShowReassignSheet = jest.fn();

  mockedState.mockImplementation((sel: any) =>
    sel({
      state: {
        activeTab: 'expense',
        showAddSheet: false,
        showDeleteConfirm: overrides.showDeleteConfirm ?? false,
        showReassignSheet: overrides.showReassignSheet ?? false,
        isDeleting: overrides.isDeleting ?? false,
      },
      setActiveTab: jest.fn(),
      setShowAddSheet: jest.fn(),
      setShowDeleteConfirm: capturedSetShowDeleteConfirm,
      setShowReassignSheet: capturedSetShowReassignSheet,
      setIsDeleting: capturedSetIsDeleting,
    }),
  );

  mockedStore.mockImplementation((sel: any) =>
    sel({
      state: {
        editingCategory: null,
        categoryToDelete: overrides.categoryToDelete ?? null,
        linkedCount: overrides.linkedCount ?? 0,
      },
      setEditingCategory: jest.fn(),
      setCategoryToDelete: jest.fn(),
      setLinkedCount: capturedSetLinkedCount,
    }),
  );

  (useCategoryStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { categories: [] },
      addCategory: overrides.addCategory ?? jest.fn().mockResolvedValue(undefined),
      updateCategory: jest.fn().mockResolvedValue(undefined),
      deleteCategory: jest.fn().mockResolvedValue(undefined),
      reassignAndDelete: overrides.reassignAndDelete ?? jest.fn().mockResolvedValue(undefined),
    }),
  );

  const mockDb = { getFirstAsync: jest.fn() };
  (getDb as jest.Mock).mockResolvedValue(mockDb);
  (getCategoryTransactionCount as jest.Mock).mockResolvedValue(0);
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
    (getCategoryTransactionCount as jest.Mock).mockResolvedValueOnce(0);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(getCategoryTransactionCount).toHaveBeenCalledWith(expect.anything(), 'cat_food');
  });

  it('handleDeletePress opens DeleteConfirmationDialog when count = 0 (TC-03)', async () => {
    (getCategoryTransactionCount as jest.Mock).mockResolvedValueOnce(0);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(capturedSetShowDeleteConfirm).toHaveBeenCalledWith(true);
    expect(capturedSetShowReassignSheet).not.toHaveBeenCalledWith(true);
  });

  it('handleDeletePress opens ReassignSheet when count > 0 (TC-01, TC-02)', async () => {
    (getCategoryTransactionCount as jest.Mock).mockResolvedValueOnce(47);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(capturedSetShowReassignSheet).toHaveBeenCalledWith(true);
    expect(capturedSetShowDeleteConfirm).not.toHaveBeenCalledWith(true);
  });

  it('handleDeletePress stores the count in linkedCount before branching', async () => {
    (getCategoryTransactionCount as jest.Mock).mockResolvedValueOnce(47);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(capturedSetLinkedCount).toHaveBeenCalledWith(47);
  });

  it('handleDeletePress calls setIsDeleting(true) then setIsDeleting(false) — finally block', async () => {
    (getCategoryTransactionCount as jest.Mock).mockResolvedValueOnce(0);
    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await result.current.handleDeletePress(fakeExpenseCategory);
    });

    expect(capturedSetIsDeleting).toHaveBeenNthCalledWith(1, true);
    expect(capturedSetIsDeleting).toHaveBeenNthCalledWith(2, false);
  });

  it('handleDeletePress calls setIsDeleting(false) in finally even when count query throws (TC-09)', async () => {
    (getCategoryTransactionCount as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    const { result } = renderHook(() => useCategories());

    // The hook has try/finally (no catch) so the error propagates, but
    // setIsDeleting(false) is guaranteed to run in the finally block first.
    // We use a try/catch here so we can assert after the rejection.
    let thrown: Error | undefined;
    await act(async () => {
      try {
        await result.current.handleDeletePress(fakeExpenseCategory);
      } catch (err) {
        thrown = err as Error;
      }
    });

    expect(thrown?.message).toBe('DB error');
    // setIsDeleting must have been called true then false (finally)
    expect(capturedSetIsDeleting).toHaveBeenNthCalledWith(1, true);
    expect(capturedSetIsDeleting).toHaveBeenNthCalledWith(2, false);
    // Neither sheet opens on error
    expect(capturedSetShowDeleteConfirm).not.toHaveBeenCalledWith(true);
    expect(capturedSetShowReassignSheet).not.toHaveBeenCalledWith(true);
  });
});

// ---------------------------------------------------------------------------
// handleSave — name-duplicate error surface (TC-06)
// ---------------------------------------------------------------------------

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
          type: 'expense' as any,
          icon: 'food-fork-drink',
          color: '#C9',
        });
      }),
    ).rejects.toThrow('already exists');
  });
});

// ---------------------------------------------------------------------------
// handleReassignConfirm — error surface (TC-09 partial failure)
// ---------------------------------------------------------------------------

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
