import { renderHook } from '@testing-library/react-native';

import { useCategories } from '@/screens/settings/categories/categories.hook';
import { useCategoryStore } from '@/store/category.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/screens/settings/categories/categories.state', () => ({
  useCategoriesScreenState: jest.fn((sel: any) =>
    sel({
      state: {
        activeTab: 'expense',
        showAddSheet: false,
        showDeleteConfirm: false,
        showReassignSheet: false,
      },
      setActiveTab: jest.fn(),
      setShowAddSheet: jest.fn(),
      setShowDeleteConfirm: jest.fn(),
      setShowReassignSheet: jest.fn(),
    }),
  ),
}));
jest.mock('@/screens/settings/categories/categories.store', () => ({
  useCategoriesScreenStore: jest.fn((sel: any) =>
    sel({
      state: { editingCategory: null, categoryToDelete: null },
      setEditingCategory: jest.fn(),
      setCategoryToDelete: jest.fn(),
    }),
  ),
}));

function setup() {
  (useCategoryStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { categories: [] },
      addCategory: jest.fn().mockResolvedValue(undefined),
      updateCategory: jest.fn().mockResolvedValue(undefined),
      deleteCategory: jest.fn().mockResolvedValue(undefined),
      reassignAndDelete: jest.fn().mockResolvedValue(undefined),
    }),
  );
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
});
