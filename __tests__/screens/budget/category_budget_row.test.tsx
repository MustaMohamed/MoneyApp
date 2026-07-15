import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import { Colors } from '@/constants/theme';
import type { CategoryBudgetRowVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { CategoryBudgetRow } from '@/modules/budget/screens/budget/components/category_budget_row';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/modules/budget/screens/budget/components/budget_ring', () => ({
  BudgetRing: ({ children }: { children?: ReactNode }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View>{children}</View>;
  },
}));
jest.mock('heroui-native', () => {
  const { Pressable, Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const Accordion = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Accordion.Item = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Accordion.Trigger = ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
    <Pressable {...props}>{children}</Pressable>
  );
  Accordion.Content = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Accordion.Indicator = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  const Chip = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Chip.Label = ({ children }: { children?: ReactNode }) => <Text>{children}</Text>;
  const Menu = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Menu.Trigger = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Menu.Portal = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Menu.Overlay = () => null;
  Menu.Content = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Menu.Item = ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
    <Pressable {...props}>{children}</Pressable>
  );
  Menu.ItemTitle = ({ children }: { children?: ReactNode }) => <Text>{children}</Text>;
  return {
    Accordion,
    Chip,
    Menu,
    PressableFeedback: ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    Text,
  };
});

const row: CategoryBudgetRowVM = {
  categoryId: 'food',
  name: 'Food & Dining',
  icon: 'food-fork-drink',
  color: '#E0B341',
  planned: 2500,
  spent: 1900,
  left: 600,
  usedPct: 0.76,
  status: 'on-track',
  statusLabel: 'On track',
  statusChipColor: 'default',
  spentPlannedUsedLabel: '1,900 / 2,500 spent · 76% used',
  balanceAmountLabel: '600',
  balanceMetaLabel: 'EGP left',
  ringColor: Colors.dark.positive,
  unassignedSpend: 200,
  unassignedSpendLabel: '200 EGP unassigned',
  budgets: [
    {
      id: 'meals',
      name: 'Monthly meals',
      planned: 2000,
      spent: 1400,
      left: 600,
      usedPct: 0.7,
      categorySharePct: 0.8,
      usedLabel: '70%',
      shareLabel: '80% of category',
      spentPlannedLabel: '1,400 / 2,000 spent',
      balanceAmountLabel: '600',
      balanceMetaLabel: 'EGP left',
      ringColor: Colors.dark.positive,
      accessibilityLabel: 'Monthly meals',
      menuAccessibilityLabel: 'Actions for Monthly meals',
    },
  ],
  accessibilityLabel: 'Food & Dining category budget',
};

describe('CategoryBudgetRow', () => {
  it('renders aligned named-budget data and routes row actions', () => {
    const onViewDetails = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const { getByLabelText, getByText } = render(
      <CategoryBudgetRow
        row={row}
        isExpanded
        onExpandedChange={jest.fn()}
        onViewDetails={onViewDetails}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(getByText('Monthly meals')).toBeTruthy();
    expect(getByText('80% of category')).toBeTruthy();
    expect(getByText('1,400 / 2,000 spent')).toBeTruthy();
    expect(getByText('Unassigned spending')).toBeTruthy();

    fireEvent.press(getByText('Edit'));
    fireEvent.press(getByText('Delete'));
    fireEvent.press(getByLabelText('View Food & Dining details'));

    expect(onEdit).toHaveBeenCalledWith('meals');
    expect(onDelete).toHaveBeenCalledWith({ id: 'meals', name: 'Monthly meals' });
    expect(onViewDetails).toHaveBeenCalledWith('food');
  });
});
