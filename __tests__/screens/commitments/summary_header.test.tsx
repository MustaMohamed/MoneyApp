import { render, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, type StyleProp, type ViewStyle } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { Type } from '@/constants/theme';
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

describe('SummaryHeader skeleton loading', () => {
  it('does not render final-looking empty values while payments load', async () => {
    const { queryByText, getAllByTestId, queryByTestId } = await render(
      <SummaryHeader
        counts={{ paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 }}
        totalsByCurrency={new Map()}
        isLoading
      />,
    );

    expect(queryByText('—')).toBeNull();
    expect(queryByText('0%')).toBeNull();
    expect(queryByTestId('skeleton-group-only')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(5);
  });

  it('matches the loaded summary row geometry while loading', async () => {
    const { getAllByTestId, getByTestId } = await render(
      <SummaryHeader
        counts={{ paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 }}
        totalsByCurrency={new Map()}
        isLoading
      />,
    );

    expect(getByTestId('commitments-summary-skeleton-summary-row')).toHaveStyle({
      minHeight: ms(27),
    });
    expect(getByTestId('commitments-summary-skeleton-progress')).toHaveStyle({
      height: ms(3),
    });
    expect(getByTestId('commitments-summary-skeleton-stats-row')).toHaveStyle({
      minHeight: ms(13),
    });
    expect(getAllByTestId('commitments-summary-skeleton-stat')).toHaveLength(5);
  });

  it('grows the skeleton text bars with the font scale and keeps the stat icons at their size', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);

    const { getAllByTestId } = await render(
      <SummaryHeader
        counts={{ paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 }}
        totalsByCurrency={new Map()}
        isLoading
      />,
    );

    const [label, amount, percent] = getAllByTestId('skeleton-item');
    expect(label).toHaveStyle({ height: resolveSkeletonBarHeight(ms(6), fontScale) });
    expect(amount).toHaveStyle({ height: resolveSkeletonBarHeight(ms(14), fontScale) });
    expect(percent).toHaveStyle({ height: resolveSkeletonBarHeight(ms(14), fontScale) });

    const stats = getAllByTestId('commitments-summary-skeleton-stat');
    expect(stats).toHaveLength(5);
    for (const stat of stats) {
      const [icon, value] = within(stat).getAllByTestId('skeleton-item');
      expect(icon).toHaveStyle({ width: ms(11), height: ms(11) });
      expect(value).toHaveStyle({ height: resolveSkeletonBarHeight(ms(9), fontScale) });
    }
  });
});

// (23 / 40) * 100 is 57.49999999999999: a half that a float quotient rounds down.
describe('SummaryHeader paid share', () => {
  it('prints the paid percent with a half rounded up: 23 paid of 40 reads 58%', async () => {
    const { getByText } = await render(
      <SummaryHeader
        counts={{ paid: 23, overdue: 0, due: 17, upcoming: 0, skipped: 0, total: 40 }}
        totalsByCurrency={new Map([[Currency.EGP, 1500]])}
      />,
    );

    expect(getByText('58%')).toBeTruthy();
  });
});

describe('SummaryHeader total committed line', () => {
  it('fits a total in both currencies to one line at the window font scale', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);

    const { getByText } = await render(
      <SummaryHeader
        counts={{ paid: 1, overdue: 0, due: 1, upcoming: 0, skipped: 0, total: 2 }}
        totalsByCurrency={
          new Map([
            [Currency.EGP, 1500],
            [Currency.USD, 75],
          ])
        }
      />,
    );

    const totals = getByText(/1,500[\s\S]*75|75[\s\S]*1,500/);
    expect(totals).toHaveProp('allowFontScaling', false);
    expect(totals).toHaveProp('adjustsFontSizeToFit', true);
    expect(totals).toHaveStyle(scaledTextStyle(Type.subhead, fontScale));
  });
});
