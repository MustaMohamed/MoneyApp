import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { SummaryHeader } from '@/modules/commitments/screens/commitments/components/summary_header';
import { ms } from '@/utils/responsive';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const SkeletonGroupRoot = ({
    children,
    isSkeletonOnly,
  }: {
    children?: ReactNode;
    isSkeletonOnly?: boolean;
  }) =>
    React.createElement(
      View,
      { testID: isSkeletonOnly ? 'skeleton-group-only' : 'skeleton-group' },
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
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

describe('SummaryHeader skeleton loading', () => {
  it('does not render final-looking empty values while payments load', () => {
    const { queryByText, getAllByTestId } = render(
      <SummaryHeader
        counts={{ paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 }}
        totalsByCurrency={new Map()}
        isLoading
      />,
    );

    expect(queryByText('—')).toBeNull();
    expect(queryByText('0%')).toBeNull();
    expect(getAllByTestId('skeleton-group-only')).toHaveLength(1);
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(5);
  });

  it('matches the loaded summary row geometry while loading', () => {
    const { getAllByTestId, getByTestId } = render(
      <SummaryHeader
        counts={{ paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 }}
        totalsByCurrency={new Map()}
        isLoading
      />,
    );

    expect(getByTestId('commitments-summary-skeleton-summary-row')).toHaveStyle({
      minHeight: ms(31),
    });
    expect(getByTestId('commitments-summary-skeleton-progress')).toHaveStyle({
      height: ms(3),
    });
    expect(getByTestId('commitments-summary-skeleton-stats-row')).toHaveStyle({
      minHeight: ms(14),
    });
    expect(getAllByTestId('commitments-summary-skeleton-stat')).toHaveLength(5);
  });
});
