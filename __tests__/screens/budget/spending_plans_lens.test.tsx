import { fireEvent, render, within } from '@testing-library/react-native';
import type { ElementType, ReactNode } from 'react';
import { Text } from 'react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { SpendingPlanWithCategories } from '@/modules/budget/database/spending_plans';
import { SpendingPlansLens } from '@/modules/budget/screens/budget/components/spending_plans_lens';
import {
  buildSpendingPlanRows,
  computeSpendingPlansSummary,
} from '@/modules/budget/screens/budget/spending_plans.helpers';
import type { Category } from '@/modules/categories/entities/category.entity';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return ({ name, color, ...props }: { name: string; color?: string } & Record<string, unknown>) =>
    React.createElement(View, {
      ...props,
      testID: `material-community-icon:${name}:${color ?? ''}`,
    });
});
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const {
    Pressable,
    Text: RNText,
    View,
  } = jest.requireActual<typeof import('react-native')>('react-native');
  const passThrough =
    (Component: ElementType) =>
    ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
      React.createElement(Component, props, children);
  const Card = Object.assign(passThrough(View), {
    Header: passThrough(View),
    Body: passThrough(View),
    Title: passThrough(RNText),
    Description: passThrough(RNText),
    Footer: passThrough(View),
  });
  const Chip = Object.assign(passThrough(View), { Label: passThrough(RNText) });
  const Button = Object.assign(passThrough(View), { Label: passThrough(RNText) });
  const PressableFeedback = Object.assign(passThrough(Pressable), {
    Highlight: passThrough(View),
  });

  return {
    Button,
    Card,
    Chip,
    PressableFeedback,
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

describe('SpendingPlansLens', () => {
  const categories: Category[] = [
    {
      id: 'cat_food',
      name: 'Food',
      type: CategoryType.Expense,
      icon: 'food',
      color: '#f90',
      is_default: 0,
      sort_order: 0,
      budget_group: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'cat_travel',
      name: 'Travel',
      type: CategoryType.Expense,
      icon: 'car',
      color: '#09f',
      is_default: 0,
      sort_order: 1,
      budget_group: null,
      created_at: '',
      updated_at: '',
    },
  ];
  const plan: SpendingPlanWithCategories = {
    id: 'plan_trip',
    name: 'Alexandria weekend',
    start_date: '2026-07-10',
    end_date: '2026-07-21',
    total_amount: 8000,
    created_at: '',
    updated_at: '',
    categories: [
      { plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 },
      { plan_id: 'plan_trip', category_id: 'cat_travel', allocated_amount: null },
    ],
  };
  const row = buildSpendingPlanRows({
    plans: [plan],
    categories,
    spendByPlanId: { plan_trip: { cat_food: 1200, cat_travel: 0 } },
    selectedMonth: '2026-07',
    today: '2026-07-13',
  })[0];
  const summary = computeSpendingPlansSummary([row], '2026-07');

  it('renders summary and plan cards', () => {
    const { getByText, queryByText } = render(
      <SpendingPlansLens
        rows={[row]}
        summary={summary}
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(getByText('Alexandria weekend')).toBeTruthy();
    expect(getByText('Lifecycle')).toBeTruthy();
    expect(getByText('Upcoming')).toBeTruthy();
    expect(getByText('Itemized')).toBeTruthy();
    expect(queryByText('Temporary budgets')).toBeNull();
    expect(queryByText('0 needs attention')).toBeNull();
    expect(queryByText('Food')).toBeNull();
  });

  it('opens details from the card and uses explicit edit and delete actions', () => {
    const onOpenDetails = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const { getByLabelText } = render(
      <SpendingPlansLens
        rows={[row]}
        summary={summary}
        onCreate={jest.fn()}
        onOpenDetails={onOpenDetails}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(getByLabelText(row.card.openDetailsAccessibilityLabel)).toHaveStyle({
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(getByLabelText(row.card.statusLabel)).toBeTruthy();
    expect(getByLabelText(row.card.balanceAccessibilityLabel)).toBeTruthy();
    expect(getByLabelText(row.card.allocationChips[0].accessibilityLabel)).toBeTruthy();

    fireEvent.press(getByLabelText(row.card.openDetailsAccessibilityLabel));
    fireEvent.press(getByLabelText('Edit plan Alexandria weekend'));
    fireEvent.press(getByLabelText(`${Strings.budgetPlansRemoveA11y} Alexandria weekend`));

    expect(onOpenDetails).toHaveBeenCalledWith('plan_trip');
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith('plan_trip');
    expect(onDelete).toHaveBeenCalledWith({
      id: 'plan_trip',
      name: 'Alexandria weekend',
    });
  });

  it('renders summary actions inside the summary cluster', () => {
    const { getByText } = render(
      <SpendingPlansLens
        rows={[row]}
        summary={summary}
        summaryFooter={<Text>summary actions</Text>}
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(getByText('summary actions')).toBeTruthy();
  });

  it('aligns the plan delete action to the card content inset', () => {
    const { getByLabelText } = render(
      <SpendingPlansLens
        rows={[row]}
        summary={summary}
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(getByLabelText(`${Strings.budgetPlansRemoveA11y} Alexandria weekend`)).not.toHaveStyle({
      position: 'absolute',
    });
  });

  it('keeps plan cards compact by leaving allocation totals for details', () => {
    const { queryByText } = render(
      <SpendingPlansLens
        rows={[row]}
        summary={summary}
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(queryByText('1,200 / 3,000')).toBeNull();
  });

  it('renders compact allocation progress chips on plan cards', () => {
    const { getByLabelText, getByTestId } = render(
      <SpendingPlansLens
        rows={[row]}
        summary={summary}
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    const allocationCopy = getByTestId('spending-plan-allocation-chip-copy:cat_food');
    expect(allocationCopy).toHaveStyle({ flexDirection: 'column' });
    expect(within(allocationCopy).getByText('1,200/3,000')).toBeTruthy();
    expect(within(allocationCopy).getByText('40%')).toBeTruthy();

    const unassignedChip = getByLabelText('Travel, 0 spent');
    expect(within(unassignedChip).queryByText('0')).toBeNull();
  });

  it('renders empty state and create action', () => {
    const onCreate = jest.fn();
    const { getByText } = render(
      <SpendingPlansLens
        rows={[]}
        summary={{
          planned: 0,
          spent: 0,
          left: 0,
          pct: 0,
          planCount: 0,
          monthLabel: 'July 2026',
          eyebrowLabel: '0 plans in July 2026',
          usedPercentage: 0,
          progressPercentage: 0,
          itemizedAmount: 0,
          itemizedPct: 0,
          itemizedPercentage: 0,
          balanceAmount: 0,
          balanceStatus: 'left',
          balanceColor: Colors.dark.positive,
          barColor: Colors.dark.budgetUnder,
          barStatus: 'under',
          activeCount: 0,
          upcomingCount: 0,
          onTrackCount: 0,
          watchCount: 0,
          overCount: 0,
          needsAttentionCount: 0,
          statusItems: [
            {
              key: 'onTrack',
              icon: 'check-circle-outline',
              color: Colors.dark.positive,
              label: '0 on track',
            },
            {
              key: 'watch',
              icon: 'alert-circle-outline',
              color: Colors.dark.warning,
              label: '0 watch',
            },
            {
              key: 'over',
              icon: 'alert-octagon-outline',
              color: Colors.dark.negative,
              label: '0 over',
            },
            {
              key: 'upcoming',
              icon: 'clock-outline',
              color: Colors.shared.transferBlue,
              label: '0 upcoming',
            },
          ],
        }}
        onCreate={onCreate}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Create plan'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
