import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { TotalsStrip } from '@/modules/transactions/screens/transactions/components/totals_strip';

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
    Card: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

describe('TotalsStrip skeleton loading', () => {
  it('keeps the totals card footprint while totals are loading', () => {
    const { queryByText, getAllByTestId } = render(
      <TotalsStrip current={null} previous={null} previousLabel="June 2026" isLoading />,
    );

    expect(queryByText('+0')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(4);
  });
});
