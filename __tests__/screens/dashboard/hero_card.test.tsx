import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Strings } from '@/constants/strings';
import { HeroCard } from '@/modules/dashboard/screens/dashboard/components/hero_card';
import { ms } from '@/utils/responsive';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/components/ui/hero_shell', () => ({
  // The real `HeroShell` renders its `Pressable` wrapper ONLY when it is handed
  // an `onPress`, and renders a plain card otherwise — so whether the card is
  // tappable is exactly whether that prop arrived. The mock re-states that as a
  // sentinel child rather than as a press, because RNTL's `fireEvent` resolves a
  // handler on COMPOSITE ancestors too: pressing the mocked shell finds
  // `HeroCard`'s own `onPress` prop and fires it whatever the shell received,
  // which makes a press-based assertion vacuous here.
  HeroShell: ({
    children,
    style,
    onPress,
  }: {
    children?: ReactNode;
    style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
    onPress?: () => void;
  }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="dashboard-hero-card" style={style}>
        {onPress ? <View testID="dashboard-hero-press-target" /> : null}
        {children}
      </View>
    );
  },
}));
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
    style,
    testID,
  }: {
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
    testID?: string;
  }) => React.createElement(View, { testID: testID ?? 'skeleton-item', style }, children);
  return {
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    Skeleton: ({
      animation,
      children,
      style,
      testID,
    }: {
      animation?: unknown;
      children?: ReactNode;
      style?: StyleProp<ViewStyle>;
      testID?: string;
    }) => {
      const viewProps: React.ComponentProps<typeof View> & { animation?: unknown } = {
        animation,
        style,
        testID: testID ?? 'skeleton-item',
      };
      return React.createElement(View, viewProps, children);
    },
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

const baseProps = {
  // `liabilitiesCount: 0` below is what fixes the three values this fixture did
  // not previously carry: with no liabilities, netWorth === assets and
  // netWorthUsd === assetsUsd. `assetsUsd` is NOT `assets / rate` (8650/49.06
  // is 176.31); that mismatch is pre-existing, no assertion reads the two as a
  // converted pair, and it stays.
  netWorth: {
    kind: 'amount',
    assets: 8650,
    liabilities: 0,
    netWorth: 8650,
    assetsUsd: 176,
    netWorthUsd: 176,
  } as const,
  rate: 49.06,
  isRateUsable: true,
  isManualOverride: false,
  assetsCount: 1,
  liabilitiesCount: 0,
  onPress: jest.fn(),
};

describe('HeroCard skeleton loading', () => {
  it('skeletonizes balance and metadata while account totals load', async () => {
    const { getAllByTestId, getByTestId, getByText, queryByTestId, queryByText } = await render(
      <HeroCard {...baseProps} isLoading />,
    );

    expect(getByText(Strings.dashAvailableToSpend)).toBeTruthy();
    expect(queryByText(/8,650/)).toBeNull();
    // MA-016 P8 F-3: restores the content-absent-while-loading coverage a prior chunk-D
    // dispatch wrongly deleted, believing the pill-presence assertions below carried the
    // same property. They don't — those assert the SKELETON is present; these assert the
    // real USD total and rate pill are NOT rendered underneath it. Testing by testID
    // rather than the old text regex because this same commit moved the rate pill's copy
    // from "1 USD = 49.06 EGP" to "49.06 EGP/USD" and the total to 2dp.
    expect(queryByTestId('dashboard-hero-rate-pill')).toBeNull();
    expect(queryByText(/176\.00 USD/)).toBeNull();
    expect(queryByText(`1 ${Strings.o6AccountsUnit}`)).toBeNull();
    expect(queryByTestId('skeleton-group-only')).toBeNull();
    expect(getByTestId('dashboard-hero-skeleton-amount').props.animation).toEqual({
      entering: 'disabled',
      exiting: 'disabled',
    });
    expect(getAllByTestId('dashboard-hero-skeleton-pill')).toHaveLength(3);
  });

  it('preserves the natural card frame while loading', async () => {
    const loading = await render(<HeroCard {...baseProps} isLoading />);
    const loaded = await render(<HeroCard {...baseProps} isLoading={false} />);

    expect(loading.getByTestId('dashboard-hero-card')).not.toHaveStyle({ height: ms(178) });
    expect(loaded.getByTestId('dashboard-hero-card')).not.toHaveStyle({ height: ms(178) });
    expect(loading.getByTestId('dashboard-hero-card')).not.toHaveStyle({ minHeight: ms(148) });
    expect(loaded.getByTestId('dashboard-hero-card')).not.toHaveStyle({ minHeight: ms(148) });
  });

  it('matches the loaded amount and pill row geometry while loading', async () => {
    const { getAllByTestId, getByTestId } = await render(<HeroCard {...baseProps} isLoading />);

    expect(getByTestId('dashboard-hero-skeleton-amount')).toHaveStyle({ height: ms(35) });
    expect(getByTestId('dashboard-hero-skeleton-pills-row')).toHaveStyle({
      minHeight: ms(20),
    });
    expect(getAllByTestId('dashboard-hero-skeleton-pill')).toHaveLength(3);
  });
});

// Two USD wallets and no verified rate: `computeNetWorth` refuses, so the card
// is handed a union member carrying no number at all.
const rateNeededProps = {
  ...baseProps,
  netWorth: { kind: 'rate-needed', foreignCount: 2 } as const,
  isRateUsable: false,
};

// #257: an EGP-only portfolio whose rate has never been verified. `kind` stays
// 'amount' — nothing here is foreign, so `computeNetWorth` does not refuse —
// but `isRateUsable` is false, so the ~USD fields are undefined. This is the
// gap the old `netWorth.kind === 'rate-needed'` gate missed: that check let
// the pill print the placeholder rate as fact for every EGP-only user who had
// never fetched one.
const egpOnlyUnverifiedProps = {
  ...baseProps,
  netWorth: {
    kind: 'amount',
    assets: 8650,
    liabilities: 0,
    netWorth: 8650,
    assetsUsd: undefined,
    netWorthUsd: undefined,
  } as const,
  isRateUsable: false,
};

describe('HeroCard on the rate-needed refusal', () => {
  it('shows no exchange rate under the refusal', async () => {
    // The only rate available on this path is the unverified one the refusal
    // exists to keep off the screen; `rate` is still 49.06 in the props.
    const { queryByTestId } = await render(<HeroCard {...rateNeededProps} isLoading={false} />);

    expect(queryByTestId('dashboard-hero-rate-pill')).toBeNull();
  });

  it('still shows the exchange rate and USD total on the amount path', async () => {
    const { getByText, getByTestId } = await render(<HeroCard {...baseProps} isLoading={false} />);

    expect(getByText('49.06 EGP/USD')).toBeTruthy();
    expect(getByTestId('dashboard-hero-rate-pill')).toBeTruthy();
    expect(getByText('176.00 USD')).toBeTruthy();
  });

  it('hands the shell no press handler, so the breakdown sheet cannot open', async () => {
    const { queryByTestId } = await render(<HeroCard {...rateNeededProps} isLoading={false} />);

    expect(queryByTestId('dashboard-hero-press-target')).toBeNull();
  });

  it('stays tappable on the amount path', async () => {
    const { queryByTestId } = await render(<HeroCard {...baseProps} isLoading={false} />);

    expect(queryByTestId('dashboard-hero-press-target')).not.toBeNull();
  });
});

describe('HeroCard on an EGP-only portfolio with an unverified rate (#257)', () => {
  it('shows no rate pill, the absent-USD placeholder, and the EGP amount', async () => {
    const { queryByTestId, getByText } = await render(
      <HeroCard {...egpOnlyUnverifiedProps} isLoading={false} />,
    );

    expect(queryByTestId('dashboard-hero-rate-pill')).toBeNull();
    expect(getByText(Strings.netWorthBreakdownUsdUnavailable)).toBeTruthy();
    expect(getByText(/8,650/)).toBeTruthy();
  });
});
