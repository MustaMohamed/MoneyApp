import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import { BudgetGroup, CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { SetBudgetSheet } from '@/modules/budget/screens/budget/components/set_budget_sheet';
import { useSetBudgetSheetState } from '@/modules/budget/screens/budget/components/set_budget_sheet.state';
import type { Category } from '@/modules/categories/entities/category.entity';
import { isTypeableMoneyText } from '@/utils/money_text';
import { ms } from '@/utils/responsive';

let mockSetBudget: jest.Mock<Promise<void>, [unknown]>;
const mockLoadCategories = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return ({ name, size }: { name: string; size: number }) => (
    <View testID={`icon-${name}`} style={{ width: size, height: size }} />
  );
});
jest.mock('@gorhom/bottom-sheet', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    BottomSheetScrollView: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
  };
});
jest.mock('@/components/ui/sheet', () => ({
  SHEET_FOOTER_CLEARANCE: 120,
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
  Sheet: ({
    isOpen,
    children,
    footer,
    isDismissable = true,
  }: {
    isOpen: boolean;
    children?: ReactNode;
    footer?: ReactNode;
    isDismissable?: boolean;
  }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return isOpen ? (
      <View testID="set-budget-sheet" accessibilityState={{ disabled: !isDismissable }}>
        {children}
        {footer}
      </View>
    ) : null;
  },
}));
jest.mock('@/components/ui/button', () => ({
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <Pressable accessibilityLabel={label} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/modules/budget/store/budget.store', () => {
  mockSetBudget = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
  return {
    useBudgetStore: {
      getState: jest.fn(() => ({ setBudget: mockSetBudget, setLimit: jest.fn() })),
    },
  };
});
jest.mock('@/modules/categories/store/category.store', () => {
  return {
    useCategoryStore: {
      getState: jest.fn(() => ({ loadCategories: mockLoadCategories })),
    },
  };
});
jest.mock('@/modules/categories/components/category_picker_sheet', () => ({
  CategoryPickerSheet: ({
    isOpen,
    categories,
    onSelect,
  }: {
    isOpen: boolean;
    categories: Category[];
    onSelect: (category: Category) => void;
  }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return isOpen && categories[0] ? (
      <Pressable
        accessibilityLabel="select first budget category"
        onPress={() => onSelect(categories[0])}
      >
        <Text>select first budget category</Text>
      </Pressable>
    ) : null;
  },
}));
jest.mock('heroui-native', () => {
  const { Pressable, Text, TextInput, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  // Keyed on the accessibility label, not on `keyboardType`: both money fields
  // in this sheet now carry `decimal-pad`, so a keyboard-derived testID gives
  // both inputs the same one and every assertion below resolves to the wrong
  // element. Required through `requireActual` because a jest.mock factory
  // cannot close over an out-of-scope import.
  const { Strings: ActualStrings } =
    jest.requireActual<typeof import('@/constants/strings')>('@/constants/strings');
  let onRadioValueChange: ((value: string) => void) | undefined;
  const RadioGroup = ({
    children,
    onValueChange,
  }: {
    children?: ReactNode;
    onValueChange?: (value: string) => void;
  }) => {
    onRadioValueChange = onValueChange;
    return <View>{children}</View>;
  };
  RadioGroup.Item = ({ children, value }: { children?: ReactNode; value: string }) => (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={String(children)}
      onPress={() => onRadioValueChange?.(value)}
    >
      <Text>{children}</Text>
    </Pressable>
  );
  return {
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
    Input: (props: Record<string, unknown>) => (
      <TextInput
        testID={
          props.accessibilityLabel === ActualStrings.budgetMonthlyLimitLabel
            ? 'budget-limit-input'
            : 'budget-name-input'
        }
        {...props}
      />
    ),
    PressableFeedback: ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    RadioGroup,
  };
});

const NOW = '2026-07-01T00:00:00.000Z';

const categories: Category[] = [
  {
    id: 'housing',
    name: 'Housing',
    type: CategoryType.Expense,
    icon: 'home',
    color: '#6fa8dc',
    is_default: 0,
    sort_order: 0,
    budget_group: null,
    created_at: NOW,
    updated_at: NOW,
  },
];

function deferred() {
  let resolve: (() => void) | undefined;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve: () => resolve?.() };
}

const existingBudget = {
  id: 'budget-trip-food',
  categoryId: 'housing',
  categoryName: 'Housing',
  categoryGroup: BudgetGroup.Need,
  name: 'Alexandria Trip Food',
  planned: 1500,
  spent: 0,
  left: 1500,
  usedPct: 0,
  categorySharePct: 1,
  usedLabel: '0%',
  shareLabel: '100% of category',
  spentPlannedLabel: '0 / 1,500 spent',
  balanceAmountLabel: '1,500',
  balanceMetaLabel: 'EGP left',
  ringColor: '#4CAF82',
  accessibilityLabel: 'Alexandria Trip Food',
  menuAccessibilityLabel: 'Actions for Alexandria Trip Food',
  limit: 1500,
  icon: 'home',
  color: '#6fa8dc',
};

beforeEach(() => {
  useBudgetState.getState().reset();
  // reset() re-seeds selectedMonth from currentYearMonth(), i.e. the system clock, so
  // any yearMonth assertion is only true during the month it was written. Pin a month
  // that can never be "now" — that keeps assertions honest instead of self-fulfilling.
  useBudgetState.getState().setSelectedMonth('2026-01');
  useSetBudgetSheetState.getState().reset();
  mockSetBudget.mockClear();
  mockLoadCategories.mockClear();
  useBudgetState.getState().openAdd();
});

describe('SetBudgetSheet', () => {
  it('keeps the category selector compact inside the sheet', async () => {
    const { getByLabelText, getByTestId, getByText } = await render(
      <SetBudgetSheet budgetableCategories={categories} />,
    );

    expect(getByLabelText(Strings.budgetPickCategory)).toHaveProp(
      'className',
      expect.stringContaining('mb-3'),
    );
    expect(getByLabelText(Strings.budgetPickCategory)).toHaveProp(
      'className',
      expect.stringContaining('py-2'),
    );
    expect(getByTestId('icon-home')).toHaveStyle({ width: ms(13), height: ms(13) });
    expect(getByText('Housing')).toHaveStyle({ fontSize: Type.caption });
  });

  it('keeps the amount input compact inside the sheet', async () => {
    const { getByTestId } = await render(<SetBudgetSheet budgetableCategories={categories} />);

    expect(getByTestId('budget-limit-input')).toHaveStyle({
      fontSize: Type.bodyStrong,
      height: ms(28),
    });
    expect(getByTestId('budget-limit-input')).toHaveProp(
      'className',
      expect.stringContaining('min-h-0'),
    );
  });

  it('keeps the budget name input compact inside the sheet', async () => {
    const { getByTestId } = await render(<SetBudgetSheet budgetableCategories={categories} />);

    expect(getByTestId('budget-name-input')).toHaveStyle({
      fontSize: Type.body,
      height: ms(28),
    });
  });

  it('requires category selection when a contextual group has no matching category', async () => {
    useBudgetState.getState().openAddWithContext(undefined, BudgetGroup.Want);

    await render(<SetBudgetSheet budgetableCategories={categories} />);

    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: undefined,
      groupValue: BudgetGroup.Want,
    });
  });

  it('preserves the contextual rule group when selecting a category', async () => {
    useBudgetState.getState().openAddWithContext(undefined, BudgetGroup.Want);
    const screen = await render(<SetBudgetSheet budgetableCategories={categories} />);

    await fireEvent.press(screen.getByLabelText(Strings.budgetPickCategory));
    await fireEvent.press(screen.getByLabelText('select first budget category'));

    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: 'housing',
      groupValue: BudgetGroup.Want,
    });
  });

  it('adds a named budget for the selected month', async () => {
    useBudgetState.getState().setSelectedMonth('2026-08');
    const { getByLabelText, getByTestId } = await render(
      <SetBudgetSheet budgetableCategories={categories} />,
    );

    await fireEvent.changeText(getByTestId('budget-name-input'), 'Alexandria Trip Food');
    await fireEvent.changeText(getByTestId('budget-limit-input'), '1500');
    await fireEvent.press(getByLabelText(Strings.budgetSaveCta));

    await waitFor(() =>
      expect(mockSetBudget).toHaveBeenCalledWith({
        categoryId: 'housing',
        name: 'Alexandria Trip Food',
        limit: 1500,
        yearMonth: '2026-08',
      }),
    );
  });

  it('saves the selected 50/30/20 group atomically and refreshes categories', async () => {
    const groupedCategories = [{ ...categories[0], budget_group: BudgetGroup.Need }];
    const { getByLabelText, getByTestId } = await render(
      <SetBudgetSheet budgetableCategories={groupedCategories} />,
    );

    await fireEvent.changeText(getByTestId('budget-name-input'), 'Monthly housing');
    await fireEvent.changeText(getByTestId('budget-limit-input'), '700');
    await fireEvent.press(getByLabelText(Strings.budgetSaveCta));

    await waitFor(() =>
      expect(mockSetBudget).toHaveBeenCalledWith({
        categoryId: 'housing',
        name: 'Monthly housing',
        limit: 700,
        yearMonth: '2026-01',
        categoryGroup: BudgetGroup.Need,
      }),
    );
    expect(mockLoadCategories).toHaveBeenCalledTimes(1);
  });

  it('prefills and saves an existing budget in edit mode', async () => {
    useBudgetState.getState().reset();
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openEdit('budget-trip-food');

    const { getByLabelText, getByTestId, getByText } = await render(
      <SetBudgetSheet budgetableCategories={categories} editingRow={existingBudget} />,
    );

    expect(getByTestId('budget-name-input')).toHaveProp('value', 'Alexandria Trip Food');
    expect(getByTestId('budget-limit-input')).toHaveProp('value', '1500');
    expect(getByText(Strings.budget5030GroupPickerLabel)).toBeTruthy();
    expect(useSetBudgetSheetState.getState().groupValue).toBe(BudgetGroup.Need);

    await fireEvent.changeText(getByTestId('budget-name-input'), 'Weekend Food');
    await fireEvent.changeText(getByTestId('budget-limit-input'), '1750');
    await fireEvent.press(getByLabelText(Strings.budget5030GroupWant));
    await fireEvent.press(getByLabelText(Strings.budgetSaveCta));

    await waitFor(() =>
      expect(mockSetBudget).toHaveBeenCalledWith({
        id: 'budget-trip-food',
        categoryId: 'housing',
        name: 'Weekend Food',
        limit: 1750,
        yearMonth: '2026-08',
        categoryGroup: BudgetGroup.Want,
      }),
    );
  });

  // The three save tests above type '1500', '700' and '1750' -- all of which
  // the mask accepts, so the suite stays green with the mask at
  // set_budget_sheet.tsx:188 deleted. This is the case that goes red instead.
  // A rejected keystroke must also leave the field holding what it held: the
  // mask returns before `onChange`, so the last accepted text survives.
  it('refuses a comma keystroke on the limit and keeps the accepted text', async () => {
    const { getByTestId } = await render(<SetBudgetSheet budgetableCategories={categories} />);

    await fireEvent.changeText(getByTestId('budget-limit-input'), '15');
    await fireEvent.changeText(getByTestId('budget-limit-input'), '1,5');

    expect(getByTestId('budget-limit-input')).toHaveProp('value', '15');
    // The name field is character-identical to what the limit handler was, and
    // must stay unmasked -- a leaked mask refuses every letter of a name.
    await fireEvent.changeText(getByTestId('budget-name-input'), 'Alexandria, Trip');
    expect(getByTestId('budget-name-input')).toHaveProp('value', 'Alexandria, Trip');
  });

  // `budgets.limit_amount` is a bare `REAL NOT NULL` with no CHECK
  // (migrations/013:8), so nothing in the schema keeps a stored limit out of
  // `String()`'s exponent form. The prefill is a programmatic write that the
  // mask never sees, so `String(1e-7)` would open the sheet on '1e-7' -- text
  // the mask then refuses, leaving the field unable to accept even a
  // backspace. Red against `String(editingRow.limit)`.
  it('prefills an exponent-form limit as digits the mask accepts, and it backspaces', async () => {
    useBudgetState.getState().reset();
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openEdit('budget-trip-food');

    const { getByTestId } = await render(
      <SetBudgetSheet
        budgetableCategories={categories}
        editingRow={{ ...existingBudget, limit: 1e-7 }}
      />,
    );

    const prefilled = '0.0000001';
    expect(getByTestId('budget-limit-input')).toHaveProp('value', prefilled);
    // The two assertions are one claim: the field opens holding `prefilled`,
    // and `prefilled` is text the mask lets through. Splitting them is what
    // makes the second non-tautological -- it is the mask's verdict on the
    // string the first line pinned the field to.
    expect(isTypeableMoneyText(prefilled)).toBe(true);

    await fireEvent.changeText(getByTestId('budget-limit-input'), prefilled.slice(0, -1));
    expect(getByTestId('budget-limit-input')).toHaveProp('value', '0.000000');
  });

  it('keeps an in-flight edit save locked when refreshed props arrive', async () => {
    const pendingSave = deferred();
    mockSetBudget.mockReturnValueOnce(pendingSave.promise);
    useBudgetState.getState().reset();
    useBudgetState.getState().openEdit(existingBudget.id);

    const screen = await render(
      <SetBudgetSheet budgetableCategories={categories} editingRow={existingBudget} />,
    );

    await fireEvent.press(screen.getByLabelText(Strings.budgetSaveCta));
    await waitFor(() => expect(useSetBudgetSheetState.getState().saving).toBe(true));
    expect(screen.getByTestId('set-budget-sheet')).toHaveProp('accessibilityState', {
      disabled: true,
    });

    await screen.rerender(
      <SetBudgetSheet budgetableCategories={[...categories]} editingRow={{ ...existingBudget }} />,
    );

    expect(useSetBudgetSheetState.getState().saving).toBe(true);

    pendingSave.resolve();
    await waitFor(() => expect(useSetBudgetSheetState.getState().saving).toBe(false));
  });
});
