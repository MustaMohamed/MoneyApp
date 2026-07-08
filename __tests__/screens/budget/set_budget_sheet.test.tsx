import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StyleSheet, type PressableProps } from 'react-native';

import { CategoryType } from '@/constants/enums';
import { Type } from '@/constants/theme';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { SetBudgetSheet } from '@/modules/budget/screens/budget/components/set_budget_sheet';
import { useSetBudgetSheetState } from '@/modules/budget/screens/budget/components/set_budget_sheet.state';
import type { Category } from '@/modules/categories/entities/category.entity';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
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
  Button: ({ label }: { label: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{label}</Text>;
  },
}));
jest.mock('@/modules/budget/store/budget.store', () => ({
  useBudgetStore: { getState: jest.fn(() => ({ setLimit: jest.fn() })) },
}));
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
    Input: (props: Record<string, unknown>) => <TextInput testID="budget-limit-input" {...props} />,
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
  useBudgetState.getState().openAdd();
});

describe('SetBudgetSheet', () => {
  it('keeps the amount input compact inside the sheet', () => {
    const { getByTestId } = render(<SetBudgetSheet budgetableCategories={categories} />);

    const inputStyle = StyleSheet.flatten(getByTestId('budget-limit-input').props.style);

    expect(inputStyle.fontSize).toBeLessThanOrEqual(Type.title);
  });
});
