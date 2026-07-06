import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Strings } from '@/constants/strings';
import { CommitmentsCard } from '@/modules/dashboard/screens/dashboard/components/commitments_card';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
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
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

describe('CommitmentsCard skeleton loading', () => {
  it('shows skeleton slots instead of committed totals while loading', () => {
    const { queryByText, getAllByTestId } = render(
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
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(5);
    expect(queryByText(Strings.dashboardCommitmentsTitle)).toBeTruthy();
  });
});
