import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { FadeInDown } from 'react-native-reanimated';

import { resolveHeroPillGeometry } from '@/components/ui/chip.geometry';
import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Spacing, Type } from '@/constants/theme';
import { DASHBOARD_HERO_MAX_FONT_SCALE } from '@/modules/dashboard/screens/dashboard/components/dashboard_card.geometry';
import { HeroCard } from '@/modules/dashboard/screens/dashboard/components/hero_card';
import { ms } from '@/utils/responsive';

const mockAnimatedViewTestId = 'mock-animated-view';
// The entrance each `Animated.View` mounted holding, in mount order: a second mount is a lost entrance.
const mockAnimatedViewMounts: unknown[] = [];

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  const AnimatedView = ({
    entering,
    children,
    ...rest
  }: React.ComponentProps<typeof RNView> & { entering?: unknown }) => {
    const [mountedWith] = React.useState(entering);
    React.useEffect(() => {
      mockAnimatedViewMounts.push(mountedWith);
    }, [mountedWith]);
    return React.createElement(RNView, { ...rest, testID: mockAnimatedViewTestId }, children);
  };
  const builder = jest
    .requireActual<typeof import('@/test_helpers/mock_reanimated_builder')>(
      '@/test_helpers/mock_reanimated_builder',
    )
    .mockEnteringBuilder();
  return { __esModule: true, default: { View: AnimatedView }, FadeInDown: builder };
});
jest.mock('expo-linear-gradient', () => {
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: RNView };
});
jest.mock('@/components/ui/hero_shell', () => ({
  // A sentinel child, not a press: `fireEvent` resolves `HeroCard`'s own `onPress` on an ancestor.
  HeroShell: ({
    children,
    style,
    onPress,
    entering,
  }: {
    children?: ReactNode;
    style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
    onPress?: () => void;
    entering?: unknown;
  }) => {
    const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <RNView testID="dashboard-hero-card" style={style}>
        {onPress ? <RNView testID="dashboard-hero-press-target" /> : null}
        {entering !== undefined ? <RNView testID="dashboard-hero-entering" /> : null}
        {children}
      </RNView>
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
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const ChipRoot = ({
    variant: _variant,
    color: _color,
    animation: _animation,
    className: _className,
    children,
    ...rest
  }: React.ComponentProps<typeof View> & {
    variant?: unknown;
    color?: unknown;
    animation?: unknown;
    className?: string;
  }) => React.createElement(View, rest, children);
  const ChipLabel = ({
    className: _className,
    children,
    ...rest
  }: React.ComponentProps<typeof Text> & { className?: string }) =>
    React.createElement(Text, rest, children);
  return {
    Chip: Object.assign(ChipRoot, { Label: ChipLabel }),
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
  // `assetsForeign` is not `assets / rate`; no assertion reads the two as a converted pair.
  netWorth: {
    kind: 'amount',
    assets: 8650,
    liabilities: 0,
    netWorth: 8650,
    assetsForeign: 176,
    netWorthForeign: 176,
  } as const,
  baseCurrency: Currency.EGP,
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
    expect(queryByTestId('dashboard-hero-rate-pill')).toBeNull();
    expect(queryByText(/176\.00 USD/)).toBeNull();
    expect(queryByText(Strings.n4PillAccounts(1))).toBeNull();
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
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(DASHBOARD_HERO_MAX_FONT_SCALE);
    const { getAllByTestId, getByTestId } = await render(<HeroCard {...baseProps} isLoading />);

    expect(getByTestId('dashboard-hero-skeleton-amount')).toHaveStyle({
      height: resolveSkeletonBarHeight(ms(35), fontScale, DASHBOARD_HERO_MAX_FONT_SCALE),
    });
    expect(getByTestId('dashboard-hero-skeleton-pills-row')).toHaveStyle({
      minHeight: resolveSkeletonBarHeight(ms(20), fontScale),
    });
    expect(getAllByTestId('dashboard-hero-skeleton-pill')).toHaveLength(3);
  });

  it('draws the two pills the loaded card shows when no rate is usable', async () => {
    const { getAllByTestId } = await render(
      <HeroCard {...baseProps} isRateUsable={false} isLoading />,
    );

    expect(getAllByTestId('dashboard-hero-skeleton-pill')).toHaveLength(2);
  });
});

describe('HeroCard loaded text at the window font scale', () => {
  it('stops the amount at the display headline cap and scales the pills app-side to their bars', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(DASHBOARD_HERO_MAX_FONT_SCALE);

    const { getByTestId, getByText } = await render(<HeroCard {...baseProps} isLoading={false} />);
    const amount = getByText(/8,650/);
    const pillTexts = [
      getByText('176.00 USD'),
      getByText('49.06 EGP/USD'),
      getByText(Strings.n4PillAccounts(1)),
    ];

    expect(amount).toHaveProp('allowFontScaling', false);
    expect(amount).toHaveStyle(
      scaledTextStyle(Type.dashboardHero, fontScale, DASHBOARD_HERO_MAX_FONT_SCALE),
    );
    expect(getByText('EGP')).toHaveStyle(
      scaledTextStyle(Type.subhead, fontScale, DASHBOARD_HERO_MAX_FONT_SCALE),
    );
    for (const pillText of pillTexts) {
      expect(pillText).toHaveProp('allowFontScaling', false);
      expect(pillText).toHaveStyle(scaledTextStyle(Type.caption, fontScale));
    }
    for (const testID of [
      'dashboard-hero-foreign-pill',
      'dashboard-hero-rate-pill',
      'dashboard-hero-accounts-pill',
    ]) {
      expect(getByTestId(testID)).toHaveStyle({
        alignItems: 'center',
        minHeight: resolveSkeletonBarHeight(ms(20), fontScale),
      });
    }
  });
});

