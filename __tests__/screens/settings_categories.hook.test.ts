import { signal } from '@preact/signals-react';
import { renderHook } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { useCategories } from '@/modules/categories/screens/settings/categories/categories.hook';
import { useCategoriesScreenState } from '@/modules/categories/screens/settings/categories/categories.state';
import { useCategoriesScreenStore } from '@/modules/categories/screens/settings/categories/categories.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';

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
  (useCategoriesScreenState as unknown as jest.Mock).mockReturnValue({
    state: {
      activeTab: signal(CategoryType.Expense),
      showAddSheet: signal(false),
      showDeleteConfirm: signal(false),
      showReassignSheet: signal(false),
      isDeleting: signal(false),
    },
    setActiveTab: jest.fn(),
    setShowAddSheet: jest.fn(),
    setShowDeleteConfirm: jest.fn(),
    setShowReassignSheet: jest.fn(),
    setIsDeleting: jest.fn(),
  });
  (useCategoriesScreenStore as unknown as jest.Mock).mockReturnValue({
    state: {
      editingCategory: signal(null),
      categoryToDelete: signal(null),
      linkedCount: signal(0),
    },
    setEditingCategory: jest.fn(),
    setCategoryToDelete: jest.fn(),
    setLinkedCount: jest.fn(),
  });
  (useCategoryStore as unknown as jest.Mock).mockReturnValue({
    state: {
      categories: signal([]),
      hasLoaded: signal(false),
    },
    addCategory: jest.fn().mockResolvedValue(undefined),
    updateCategory: jest.fn().mockResolvedValue(undefined),
    deleteCategory: jest.fn().mockResolvedValue(undefined),
    reassignAndDelete: jest.fn().mockResolvedValue(undefined),
    getCategoryTransactionCount: jest.fn().mockResolvedValue(0),
  });
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
});
