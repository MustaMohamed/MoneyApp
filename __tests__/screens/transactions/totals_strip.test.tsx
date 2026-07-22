import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Strings } from '@/constants/strings';
import {
  TRANSACTIONS_EXPENSE_SHARE_RAIL_CLASS_NAME,
  TRANSACTIONS_TOTALS_CARD_CLASS_NAME,
  TotalsStrip,
} from '@/modules/transactions/screens/transactions/components/totals_strip';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Card: ({ children, ...props }: { children?: ReactNode; className?: string }) =>
      React.createElement(View, props, children),
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

describe('TotalsStrip', () => {
  it('uses the commitments summary card size and margin', () => {
    expect(TRANSACTIONS_TOTALS_CARD_CLASS_NAME).toBe(
      'bg-surface border-border mx-4 mb-2 gap-1 rounded-2xl border px-4 py-2',
    );
    expect(TRANSACTIONS_EXPENSE_SHARE_RAIL_CLASS_NAME).toContain('h-[3px]');
    expect(TRANSACTIONS_EXPENSE_SHARE_RAIL_CLASS_NAME).not.toContain('h-[5px]');
  });

  it('shows the previous-period comparison caption', () => {
    const { getByText, queryAllByTestId } = render(
      <TotalsStrip
        current={{ incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 }}
        previous={{ incomeEgp: 22800, expenseEgp: 11300, netEgp: 14500 }}
        previousLabel="June 2026"
      />,
    );

    expect(getByText(Strings.totalsVsPrev('June 2026'))).toBeTruthy();
    expect(queryAllByTestId('skeleton-item')).toHaveLength(0);
  });

  it('exposes the bounded expense share as a progress value', () => {
    const { getByTestId } = render(
      <TotalsStrip
        current={{ incomeEgp: 1_000, expenseEgp: 1_500, netEgp: -500 }}
        previous={null}
        previousLabel={null}
      />,
    );

    expect(getByTestId('transactions-totals-progress')).toHaveProp(
      'accessibilityRole',
      'progressbar',
    );
    expect(getByTestId('transactions-totals-progress')).toHaveProp('accessibilityValue', {
      min: 0,
      max: 100,
      now: 100,
      text: Strings.totalsExpenseShareA11y(150),
    });
  });

  it.each([
    {
      totals: { incomeEgp: 0, expenseEgp: 500, netEgp: -500 },
      label: Strings.totalsNoIncome,
    },
    {
      totals: { incomeEgp: 1_000, expenseEgp: 650, netEgp: 350 },
      label: Strings.totalsWithinIncome,
    },
    {
      totals: { incomeEgp: 100, expenseEgp: 350, netEgp: -250 },
      label: Strings.totalsOverIncome(350),
    },
    {
      totals: { incomeEgp: 100, expenseEgp: -50, netEgp: 150 },
      label: Strings.totalsNetCredit,
    },
  ])('renders the $label edge state in the shared caption slot', ({ totals, label }) => {
    const { getByTestId, getByText } = render(
      <TotalsStrip current={totals} previous={null} previousLabel="June 2026" />,
    );

    expect(getByTestId('transactions-totals-values-row')).toBeTruthy();
    expect(getByTestId('transactions-totals-progress')).toBeTruthy();
    expect(getByTestId('transactions-totals-comparison-row')).toBeTruthy();
    expect(getByTestId('transactions-totals-caption')).toBeTruthy();
    expect(getByText(label)).toBeTruthy();
  });
});