const HERO_PILL_IDS = [
  'dashboard-hero-foreign-pill',
  'dashboard-hero-rate-pill',
  'dashboard-hero-accounts-pill',
] as const;

describe('HeroCard pills drawn by the shared hero pill (MA-173)', () => {
  it('keeps each pill out of the accessibility tree and out of the touch path', async () => {
    const { getByTestId } = await render(<HeroCard {...baseProps} isLoading={false} />);

    for (const testID of HERO_PILL_IDS) {
      expect(getByTestId(testID)).toHaveProp('accessible', false);
      expect(getByTestId(testID)).toHaveProp('focusable', false);
      expect(getByTestId(testID)).toHaveProp('pointerEvents', 'none');
    }
  });

  it('frees the foreign pill of a fixed height and holds the rate and accounts pills at the floored height', async () => {
    const { fontScale } = Dimensions.get('window');
    const { getByTestId } = await render(<HeroCard {...baseProps} isLoading={false} />);
    const floored = resolveHeroPillGeometry(
      fontScale,
      resolveSkeletonBarHeight(ms(20), fontScale),
    ).height;

    const foreign: { props: { style?: StyleProp<ViewStyle> } } = getByTestId(
      'dashboard-hero-foreign-pill',
    );

    expect(StyleSheet.flatten(foreign.props.style).height).toBeUndefined();
    expect(getByTestId('dashboard-hero-rate-pill')).toHaveStyle({ height: floored });
    expect(getByTestId('dashboard-hero-accounts-pill')).toHaveStyle({ height: floored });
  });

  it('lets the foreign amount wrap with no line cap, and holds the rate and accounts labels to one line', async () => {
    const { getByText } = await render(<HeroCard {...baseProps} isLoading={false} />);

    expect(getByText('176.00 USD').props.numberOfLines).toBeUndefined();
    expect(getByText('49.06 EGP/USD')).toHaveProp('numberOfLines', 1);
    expect(getByText(Strings.n4PillAccounts(1))).toHaveProp('numberOfLines', 1);
  });
});

// No verified rate for two USD wallets, so `computeNetWorth` refuses and carries no number.
const rateNeededProps = {
  ...baseProps,
  netWorth: { kind: 'rate-needed', foreignCount: 2 } as const,
  isRateUsable: false,
};

// An EGP-only portfolio: nothing is foreign, so `kind` stays 'amount' even with an unusable rate.
const egpOnlyUnverifiedProps = {
  ...baseProps,
  netWorth: {
    kind: 'amount',
    assets: 8650,
    liabilities: 0,
    netWorth: 8650,
    assetsForeign: undefined,
    netWorthForeign: undefined,
  } as const,
  isRateUsable: false,
};

describe('HeroCard on the rate-needed refusal', () => {
  it('shows no exchange rate under the refusal', async () => {
    // `rate` is still 49.06 here; the refusal keeps that unverified rate off the screen.
    const { queryByTestId } = await render(<HeroCard {...rateNeededProps} isLoading={false} />);

    expect(queryByTestId('dashboard-hero-rate-pill')).toBeNull();
  });

  it('still shows the exchange rate and USD total on the amount path', async () => {
    const { getByText, getByTestId } = await render(<HeroCard {...baseProps} isLoading={false} />);

    expect(getByText('49.06 EGP/USD')).toBeTruthy();
    expect(getByTestId('dashboard-hero-rate-pill')).toBeTruthy();
    expect(getByText('176.00 USD')).toBeTruthy();
  });

  it('prints a foreign assets total below zero behind U+2212, joined to its code', async () => {
    const { getByText, queryByText } = await render(
      <HeroCard
        {...baseProps}
        netWorth={{ ...baseProps.netWorth, assetsForeign: -176 }}
        isLoading={false}
      />,
    );

    expect(getByText('−176.00 USD')).toBeTruthy();
    expect(queryByText('-176.00 USD')).toBeNull();
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
    expect(getByText(Strings.netWorthBreakdownForeignUnavailable(Currency.USD))).toBeTruthy();
    expect(getByText(/8,650/)).toBeTruthy();
  });
});

