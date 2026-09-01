import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import { Strings } from '@/constants/strings';
import { BudgetCard } from '@/modules/dashboard/screens/dashboard/components/budget_card';

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
});
