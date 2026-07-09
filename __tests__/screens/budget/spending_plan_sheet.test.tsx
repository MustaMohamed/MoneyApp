import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { SpendingPlanSheet } from '@/modules/budget/screens/budget/components/spending_plan_sheet';
import { useSpendingPlanSheetState } from '@/modules/budget/screens/budget/components/spending_plan_sheet.state';
import type { Category } from '@/modules/categories/entities/category.entity';

let mockSetSpendingPlan: jest.Mock<Promise<void>, [unknown]>;

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
  mockSetSpendingPlan = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
  return {
    useBudgetStore: {
      getState: jest.fn(() => ({ setSpendingPlan: mockSetSpendingPlan })),
    },
  };
});
jest.mock('@/modules/categories/components/category_picker_sheet', () => ({
  CategoryPickerSheet: () => null,
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
      expect(mockSetSpendingPlan).toHaveBeenCalledWith({
        name: 'Alexandria weekend',
        startDate: '2026-08-01',
        endDate: '2026-08-01',
        totalAmount: 8000,
        categories: [{ categoryId: 'cat_food', allocatedAmount: undefined }],
      }),
    );
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
});
