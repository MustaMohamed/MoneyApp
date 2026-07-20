import { render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { TransactionRow } from '@/modules/transactions/screens/transactions/components/transaction_row';

interface MockSwipeableRowProps {
  actions: unknown[];
  children: React.ReactNode;
  disabled?: boolean;
}

const mockSwipeableRow = jest.fn(({ children }: MockSwipeableRowProps) => <View>{children}</View>);

jest.mock('@/components/ui/swipeable_row', () => ({
  SwipeableRow: (props: MockSwipeableRowProps) => mockSwipeableRow(props),
}));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('react-native-reanimated', () => {
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View: RNView },
    useAnimatedStyle: () => ({}),
  };
});
jest.mock('@/modules/transactions/screens/transactions/components/transaction_row.anim', () => ({
  useRowPressScale: () => ({
    scale: { value: 1 },
    onPressIn: jest.fn(),
    onPressOut: jest.fn(),
  }),
}));

function transaction(commitmentPaymentId: string | null): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    revolving_balance_delta: null,
    account_id: 'account',
    to_account_id: null,
    category_id: 'category',
    budget_id: null,
    note: null,
    transaction_date: '2026-07-19',
    transaction_time: '12:00:00',
    commitment_payment_id: commitmentPaymentId,
    installment_id: null,
    created_at: '2026-07-19T12:00:00.000Z',
    updated_at: '2026-07-19T12:00:00.000Z',
  };
}

describe('TransactionRow ownership actions', () => {
  beforeEach(() => mockSwipeableRow.mockClear());

  it('does not expose generic swipe actions for a commitment-owned transaction', () => {
    render(
      <TransactionRow
        tx={transaction('payment-1')}
        onPress={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(mockSwipeableRow).toHaveBeenCalledWith(
      expect.objectContaining({ actions: [], disabled: true }),
    );
  });

  it('keeps edit and delete actions for an ordinary transaction', () => {
    render(
      <TransactionRow
        tx={transaction(null)}
        onPress={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(mockSwipeableRow.mock.calls[0][0].actions).toHaveLength(2);
  });
});
