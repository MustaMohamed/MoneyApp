import { act, render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

const mockAddSheet = jest.fn<React.ReactElement, [Record<string, unknown>]>((props) =>
  React.createElement(View, { testID: 'add-transaction-sheet', ...props }),
);
const mockEditSheet = jest.fn<React.ReactElement, [Record<string, unknown>]>((props) =>
  React.createElement(View, { testID: 'edit-transaction-sheet', ...props }),
);

jest.mock('@/modules/transactions/screens/transactions/transaction_form', () => ({
  AddTransactionSheet: (props: Record<string, unknown>) => mockAddSheet(props),
  EditTransactionSheet: (props: Record<string, unknown>) => mockEditSheet(props),
}));

import { TransactionFormHost } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host';
import { useTransactionFormHostState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';

function createTransaction(): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 125,
    currency: Currency.EGP,
    egp_amount: 125,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    revolving_balance_delta: null,
    account_id: 'account-1',
    to_account_id: null,
    category_id: 'category-1',
    budget_id: null,
    note: null,
    transaction_date: '2026-07-21',
    transaction_time: '12:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: '2026-07-21T12:00:00.000Z',
    updated_at: '2026-07-21T12:00:00.000Z',
  };
}

function callProp(
  props: Record<string, unknown> | undefined,
  name: string,
  ...args: unknown[]
): void {
  const callback = props?.[name];
  if (typeof callback !== 'function') {
    throw new Error(`Expected ${name} to be a callback`);
  }
  callback(...args);
}

describe('TransactionFormHost', () => {
  beforeEach(() => {
    mockAddSheet.mockClear();
    mockEditSheet.mockClear();
    useTransactionFormHostState.getState().reset();
  });

  it('prepares and opens one Add sheet without mounting Edit', () => {
    render(<TransactionFormHost />);

    act(() => useTransactionFormHostState.getState().openAdd());

    expect(mockAddSheet).toHaveBeenCalled();
    expect(mockEditSheet).not.toHaveBeenCalled();
    const preparingProps = mockAddSheet.mock.lastCall?.[0];
    expect(preparingProps).toMatchObject({ visible: false, sessionId: 1 });

    act(() => callProp(preparingProps, 'onReady', 1));

    expect(mockAddSheet.mock.lastCall?.[0]).toMatchObject({ visible: true, sessionId: 1 });
  });

  it('owns the only Edit sheet and retains it until close completion', () => {
    const tx = createTransaction();
    render(<TransactionFormHost />);

    act(() => useTransactionFormHostState.getState().openEdit(tx));
    const preparingProps = mockEditSheet.mock.lastCall?.[0];
    act(() => callProp(preparingProps, 'onReady', 1));

    expect(mockEditSheet.mock.lastCall?.[0]).toMatchObject({
      visible: true,
      sessionId: 1,
      tx,
    });

    act(() => callProp(mockEditSheet.mock.lastCall?.[0], 'onClose'));
    expect(mockEditSheet.mock.lastCall?.[0]).toMatchObject({ visible: false, tx });

    act(() => callProp(mockEditSheet.mock.lastCall?.[0], 'onCloseComplete'));
    expect(mockEditSheet).toHaveBeenCalledTimes(3);
    expect(useTransactionFormHostState.getState().mode).toBeNull();
  });
});
