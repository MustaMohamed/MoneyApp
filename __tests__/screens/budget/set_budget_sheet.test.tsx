import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Spacing, Type } from '@/constants/theme';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { SetBudgetSheet } from '@/modules/budget/screens/budget/components/set_budget_sheet';
import { useSetBudgetSheetState } from '@/modules/budget/screens/budget/components/set_budget_sheet.state';
import type { Category } from '@/modules/categories/entities/category.entity';
import { ms } from '@/utils/responsive';

let mockSetBudget: jest.Mock<Promise<void>, [unknown]>;

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
  }: {
    isOpen: boolean;
    children?: ReactNode;
    footer?: ReactNode;
  }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return isOpen ? (
      <View>
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
jest.mock('@/database/client', () => ({ getDb: jest.fn().mockResolvedValue({}) }));
jest.mock('@/modules/categories/database/categories', () => ({
  setCategoryGroup: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/modules/categories/components/category_picker_sheet', () => ({
  CategoryPickerSheet: () => null,
}));
jest.mock('heroui-native', () => {
  const { Pressable, Text, TextInput, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const RadioGroup = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  RadioGroup.Item = ({ children }: { children?: ReactNode }) => <Text>{children}</Text>;
  return {
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
    Input: (props: Record<string, unknown>) => (
      <TextInput
        testID={props.keyboardType === 'number-pad' ? 'budget-limit-input' : 'budget-name-input'}
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

beforeEach(() => {
  useBudgetState.getState().reset();
  useSetBudgetSheetState.getState().reset();
  mockSetBudget.mockClear();
  useBudgetState.getState().openAdd();
});

describe('SetBudgetSheet', () => {
  it('keeps the category selector compact inside the sheet', () => {
    const { getByLabelText, getByTestId, getByText } = render(
      <SetBudgetSheet budgetableCategories={categories} />,
    );

    expect(getByLabelText(Strings.budgetPickCategory)).toHaveStyle({
      paddingVertical: Spacing.xs,
      marginBottom: Spacing.sm,
    });
    expect(getByTestId('icon-home')).toHaveStyle({ width: ms(13), height: ms(13) });
    expect(getByText('Housing')).toHaveStyle({ fontSize: Type.caption });
  });

  it('keeps the amount input compact inside the sheet', () => {
    const { getByTestId } = render(<SetBudgetSheet budgetableCategories={categories} />);

    expect(getByTestId('budget-limit-input')).toHaveStyle({
      fontSize: Type.bodyStrong,
      height: ms(28),
    });
    expect(getByTestId('budget-limit-input')).toHaveProp(
      'className',
      expect.stringContaining('min-h-0'),
    );
  });

  it('keeps the budget name input compact inside the sheet', () => {
    const { getByTestId } = render(<SetBudgetSheet budgetableCategories={categories} />);

    expect(getByTestId('budget-name-input')).toHaveStyle({
      fontSize: Type.body,
      height: ms(28),
    });
  });

  it('adds a named budget for the selected month', async () => {
    useBudgetState.getState().setSelectedMonth('2026-08');
    const { getByLabelText, getByTestId } = render(
      <SetBudgetSheet budgetableCategories={categories} />,
    );

    fireEvent.changeText(getByTestId('budget-name-input'), 'Alexandria Trip Food');
    fireEvent.changeText(getByTestId('budget-limit-input'), '1500');
    fireEvent.press(getByLabelText(Strings.budgetSaveCta));

    await waitFor(() =>
      expect(mockSetBudget).toHaveBeenCalledWith({
        categoryId: 'housing',
        name: 'Alexandria Trip Food',
        limit: 1500,
        yearMonth: '2026-08',
      }),
    );
  });

  it('prefills and saves an existing budget in edit mode', async () => {
    useBudgetState.getState().reset();
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openEdit('budget-trip-food');

    const { getByLabelText, getByTestId, queryByText } = render(
      <SetBudgetSheet
        budgetableCategories={categories}
        editingRow={{
          id: 'budget-trip-food',
          categoryId: 'housing',
          categoryName: 'Housing',
          name: 'Alexandria Trip Food',
          amount: 1500,
          limit: 1500,
          icon: 'home',
          color: '#6fa8dc',
        }}
      />,
    );

    expect(getByTestId('budget-name-input')).toHaveProp('value', 'Alexandria Trip Food');
    expect(getByTestId('budget-limit-input')).toHaveProp('value', '1500');
    expect(queryByText(Strings.budget5030GroupPickerLabel)).toBeNull();

    fireEvent.changeText(getByTestId('budget-name-input'), 'Weekend Food');
    fireEvent.changeText(getByTestId('budget-limit-input'), '1750');
    fireEvent.press(getByLabelText(Strings.budgetSaveCta));

    await waitFor(() =>
      expect(mockSetBudget).toHaveBeenCalledWith({
        id: 'budget-trip-food',
        categoryId: 'housing',
        name: 'Weekend Food',
        limit: 1750,
        yearMonth: '2026-08',
      }),
    );
  });
});
