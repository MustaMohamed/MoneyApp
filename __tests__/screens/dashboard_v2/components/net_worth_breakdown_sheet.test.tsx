import React from 'react';
import { render } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

jest.mock('react-native-gesture-handler', () => {
  const { View, TouchableOpacity } = require('react-native');
  return {
    GestureHandlerRootView: View,
    TouchableOpacity,
  };
});

import { NetWorthBreakdownSheet } from '@/screens/dashboard_v2/components/net_worth_breakdown_sheet';

function renderSheet(props: Partial<React.ComponentProps<typeof NetWorthBreakdownSheet>> = {}) {
  return render(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NetWorthBreakdownSheet
        visible
        onClose={() => {}}
        assetsEgp={42500}
        liabilitiesEgp={4080}
        netWorthEgp={38420}
        netWorthUsd={786}
        rate={48.85}
        liquidity={{ liquidEgp: 32500, liquidCount: 3, reserveEgp: 10000, reserveCount: 1 }}
        liabilities={[{ id: 'a3', name: 'Visa Credit', balanceEgp: 4080 }]}
        {...props}
      />
    </GestureHandlerRootView>,
  );
}

describe('NetWorthBreakdownSheet', () => {
  it('renders net worth headline in EGP and USD', () => {
    const { getByText } = renderSheet();
    expect(getByText(/38,420/)).toBeTruthy();
    expect(getByText(/786/)).toBeTruthy();
  });

  it('renders Liquid and Reserve legend rows when both tiers non-zero', () => {
    const { getByText } = renderSheet();
    expect(getByText('Liquid')).toBeTruthy();
    expect(getByText('Reserve')).toBeTruthy();
    expect(getByText(/32,500/)).toBeTruthy();
    expect(getByText(/10,000/)).toBeTruthy();
  });

  it('hides Reserve legend row when reserveCount is 0', () => {
    const { queryByText } = renderSheet({
      liquidity: { liquidEgp: 32500, liquidCount: 3, reserveEgp: 0, reserveCount: 0 },
    });
    expect(queryByText('Reserve')).toBeNull();
    expect(queryByText('Liquid')).toBeTruthy();
  });

  it('hides Liquid legend row when liquidCount is 0', () => {
    const { queryByText } = renderSheet({
      liquidity: { liquidEgp: 0, liquidCount: 0, reserveEgp: 10000, reserveCount: 1 },
    });
    expect(queryByText('Liquid')).toBeNull();
    expect(queryByText('Reserve')).toBeTruthy();
  });

  it('hides the entire Liabilities section when liabilities array is empty', () => {
    const { queryByText } = renderSheet({ liabilities: [] });
    expect(queryByText('Total debt')).toBeNull();
  });

  it('renders one row per liability, ordered as passed', () => {
    const { getByText } = renderSheet({
      liabilities: [
        { id: '1', name: 'Card A', balanceEgp: 5000 },
        { id: '2', name: 'Card B', balanceEgp: 1000 },
      ],
    });
    expect(getByText('Card A')).toBeTruthy();
    expect(getByText('Card B')).toBeTruthy();
    expect(getByText('Total debt')).toBeTruthy();
    expect(getByText(/6,000/)).toBeTruthy();
  });

  it('renders "— USD" when rate is 0 (spec §5.3)', () => {
    const { getByText, queryByText } = renderSheet({ rate: 0, netWorthUsd: 0 });
    expect(getByText('— USD')).toBeTruthy();
    expect(queryByText(/≈ 0 USD/)).toBeNull();
  });
});
