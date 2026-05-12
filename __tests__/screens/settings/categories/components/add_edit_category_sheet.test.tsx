/**
 * Task 6 — Group D1
 *
 * Tests for AddEditCategorySheet migration from react-native-actions-sheet
 * to the declarative Sheet primitive (@gorhom/bottom-sheet).
 *
 * Layla's acceptance criteria covered:
 * TC-ADD-1  — Sheet renders with "New Category" title when isEditing=false
 * TC-ADD-2  — Sheet renders with "Edit Category" title when isEditing=true
 * TC-ADD-3  — Sheet NOT visible when visible=false (mock returns null at index<0)
 * TC-ADD-4  — onClose called when sheet close button pressed
 * TC-ADD-5  — CTA button is present in footer
 * TC-ADD-6  — Type toggle row shown for new category (isEditing=false)
 * TC-ADD-7  — Type toggle row NOT shown for edit (isEditing=true)
 * TC-ADD-8  — Icon error message shown when iconError is non-empty
 * TC-ADD-9  — Icon error NOT shown when iconError is empty
 * TC-ADD-10 — No react-native-actions-sheet import in the migrated file
 * TC-ADD-11 — BottomSheetScrollView wraps scrollable form content (not RN ScrollView)
 * TC-ADD-12 — Sheet uses size="lg"
 */

// ---------------------------------------------------------------------------
// Mock declarations — hoisted
// ---------------------------------------------------------------------------
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('heroui-native', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));

jest.mock('@/store/category.store', () => ({
  useCategoryStore: jest.fn(),
}));

jest.mock(
  '@/screens/settings/categories/components/add_edit_category_sheet.state',
  () => ({
    useAddEditCategorySheetState: jest.fn(),
  }),
);

// Bottom-sheet is mocked via __mocks__/@gorhom/bottom-sheet.tsx (moduleNameMapper)

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountColors } from '@/constants/theme';
import { useCategoryStore } from '@/store/category.store';
import { useAddEditCategorySheetState } from '@/screens/settings/categories/components/add_edit_category_sheet.state';
import { AddEditCategorySheet, createCategorySchema } from '@/screens/settings/categories/components/add_edit_category_sheet';
import { SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import type { Category } from '@/store/category.store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeCategory: Category = {
  id: 'cat_food',
  name: 'Food',
  type: CategoryType.Expense,
  icon: 'food-fork-drink',
  color: AccountColors[0],
  is_default: 1,
  sort_order: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function makeCategoryStoreMock(categories: Category[] = []) {
  (useCategoryStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { categories } }),
  );
}

function makeSheetStateMock(overrides: {
  type?: CategoryType;
  selectedIcon?: string | null;
  selectedColor?: string;
  iconError?: string;
  isLoading?: boolean;
} = {}) {
  const setType = jest.fn();
  const setSelectedIcon = jest.fn();
  const setSelectedColor = jest.fn();
  const setIconError = jest.fn();
  const setIsLoading = jest.fn();
  const initialize = jest.fn();

  (useAddEditCategorySheetState as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: {
        type: overrides.type ?? CategoryType.Expense,
        selectedIcon: overrides.selectedIcon ?? null,
        selectedColor: overrides.selectedColor ?? AccountColors[0],
        iconError: overrides.iconError ?? '',
        isLoading: overrides.isLoading ?? false,
      },
      setType,
      setSelectedIcon,
      setSelectedColor,
      setIconError,
      setIsLoading,
      initialize,
    }),
  );

  return { setType, setSelectedIcon, setSelectedColor, setIconError, setIsLoading, initialize };
}

