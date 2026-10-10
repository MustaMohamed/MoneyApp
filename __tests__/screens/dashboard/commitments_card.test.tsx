import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, type StyleProp, type ViewStyle } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';
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
    Card: Object.assign(
      ({ children, ...props }: { children?: ReactNode }) =>
        React.createElement(View, props, children),
      {
        Body: ({ children, ...props }: { children?: ReactNode }) =>
          React.createElement(View, props, children),
      },
    ),
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
  it('shows skeleton slots instead of committed totals while loading', async () => {
    const { queryByText, getAllByTestId, queryByTestId } = await render(
      <CommitmentsCard
        counts={{ paid: 1, overdue: 2, due: 3, upcoming: 4, skipped: 5, total: 10 }}
        totalsByCurrency={new Map([[Currency.EGP, 5000]])}
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

  it('preserves the natural card frame while loading', async () => {
    const loading = await render(
      <CommitmentsCard
        counts={{ paid: 1, overdue: 2, due: 3, upcoming: 4, skipped: 5, total: 10 }}
        totalsByCurrency={new Map([[Currency.EGP, 5000]])}
        yearMonth="2026-07"
        isLoading
        onPress={jest.fn()}
      />,
    );
    const loaded = await render(
      <CommitmentsCard
        counts={{ paid: 1, overdue: 2, due: 3, upcoming: 4, skipped: 5, total: 10 }}
        totalsByCurrency={new Map([[Currency.EGP, 5000]])}
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

  it('matches the loaded commitments row geometry while loading', async () => {
    const { getAllByTestId, getByTestId } = await render(
      <CommitmentsCard
        counts={{ paid: 1, overdue: 2, due: 3, upcoming: 4, skipped: 5, total: 10 }}
        totalsByCurrency={new Map([[Currency.EGP, 5000]])}
        yearMonth="2026-07"
        isLoading
        onPress={jest.fn()}
      />,
    );

    expect(getByTestId('dashboard-commitments-skeleton-summary-row')).toHaveStyle({
      minHeight: resolveSkeletonBarHeight(ms(33), Dimensions.get('window').fontScale),
    });
    expect(getByTestId('dashboard-commitments-skeleton-progress')).toHaveStyle({
      height: ms(3),
    });
    expect(getByTestId('dashboard-commitments-skeleton-stats-row')).toHaveStyle({
      minHeight: resolveSkeletonBarHeight(ms(14), Dimensions.get('window').fontScale),
    });
    expect(getAllByTestId('dashboard-commitments-skeleton-stat')).toHaveLength(5);
  });
});

// (23 / 40) * 100 is 57.49999999999999: a half that a float quotient rounds down.
describe('CommitmentsCard paid share', () => {
  it('prints the paid percent with a half rounded up: 23 paid of 40 reads 58%', async () => {
    const { getByText } = await render(
      <CommitmentsCard
        counts={{ paid: 23, overdue: 0, due: 17, upcoming: 0, skipped: 0, total: 40 }}
        totalsByCurrency={new Map([[Currency.EGP, 5000]])}
        yearMonth="2026-07"
        isLoading={false}
        onPress={jest.fn()}
      />,
    );

    expect(getByText('58%')).toBeTruthy();
  });
});

describe('CommitmentsCard text at the window font scale', () => {
  it('holds the label to one line and scales the label, percent and paid counter app-side', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);

    const { getByText } = await render(
      <CommitmentsCard
        counts={{ paid: 1, overdue: 2, due: 3, upcoming: 4, skipped: 5, total: 10 }}
        totalsByCurrency={new Map([[Currency.EGP, 5000]])}
        yearMonth="2026-07"
        isLoading={false}
        onPress={jest.fn()}
      />,
    );
    const label = getByText(Strings.commitmentsTotalCommitted);
    const percent = getByText('10%');
    const paid = getByText('1');

    expect(label).toHaveProp('numberOfLines', 1);
    expect(label).toHaveProp('allowFontScaling', false);
    expect(label).toHaveProp('adjustsFontSizeToFit', true);
    expect(label).toHaveStyle(scaledTextStyle(Type.caption, fontScale));
    expect(percent).toHaveProp('allowFontScaling', false);
    expect(percent).toHaveStyle(scaledTextStyle(Type.subhead, fontScale));
    expect(paid).toHaveProp('allowFontScaling', false);
    expect(paid).toHaveStyle(scaledTextStyle(Type.micro, fontScale));
  });
});
