import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { StatCards } from '@/modules/dashboard/screens/dashboard/components/stat_cards';
import { ms } from '@/utils/responsive';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const SkeletonGroupRoot = ({
    children,
    isSkeletonOnly,
    style,
  }: {
    children?: ReactNode;
    isSkeletonOnly?: boolean;
    style?: StyleProp<ViewStyle>;
  }) =>
    React.createElement(
      View,
      { testID: isSkeletonOnly ? 'skeleton-group-only' : 'skeleton-group', style },
      children,
    );
  const SkeletonGroupItem = ({
    children,
    isLoading,
    style,
    testID,
  }: {
    children?: ReactNode;
    isLoading?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
  }) =>
    React.createElement(
      View,
      { testID: testID ?? 'skeleton-item', style },
      isLoading ? null : children,
    );
  return {
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    Skeleton: ({
      children,
      isLoading,
      style,
      testID,
    }: {
      children?: ReactNode;
      isLoading?: boolean;
      style?: StyleProp<ViewStyle>;
      testID?: string;
    }) =>
      React.createElement(
        View,
        { testID: testID ?? 'skeleton-item', style },
        isLoading ? null : children,
      ),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

const baseProps = {
  netWorthEgp: 1000,
  assetsEgp: 1200,
  liabilitiesEgp: -200,
  assetsCount: 2,
  liabilitiesCount: 1,
  monthSpentEgp: 3000,
  monthSpentUsd: 20,
  monthSpendDeltaPct: 15,
  monthSpendCount: 4,
  spendYearMonth: '2026-07',
};

describe('StatCards skeleton loading', () => {
  it('skeletonizes month-spend numbers while loading without hiding net-worth numbers', async () => {
    const { queryByText, getByText, getAllByTestId } = await render(
      <StatCards {...baseProps} netWorthLoading={false} monthSpendLoading />,
    );

    expect(getByText(/1,000/)).toBeTruthy();
    expect(queryByText('3,000')).toBeNull();
    expect(queryByText('20')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(2);
    expect(getAllByTestId('dashboard-month-spend-skeleton-footer-item')).toHaveLength(3);
  });

  it('skeletonizes net-worth numbers while loading without hiding month-spend numbers', async () => {
    const { queryByTestId, queryByText, getByText, getAllByTestId } = await render(
      <StatCards {...baseProps} netWorthLoading monthSpendLoading={false} />,
    );

    expect(queryByText(/1,000/)).toBeNull();
    expect(queryByText(/1,200/)).toBeNull();
    expect(queryByText(/-200/)).toBeNull();
    expect(getByText(/3,000/)).toBeTruthy();
    expect(getByText(/20/)).toBeTruthy();
    expect(queryByTestId('skeleton-group-only')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(4);
  });

  it('preserves both stat card natural frames while loading', async () => {
    const loading = await render(<StatCards {...baseProps} netWorthLoading monthSpendLoading />);
    const loaded = await render(
      <StatCards {...baseProps} netWorthLoading={false} monthSpendLoading={false} />,
    );

    expect(loading.getByTestId('dashboard-net-worth-card')).not.toHaveStyle({ height: ms(132) });
    expect(loaded.getByTestId('dashboard-net-worth-card')).not.toHaveStyle({ height: ms(132) });
    expect(loading.getByTestId('dashboard-month-spend-card')).not.toHaveStyle({
      height: ms(132),
    });
    expect(loaded.getByTestId('dashboard-month-spend-card')).not.toHaveStyle({ height: ms(132) });
  });

  it('uses loaded-row heights for dashboard stat skeletons', async () => {
    const { getAllByTestId, getByTestId } = await render(
      <StatCards {...baseProps} netWorthLoading monthSpendLoading />,
    );

    expect(getByTestId('dashboard-net-worth-skeleton-progress')).toHaveStyle({
      height: ms(5),
    });
    expect(getByTestId('dashboard-month-spend-skeleton-footer-row')).toHaveStyle({
      minHeight: ms(16),
    });
    expect(getAllByTestId('dashboard-month-spend-skeleton-footer-item')).toHaveLength(3);
  });
});
