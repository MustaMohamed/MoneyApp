import React from 'react';
import { render } from '@testing-library/react-native';

import { TotalsStrip } from '@/screens/transactions_v2/components/totals_strip';

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { cn: (...a: unknown[]) => a.filter(Boolean).join(' '), View, Text };
});

describe('TotalsStrip', () => {
  it('renders Income / Expense / Net values', () => {
    const { getByText } = render(
      <TotalsStrip
        current={{ incomeEgp: 24713, expenseEgp: 8300, netEgp: 16413 }}
        previous={{ incomeEgp: 25500, expenseEgp: 7685, netEgp: 17815 }}
        previousLabel="April 2026"
      />,
    );
    expect(getByText(/24,713/)).toBeTruthy();
    expect(getByText(/8,300/)).toBeTruthy();
    expect(getByText(/16,413/)).toBeTruthy();
  });

  it('renders the "vs <prev>" caption', () => {
    const { getByText } = render(
      <TotalsStrip
        current={{ incomeEgp: 24713, expenseEgp: 8300, netEgp: 16413 }}
        previous={{ incomeEgp: 25500, expenseEgp: 7685, netEgp: 17815 }}
        previousLabel="April 2026"
      />,
    );
    expect(getByText('vs April 2026')).toBeTruthy();
  });

  it('omits the caption + deltas when previous is null', () => {
    const { queryByText } = render(
      <TotalsStrip
        current={{ incomeEgp: 24713, expenseEgp: 8300, netEgp: 16413 }}
        previous={null}
        previousLabel={null}
      />,
    );
    expect(queryByText(/^vs /)).toBeNull();
  });
});
