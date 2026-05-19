/**
 * CategoriesScreen — isLast prop computation tests
 *
 * Verifies that the screen correctly passes isLast={true} to the last CategoryRow
 * in each section (Defaults / Custom) and isLast={false} to all other rows.
 *
 * Strategy: mock useCategories with known category data, render the screen, then
 * query CategoryRow instances via UNSAFE_getAllByType and inspect their isLast prop.
 */

import { render } from '@testing-library/react-native';
import React from 'react';

// ---------------------------------------------------------------------------
// Module mocks (must be declared before imports of the module under test)
// ---------------------------------------------------------------------------

jest.mock('react-native-reanimated', () => ({
  default: { View: require('react-native').View },
  useSharedValue: jest.fn((v: any) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((v: any) => v),
  withSpring: jest.fn((v: any) => v),
  View: require('react-native').View,
  createAnimatedComponent: (c: any) => c,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});

jest.mock('@/screens/settings/categories/components/add_edit_category_sheet', () => ({
  AddEditCategorySheet: () => null,
}));
jest.mock('@/screens/settings/categories/components/delete_confirmation_dialog', () => ({
  DeleteConfirmationDialog: () => null,
}));
jest.mock('@/screens/settings/categories/components/reassign_category_sheet', () => ({
  ReassignCategorySheet: () => null,
}));

// ---------------------------------------------------------------------------
// useCategories mock — uses mockCategoriesState so factory can reference it
// (jest.mock factories only allow access to variables prefixed with 'mock')
// ---------------------------------------------------------------------------

const mockSetActiveTab = jest.fn();
const mockOpenAddSheet = jest.fn();
const mockOpenEditSheet = jest.fn();
const mockCategoriesState = {
  defaultCategories: [] as any[],
  customCategories: [] as any[],
  isAtLimit: false,
  activeTab: 'expense' as const,
  showAddSheet: false,
  editingCategory: undefined,
  categoryToDelete: undefined,
  showDeleteConfirm: false,
  showReassignSheet: false,
  reassignOptions: [],
  linkedCount: 0,
  isDeleting: false,
};

jest.mock('@/screens/settings/categories/categories.hook', () => ({
  useCategories: () => ({
    state: mockCategoriesState,
    setActiveTab: mockSetActiveTab,
    openAddSheet: mockOpenAddSheet,
    openEditSheet: mockOpenEditSheet,
    closeSheet: jest.fn(),
    handleSave: jest.fn(),
    handleDeletePress: jest.fn(),
    handleDeleteConfirm: jest.fn(),
    handleReassignConfirm: jest.fn(),
    closeDeleteFlow: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { CategoryType } from '@/constants/enums';
import { CategoryRow } from '@/screens/settings/categories/components/category_row';
import CategoriesScreen from '@/screens/settings/categories/index';
import type { Category } from '@/store/category.store';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const NOW = '2024-01-01T00:00:00.000Z';

const makeCategory = (id: string, name: string, isDefault: 0 | 1, sortOrder: number): Category => ({
  id,
  name,
  type: CategoryType.Expense,
  icon: 'food',
  color: '#4CAF82',
  is_default: isDefault,
  sort_order: sortOrder,
  created_at: NOW,
  updated_at: NOW,
});

const defaultCats: Category[] = [
  makeCategory('def-1', 'Food', 1, 1),
  makeCategory('def-2', 'Transport', 1, 2),
  makeCategory('def-3', 'Housing', 1, 3),
];

const customCats: Category[] = [
  makeCategory('cus-1', 'Hobbies', 0, 4),
  makeCategory('cus-2', 'Gym', 0, 5),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CategoriesScreen — isLast prop computation', () => {
  beforeEach(() => {
    mockCategoriesState.defaultCategories = defaultCats;
    mockCategoriesState.customCategories = customCats;
  });

  it('passes isLast={true} only to the last default category and last custom category', () => {
    const { UNSAFE_getAllByType } = render(<CategoriesScreen />);

    // CategoryRow instances rendered in list order: def-1, def-2, def-3, cus-1, cus-2
    const rows = UNSAFE_getAllByType(CategoryRow);

    expect(rows).toHaveLength(5);

    // Default section: first two are NOT last, third IS last (next entry is custom header)
    expect(rows[0].props.isLast).toBe(false); // def-1
    expect(rows[1].props.isLast).toBe(false); // def-2
    expect(rows[2].props.isLast).toBe(true); // def-3 — last before custom section header

    // Custom section: first is NOT last, second IS last (end of list)
    expect(rows[3].props.isLast).toBe(false); // cus-1
    expect(rows[4].props.isLast).toBe(true); // cus-2 — last item in list
  });

  it('passes isLast={true} to the only row when each section has exactly one category', () => {
    mockCategoriesState.defaultCategories = [makeCategory('def-only', 'Food', 1, 1)];
    mockCategoriesState.customCategories = [makeCategory('cus-only', 'Hobbies', 0, 2)];

    const { UNSAFE_getAllByType } = render(<CategoriesScreen />);
    const rows = UNSAFE_getAllByType(CategoryRow);

    expect(rows).toHaveLength(2);
    expect(rows[0].props.isLast).toBe(true); // sole default category
    expect(rows[1].props.isLast).toBe(true); // sole custom category
  });
});
