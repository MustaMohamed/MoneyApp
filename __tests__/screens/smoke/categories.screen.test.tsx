/**
 * Fix§4 regression guard — CategoriesScreen layout
 *
 * Verifies:
 * 1. Screen renders without throwing (smoke)
 * 2. Tab switcher is present in the tree (both tabs rendered)
 * 3. Tapping the "Income" tab invokes setActiveTab with 'income'
 * 4. Tapping the "Expense" tab invokes setActiveTab with 'expense'
 *
 * Root cause covered: FlashList was a direct child of Screen with no
 * flex:1 wrapper + no estimatedItemSize, causing RecyclerListView to
 * overflow and paint over the tab switcher — blocking all touches.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';

// ---------------------------------------------------------------------------
// Module mocks (hoisted)
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

// Mock all three sheets/dialogs so we don't need to set up their full dep trees
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
// Captured mock for setActiveTab assertion
// ---------------------------------------------------------------------------
const mockSetActiveTab = jest.fn();

jest.mock('@/screens/settings/categories/categories.hook', () => ({
  useCategories: () => ({
    state: {
      defaultCategories: [],
      customCategories: [],
      isAtLimit: false,
      activeTab: 'expense',
      showAddSheet: false,
      editingCategory: null,
      categoryToDelete: null,
      showDeleteConfirm: false,
      showReassignSheet: false,
      reassignOptions: [],
      linkedCount: 0,
      isDeleting: false,
    },
    setActiveTab: mockSetActiveTab,
    openAddSheet: jest.fn(),
    openEditSheet: jest.fn(),
    closeSheet: jest.fn(),
    handleSave: jest.fn(),
    handleDeletePress: jest.fn(),
    handleDeleteConfirm: jest.fn(),
    handleReassignConfirm: jest.fn(),
    closeDeleteFlow: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------
import CategoriesScreen from '@/screens/settings/categories/index';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockSetActiveTab.mockClear();
});

describe('CategoriesScreen — tab switcher layout fix', () => {
  it('renders without throwing', () => {
    expect(() => render(<CategoriesScreen />)).not.toThrow();
  });

  it('renders both Expense and Income tabs', () => {
    const { getByText } = render(<CategoriesScreen />);
    expect(getByText(Strings.categoriesTabExpense)).toBeTruthy();
    expect(getByText(Strings.categoriesTabIncome)).toBeTruthy();
  });

  it('pressing the Income tab invokes setActiveTab with "income"', () => {
    const { getByText } = render(<CategoriesScreen />);
    fireEvent.press(getByText(Strings.categoriesTabIncome));
    expect(mockSetActiveTab).toHaveBeenCalledWith('income');
  });

  it('pressing the Expense tab invokes setActiveTab with "expense"', () => {
    const { getByText } = render(<CategoriesScreen />);
    fireEvent.press(getByText(Strings.categoriesTabExpense));
    expect(mockSetActiveTab).toHaveBeenCalledWith('expense');
  });

  it('renders the Add Category button when not at limit', () => {
    const { getByText } = render(<CategoriesScreen />);
    expect(getByText(Strings.categoriesAddBtn)).toBeTruthy();
  });
});
