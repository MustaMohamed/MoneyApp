import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Strings } from '@/constants/strings';
import { TransactionsCard } from '@/modules/dashboard/screens/dashboard/components/transactions_card';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Card: ({ children, ...props }: { children?: ReactNode; className?: string }) =>
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
    SkeletonGroup: Object.assign(
      ({ children }: { children?: ReactNode }) =>
        React.createElement(View, { testID: 'skeleton-group' }, children),
      {
        Item: ({ children, isLoading }: { children?: ReactNode; isLoading?: boolean }) =>
          React.createElement(View, { testID: 'skeleton-item' }, isLoading ? null : children),
      },
    ),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

describe('TransactionsCard', () => {
  it('renders dashboard transaction summary and opens transactions on press', () => {
    const onPress = jest.fn();
    const { getByText, getByLabelText, queryAllByTestId } = render(
      <TransactionsCard
        current={{ incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 }}
        previous={{ incomeEgp: 22800, expenseEgp: 11300, netEgp: 11500 }}
        previousLabel="June 2026"
        yearMonth="2026-07"
        isLoading={false}
        onPress={onPress}
      />,
    );

    expect(getByText(Strings.transactions)).toBeTruthy();
    expect(getByText('+25,000')).toBeTruthy();
    expect(getByText('-13,000')).toBeTruthy();
    expect(getByText('+12,000')).toBeTruthy();
    expect(getByText(Strings.totalsVsPrev('June 2026'))).toBeTruthy();
    expect(queryAllByTestId('skeleton-item')).toHaveLength(0);

    fireEvent.press(getByLabelText(Strings.transactions));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows skeleton slots instead of totals while loading', () => {
    const { queryByText, getAllByTestId } = render(
      <TransactionsCard
        current={{ incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 }}
        previous={{ incomeEgp: 22800, expenseEgp: 11300, netEgp: 11500 }}
        previousLabel="June 2026"
        yearMonth="2026-07"
        isLoading
        onPress={jest.fn()}
      />,
    );

    expect(queryByText('+25,000')).toBeNull();
    expect(queryByText('-13,000')).toBeNull();
    expect(queryByText('+12,000')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(4);
  });
});
