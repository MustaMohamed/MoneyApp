import { act, renderHook } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';

const NOW = '2026-05-01T12:00:00.000Z';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 150,
    currency: Currency.EGP,
    egp_amount: 150,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat_food',
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function setup() {
  const hook = renderHook(() => useEditTransactionStore());
  act(() => hook.result.current.reset());
  return hook;
}

describe('useEditTransactionStore initial state', () => {
  it('starts with editingTx=null and amountStr="0"', () => {
    const { result } = setup();

    expect(result.current.state.editingTx.value).toBeNull();
    expect(result.current.state.amountStr.value).toBe('0');
  });
});

describe('useEditTransactionStore.loadFromTx', () => {
  it('stores the transaction', () => {
    const { result } = setup();
    const tx = makeTx();

    act(() => result.current.loadFromTx(tx));

    expect(result.current.state.editingTx.value).toBe(tx);
  });

  it('formats integer amount without decimal for integer amounts', () => {
    const { result } = setup();

    act(() => result.current.loadFromTx(makeTx({ amount: 200 })));

    expect(result.current.state.amountStr.value).toBe('200');
  });

  it('formats fractional amount as a string with decimal', () => {
    const { result } = setup();

    act(() => result.current.loadFromTx(makeTx({ amount: 99.5 })));

    expect(result.current.state.amountStr.value).toBe('99.5');
  });
});

describe('useEditTransactionStore.handleNumpad', () => {
  it('digit replaces "0" with the digit (leading-zero guard)', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '7'));

    expect(result.current.state.amountStr.value).toBe('7');
  });

  it('pressing "0" when amountStr is "0" keeps it "0"', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '0'));

    expect(result.current.state.amountStr.value).toBe('0');
  });

  it('digit appends to a non-zero string', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '4'));
    act(() => result.current.handleNumpad('digit', '2'));

    expect(result.current.state.amountStr.value).toBe('42');
  });

  it('decimal appends "." when not already present', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('decimal'));

    expect(result.current.state.amountStr.value).toBe('5.');
  });

  it('decimal is a no-op when "." is already present', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('decimal'));
    act(() => result.current.handleNumpad('decimal'));

    expect(result.current.state.amountStr.value).toBe('5.');
  });

  it('backspace removes the last character', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('digit', '3'));
    act(() => result.current.handleNumpad('backspace'));

    expect(result.current.state.amountStr.value).toBe('5');
  });

  it('backspace on a single character resets to "0"', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('backspace'));

    expect(result.current.state.amountStr.value).toBe('0');
  });

  it('limits decimal digits to 2', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('decimal'));
    act(() => result.current.handleNumpad('digit', '1'));
    act(() => result.current.handleNumpad('digit', '2'));
    act(() => result.current.handleNumpad('digit', '3'));

    expect(result.current.state.amountStr.value).toBe('5.12');
  });

  it('digit action without value argument defaults to empty string', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('digit'));

    expect(result.current.state.amountStr.value).toBe('5');
  });
});

describe('useEditTransactionStore.reset', () => {
  it('clears editingTx and amountStr', () => {
    const { result } = setup();

    act(() => result.current.loadFromTx(makeTx()));
    act(() => result.current.reset());

    expect(result.current.state.editingTx.value).toBeNull();
    expect(result.current.state.amountStr.value).toBe('0');
  });
});
