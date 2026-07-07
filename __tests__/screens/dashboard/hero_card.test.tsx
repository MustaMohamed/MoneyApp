import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Strings } from '@/constants/strings';
import { HeroCard } from '@/modules/dashboard/screens/dashboard/components/hero_card';
import { ms } from '@/utils/responsive';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/components/ui/hero_shell', () => ({
  HeroShell: ({
    children,
    style,
  }: {
    children?: ReactNode;
    style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
  }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="dashboard-hero-card" style={style}>
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
    style,
    testID,
  }: {
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
    testID?: string;
  }) => React.createElement(View, { testID: testID ?? 'skeleton-item', style }, children);
  return {
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

const baseProps = {
  assetsEgp: 8650,
  assetsUsd: 176,
  rate: 49.06,
  isManualOverride: false,
  assetsCount: 1,
  liabilitiesCount: 0,
  onPress: jest.fn(),
};

describe('HeroCard skeleton loading', () => {
  it('skeletonizes balance and metadata while account totals load', () => {
    const { getAllByTestId, getByText, queryByText } = render(
      <HeroCard {...baseProps} isLoading />,
    );

    expect(getByText(Strings.dashAvailableToSpend)).toBeTruthy();
    expect(queryByText(/8,650/)).toBeNull();
    expect(queryByText(/176 USD/)).toBeNull();
    expect(queryByText(/1 USD = 49.06 EGP/)).toBeNull();
    expect(queryByText(`1 ${Strings.o6AccountsUnit}`)).toBeNull();
    expect(getAllByTestId('skeleton-group-only')).toHaveLength(1);
    expect(getAllByTestId('dashboard-hero-skeleton-pill')).toHaveLength(3);
  });

  it('keeps the same card frame size while loading', () => {
    const loading = render(<HeroCard {...baseProps} isLoading />);
    const loaded = render(<HeroCard {...baseProps} isLoading={false} />);

    expect(loading.getByTestId('dashboard-hero-card')).toHaveStyle({ minHeight: ms(148) });
    expect(loaded.getByTestId('dashboard-hero-card')).toHaveStyle({ minHeight: ms(148) });
  });

  it('matches the loaded amount and pill row geometry while loading', () => {
    const { getAllByTestId, getByTestId } = render(<HeroCard {...baseProps} isLoading />);

    expect(getByTestId('dashboard-hero-skeleton-amount')).toHaveStyle({ height: ms(40) });
    expect(getByTestId('dashboard-hero-skeleton-pills-row')).toHaveStyle({
      minHeight: ms(24),
    });
    expect(getAllByTestId('dashboard-hero-skeleton-pill')).toHaveLength(3);
  });
});
