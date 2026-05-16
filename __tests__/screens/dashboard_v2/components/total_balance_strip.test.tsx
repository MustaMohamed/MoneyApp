import React from 'react';
import { render } from '@testing-library/react-native';

import { TotalBalanceStrip } from '@/screens/dashboard_v2/components/total_balance_strip';

describe('TotalBalanceStrip', () => {
  it('renders the formatted EGP balance and account count', () => {
    const { getByText } = render(
      <TotalBalanceStrip assetsEgp={42500} accountsCount={4} />,
    );
    expect(getByText(/42,500/)).toBeTruthy();
    expect(getByText('EGP')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
    expect(getByText('Total balance')).toBeTruthy();
    expect(getByText('Accounts')).toBeTruthy();
  });

  it('renders zero gracefully', () => {
    const { getByText } = render(
      <TotalBalanceStrip assetsEgp={0} accountsCount={0} />,
    );
    expect(getByText('0')).toBeTruthy();
  });
});
