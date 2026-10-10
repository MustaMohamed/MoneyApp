import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, type StyleProp, type ViewStyle } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';
import { StatCards } from '@/modules/dashboard/screens/dashboard/components/stat_cards';
import { resolveMonthSpendFooterLayout } from '@/modules/dashboard/screens/dashboard/components/stat_cards.helpers';
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
  // `liabilities` is the owed-frame total: positive when cards are owed, negative only in credit.
  netWorth: {
    kind: 'amount',
    assets: 1200,
    liabilities: 200,
    netWorth: 1000,
    assetsForeign: 30,
    netWorthForeign: 25,
  } as const,
  baseCurrency: Currency.EGP,
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
      minHeight: resolveSkeletonBarHeight(ms(16), Dimensions.get('window').fontScale),
    });
    expect(getAllByTestId('dashboard-month-spend-skeleton-footer-item')).toHaveLength(3);
  });
});

describe('StatCards month-spend spoken figures', () => {
  it('labels each month-spend figure with its amount joined to its code, then the state word', async () => {
    const { getByLabelText } = await render(
      <StatCards {...baseProps} netWorthLoading={false} monthSpendLoading={false} />,
    );

    expect(getByLabelText('3,000 EGP Spent')).toBeTruthy();
    expect(getByLabelText('20.00 USD Spent')).toBeTruthy();
  });
});

describe('StatCards text at the window font scale', () => {
  it('fits the net worth value to its line and scales the assets label app-side', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);

    const { getByText } = await render(
      <StatCards {...baseProps} netWorthLoading={false} monthSpendLoading />,
    );

    const netWorth = getByText(/1,000/);
    expect(netWorth).toHaveProp('allowFontScaling', false);
    expect(netWorth).toHaveProp('adjustsFontSizeToFit', true);
    expect(netWorth).toHaveStyle(scaledTextStyle(Type.title, fontScale));
    const assetsLabel = getByText(`${Strings.dashAssetsLabel} (${baseProps.assetsCount})`);
    expect(assetsLabel).toHaveProp('allowFontScaling', false);
    expect(assetsLabel).toHaveStyle(scaledTextStyle(Type.caption, fontScale));
  });

  it('lays the month-spend footer out by the font scale rule, skeleton and loaded', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    const layout = resolveMonthSpendFooterLayout(fontScale);

    const loading = await render(<StatCards {...baseProps} netWorthLoading monthSpendLoading />);
    const loaded = await render(
      <StatCards {...baseProps} netWorthLoading={false} monthSpendLoading={false} />,
    );

    expect(loading.getByTestId('dashboard-month-spend-skeleton-footer-row')).toHaveStyle(layout);
    expect(loaded.getByTestId('dashboard-month-spend-footer-row')).toHaveStyle(layout);
  });

  it('scales the month-spend delta, previous month and count app-side', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);

    const { getByText } = await render(
      <StatCards {...baseProps} netWorthLoading={false} monthSpendLoading={false} />,
    );
    // `spendYearMonth` is July, so the month before it prints `Jun`.
    const footerTexts = [
      getByText(`${baseProps.monthSpendDeltaPct}%`),
      getByText('vs Jun'),
      getByText(`${baseProps.monthSpendCount} ${Strings.dashMonthSpentTxsUnit}`),
    ];

    for (const text of footerTexts) {
      expect(text).toHaveProp('allowFontScaling', false);
      expect(text).toHaveStyle(scaledTextStyle(Type.caption, fontScale));
    }
  });

  it('scales the net worth refusal text app-side', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);

    const { getByText } = await render(
      <StatCards
        {...baseProps}
        netWorth={{ kind: 'rate-needed', foreignCount: 1 }}
        netWorthLoading={false}
        monthSpendLoading
      />,
    );
    const refusal = getByText(Strings.dashboardRateNeededValue);

    expect(refusal).toHaveProp('allowFontScaling', false);
    expect(refusal).toHaveStyle(scaledTextStyle(Type.caption, fontScale));
  });
});
