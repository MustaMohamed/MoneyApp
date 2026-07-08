import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Strings } from '@/constants/strings';
import { CommitmentsCard } from '@/modules/dashboard/screens/dashboard/components/commitments_card';
import { ms } from '@/utils/responsive';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
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
    Card: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
    PressableFeedback: ({
      children,
      onPress,
      accessibilityLabel,
    }: {
      children?: ReactNode;
      onPress: () => void;
      accessibilityLabel?: string;
    }) => React.createElement(Pressable, { onPress, accessibilityLabel }, children),
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

describe('CommitmentsCard skeleton loading', () => {
  it('shows skeleton slots instead of committed totals while loading', () => {
    const { queryByText, getAllByTestId, queryByTestId } = render(
      <CommitmentsCard
        counts={{ paid: 1, overdue: 2, due: 3, upcoming: 4, skipped: 5, total: 10 }}
        totalsByCurrency={new Map([['EGP', 5000]])}
        yearMonth="2026-07"
        isLoading
        onPress={jest.fn()}
      />,
    );

    expect(queryByText('5,000 EGP')).toBeNull();
    expect(queryByText('10%')).toBeNull();
    expect(queryByText('1')).toBeNull();
    expect(queryByTestId('skeleton-group-only')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(5);
    expect(queryByText(Strings.dashboardCommitmentsTitle)).toBeTruthy();
  });

  it('preserves the natural card frame while loading', () => {
    const loading = render(
      <CommitmentsCard
        counts={{ paid: 1, overdue: 2, due: 3, upcoming: 4, skipped: 5, total: 10 }}
        totalsByCurrency={new Map([['EGP', 5000]])}
        yearMonth="2026-07"
        isLoading
        onPress={jest.fn()}
      />,
    );
    const loaded = render(
      <CommitmentsCard
        counts={{ paid: 1, overdue: 2, due: 3, upcoming: 4, skipped: 5, total: 10 }}
        totalsByCurrency={new Map([['EGP', 5000]])}
        yearMonth="2026-07"
        isLoading={false}
        onPress={jest.fn()}
      />,
    );

    expect(loading.getByTestId('dashboard-commitments-card')).not.toHaveStyle({
      height: ms(128),
    });
    expect(loaded.getByTestId('dashboard-commitments-card')).not.toHaveStyle({ height: ms(128) });
  });

  it('matches the loaded commitments row geometry while loading', () => {
    const { getAllByTestId, getByTestId } = render(
      <CommitmentsCard
        counts={{ paid: 1, overdue: 2, due: 3, upcoming: 4, skipped: 5, total: 10 }}
        totalsByCurrency={new Map([['EGP', 5000]])}
        yearMonth="2026-07"
        isLoading
        onPress={jest.fn()}
      />,
    );

    expect(getByTestId('dashboard-commitments-skeleton-summary-row')).toHaveStyle({
      minHeight: ms(33),
    });
    expect(getByTestId('dashboard-commitments-skeleton-progress')).toHaveStyle({
      height: ms(3),
    });
    expect(getByTestId('dashboard-commitments-skeleton-stats-row')).toHaveStyle({
      minHeight: ms(14),
    });
    expect(getAllByTestId('dashboard-commitments-skeleton-stat')).toHaveLength(5);
  });
});
