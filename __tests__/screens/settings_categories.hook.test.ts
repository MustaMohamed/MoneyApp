import { renderHook } from '@testing-library/react-native';

import { useCategories } from '@/modules/categories/screens/settings/categories/categories.hook';
import { useCategoriesScreenState } from '@/modules/categories/screens/settings/categories/categories.state';
import { useCategoriesScreenStore } from '@/modules/categories/screens/settings/categories/categories.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
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

function setup() {
  const loadCategories = jest.fn().mockResolvedValue(undefined);
  attachMockSelectorStore(useCategoriesScreenState as unknown as jest.Mock, () => ({
    activeTab: 'expense',
    showAddSheet: false,
    showDeleteConfirm: false,
    showReassignSheet: false,
    isDeleting: false,
    setActiveTab: jest.fn(),
    setShowAddSheet: jest.fn(),
    setShowDeleteConfirm: jest.fn(),
    setShowReassignSheet: jest.fn(),
    setIsDeleting: jest.fn(),
  }));
  attachMockSelectorStore(useCategoriesScreenStore as unknown as jest.Mock, () => ({
    editingCategory: null,
    categoryToDelete: null,
    linkedCount: 0,
    setEditingCategory: jest.fn(),
    setCategoryToDelete: jest.fn(),
    setLinkedCount: jest.fn(),
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
    categories: [],
    hasLoaded: false,
    loadError: false,
    loadCategories,
    addCategory: jest.fn().mockResolvedValue(undefined),
    updateCategory: jest.fn().mockResolvedValue(undefined),
    deleteCategory: jest.fn().mockResolvedValue(undefined),
    reassignAndDelete: jest.fn().mockResolvedValue(undefined),
    getCategoryTransactionCount: jest.fn().mockResolvedValue(0),
  }));
}

describe('useCategories', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useCategories())).not.toThrow();
  });

  it('customCategories defaults to empty array', () => {
    const { result } = renderHook(() => useCategories());
    expect(result.current.state.customCategories).toEqual([]);
  });

  it('exposes whether category data has loaded', () => {
    const { result } = renderHook(() => useCategories());
    expect(result.current.state.hasLoaded).toBe(false);
  });

  it('exposes the category load error state', () => {
    attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
      categories: [],
      hasLoaded: false,
      loadError: true,
      loadCategories: jest.fn().mockResolvedValue(undefined),
      addCategory: jest.fn().mockResolvedValue(undefined),
      updateCategory: jest.fn().mockResolvedValue(undefined),
      deleteCategory: jest.fn().mockResolvedValue(undefined),
      reassignAndDelete: jest.fn().mockResolvedValue(undefined),
      getCategoryTransactionCount: jest.fn().mockResolvedValue(0),
    }));

    const { result } = renderHook(() => useCategories());
    expect(result.current.state.loadError).toBe(true);
  });

  it('retries category loading without leaking the rejection', async () => {
    const loadCategories = jest.fn().mockRejectedValue(new Error('still unavailable'));
    attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
      categories: [],
      hasLoaded: false,
      loadError: true,
      loadCategories,
      addCategory: jest.fn().mockResolvedValue(undefined),
      updateCategory: jest.fn().mockResolvedValue(undefined),
      deleteCategory: jest.fn().mockResolvedValue(undefined),
      reassignAndDelete: jest.fn().mockResolvedValue(undefined),
      getCategoryTransactionCount: jest.fn().mockResolvedValue(0),
    }));
    const { result } = renderHook(() => useCategories());

    await expect(result.current.retryLoad()).resolves.toBeUndefined();
    expect(loadCategories).toHaveBeenCalledTimes(1);
  });
});
