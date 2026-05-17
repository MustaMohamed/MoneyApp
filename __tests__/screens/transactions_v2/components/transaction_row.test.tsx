import React from 'react';
import { render } from '@testing-library/react-native';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';

import { TransactionRow } from '@/screens/transactions_v2/components/transaction_row';

jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    View,
    useSharedValue: () => ({ value: 1 }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: unknown) => v,
  };
});

function mkAccount(p: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    name: 'CIB',
    type: AccountType.Bank,
    currency: Currency.EGP,
    current_balance: 1000,
    opening_balance: 1000,
    is_archived: 0,
    created_at: 'X',
    updated_at: 'X',
    ...p,
  } as Account;
}

function mkCategory(p: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    name: 'Food',
    icon: 'silverware-fork-knife',
    color: '#ffaa66',
    type: 'expense',
    is_archived: 0,
    created_at: 'X',
    updated_at: 'X',
    ...p,
  } as Category;
}

function mkTx(p: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: TransactionType.Expense,
    amount: 285,
    currency: Currency.EGP,
    egp_amount: 285,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'a1',
    to_account_id: null,
    category_id: 'c1',
    note: null,
    transaction_date: '2026-05-17',
    transaction_time: '19:14:00',
    commitment_payment_id: null,
    created_at: 'X',
    updated_at: 'X',
    ...p,
  } as Transaction;
}

describe('TransactionRow — left column', () => {
  it('shows category name as the title for expense', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByText('Food')).toBeTruthy();
  });

  it('falls back to "Uncategorized" when expense has no category', () => {
    const { getByText } = render(
      <TransactionRow tx={mkTx({ category_id: null })} account={mkAccount()} onPress={() => {}} />,
    );
    expect(getByText('Uncategorized')).toBeTruthy();
  });

  it('shows "Transfer" title for transfer with no category', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.Transfer, category_id: null, to_account_id: 'a2' })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a2', name: 'QNB Reserve' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('Transfer')).toBeTruthy();
  });

  it('shows "CC Payment" title for cc_payment type', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.CCPayment, category_id: null, to_account_id: 'a3' })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a3', name: 'Visa Credit' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('CC Payment')).toBeTruthy();
  });

  it('renders the italic note line when present', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ note: 'Talabat — family dinner' })}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByText('Talabat — family dinner')).toBeTruthy();
  });

  it('omits the note line when note is null', () => {
    const { queryByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    // No specific text to find; just assert that a generic note placeholder is absent.
    expect(queryByText(/^"/)).toBeNull();
  });

  it('shows account name for expense/income', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByText('CIB')).toBeTruthy();
  });

  it('shows FROM → TO for transfer', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.Transfer, category_id: null, to_account_id: 'a2' })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a2', name: 'QNB Reserve' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('CIB → QNB Reserve')).toBeTruthy();
  });

  it('renders TypeBadge when commitment_payment_id is set', () => {
    const { getByLabelText } = render(
      <TransactionRow
        tx={mkTx({ commitment_payment_id: 'cp1' })}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByLabelText('Commitment')).toBeTruthy();
  });
});

describe('TransactionRow — right column', () => {
  it('shows signed native amount + currency code', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByText('−285 EGP')).toBeTruthy();
  });

  it('shows + prefix for income', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.Income, amount: 25000, egp_amount: 25000 })}
        account={mkAccount()}
        category={mkCategory({ name: 'Salary' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('+25,000 EGP')).toBeTruthy();
  });

  it('omits sign prefix for transfer', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({
          type: TransactionType.Transfer,
          category_id: null,
          to_account_id: 'a2',
          amount: 5000,
          egp_amount: 5000,
        })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a2', name: 'QNB Reserve' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('5,000 EGP')).toBeTruthy();
  });

  it('shows EGP equivalent + rate when currency is USD (expense uses ≈)', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ currency: Currency.USD, amount: 9.99, egp_amount: 488, exchange_rate: 48.85 })}
        account={mkAccount()}
        category={mkCategory({ name: 'Subscriptions' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('−9.99 USD')).toBeTruthy();
    expect(getByText(/≈ 488 EGP/)).toBeTruthy();
    expect(getByText(/@ 48.85/)).toBeTruthy();
  });

  it('shows → prefix on EGP equivalent for cross-currency transfer', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({
          type: TransactionType.Transfer,
          category_id: null,
          to_account_id: 'a2',
          currency: Currency.USD,
          amount: 100,
          egp_amount: 4885,
          to_amount: 4885,
          exchange_rate: 48.85,
        })}
        account={mkAccount({ name: 'Wise USD', currency: Currency.USD })}
        toAccount={mkAccount({ id: 'a2', name: 'CIB' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('100 USD')).toBeTruthy();
    expect(getByText(/→ 4,885 EGP/)).toBeTruthy();
  });

  it('omits the EGP-equivalent line when currency is EGP', () => {
    const { queryByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(queryByText(/≈/)).toBeNull();
    expect(queryByText(/@ /)).toBeNull();
  });

  it('shows time in 12h format', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx()}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByText('7:14 PM')).toBeTruthy();
  });
});
