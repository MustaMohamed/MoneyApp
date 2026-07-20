import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { DETAIL_HERO_MIN_HEIGHT } from '@/modules/transactions/screens/transactions/detail/components/detail_geometry';
import { TransactionDetailSkeleton } from '@/modules/transactions/screens/transactions/detail/components/detail_skeleton';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Group = ({ children }: { children?: ReactNode }) =>
    React.createElement(View, null, children);
  const Item = (props: object) => React.createElement(View, props);
  return {
    Card: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
    SkeletonGroup: Object.assign(Group, { Item }),
  };
});

describe('TransactionDetailSkeleton', () => {
  it('reserves the loaded hero and detail-card geometry', () => {
    const { getByTestId } = render(<TransactionDetailSkeleton />);

    expect(getByTestId('transaction-detail-skeleton-hero')).toHaveStyle({
      minHeight: DETAIL_HERO_MIN_HEIGHT,
    });
    expect(getByTestId('transaction-detail-skeleton-rows')).toBeTruthy();
  });
});
