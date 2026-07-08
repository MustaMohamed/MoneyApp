import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { TotalsStrip } from '@/modules/transactions/screens/transactions/components/totals_strip';
import { ms } from '@/utils/responsive';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const SkeletonGroupRoot = ({
    children,
    style,
  }: {
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
  }) => React.createElement(View, { testID: 'skeleton-group', style }, children);
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
    Card: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
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

describe('TotalsStrip skeleton loading', () => {
  it('keeps the totals card footprint while totals are loading', () => {
    const { queryByText, getAllByTestId, queryByTestId } = render(
      <TotalsStrip current={null} previous={null} previousLabel="June 2026" isLoading />,
    );

    expect(queryByText('+0')).toBeNull();
    expect(queryByTestId('skeleton-group')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(4);
  });

  it('matches the loaded totals row geometry while loading', () => {
    const { getAllByTestId, getByTestId } = render(
      <TotalsStrip current={null} previous={null} previousLabel="June 2026" isLoading />,
    );

    expect(getByTestId('transactions-totals-skeleton-values-row')).toHaveStyle({
      minHeight: ms(15),
    });
    expect(getByTestId('transactions-totals-skeleton-progress')).toHaveStyle({
      height: ms(3),
    });
    expect(getByTestId('transactions-totals-skeleton-deltas-row')).toHaveStyle({
      minHeight: ms(12),
    });
    expect(getAllByTestId('transactions-totals-skeleton-delta-pill')).toHaveLength(3);
    expect(getByTestId('transactions-totals-skeleton-previous-label')).toHaveStyle({
      height: ms(9),
    });
  });
});
