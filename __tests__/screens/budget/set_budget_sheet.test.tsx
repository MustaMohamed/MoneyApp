import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import type { ElementType, ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { BudgetMonthGroupMap } from '@/modules/budget/entities/budget.entity';
import { BudgetNameTakenError } from '@/modules/budget/repositories/budget.repository';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { SetBudgetSheet } from '@/modules/budget/screens/budget/components/set_budget_sheet';
import {
  BUDGET_TAB_SHEET_OWNER,
  useSetBudgetSheetState,
} from '@/modules/budget/screens/budget/components/set_budget_sheet.state';
import type { Category } from '@/modules/categories/entities/category.entity';
import { makeTestBudgetEditTarget, makeTestBudgetableCategory } from '@/test_helpers/budget';
import { deferred } from '@/test_helpers/deferred';

let mockSetBudget: jest.Mock<Promise<void>, [unknown]>;
const mockToast = { show: jest.fn() };
let mockOnCloseComplete: (() => void) | undefined;

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
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
  Sheet: ({
    isOpen,
    children,
    footer,
    isDismissable = true,
    onCloseComplete,
  }: {
    isOpen: boolean;
    children?: ReactNode;
    footer?: ReactNode;
    isDismissable?: boolean;
    onCloseComplete?: () => void;
  }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    // The Group picker's Sheet renders after the main one and passes no close callback.
    if (onCloseComplete) mockOnCloseComplete = onCloseComplete;
    return isOpen ? (
      <View testID="set-budget-sheet" accessibilityState={{ disabled: !isDismissable }}>
        {children}
        {footer === undefined ? null : <View testID="sheet-footer">{footer}</View>}
      </View>
    ) : null;
  },
}));
// The wrapper, not HeroUI: the suite's heroui-native mock exports no useToast.
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: mockToast, isToastVisible: false }),
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
const mockBudgetSnapshot = {
  loaded: true,
  loadedMonth: '2026-01',
  rows: [] as unknown[],
  spendByMonth: {} as Record<string, Record<string, number>>,
};
jest.mock('@/modules/budget/store/budget.store', () => {
  mockSetBudget = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
  const state = () => ({ ...mockBudgetSnapshot, setBudget: mockSetBudget, setLimit: jest.fn() });
  return {
    useBudgetStore: Object.assign(
      (selector: (snapshot: ReturnType<typeof state>) => unknown) => selector(state()),
      { getState: jest.fn(state) },
    ),
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
  // `requireActual` because a jest.mock factory cannot close over an out-of-scope import.
  const { Strings: ActualStrings } =
    jest.requireActual<typeof import('@/constants/strings')>('@/constants/strings');
  const passThrough = (Component: ElementType) => {
    const Wrapped = ({ children, ...props }: { children?: ReactNode }) => (
      <Component {...props}>{children}</Component>
    );
    return Wrapped;
  };
  const ListGroup = Object.assign(passThrough(View), {
    Item: passThrough(View),
    ItemPrefix: passThrough(View),
    ItemContent: passThrough(View),
    ItemTitle: passThrough(Text),
    ItemDescription: passThrough(Text),
    ItemSuffix: passThrough(View),
  });
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
  RadioGroup.Item = ({
    children,
    value,
    testID,
    accessibilityLabel,
  }: {
    children?: ReactNode;
    value: string;
    testID?: string;
    accessibilityLabel?: string;
  }) => (
    <Pressable
      accessibilityRole="radio"
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onRadioValueChange?.(value)}
    >
      {children}
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
    Radio: ({ testID }: { testID?: string }) => <View testID={testID} />,
    PressableFeedback: ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    RadioGroup,
    ListGroup,
    Separator: (props: Record<string, unknown>) => <View testID="separator" {...props} />,
    Typography: passThrough(Text),
    FieldError: passThrough(Text),
  };
});

const categories = [makeTestBudgetableCategory()];

const existingBudget = makeTestBudgetEditTarget();

const noShownGroups: BudgetMonthGroupMap = {};

beforeEach(() => {
  useBudgetState.getState().reset();
  // `reset()` re-seeds `selectedMonth` from the system clock; pin a month that can never be now.
  useBudgetState.getState().setSelectedMonth('2026-01');
  useSetBudgetSheetState.getState().reset();
  useSetBudgetSheetState.getState().openFor(BUDGET_TAB_SHEET_OWNER);
  mockSetBudget.mockClear();
  useBudgetState.getState().openAdd();
});

