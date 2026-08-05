import { render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { AccountType } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { TransactionRow } from '@/modules/transactions/screens/transactions/components/transaction_row';
import { TRANSACTION_ROW_HEIGHT } from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { ms } from '@/utils/responsive';

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

  it('does not expose generic swipe actions for a commitment-owned transaction', async () => {
    await render(
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

  it('keeps edit and delete actions for an ordinary transaction', async () => {
    await render(
      <TransactionRow
        tx={transaction(null)}
        onPress={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(mockSwipeableRow.mock.calls[0][0].actions).toHaveLength(2);
  });

  it('uses stable icon, content, and value tracks for long row content', async () => {
    const source: Account = {
      id: 'account',
      name: 'A very long source account name that must truncate',
      type: AccountType.Bank,
      currency: Currency.USD,
      opening_balance: 0,
      current_balance: 0,
      color: null,
      credit_limit: null,
      revolving_balance: null,
      minimum_payment: null,
      statement_due_day: null,
      interest_tracking: 0,
      apr: null,
      is_archived: 0,
      balance_review_required: 0,
      sort_order: 0,
      created_at: '2026-07-19T12:00:00.000Z',
      updated_at: '2026-07-19T12:00:00.000Z',
    };
    const screen = await render(
      <TransactionRow
        tx={transaction(null)}
        account={source}
        onPress={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(screen.getByTestId('transaction-row')).toHaveStyle({ height: TRANSACTION_ROW_HEIGHT });
    expect(screen.getByTestId('transaction-row-icon-track')).toHaveStyle({
      width: ms(36),
      height: ms(36),
    });
    expect(screen.getByTestId('transaction-row-content-track')).toHaveStyle({
      flex: 1,
      minWidth: 0,
    });
    expect(screen.getByTestId('transaction-row-value-track')).toHaveStyle({ width: ms(120) });
    expect(screen.getByTestId('transaction-row-note-track')).toBeTruthy();
    expect(screen.getByTestId('transaction-row-secondary-amount-track')).toBeTruthy();
    expect(TRANSACTION_ROW_HEIGHT).toBe(ms(60));
  });

  it('renders the destination native amount for transfers', async () => {
    const source = {
      id: 'account',
      name: 'USD wallet',
      type: AccountType.Bank,
      currency: Currency.USD,
      opening_balance: 0,
      current_balance: 0,
      color: null,
      credit_limit: null,
      revolving_balance: null,
      minimum_payment: null,
      statement_due_day: null,
      interest_tracking: 0 as const,
      apr: null,
      is_archived: 0 as const,
      balance_review_required: 0 as const,
      sort_order: 0,
      created_at: '2026-07-19T12:00:00.000Z',
      updated_at: '2026-07-19T12:00:00.000Z',
    };
    const destination = { ...source, id: 'destination', name: 'CIB', currency: Currency.EGP };
    const transfer = transaction(null);
    transfer.type = TransactionType.Transfer;
    transfer.currency = Currency.USD;
    transfer.amount = 100;
    transfer.egp_amount = 4_850;
    transfer.to_amount = 4_850;
    transfer.to_account_id = destination.id;
    transfer.category_id = null;

    const { getByText } = await render(
      <TransactionRow
        tx={transfer}
        account={source}
        toAccount={destination}
        onPress={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(getByText('100 USD')).toBeTruthy();
    expect(getByText('→ 4,850 EGP')).toBeTruthy();
  });
});
