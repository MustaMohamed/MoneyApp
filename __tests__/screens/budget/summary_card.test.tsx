import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import { Colors } from '@/constants/theme';
import type { BudgetCategoriesSummaryVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { SummaryCard } from '@/modules/budget/screens/budget/components/summary_card';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/modules/budget/screens/budget/components/budget_bar', () => ({
  BudgetBar: () => null,
}));
jest.mock('heroui-native', () => {
  const { Pressable, Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const Card = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Card.Body = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  return {
    Card,
    PressableFeedback: ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    Text,
  };
});

const summary: BudgetCategoriesSummaryVM = {
  hasPlan: true,
  planned: 6250,
  spent: 3700,
  left: 2550,
  usedPct: 0.592,
  unassignedIncome: undefined,
  unbudgetedSpend: 200,
  eyebrowLabel: '3 category budgets in July 2026',
  categoryCountLabel: '3 category budgets',
  balanceAmountLabel: '2,550',
  balanceMetaLabel: 'EGP left',
  balanceColor: Colors.dark.positive,
  barColor: Colors.dark.budgetSteady,
  spentPlannedLabel: '3,700 spent of 6,250',
  usedLabel: '59% used',
  plannedLabel: '6,250',
  unassignedIncomeLabel: 'Set income',
  unbudgetedSpendLabel: '200',
  lifecycleLabel: '12 days left',
  onTrackCount: 1,
  watchCount: 1,
  overCount: 1,
  statusItems: [
    {
      key: 'on-track',
      label: '1 on track',
      icon: 'check-circle-outline',
      color: Colors.dark.positive,
    },
    {
      key: 'watch',
      label: '1 watch',
      icon: 'alert-circle-outline',
      color: Colors.dark.budgetWatch,
    },
    {
      key: 'over',
      label: '1 over',
      icon: 'alert-octagon-outline',
      color: Colors.dark.negative,
    },
  ],
};

describe('SummaryCard', () => {
  it('renders the supplied compact summary and opens income setup', () => {
    const onSetIncome = jest.fn();
    const { getByLabelText, getByText } = render(
      <SummaryCard summary={summary} onSetIncome={onSetIncome} />,
    );

    expect(getByText(/2,550/)).toBeTruthy();
    expect(getByText('EGP left')).toBeTruthy();
    expect(getByText('3,700 spent of 6,250')).toBeTruthy();
    expect(getByText('59% used')).toBeTruthy();
    expect(getByText('1 on track')).toBeTruthy();
    expect(getByText('1 watch')).toBeTruthy();
    expect(getByText('1 over')).toBeTruthy();

    fireEvent.press(getByLabelText('Set income'));
    expect(onSetIncome).toHaveBeenCalledTimes(1);
  });

  it('keeps the income metric editable after income has been set', () => {
    const onSetIncome = jest.fn();
    const populatedSummary = {
      ...summary,
      unassignedIncome: 3750,
      unassignedIncomeLabel: '3,750',
    };
    const { getByLabelText } = render(
      <SummaryCard summary={populatedSummary} onSetIncome={onSetIncome} />,
    );

    fireEvent.press(getByLabelText('Set income'));
    expect(onSetIncome).toHaveBeenCalledTimes(1);
  });
});