describe('HeroCard hands its entrance to the hero frame (MA-198)', () => {
  it('passes its entering to the shell while loading, on the amount path and on the rate-needed refusal', async () => {
    const entering = FadeInDown.duration(400);

    for (const props of [
      { ...baseProps, isLoading: true },
      { ...baseProps, isLoading: false },
      { ...rateNeededProps, isLoading: false },
    ]) {
      const { queryByTestId, unmount } = await render(<HeroCard {...props} entering={entering} />);
      expect(queryByTestId('dashboard-hero-entering')).not.toBeNull();
      await unmount();
    }
  });

  it('passes the shell no entrance once Home renders the hero again without one', async () => {
    const { queryByTestId, rerender } = await render(
      <HeroCard {...baseProps} isLoading entering={FadeInDown.duration(400)} />,
    );
    expect(queryByTestId('dashboard-hero-entering')).not.toBeNull();

    await rerender(<HeroCard {...baseProps} isLoading={false} />);

    expect(queryByTestId('dashboard-hero-entering')).toBeNull();
  });
});

const { HeroShell: RealHeroShell } = jest.requireActual<
  typeof import('@/components/ui/hero_shell')
>('@/components/ui/hero_shell');

const HERO_SHELL_CHILD_ID = 'hero-shell-child';

type RenderResult = Awaited<ReturnType<typeof render>>;
type HostNode = NonNullable<RenderResult['root']>;

function ancestorsOf(node: HostNode): HostNode[] {
  const found: HostNode[] = [];
  for (let at = node.parent; at; at = at.parent) found.push(at);
  return found;
}

function frameOf(view: RenderResult): HostNode {
  const frame = view.getByTestId(HERO_SHELL_CHILD_ID).parent;
  if (!frame) throw new Error('the shell child has no host parent');
  return frame;
}

function shellElement(
  props: Omit<import('@/components/ui/hero_shell').HeroShellProps, 'children'> = {},
) {
  return (
    <RealHeroShell {...props}>
      <View testID={HERO_SHELL_CHILD_ID} />
    </RealHeroShell>
  );
}

describe('HeroShell keeps its entrance on a view that stays mounted when it becomes a button (MA-198)', () => {
  beforeEach(() => {
    mockAnimatedViewMounts.length = 0;
  });

  it('holds the entrance around the frame, and mounts it once when onPress goes from unset to set', async () => {
    const entering = FadeInDown.duration(400);
    const view = await render(shellElement({ entering }));

    const enteringView = view.getByTestId(mockAnimatedViewTestId);
    expect(frameOf(view)).not.toBe(enteringView);
    expect(ancestorsOf(frameOf(view))).toContain(enteringView);

    await view.rerender(
      shellElement({
        entering,
        onPress: jest.fn(),
        accessibilityLabel: Strings.dashAvailableToSpend,
      }),
    );

    expect(ancestorsOf(view.getByRole('button'))).toContain(
      view.getByTestId(mockAnimatedViewTestId),
    );
    expect(mockAnimatedViewMounts).toStrictEqual([entering]);
  });

  it('keeps the entrance mounted when Home drops it on the render that makes the hero a button', async () => {
    const entering = FadeInDown.duration(400);
    const view = await render(shellElement({ entering }));

    await view.rerender(
      shellElement({ onPress: jest.fn(), accessibilityLabel: Strings.dashAvailableToSpend }),
    );

    expect(mockAnimatedViewMounts).toStrictEqual([entering]);
  });

  it('is a button only with onPress, inside the view that holds the entrance and around the frame', async () => {
    const without = await render(shellElement({ entering: FadeInDown.duration(400) }));
    expect(without.queryAllByRole('button')).toHaveLength(0);
    expect(without.container.queryAll((node) => node.props.accessible === true)).toHaveLength(0);
    await without.unmount();

    const withPress = await render(
      shellElement({
        entering: FadeInDown.duration(400),
        onPress: jest.fn(),
        accessibilityLabel: Strings.dashAvailableToSpend,
      }),
    );
    const [button, ...rest] = withPress.getAllByRole('button');
    expect(rest).toHaveLength(0);
    expect(button).toHaveProp('accessibilityLabel', Strings.dashAvailableToSpend);
    expect(ancestorsOf(button)).toContain(withPress.getByTestId(mockAnimatedViewTestId));
    expect(ancestorsOf(frameOf(withPress))).toContain(button);
  });

  it('puts the style override on the frame, never on the view that holds the entrance', async () => {
    for (const onPress of [undefined, jest.fn()]) {
      const view = await render(
        shellElement({
          entering: FadeInDown.duration(400),
          onPress,
          style: { marginTop: Spacing.xs },
        }),
      );

      expect(frameOf(view)).toHaveStyle({ marginTop: Spacing.xs });
      expect(view.getByTestId(mockAnimatedViewTestId)).not.toHaveStyle({
        marginTop: Spacing.xs,
      });
      await view.unmount();
    }
  });
});
