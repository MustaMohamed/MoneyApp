import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { SpendingPlanSheet } from '@/modules/budget/screens/budget/components/spending_plan_sheet';
import { useSpendingPlanSheetState } from '@/modules/budget/screens/budget/components/spending_plan_sheet.state';
import type { Category } from '@/modules/categories/entities/category.entity';

let mockSetSpendingPlan: jest.Mock<Promise<void>, [unknown, string?]>;

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
jest.mock('@react-native-community/datetimepicker', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ({
      testID,
      onChange,
    }: {
      testID: string;
      onChange: (_event: { type: string }, date?: Date) => void;
    }) => (
      <Pressable
        testID={testID}
        onPress={() =>
          onChange(
            { type: 'set' },
            new Date(testID.endsWith('-end') ? '2026-08-09T12:00:00' : '2026-08-05T12:00:00'),
          )
        }
      >
        <Text>{testID}</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/components/ui/sheet', () => ({
  SHEET_FOOTER_CLEARANCE: 120,
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
  Sheet: ({
    isOpen,
    children,
    footer,
    title,
  }: {
    isOpen: boolean;
    children?: ReactNode;
    footer?: ReactNode;
    title?: string;
  }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    return isOpen ? (
      <View>
        {title ? <Text>{title}</Text> : null}
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
  mockSetSpendingPlan = jest.fn<Promise<void>, [unknown, string?]>().mockResolvedValue(undefined);
  return {
    useBudgetStore: {
      getState: jest.fn(() => ({ setSpendingPlan: mockSetSpendingPlan })),
    },
  };
});
jest.mock('@/modules/categories/components/category_picker_sheet', () => ({
  CategoryPickerSheet: ({
    isOpen,
    categories,
    selectedIds,
    onSelect,
  }: {
    isOpen: boolean;
    categories: Category[];
    selectedIds?: string[];
    onSelect: (category: Category) => void;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    if (!isOpen) return null;
    return (
      <View testID="category-picker-sheet">
        <Text>{`selected:${selectedIds?.join(',') ?? ''}`}</Text>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            accessibilityLabel={`pick ${category.name}`}
            onPress={() => onSelect(category)}
          >
            <Text>{category.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));
jest.mock('heroui-native', () => {
  const { Pressable, Text, TextInput } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
    Input: (props: Record<string, unknown>) => <TextInput {...props} />,
    PressableFeedback: ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    Switch: ({
      accessibilityLabel,
      isSelected,
      onSelectedChange,
    }: {
      accessibilityLabel: string;
      isSelected: boolean;
      onSelectedChange: (selected: boolean) => void;
    }) => (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        onPress={() => onSelectedChange(!isSelected)}
      >
        <Text>{isSelected ? 'on' : 'off'}</Text>
      </Pressable>
    ),
  };
});

const NOW = '2026-07-01T00:00:00.000Z';

const categories: Category[] = [
  {
    id: 'cat_food',
    name: 'Food',
    type: CategoryType.Expense,
    icon: 'food',
    color: '#caa445',
    is_default: 0,
    sort_order: 0,
    budget_group: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'cat_groceries',
    name: 'Groceries',
    type: CategoryType.Expense,
    icon: 'cart',
    color: '#64c987',
    is_default: 0,
    sort_order: 1,
    budget_group: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'cat_housing',
    name: 'Housing',
    type: CategoryType.Expense,
    icon: 'home',
    color: '#6aa9ff',
    is_default: 0,
    sort_order: 2,
    budget_group: null,
    created_at: NOW,
    updated_at: NOW,
  },
];

beforeEach(() => {
  useBudgetState.getState().reset();
  useSpendingPlanSheetState.getState().reset();
  mockSetSpendingPlan.mockClear();
});

describe('SpendingPlanSheet', () => {
  it('does not render when closed', () => {
    const { queryByText } = render(<SpendingPlanSheet budgetableCategories={categories} />);

    expect(queryByText(Strings.budgetPlanSetTitle)).toBeNull();
  });

  it('submits a simple plan with selected categories', async () => {
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openAddPlan();
    const { getByLabelText, getByTestId } = render(
      <SpendingPlanSheet budgetableCategories={categories} />,
    );

    fireEvent.changeText(getByTestId('spending-plan-name-input'), 'Alexandria weekend');
    fireEvent.changeText(getByTestId('spending-plan-total-input'), '8000');
    fireEvent.press(getByLabelText(Strings.budgetPlanSave));

    await waitFor(() =>
      expect(mockSetSpendingPlan).toHaveBeenCalledWith(
        {
          name: 'Alexandria weekend',
          startDate: '2026-08-01',
          endDate: '2026-08-01',
          totalAmount: 8000,
          categories: [{ categoryId: 'cat_food', allocatedAmount: undefined }],
        },
        '2026-08',
      ),
    );
  });

  it('submits only once while a plan save is pending', async () => {
    let resolveSave: (() => void) | undefined;
    mockSetSpendingPlan.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    useBudgetState.getState().openAddPlan();
    const { getByLabelText, getByTestId } = render(
      <SpendingPlanSheet budgetableCategories={categories} />,
    );

    fireEvent.changeText(getByTestId('spending-plan-name-input'), 'Alexandria weekend');
    fireEvent.changeText(getByTestId('spending-plan-total-input'), '8000');
    fireEvent.press(getByLabelText(Strings.budgetPlanSave));
    fireEvent.press(getByLabelText(Strings.budgetPlanSave));

    await waitFor(() => expect(mockSetSpendingPlan).toHaveBeenCalledTimes(1));
    await act(async () => resolveSave?.());
  });

  it('saves selected custom start and end dates', async () => {
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openAddPlan();
    const { getByLabelText, getByTestId } = render(
      <SpendingPlanSheet budgetableCategories={categories} />,
    );

    fireEvent.press(getByLabelText(Strings.budgetPlanStartDate));
    fireEvent.press(getByTestId('spending-plan-date-picker-start'));
    fireEvent.press(getByLabelText(Strings.budgetPlanEndDate));
    fireEvent.press(getByTestId('spending-plan-date-picker-end'));
    fireEvent.changeText(getByTestId('spending-plan-name-input'), 'Alexandria weekend');
    fireEvent.changeText(getByTestId('spending-plan-total-input'), '8000');
    fireEvent.press(getByLabelText(Strings.budgetPlanSave));

    await waitFor(() =>
      expect(mockSetSpendingPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2026-08-05',
          endDate: '2026-08-09',
        }),
        '2026-08',
      ),
    );
  });

  it('passes all selected plan categories to the picker and reflects toggles in the selector', () => {
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openAddPlan();
    const { getAllByText, getByLabelText, getByText } = render(
      <SpendingPlanSheet budgetableCategories={categories} />,
    );

    fireEvent.press(getByLabelText(Strings.budgetPlanPickCategories));
    expect(getByText('selected:cat_food')).toBeTruthy();

    fireEvent.press(getByLabelText('pick Groceries'));

    expect(getByText('selected:cat_food,cat_groceries')).toBeTruthy();
    expect(getAllByText('Groceries').length).toBeGreaterThan(1);
  });

  it('moves to the plan start month when saved dates are outside the visible month', async () => {
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openAddPlan();
    const { getByLabelText, getByTestId } = render(
      <SpendingPlanSheet budgetableCategories={categories} />,
    );

    act(() => {
      useSpendingPlanSheetState.getState().setStartDate('2026-07-10');
      useSpendingPlanSheetState.getState().setEndDate('2026-07-13');
    });
    fireEvent.changeText(getByTestId('spending-plan-name-input'), 'First plan');
    fireEvent.changeText(getByTestId('spending-plan-total-input'), '5000');
    fireEvent.press(getByLabelText(Strings.budgetPlanSave));

    await waitFor(() =>
      expect(mockSetSpendingPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'First plan',
          startDate: '2026-07-10',
          endDate: '2026-07-13',
        }),
        '2026-07',
      ),
    );
    expect(useBudgetState.getState().selectedMonth).toBe('2026-07');
  });

  it('blocks save when allocations exceed total', async () => {
    useBudgetState.getState().openAddPlan();
    const { getByLabelText, getByTestId, getByText } = render(
      <SpendingPlanSheet budgetableCategories={categories} />,
    );

    fireEvent.changeText(getByTestId('spending-plan-name-input'), 'Alexandria weekend');
    fireEvent.changeText(getByTestId('spending-plan-total-input'), '5000');
    fireEvent.press(getByLabelText(Strings.budgetPlanAllocateByCategory));
    fireEvent.changeText(getByTestId('spending-plan-allocation-cat_food'), '6000');
    fireEvent.press(getByLabelText(Strings.budgetPlanSave));

    await waitFor(() => expect(getByText(Strings.budgetPlanAllocationOver)).toBeTruthy());
    expect(mockSetSpendingPlan).not.toHaveBeenCalled();
  });

  it('shows an error when saving without categories', async () => {
    useBudgetState.getState().openAddPlan();
    const { getByLabelText, getByTestId, findByText } = render(
      <SpendingPlanSheet budgetableCategories={categories} />,
    );

    act(() => useSpendingPlanSheetState.getState().toggleCategoryId('cat_food'));
    fireEvent.changeText(getByTestId('spending-plan-name-input'), 'Alexandria weekend');
    fireEvent.changeText(getByTestId('spending-plan-total-input'), '5000');
    fireEvent.press(getByLabelText(Strings.budgetPlanSave));

    expect(await findByText(Strings.budgetPlanCategoryRequired)).toBeTruthy();
    expect(mockSetSpendingPlan).not.toHaveBeenCalled();
  });

  it('shows an error when the end date is before the start date', async () => {
    useBudgetState.getState().openAddPlan();
    const { getByLabelText, getByTestId, findByText } = render(
      <SpendingPlanSheet budgetableCategories={categories} />,
    );

    act(() => {
      useSpendingPlanSheetState.getState().setStartDate('2026-08-09');
      useSpendingPlanSheetState.getState().setEndDate('2026-08-05');
    });
    fireEvent.changeText(getByTestId('spending-plan-name-input'), 'Alexandria weekend');
    fireEvent.changeText(getByTestId('spending-plan-total-input'), '5000');
    fireEvent.press(getByLabelText(Strings.budgetPlanSave));

    expect(await findByText(Strings.budgetPlanDateInvalid)).toBeTruthy();
    expect(mockSetSpendingPlan).not.toHaveBeenCalled();
  });

  it('keeps the sheet open and shows repository save errors', async () => {
    mockSetSpendingPlan.mockRejectedValueOnce(new Error('Food overlaps Alexandria weekend'));
    useBudgetState.getState().openAddPlan();
    const { getByLabelText, getByTestId, findByText } = render(
      <SpendingPlanSheet budgetableCategories={categories} />,
    );

    fireEvent.changeText(getByTestId('spending-plan-name-input'), 'Alexandria weekend');
    fireEvent.changeText(getByTestId('spending-plan-total-input'), '5000');
    fireEvent.press(getByLabelText(Strings.budgetPlanSave));

    expect(await findByText('Food overlaps Alexandria weekend')).toBeTruthy();
    expect(await findByText(Strings.budgetPlanSetTitle)).toBeTruthy();
  });
});
