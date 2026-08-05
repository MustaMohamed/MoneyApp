import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { BudgetGroup, CategoryType } from '@/constants/enums';
import type { Category } from '@/database/entities/category.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { buildBudgetRuleLens } from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { BudgetScreenSkeleton } from '@/modules/budget/screens/budget/components/budget_screen_skeleton';
import { RuleLedger } from '@/modules/budget/screens/budget/components/fifty_thirty_twenty/rule_ledger';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return ({ name }: { name: string }) => <View testID={`icon-${name}`} />;
});

jest.mock('@/modules/budget/screens/budget/components/budget_ring', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    BudgetRing: ({ children }: { children?: ReactNode }) => (
      <View testID="budget-ring">{children}</View>
    ),
  };
});

jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const AccordionContext = React.createContext<{
    selected: string;
    onValueChange?: (value: string | undefined) => void;
  }>({ selected: '' });
  const ItemContext = React.createContext('');

  const Accordion = ({
    children,
    value,
    onValueChange,
  }: {
    children?: ReactNode;
    value?: string;
    onValueChange?: (value: string | undefined) => void;
  }) => (
    <AccordionContext.Provider value={{ selected: value ?? '', onValueChange }}>
      <View>{children}</View>
    </AccordionContext.Provider>
  );
  Accordion.Item = ({ children, value }: { children?: ReactNode; value: string }) => (
    <ItemContext.Provider value={value}>
      <View>{children}</View>
    </ItemContext.Provider>
  );
  Accordion.Trigger = ({ children, ...props }: { children?: ReactNode }) => {
    const item = React.useContext(ItemContext);
    const context = React.useContext(AccordionContext);
    return (
      <Pressable
        {...props}
        onPress={() => context.onValueChange?.(context.selected === item ? undefined : item)}
      >
        {children}
      </Pressable>
    );
  };
  Accordion.Content = ({ children }: { children?: ReactNode }) => {
    const item = React.useContext(ItemContext);
    const context = React.useContext(AccordionContext);
    return context.selected === item ? <View>{children}</View> : null;
  };
  Accordion.Indicator = ({ children }: { children?: ReactNode }) => <View>{children}</View>;

  const Button = ({
    children,
    onPress,
    ...props
  }: {
    children?: ReactNode;
    onPress?: () => void;
  }) => (
    <Pressable {...props} onPress={onPress}>
      {children}
    </Pressable>
  );
  Button.Label = ({ children }: { children?: ReactNode }) => <Text>{children}</Text>;
  const Card = ({ children, ...props }: { children?: ReactNode }) => (
    <View {...props}>{children}</View>
  );
  Card.Body = ({ children, ...props }: { children?: ReactNode }) => (
    <View {...props}>{children}</View>
  );
  const Chip = ({ children, ...props }: { children?: ReactNode }) => (
    <View {...props}>{children}</View>
  );
  Chip.Label = ({ children, ...props }: { children?: ReactNode }) => (
    <Text {...props}>{children}</Text>
  );
  const SkeletonGroup = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  SkeletonGroup.Item = (props: Record<string, unknown>) => <View {...props} />;

  const cn = (...values: Array<string | false | null | undefined>) =>
    values.filter(Boolean).join(' ');
  return { Accordion, Button, Card, Chip, SkeletonGroup, cn };
});

const MONTH = '2026-07';
const NOW = '2026-07-01T00:00:00.000Z';

function category(id: string, name: string, group: BudgetGroup): Category {
  return {
    id,
    name,
    type: CategoryType.Expense,
    icon: 'tag',
    color: '#6fa8dc',
    is_default: 0,
    sort_order: 0,
    budget_group: group,
    created_at: NOW,
    updated_at: NOW,
  };
}

function budget(id: string, categoryId: string, amount: number): Budget {
  return {
    id,
    category_id: categoryId,
    name: id,
    limit_amount: amount,
    effective_from: MONTH,
    created_at: NOW,
    updated_at: NOW,
  };
}

