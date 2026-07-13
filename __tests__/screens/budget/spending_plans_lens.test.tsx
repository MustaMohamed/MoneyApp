import { fireEvent, render } from '@testing-library/react-native';
import type { ElementType, ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { SpendingPlansLens } from '@/modules/budget/screens/budget/components/spending_plans_lens';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.helpers';

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
  const { Text: RNText, View } = jest.requireActual<typeof import('react-native')>('react-native');
  const passThrough =
    (Component: ElementType) =>
    ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
      React.createElement(Component, props, children);
  const Card = Object.assign(passThrough(View), { Body: passThrough(View) });
  const Chip = Object.assign(passThrough(View), { Label: passThrough(RNText) });
  const Button = Object.assign(passThrough(View), { Label: passThrough(RNText) });

  return {
    Button,
    Card,
    Chip,
    PressableFeedback: passThrough(View),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

describe('SpendingPlansLens', () => {
  const summary = {
    planned: 8000,
    spent: 1200,
    left: 6800,
    pct: 0.15,
    planCount: 2,
    monthLabel: 'July 2026',
    eyebrowLabel: '2 plans in July 2026',
    usedPercentage: 15,
    progressPercentage: 15,
    itemizedAmount: 3000,
    itemizedPct: 0.375,
    itemizedPercentage: 38,
    balanceAmount: 6800,
    balanceStatus: 'left' as const,
    balanceColor: Colors.dark.positive,
    barColor: Colors.dark.budgetUnder,
    barStatus: 'under' as const,
    activeCount: 1,
    upcomingCount: 0,
    onTrackCount: 1,
    watchCount: 1,
    overCount: 0,
    needsAttentionCount: 1,
    statusItems: [
      {
        key: 'onTrack' as const,
        icon: 'check-circle-outline' as const,
        color: Colors.dark.positive,
        label: '1 on track',
      },
      {
        key: 'watch' as const,
        icon: 'alert-circle-outline' as const,
        color: Colors.dark.warning,
        label: '1 watch',
      },
      {
        key: 'over' as const,
        icon: 'alert-octagon-outline' as const,
        color: Colors.dark.negative,
        label: '0 over',
      },
      {
        key: 'upcoming' as const,
        icon: 'clock-outline' as const,
        color: Colors.shared.transferBlue,
        label: '0 upcoming',
      },
    ],
  };
  const categoryChips = [
    { id: 'cat_food', name: 'Food', icon: 'food', color: '#f90', spent: 1200 },
    { id: 'cat_travel', name: 'Travel', icon: 'car', color: '#09f', spent: 0 },
  ];
  const allocation = {
    categoryId: 'cat_food',
    categoryName: 'Food',
    icon: 'food',
    color: '#f90',
    allocatedAmount: 3000,
    spent: 1200,
    left: 1800,
    pct: 0.4,
    isOver: false,
  };
  const row: SpendingPlanRowVM = {
    id: 'plan_trip',
    name: 'Alexandria weekend',
    startDate: '2026-07-18',
    endDate: '2026-07-21',
    totalAmount: 8000,
    spent: 1200,
    left: 6800,
    pct: 0.15,
    isOver: false,
    categoryCount: 2,
    categoryChips,
    allocationRows: [allocation],
    cardChips: [
      { type: 'allocation', id: 'cat_food', allocation },
      { type: 'category', id: 'cat_travel', category: categoryChips[1] },
    ],
    allocatedTotal: 3000,
    buffer: 5000,
    timing: {
      lifecycle: 'active',
      totalDays: 4,
      elapsedDays: 1,
      elapsedPct: 0.25,
      daysValue: 3,
    },
    status: 'onTrack',
    paceDelta: -0.1,
    detailCategoryRows: [
      {
        categoryId: 'cat_food',
        categoryName: 'Food',
        icon: 'food',
        color: '#f90',
        spent: 1200,
        allocatedAmount: 3000,
        left: 1800,
        pct: 0.4,
        isOver: false,
        isWarning: false,
      },
      {
        categoryId: 'cat_travel',
        categoryName: 'Travel',
        icon: 'car',
        color: '#09f',
        spent: 0,
        isOver: false,
        isWarning: false,
      },
    ],
  };

  it('renders summary and plan cards', () => {
    const { getAllByText, getByText } = render(
      <SpendingPlansLens
        rows={[row]}
        summary={summary}
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(getByText('Alexandria weekend')).toBeTruthy();
    expect(getAllByText('Food').length).toBeGreaterThan(0);
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

    fireEvent.press(getByLabelText('Alexandria weekend'));
    fireEvent.press(getByLabelText('Edit plan Alexandria weekend'));
    fireEvent.press(getByLabelText(`${Strings.budgetPlansRemoveA11y} Alexandria weekend`));

    expect(onOpenDetails).toHaveBeenCalledWith('plan_trip');
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

    const deleteAction = getByLabelText(`${Strings.budgetPlansRemoveA11y} Alexandria weekend`);
    const deleteStyle = StyleSheet.flatten(deleteAction.props.style);
    expect(deleteStyle.position).toBeUndefined();
    expect(deleteStyle.right).toBeUndefined();
    expect(deleteStyle.bottom).toBeUndefined();
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
    const { getByText } = render(
      <SpendingPlansLens
        rows={[row]}
        summary={summary}
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(getByText('1,200/3,000')).toBeTruthy();
    expect(getByText('40%')).toBeTruthy();
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