describe('SetBudgetSheet', () => {
  it('requires category selection when a contextual group has no matching category', async () => {
    useBudgetState.getState().openAddWithContext(undefined, BudgetGroup.Want);

    await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
      />,
    );

    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: undefined,
      groupValue: BudgetGroup.Want,
    });
  });

  it('preserves the contextual rule group when selecting a category', async () => {
    useBudgetState.getState().openAddWithContext(undefined, BudgetGroup.Want);
    const screen = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
      />,
    );

    await fireEvent.press(screen.getByTestId('category-row'));
    await fireEvent.press(screen.getByLabelText('select first budget category'));

    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: 'housing',
      groupValue: BudgetGroup.Want,
    });
  });

  it('adds a named budget for the selected month', async () => {
    useBudgetState.getState().setSelectedMonth('2026-08');
    const { getByLabelText, getByTestId } = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
      />,
    );

    await fireEvent.changeText(getByTestId('budget-name-input'), 'Alexandria Trip Food');
    await fireEvent.changeText(getByTestId('amount-hero-value'), '1500');
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

  it("shows a duplicate-name refusal inside the sheet's footer", async () => {
    mockSetBudget.mockRejectedValueOnce(new BudgetNameTakenError('Gym'));
    useBudgetState.getState().setSelectedMonth('2026-08');
    const { getByLabelText, getByTestId } = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
      />,
    );

    await fireEvent.changeText(getByTestId('budget-name-input'), 'Gym');
    await fireEvent.changeText(getByTestId('amount-hero-value'), '500');
    await fireEvent.press(getByLabelText(Strings.budgetSaveCta));

    await waitFor(() =>
      expect(
        within(getByTestId('sheet-footer')).getByText(
          Strings.budgetNameTaken(categories[0].name, 'Gym', 'August'),
        ),
      ).toBeTruthy(),
    );
    expect(getByTestId('set-budget-sheet')).toBeTruthy();
  });

  it("saves the category's shown 50/30/20 group for the month", async () => {
    const { getByLabelText, getByTestId } = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={{ housing: BudgetGroup.Need }}
        budgetableCategories={categories}
      />,
    );

    await fireEvent.changeText(getByTestId('budget-name-input'), 'Monthly housing');
    await fireEvent.changeText(getByTestId('amount-hero-value'), '700');
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
  });

  it('prefills and saves an existing budget in edit mode', async () => {
    useBudgetState.getState().reset();
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openEdit('budget-trip-food');

    const { getByLabelText, getByTestId } = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
        editingRow={existingBudget}
      />,
    );

    expect(getByTestId('budget-name-input')).toHaveProp('value', 'Alexandria Trip Food');
    expect(getByTestId('amount-hero-value')).toHaveProp('value', '1500');
    expect(within(getByTestId('group-row')).getByText(Strings.budget5030GroupNeed)).toBeTruthy();
    expect(useSetBudgetSheetState.getState().groupValue).toBe(BudgetGroup.Need);

    await fireEvent.changeText(getByTestId('budget-name-input'), 'Weekend Food');
    await fireEvent.changeText(getByTestId('amount-hero-value'), '1750');
    await fireEvent.press(getByTestId('group-row'));
    await fireEvent.press(getByTestId('budget-group-option-want'));
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

  it('opens the Group picker from the Group row, and a choice closes it and keeps the typed values', async () => {
    const { getByTestId, queryByTestId } = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
      />,
    );

    expect(
      within(getByTestId('group-row')).getByText(Strings.budget5030NotGroupedMetric),
    ).toBeTruthy();
    expect(queryByTestId('budget-group-picker')).toBeNull();

    await fireEvent.changeText(getByTestId('budget-name-input'), 'Alexandria Trip Food');
    await fireEvent.changeText(getByTestId('amount-hero-value'), '1500');
    await fireEvent.press(getByTestId('group-row'));

    expect(getByTestId('budget-group-picker')).toBeTruthy();

    await fireEvent.press(getByTestId('budget-group-option-need'));

    expect(queryByTestId('budget-group-picker')).toBeNull();
    expect(within(getByTestId('group-row')).getByText(Strings.budget5030GroupNeed)).toBeTruthy();
    expect(getByTestId('amount-hero-value')).toHaveProp('value', '1500');
    expect(getByTestId('budget-name-input')).toHaveProp('value', 'Alexandria Trip Food');
  });

  it('carries a typed comma on the limit to a decimal point, and leaves the name alone', async () => {
    const { getByTestId } = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
      />,
    );

    // Assert after every step; a final-only check passes even if the comma is refused outright.
    for (const [delivered, held] of [
      ['1', '1'],
      ['1,', '1.'],
      ['1.5', '1.5'],
      ['1.50', '1.50'],
    ] as const) {
      await fireEvent.changeText(getByTestId('amount-hero-value'), delivered);
      expect(getByTestId('amount-hero-value')).toHaveProp('value', held);
    }

    await fireEvent.changeText(getByTestId('budget-name-input'), 'Alexandria, Trip');
    expect(getByTestId('budget-name-input')).toHaveProp('value', 'Alexandria, Trip');
  });

  // A comma-bearing paste like '1,500' read as a decimal would be a silent 1000x.
  it.each([['1.5,'], ['1.5.'], ['1,500'], ['1,234.56']])(
    'refuses %p on the limit and keeps the accepted text',
    async (delivered) => {
      const { getByTestId } = await render(
        <SetBudgetSheet
          owner={BUDGET_TAB_SHEET_OWNER}
          shownGroupByCategoryId={noShownGroups}
          budgetableCategories={categories}
        />,
      );

      await fireEvent.changeText(getByTestId('amount-hero-value'), '1.5');
      await fireEvent.changeText(getByTestId('amount-hero-value'), delivered);

      expect(getByTestId('amount-hero-value')).toHaveProp('value', '1.5');
    },
  );

  // `budgets.limit_amount` has no CHECK, so a stored limit can reach `String()`'s exponent form.
  it('prefills an exponent-form limit as positional digits, and it backspaces', async () => {
    useBudgetState.getState().reset();
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openEdit('budget-trip-food');

    const { getByTestId } = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
        editingRow={{ ...existingBudget, limit: 1e-7 }}
      />,
    );

    const prefilled = '0.0000001';
    expect(getByTestId('amount-hero-value')).toHaveProp('value', prefilled);
    // The second assertion pins `prefilled` as positional digits, not the '1e-7' `String()` emits.
    expect(prefilled).not.toMatch(/e/i);

    await fireEvent.changeText(getByTestId('amount-hero-value'), prefilled.slice(0, -1));
    expect(getByTestId('amount-hero-value')).toHaveProp('value', '0.000000');
  });

  // Blank, never '5': the mask refuses '-5' and every edit of it, so a verbatim prefill freezes.
  it('prefills a stored negative limit as blank, and the field still types', async () => {
    useBudgetState.getState().reset();
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openEdit('budget-trip-food');

    const { getByTestId } = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
        editingRow={{ ...existingBudget, limit: -5 }}
      />,
    );

    expect(getByTestId('amount-hero-value')).toHaveProp('value', '');

    await fireEvent.changeText(getByTestId('amount-hero-value'), '5');
    expect(getByTestId('amount-hero-value')).toHaveProp('value', '5');
  });

  it('keeps an in-flight edit save locked when refreshed props arrive', async () => {
    const pendingSave = deferred();
    mockSetBudget.mockReturnValueOnce(pendingSave.promise);
    useBudgetState.getState().reset();
    useBudgetState.getState().openEdit(existingBudget.id);

    const screen = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
        editingRow={existingBudget}
      />,
    );

    await fireEvent.press(screen.getByLabelText(Strings.budgetSaveCta));
    await waitFor(() => expect(useSetBudgetSheetState.getState().saving).toBe(true));
    expect(screen.getByTestId('set-budget-sheet')).toHaveProp('accessibilityState', {
      disabled: true,
    });

    await screen.rerender(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={[...categories]}
        editingRow={{ ...existingBudget }}
      />,
    );

    expect(useSetBudgetSheetState.getState().saving).toBe(true);

    pendingSave.resolve();
    await waitFor(() => expect(useSetBudgetSheetState.getState().saving).toBe(false));
  });

  it("shows the added toast from the sheet's close callback after a saved add", async () => {
    mockToast.show.mockClear();
    const { getByLabelText, getByTestId } = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
      />,
    );

    await fireEvent.changeText(getByTestId('budget-name-input'), 'Alexandria Trip Food');
    await fireEvent.changeText(getByTestId('amount-hero-value'), '1500');
    await fireEvent.press(getByLabelText(Strings.budgetSaveCta));
    await waitFor(() => expect(mockSetBudget).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useSetBudgetSheetState.getState().saving).toBe(false));
    expect(mockToast.show).not.toHaveBeenCalled();

    await act(() => mockOnCloseComplete?.());

    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ label: Strings.budgetAddedToast }),
    );
  });

  it('draws the edit-mode Category row with no button role, and a press leaves the picker closed', async () => {
    useBudgetState.getState().reset();
    useBudgetState.getState().openEdit('budget-trip-food');
    const screen = await render(
      <SetBudgetSheet
        owner={BUDGET_TAB_SHEET_OWNER}
        shownGroupByCategoryId={noShownGroups}
        budgetableCategories={categories}
        editingRow={existingBudget}
      />,
    );

    const row = screen.getByTestId('category-row');
    expect(row.props.accessibilityRole).toBeUndefined();

    await fireEvent.press(row);

    expect(useSetBudgetSheetState.getState().pickerExpanded).toBe(false);
    expect(screen.queryByLabelText('select first budget category')).toBeNull();
  });
});
