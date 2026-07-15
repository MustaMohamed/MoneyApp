import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('heroui-native', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Wrapper = ({ children, ...props }: { children?: ReactNode }) => (
    <View {...props}>{children}</View>
  );
  const Card = Object.assign(Wrapper, {
    Body: Wrapper,
    Header: Wrapper,
    Footer: Wrapper,
  });
  const SkeletonGroup = Object.assign(Wrapper, { Item: Wrapper });
  return { Card, SkeletonGroup };
});

import type { CategoryBudgetRowVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { BudgetScreenSkeleton } from '@/modules/budget/screens/budget/components/budget_screen_skeleton';

function row(budgetCount: number): CategoryBudgetRowVM {
  return {
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
    spentPlannedUsedLabel: '250 / 1,000 spent',
    balanceAmountLabel: '750',
    balanceMetaLabel: 'EGP left',
    ringColor: '#fff',
    unassignedSpend: 0,
    unassignedSpendLabel: '0',
    budgets: Array.from({ length: budgetCount }, (_, index) => ({
      id: `budget-${index}`,
      name: `Budget ${index}`,
      planned: 500,
      spent: 100,
      left: 400,
      usedPct: 0.2,
      categorySharePct: 0.5,
      usedLabel: '20%',
      shareLabel: '50% of category',
      spentPlannedLabel: '100 / 500 spent',
      balanceAmountLabel: '400',
      balanceMetaLabel: 'EGP left',
      ringColor: '#fff',
      accessibilityLabel: 'Budget',
      menuAccessibilityLabel: 'Budget actions',
    })),
    accessibilityLabel: 'Food budget',
  };
}

describe('BudgetScreenSkeleton', () => {
  it('matches the retained category row count and expanded child geometry on refresh', () => {
    const { getAllByTestId } = render(
      <BudgetScreenSkeleton
        variant="categories"
        preserveLayout
        categorySummaryHasPlan
        categoryRows={[row(2)]}
        expandedCategoryId="food"
      />,
    );

    expect(getAllByTestId('budget-row-skeleton')).toHaveLength(1);
    expect(getAllByTestId('named-budget-row-skeleton')).toHaveLength(2);
    expect(getAllByTestId('category-details-row-skeleton')).toHaveLength(1);
  });

  it('omits planned-only summary geometry for an empty retained month', () => {
    const { queryByTestId } = render(
      <BudgetScreenSkeleton
        variant="categories"
        preserveLayout
        categorySummaryHasPlan={false}
        categoryRows={[]}
      />,
    );

    expect(queryByTestId('categories-summary-plan-skeleton')).toBeNull();
    expect(queryByTestId('categories-summary-status-skeleton')).toBeNull();
    expect(queryByTestId('budget-empty-state-skeleton')).not.toBeNull();
  });

  it('matches the retained plan card count on refresh', () => {
    const { getAllByTestId } = render(
      <BudgetScreenSkeleton variant="plans" preserveLayout planRowCount={1} />,
    );

    expect(getAllByTestId('plan-card-skeleton')).toHaveLength(1);
  });
});
