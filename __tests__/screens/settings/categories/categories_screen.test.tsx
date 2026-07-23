import { fireEvent, render, screen } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import CategoriesScreen from '@/modules/categories/screens/settings/categories';
import { useCategories } from '@/modules/categories/screens/settings/categories/categories.hook';
import type { Category } from '@/modules/categories/store/category.store';

jest.mock('@/modules/categories/screens/settings/categories/categories.hook', () => ({
  useCategories: jest.fn(),
}));
jest.mock('@/components/ui/screen', () => {
  const { View } = jest.requireActual('react-native');
  return { Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View> };
});
jest.mock('@/components/ui/tabs', () => ({ SegmentedTabs: () => null }));
jest.mock('@/components/ui/empty_state', () => ({ EmptyState: () => null }));
jest.mock('@shopify/flash-list', () => {
  const { View } = jest.requireActual('react-native');
  return { FlashList: () => <View testID="category-list" /> };
});
jest.mock(
  '@/modules/categories/screens/settings/categories/components/add_edit_category_sheet',
  () => ({ AddEditCategorySheet: () => null }),
);
jest.mock(
  '@/modules/categories/screens/settings/categories/components/delete_confirmation_dialog',
  () => ({ DeleteConfirmationDialog: () => null }),
);
jest.mock(
  '@/modules/categories/screens/settings/categories/components/reassign_category_sheet',
  () => ({ ReassignCategorySheet: () => null }),
);
jest.mock('@/modules/categories/screens/settings/categories/components/category_row', () => ({
  CategoryRow: () => null,
}));

const category: Category = {
  id: 'cat-food',
  name: 'Food',
  type: CategoryType.Expense,
  icon: 'food',
  color: '#D4A44C',
  is_default: 1,
  sort_order: 1,
  budget_group: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function setup(overrides: Record<string, unknown> = {}) {
  const retryLoad = jest.fn().mockResolvedValue(undefined);
  (useCategories as jest.Mock).mockReturnValue({
    state: {
      defaultCategories: [],
      customCategories: [],
      isAtLimit: false,
      hasLoaded: false,
      loadError: false,
      activeTab: CategoryType.Expense,
      showAddSheet: false,
      editingCategory: null,
      categoryToDelete: null,
      showDeleteConfirm: false,
      showReassignSheet: false,
      reassignOptions: [],
      linkedCount: 0,
      isDeleting: false,
      ...overrides,
    },
    setActiveTab: jest.fn(),
    openAddSheet: jest.fn(),
    openEditSheet: jest.fn(),
    closeSheet: jest.fn(),
    handleSave: jest.fn(),
    handleDeletePress: jest.fn(),
    handleDeleteConfirm: jest.fn(),
    handleReassignConfirm: jest.fn(),
    closeDeleteFlow: jest.fn(),
    retryLoad,
  });
  return { retryLoad };
}

describe('CategoriesScreen loading failures', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a retryable initial failure instead of an endless spinner', () => {
    const { retryLoad } = setup({ loadError: true });
    render(<CategoriesScreen />);

    expect(screen.getByText(Strings.categoriesLoadError)).toBeTruthy();
    fireEvent.press(screen.getByLabelText(Strings.categoriesLoadRetry));
    expect(retryLoad).toHaveBeenCalledTimes(1);
  });

  it('keeps the warm list mounted under a nonblocking refresh error', () => {
    setup({ hasLoaded: true, loadError: true, defaultCategories: [category] });
    render(<CategoriesScreen />);

    expect(screen.getByTestId('category-list')).toBeTruthy();
    expect(screen.getByText(Strings.categoriesRefreshError)).toBeTruthy();
  });
});
