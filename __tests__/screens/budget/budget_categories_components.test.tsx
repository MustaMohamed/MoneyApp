import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps, ViewProps } from 'react-native';

import { Strings } from '@/constants/strings';
import type {
  BudgetCategoriesSummaryVM,
  CategoryBudgetRowVM,
} from '@/modules/budget/screens/budget/budget_categories.types';
import { CategoryBudgetRow } from '@/modules/budget/screens/budget/components/category_budget_row';
import { SummaryCard } from '@/modules/budget/screens/budget/components/summary_card';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return ({ name }: { name: string }) => <View testID={`icon-${name}`} />;
});

jest.mock('@/modules/budget/screens/budget/components/budget_ring', () => ({
  BudgetRing: ({ children }: { children?: ReactNode }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View testID="budget-ring">{children}</View>;
  },
}));

jest.mock('heroui-native', () => {
  const { Pressable, Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const Wrapper = ({ children, ...props }: ViewProps & { children?: ReactNode }) => (
    <View {...props}>{children}</View>
  );
  const Card = Object.assign(Wrapper, { Body: Wrapper });
  const Chip = Object.assign(Wrapper, { Label: Text });
  const AccordionRoot = ({ children, ...props }: ViewProps & { children?: ReactNode }) => (
    <View testID="category-accordion" {...props}>
      {children}
    </View>
  );
  const Accordion = Object.assign(AccordionRoot, {
    Item: Wrapper,
    Trigger: Wrapper,
    Content: Wrapper,
    Indicator: Wrapper,
  });
  const MenuItem = ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
    <Pressable {...props}>{children}</Pressable>
  );
  const Menu = Object.assign(Wrapper, {
    Trigger: Wrapper,
    Portal: Wrapper,
    Overlay: () => null,
    Content: Wrapper,
    Item: MenuItem,
    ItemTitle: Text,
  });
  return {
    Accordion,
    Card,
    Chip,
    Menu,
    PressableFeedback: ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    Text,
    cn: (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' '),
  };
});

function summary(hasPlan: boolean): BudgetCategoriesSummaryVM {
  return {
    hasPlan,
    emptyLabel: hasPlan ? undefined : 'No budget yet',
    planned: hasPlan ? 1000 : 0,
    spent: hasPlan ? 250 : 0,
    left: hasPlan ? 750 : 0,
    usedPct: hasPlan ? 0.25 : undefined,
    unassignedIncome: undefined,
    unbudgetedSpend: 0,
    eyebrowLabel: '1 category budget in July',
    categoryCountLabel: '1 category',
    balanceAmountLabel: '750',
    balanceMetaLabel: 'EGP left',
    balanceColor: '#fff',
    barColor: '#fff',
    spentPlannedLabel: '250 spent of 1,000',
    usedLabel: hasPlan ? '25% used' : undefined,
    plannedLabel: '1,000',
    unassignedIncomeLabel: 'Set income',
    unbudgetedSpendLabel: '0',
    lifecycleLabel: '16 days left',
    onTrackCount: 1,
    watchCount: 0,
    overCount: 0,
    statusItems: hasPlan
      ? [
          {
            key: 'on-track',
            label: '1 on track',
            icon: 'check-circle-outline',
            color: '#fff',
          },
        ]
      : [],
  };
}

const categoryRow: CategoryBudgetRowVM = {
  categoryId: 'food',
  name: 'Food',
  icon: 'food',
  color: '#fff',
  planned: 1000,
  spent: 250,
  left: 750,
  usedPct: 0.25,
  status: 'on-track',
  statusLabel: 'On track',
  statusChipColor: 'default',
  spentPlannedUsedLabel: '250 / 1,000 spent - 25% used',
  balanceAmountLabel: '750',
  balanceMetaLabel: 'EGP left',
  ringColor: '#fff',
  unassignedSpend: 0,
  unassignedSpendLabel: '0',
  budgets: [
    {
      id: 'meals',
      name: 'Monthly meals',
      planned: 1000,
      spent: 250,
      left: 750,
      usedPct: 0.25,
      categorySharePct: 1,
      usedLabel: '25%',
      shareLabel: '100% of category',
      spentPlannedLabel: '250 / 1,000 spent',
      balanceAmountLabel: '750',
      balanceMetaLabel: 'EGP left',
      ringColor: '#fff',
      accessibilityLabel: 'Monthly meals budget',
      menuAccessibilityLabel: 'Actions for Monthly meals',
    },
  ],
  accessibilityLabel: 'Food budget',
};

describe('budget categories components', () => {
  it('keeps the summary hierarchy conditional on whether the month has a plan', () => {
    const { getAllByText, getByText, queryByRole, rerender } = render(
      <SummaryCard summary={summary(false)} onSetIncome={jest.fn()} />,
    );

    expect(getByText('No budget yet')).toBeTruthy();
    expect(queryByRole('progressbar')).toBeNull();

    rerender(<SummaryCard summary={summary(true)} onSetIncome={jest.fn()} />);
    expect(getByText('250')).toBeTruthy();
    expect(getByText('spent of')).toBeTruthy();
    expect(getAllByText('1,000')).toHaveLength(2);
    expect(queryByRole('progressbar')).not.toBeNull();
    expect(getByText('1 on track')).toBeTruthy();
  });

  it('keeps category expansion controlled and routes named-budget actions', () => {
    const onExpandedChange = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const { getByLabelText, getByTestId, getByText } = render(
      <CategoryBudgetRow
        row={categoryRow}
        isExpanded
        onExpandedChange={onExpandedChange}
        onViewDetails={jest.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    fireEvent(getByTestId('category-accordion'), 'valueChange', undefined);
    expect(onExpandedChange).toHaveBeenCalledWith(undefined);

    fireEvent.press(getByLabelText('Actions for Monthly meals'));
    fireEvent.press(getByText(Strings.swipeEdit));
    expect(onEdit).toHaveBeenCalledWith('meals');
    fireEvent.press(getByText(Strings.swipeDelete));
    expect(onDelete).toHaveBeenCalledWith({ id: 'meals', name: 'Monthly meals' });
  });
});