function ruleLens() {
  const categories = [
    category('housing', 'A very long essential household category name', BudgetGroup.Need),
    category('fun', 'Fun', BudgetGroup.Want),
    category('savings', 'Savings', BudgetGroup.Savings),
  ];
  return buildBudgetRuleLens({
    income: 10_000,
    categories,
    budgets: [
      budget('housing-budget', 'housing', 6_000),
      budget('savings-budget', 'savings', 2_000),
    ],
    budgetGroupByCategoryId: {
      housing: BudgetGroup.Need,
      fun: BudgetGroup.Want,
      savings: BudgetGroup.Savings,
    },
    spendByMonth: { housing: { [MONTH]: 6_500 } },
    selectedMonth: MONTH,
    lifecycleDate: '2026-07-16',
  });
}

function statusBucket({
  income,
  group,
  planned,
}: {
  income: number | null;
  group: BudgetGroup;
  planned: number;
}) {
  const categoryId = `category-${group}`;
  return buildBudgetRuleLens({
    income,
    categories: [category(categoryId, `A very long ${group} category label`, group)],
    budgets: planned > 0 ? [budget(`budget-${group}`, categoryId, planned)] : [],
    budgetGroupByCategoryId: { [categoryId]: group },
    spendByMonth: {},
    selectedMonth: MONTH,
    lifecycleDate: '2026-07-16',
  }).buckets.find((bucket) => bucket.group === group)!;
}

describe('50/30/20 rule ledger', () => {
  it.each([
    [null, BudgetGroup.Need, 1_000, 'Income needed'],
    [10_000, BudgetGroup.Want, 0, 'No plan yet'],
    [10_000, BudgetGroup.Need, 4_000, 'Within cap'],
    [10_000, BudgetGroup.Need, 6_000, 'Over cap'],
    [10_000, BudgetGroup.Savings, 2_000, 'Target met'],
    [10_000, BudgetGroup.Savings, 1_000, 'Below target'],
  ] as const)(
    'renders the %s income, %s, %s planned state as %s',
    async (income, group, planned, expectedStatus) => {
      const bucket = statusBucket({ income, group, planned });
      const screen = await render(
        <RuleLedger
          buckets={[bucket]}
          expandedGroup={undefined}
          onExpandedGroupChange={jest.fn()}
          onManageGroup={jest.fn()}
        />,
      );

      expect(screen.getByText(expectedStatus)).toBeTruthy();
      expect(screen.getByText(bucket.presentation.groupLabel)).toHaveProp('numberOfLines', 1);
      expect(screen.getAllByTestId('budget-ring')).toHaveLength(1);
    },
  );

  it('renders each approved status while keeping contributors collapsed', async () => {
    const screen = await render(
      <RuleLedger
        buckets={ruleLens().buckets}
        expandedGroup={undefined}
        onExpandedGroupChange={jest.fn()}
        onManageGroup={jest.fn()}
      />,
    );

    expect(screen.getByText('Over cap')).toBeTruthy();
    expect(screen.getByText('No plan yet')).toBeTruthy();
    expect(screen.getByText('Target met')).toBeTruthy();
    expect(screen.queryByText('A very long essential household category name')).toBeNull();
  });

  it('renders the expanded contributor result and dispatches its manage action', async () => {
    const onManageGroup = jest.fn();
    const screen = await render(
      <RuleLedger
        buckets={ruleLens().buckets}
        expandedGroup={BudgetGroup.Need}
        onExpandedGroupChange={jest.fn()}
        onManageGroup={onManageGroup}
      />,
    );

    expect(screen.getByText('A very long essential household category name')).toHaveProp(
      'numberOfLines',
      1,
    );
    expect(screen.getByText('6,500 / 6,000')).toBeTruthy();
    await fireEvent.press(screen.getByText('Manage Needs budgets'));
    expect(onManageGroup).toHaveBeenCalledWith(BudgetGroup.Need);
  });

  it('preserves the expanded contributor skeleton during refresh', async () => {
    const screen = await render(
      <BudgetScreenSkeleton
        variant="fiftythirty"
        preserveLayout
        ruleLens={ruleLens()}
        expandedBudgetGroup={BudgetGroup.Need}
      />,
    );

    expect(screen.getByTestId('rule-bucket-expanded-skeleton')).toBeTruthy();
    expect(screen.getAllByTestId('rule-contributor-skeleton')).toHaveLength(1);
  });
});
