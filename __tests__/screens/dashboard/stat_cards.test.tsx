import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { StatCards } from '@/modules/dashboard/screens/dashboard/components/stat_cards';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const SkeletonGroupRoot = ({ children }: { children?: ReactNode }) =>
    React.createElement(View, { testID: 'skeleton-group' }, children);
  const SkeletonGroupItem = ({
    children,
    isLoading,
  }: {
    children?: ReactNode;
    isLoading?: boolean;
  }) => React.createElement(View, { testID: 'skeleton-item' }, isLoading ? null : children);
  return {
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
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
  it('skeletonizes month-spend numbers while loading without hiding net-worth numbers', () => {
    const { queryByText, getByText, getAllByTestId } = render(
      <StatCards {...baseProps} monthSpendLoading />,
    );

    expect(getByText(/1,000/)).toBeTruthy();
    expect(queryByText('3,000')).toBeNull();
    expect(queryByText('20')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(3);
  });
});
