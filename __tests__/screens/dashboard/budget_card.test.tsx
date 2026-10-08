import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { resolveFitAmountTextProps } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';
import { BudgetCard } from '@/modules/dashboard/screens/dashboard/components/budget_card';
import { ms } from '@/utils/responsive';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Card: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
    PressableFeedback: ({
      children,
      onPress,
      accessibilityLabel,
    }: PressableProps & {
      children?: ReactNode;
      onPress: () => void;
      accessibilityLabel?: string;
    }) => React.createElement(Pressable, { onPress, accessibilityLabel }, children),
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

describe('BudgetCard', () => {
  it('renders current-month budget summary and opens budget on press', async () => {
    const onPress = jest.fn();
    const { getByText, getByLabelText, queryAllByTestId } = await render(
      <BudgetCard
        summary={{ budgeted: 8000, spent: 2000, left: 6000, pct: 0.25, categoryCount: 2 }}
        yearMonth="2026-07"
        isLoading={false}
        onPress={onPress}
      />,
    );

    expect(getByText(Strings.budgetTitle)).toBeTruthy();
    // `formatCurrencyAmount` now discloses the EGP code on all three figures (#347).
    expect(getByText('8,000 EGP')).toBeTruthy();
    expect(getByText('2,000 EGP')).toBeTruthy();
    expect(getByText('6,000 EGP')).toBeTruthy();
    expect(getByText('2 categories')).toBeTruthy();
    expect(queryAllByTestId('skeleton-item')).toHaveLength(0);

    await fireEvent.press(getByLabelText(Strings.budgetTitle));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('prints a Left below zero behind U+2212, joined to its code', async () => {
    const { getByText, queryByText } = await render(
      <BudgetCard
        summary={{ budgeted: 8000, spent: 10000, left: -2000, pct: 1.25, categoryCount: 2 }}
        yearMonth="2026-07"
        isLoading={false}
        onPress={jest.fn()}
      />,
    );

    expect(getByText('−2,000 EGP')).toBeTruthy();
    expect(queryByText('-2,000 EGP')).toBeNull();
  });

  it('shows skeleton slots instead of summary numbers while loading', async () => {
    const { queryByText, getAllByTestId } = await render(
      <BudgetCard
        summary={{ budgeted: 8000, spent: 2000, left: 6000, pct: 0.25, categoryCount: 2 }}
        yearMonth="2026-07"
        isLoading
        onPress={jest.fn()}
      />,
    );

    expect(queryByText('8,000 EGP')).toBeNull();
    expect(queryByText('2,000 EGP')).toBeNull();
    expect(queryByText('6,000 EGP')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(4);
  });

  it('grows the skeleton meta row with the font scale and keeps the progress rail', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);

    const { getByTestId } = await render(
      <BudgetCard
        summary={{ budgeted: 8000, spent: 2000, left: 6000, pct: 0.25, categoryCount: 2 }}
        yearMonth="2026-07"
        isLoading
        onPress={jest.fn()}
      />,
    );

    expect(getByTestId('dashboard-budget-skeleton-meta')).toHaveStyle({
      height: resolveSkeletonBarHeight(ms(13), fontScale),
    });
    expect(getByTestId('dashboard-budget-skeleton-progress')).toHaveStyle({ height: ms(3) });
  });

  it('fits the budgeted figure to its line at the window font scale', async () => {
    const { fontScale } = Dimensions.get('window');
    const fit = resolveFitAmountTextProps(Type.body, fontScale);
    expect(fit.adjustsFontSizeToFit).toBe(true);

    const { getByText } = await render(
      <BudgetCard
        summary={{ budgeted: 8000, spent: 2000, left: 6000, pct: 0.25, categoryCount: 2 }}
        yearMonth="2026-07"
        isLoading={false}
        onPress={jest.fn()}
      />,
    );

    const budgeted = getByText('8,000 EGP');
    expect(budgeted).toHaveProp('numberOfLines', fit.numberOfLines);
    expect(budgeted).toHaveProp('allowFontScaling', fit.allowFontScaling);
    expect(budgeted).toHaveProp('adjustsFontSizeToFit', fit.adjustsFontSizeToFit);
    expect(budgeted).toHaveStyle(fit.style);
  });
});