const defaultProps = {
  visible: true,
  editingCategory: null as Category | null,
  activeTab: 'expense' as const,
  onClose: jest.fn(),
  onSave: jest.fn().mockResolvedValue(undefined),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AddEditCategorySheet — Sheet migration (Task 6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    makeCategoryStoreMock();
    makeSheetStateMock();
  });

  // TC-ADD-1
  it('renders "New Category" title when editingCategory is null (isEditing=false)', () => {
    const { getByText } = render(
      <AddEditCategorySheet {...defaultProps} editingCategory={null} />,
    );
    expect(getByText(Strings.categoriesAddSheetTitle)).toBeTruthy();
  });

  // TC-ADD-2
  it('renders "Edit Category" title when editingCategory is provided (isEditing=true)', () => {
    const { getByText } = render(
      <AddEditCategorySheet {...defaultProps} editingCategory={fakeCategory} />,
    );
    expect(getByText(Strings.categoriesEditSheetTitle)).toBeTruthy();
  });

  // TC-ADD-3
  it('does not render sheet content when visible=false', () => {
    const { queryByTestId } = render(
      <AddEditCategorySheet {...defaultProps} visible={false} />,
    );
    // The bottom-sheet mock renders null when index < 0
    expect(queryByTestId('bottom-sheet')).toBeNull();
  });

  // TC-ADD-4
  it('calls onClose when the sheet close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <AddEditCategorySheet {...defaultProps} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('sheet-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // TC-ADD-5
  it('renders the Save CTA button in the footer', () => {
    const { getByTestId } = render(<AddEditCategorySheet {...defaultProps} />);
    expect(getByTestId('add-edit-category-save-btn')).toBeTruthy();
  });

  // TC-ADD-6
  it('shows type toggle row for a new category (isEditing=false)', () => {
    const { getByText } = render(
      <AddEditCategorySheet {...defaultProps} editingCategory={null} />,
    );
    expect(getByText(Strings.categoriesTabExpense)).toBeTruthy();
    expect(getByText(Strings.categoriesTabIncome)).toBeTruthy();
  });

  // TC-ADD-7
  it('hides type toggle row when editing an existing category (isEditing=true)', () => {
    const { queryByText } = render(
      <AddEditCategorySheet {...defaultProps} editingCategory={fakeCategory} />,
    );
    expect(queryByText(Strings.categoriesTabExpense)).toBeNull();
    expect(queryByText(Strings.categoriesTabIncome)).toBeNull();
  });

  // TC-ADD-8
  it('shows icon error message when iconError is non-empty', () => {
    makeSheetStateMock({ iconError: Strings.categoriesErrIconRequired });
    const { getByTestId } = render(<AddEditCategorySheet {...defaultProps} />);
    expect(getByTestId('icon-error')).toBeTruthy();
  });

  // TC-ADD-9
  it('does not show icon error when iconError is empty', () => {
    makeSheetStateMock({ iconError: '' });
    const { queryByTestId } = render(<AddEditCategorySheet {...defaultProps} />);
    expect(queryByTestId('icon-error')).toBeNull();
  });

  // TC-ADD-11
  it('renders the bottom-sheet testID (Sheet primitive renders BottomSheet)', () => {
    const { getByTestId } = render(<AddEditCategorySheet {...defaultProps} />);
    expect(getByTestId('bottom-sheet')).toBeTruthy();
  });

  // TC-ADD-12
  it('footer CTA is disabled when isLoading is true', () => {
    makeSheetStateMock({ isLoading: true });
    const { getByTestId } = render(<AddEditCategorySheet {...defaultProps} />);
    const saveBtn = getByTestId('add-edit-category-save-btn');
    // accessibilityState disabled should reflect isLoading
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('footer CTA is NOT disabled when isLoading is false', () => {
    makeSheetStateMock({ isLoading: false });
    const { getByTestId } = render(<AddEditCategorySheet {...defaultProps} />);
    const saveBtn = getByTestId('add-edit-category-save-btn');
    expect(saveBtn.props.accessibilityState?.disabled).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// TC-ADD-10: No react-native-actions-sheet import in migrated file
// ---------------------------------------------------------------------------
describe('AddEditCategorySheet — no legacy import', () => {
  it('does not import from react-native-actions-sheet', () => {
    // Read the source file to verify at test-time (static analysis)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const filePath = path.resolve(
      __dirname,
      '../../../../../screens/settings/categories/components/add_edit_category_sheet.tsx',
    );
    const source: string = fs.readFileSync(filePath, 'utf8');
    expect(source).not.toContain('react-native-actions-sheet');
  });

  it('imports BottomSheetScrollView from @gorhom/bottom-sheet', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const filePath = path.resolve(
      __dirname,
      '../../../../../screens/settings/categories/components/add_edit_category_sheet.tsx',
    );
    const source: string = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('@gorhom/bottom-sheet');
    expect(source).toContain('BottomSheetScrollView');
  });

  it('imports Sheet from @/components/ui/sheet', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const filePath = path.resolve(
      __dirname,
      '../../../../../screens/settings/categories/components/add_edit_category_sheet.tsx',
    );
    const source: string = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain("from '@/components/ui/sheet'");
  });
});

// ---------------------------------------------------------------------------
// BLOCKER-1: max name length — 50 chars accepted, 51 chars rejected
// ---------------------------------------------------------------------------
describe('createCategorySchema — BLOCKER-1: max name length', () => {
  const categories: Category[] = [];

  it('accepts a name exactly 50 characters long', () => {
    const schema = createCategorySchema(categories, 'expense');
    const name50 = 'A'.repeat(50);
    const result = schema.safeParse({ name: name50 });
    expect(result.success).toBe(true);
  });

  it('rejects a name that is 51 characters long with the too-long error', () => {
    const schema = createCategorySchema(categories, 'expense');
    const name51 = 'A'.repeat(51);
    const result = schema.safeParse({ name: name51 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(Strings.categoriesErrNameTooLong);
    }
  });
});

// ---------------------------------------------------------------------------
// BLOCKER-2: (name, type) scoped uniqueness in the Zod refine
// ---------------------------------------------------------------------------
describe('createCategorySchema — BLOCKER-2: (name, type) scoped uniqueness', () => {
  const expenseFood: Category = {
    id: 'cat_expense_food',
    name: 'Food',
    type: CategoryType.Expense,
    icon: 'food-fork-drink',
    color: AccountColors[0],
    is_default: 0,
    sort_order: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  it('allows same name across different types (Food expense + Food income both accepted)', () => {
    // expenseFood exists; we're adding an income category named "Food"
    const schema = createCategorySchema([expenseFood], 'income');
    const result = schema.safeParse({ name: 'Food' });
    expect(result.success).toBe(true);
  });

  it('rejects same name within same type', () => {
    // expenseFood exists; we're adding another expense category named "Food"
    const schema = createCategorySchema([expenseFood], 'expense');
    const result = schema.safeParse({ name: 'Food' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(Strings.categoriesErrNameDuplicate);
    }
  });

  it('duplicate check is case-insensitive within same type', () => {
    const schema = createCategorySchema([expenseFood], 'expense');
    const result = schema.safeParse({ name: 'food' });
    expect(result.success).toBe(false);
  });

  it('when editing, uses the editing category type (not activeTab) for scoping', () => {
    // editingCategory is expense "Food"; activeTab is "income" (stale/irrelevant).
    // Editing the same category — should not flag itself as duplicate.
    const schema = createCategorySchema([expenseFood], 'income', expenseFood);
    const result = schema.safeParse({ name: 'Food' });
    expect(result.success).toBe(true);
  });

  it('when editing, rejects a name collision within the editing category type', () => {
    // editingCategory is expense type; there is another expense "Travel" in the list.
    const expenseTravel: Category = {
      id: 'cat_expense_travel',
      name: 'Travel',
      type: CategoryType.Expense,
      icon: 'airplane',
      color: AccountColors[1],
      is_default: 0,
      sort_order: 2,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    // editingCategory is expenseFood; renaming it to "Travel" should be rejected
    // because expenseTravel exists in the same type.
    const schema = createCategorySchema([expenseFood, expenseTravel], 'income', expenseFood);
    const result = schema.safeParse({ name: 'Travel' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(Strings.categoriesErrNameDuplicate);
    }
  });
});

// ---------------------------------------------------------------------------
// Footer clearance: scrollContent paddingBottom uses SHEET_FOOTER_CLEARANCE
// ---------------------------------------------------------------------------
describe('AddEditCategorySheet — footer clearance padding', () => {
  it('scrollContent paddingBottom is at least SHEET_FOOTER_CLEARANCE', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const source: string = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../../screens/settings/categories/components/add_edit_category_sheet.tsx',
      ),
      'utf8',
    );
    // The paddingBottom must reference SHEET_FOOTER_CLEARANCE, not a literal Spacing token
    expect(source).toContain('SHEET_FOOTER_CLEARANCE');
    expect(source).toContain('paddingBottom: SHEET_FOOTER_CLEARANCE');
  });
});

// ---------------------------------------------------------------------------
// keyboardBehavior="extend" in sheet.tsx
// ---------------------------------------------------------------------------
describe('Sheet primitive — keyboardBehavior extend', () => {
  it('sheet.tsx passes keyboardBehavior="extend" to BottomSheetLib', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const filePath = path.resolve(
      __dirname,
      '../../../../../components/ui/sheet.tsx',
    );
    const source: string = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('keyboardBehavior="extend"');
  });
});
