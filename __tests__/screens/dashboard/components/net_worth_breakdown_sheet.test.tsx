import React from 'react';
import { render } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NetWorthBreakdownSheet } from '@/screens/dashboard/components/net_worth_breakdown_sheet';

jest.mock('react-native-gesture-handler', () => {
  const { View, TouchableOpacity } = jest.requireActual('react-native');
  return {
    GestureHandlerRootView: View,
    TouchableOpacity,
  };
});

const DEFAULT_LIQUIDITY = {
  liquidEgp: 32500,
  liquidCount: 3,
  liquidAccounts: [
    { id: 'l1', name: 'CIB Account', balanceEgp: 27000 },
    { id: 'l2', name: 'Vodafone Cash', balanceEgp: 3500 },
    { id: 'l3', name: 'Petty Cash', balanceEgp: 2000 },
  ],
  reserveEgp: 11500,
  reserveCount: 2,
  reserveAccounts: [
    { id: 'r1', name: 'QNB Reserve', balanceEgp: 7500 },
    { id: 'r2', name: 'Emergency Fund', balanceEgp: 4000 },
  ],
};

const DEFAULT_LIABILITIES = [
  { id: 'a3', name: 'Visa Credit', balanceEgp: 4080, statementDueDay: 28 },
];

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
        liquidity={DEFAULT_LIQUIDITY}
        liabilities={DEFAULT_LIABILITIES}
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
    expect(getByText(/11,500/)).toBeTruthy();
  });

  it('itemizes each account inside the Liquid and Reserve tiers (hybrid layout)', () => {
    const { getByText } = renderSheet();
    expect(getByText('CIB Account')).toBeTruthy();
    expect(getByText('Vodafone Cash')).toBeTruthy();
    expect(getByText('Petty Cash')).toBeTruthy();
    expect(getByText('QNB Reserve')).toBeTruthy();
    expect(getByText('Emergency Fund')).toBeTruthy();
    expect(getByText(/27,000/)).toBeTruthy();
    expect(getByText(/3,500/)).toBeTruthy();
    expect(getByText(/2,000/)).toBeTruthy();
    expect(getByText(/7,500/)).toBeTruthy();
    expect(getByText(/4,000/)).toBeTruthy();
  });

  it('hides Reserve legend row and accounts when reserveCount is 0', () => {
    const { queryByText } = renderSheet({
      liquidity: { ...DEFAULT_LIQUIDITY, reserveEgp: 0, reserveCount: 0, reserveAccounts: [] },
    });
    expect(queryByText('Reserve')).toBeNull();
    expect(queryByText('QNB Reserve')).toBeNull();
    expect(queryByText('Liquid')).toBeTruthy();
  });

  it('hides Liquid legend row and accounts when liquidCount is 0', () => {
    const { queryByText } = renderSheet({
      liquidity: { ...DEFAULT_LIQUIDITY, liquidEgp: 0, liquidCount: 0, liquidAccounts: [] },
    });
    expect(queryByText('Liquid')).toBeNull();
    expect(queryByText('CIB Account')).toBeNull();
    expect(queryByText('Reserve')).toBeTruthy();
  });

  it('hides the entire Liabilities section when liabilities array is empty', () => {
    const { queryByText } = renderSheet({ liabilities: [] });
    expect(queryByText('Total debt')).toBeNull();
  });

  it('renders each liability as a LegendRow with due-date caption when statementDueDay is set', () => {
    const { getByText } = renderSheet({
      liabilities: [
        { id: '1', name: 'Card A', balanceEgp: 5000, statementDueDay: 15 },
        { id: '2', name: 'Card B', balanceEgp: 1000, statementDueDay: null },
      ],
    });
    expect(getByText('Card A')).toBeTruthy();
    expect(getByText('Card B')).toBeTruthy();
    expect(getByText(/due /)).toBeTruthy();
    expect(getByText('Total debt')).toBeTruthy();
    expect(getByText(/6,000/)).toBeTruthy();
  });

  it('renders liability values with a negative prefix', () => {
    const { getByText } = renderSheet();
    expect(getByText(/^−4,080$/)).toBeTruthy();
  });

  it('renders "— USD" when rate is 0 (spec §5.3)', () => {
    const { getByText, queryByText } = renderSheet({ rate: 0, netWorthUsd: 0 });
    expect(getByText('— USD')).toBeTruthy();
    expect(queryByText(/≈ 0 USD/)).toBeNull();
  });
});
