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

beforeEach(() => useEditTransactionStore().reset());

describe('useEditTransactionStore initial state', () => {
  it('starts with editingTx=null and amountStr="0"', () => {
    const { state } = useEditTransactionStore();
    expect(state.editingTx.value).toBeNull();
    expect(state.amountStr.value).toBe('0');
  });
});

describe('useEditTransactionStore.loadFromTx', () => {
  it('stores the transaction', () => {
    const tx = makeTx();
    useEditTransactionStore().loadFromTx(tx);
    expect(useEditTransactionStore().state.editingTx.value).toBe(tx);
  });

  it('formats integer amount without decimal for integer amounts', () => {
    useEditTransactionStore().loadFromTx(makeTx({ amount: 200 }));
    expect(useEditTransactionStore().state.amountStr.value).toBe('200');
  });

  it('formats fractional amount as a string with decimal', () => {
    useEditTransactionStore().loadFromTx(makeTx({ amount: 99.5 }));
    expect(useEditTransactionStore().state.amountStr.value).toBe('99.5');
  });
});

describe('useEditTransactionStore.handleNumpad', () => {
  it('digit replaces "0" with the digit (leading-zero guard)', () => {
    useEditTransactionStore().handleNumpad('digit', '7');
    expect(useEditTransactionStore().state.amountStr.value).toBe('7');
  });

  it('pressing "0" when amountStr is "0" keeps it "0"', () => {
    useEditTransactionStore().handleNumpad('digit', '0');
    expect(useEditTransactionStore().state.amountStr.value).toBe('0');
  });

  it('digit appends to a non-zero string', () => {
    useEditTransactionStore().handleNumpad('digit', '4');
    useEditTransactionStore().handleNumpad('digit', '2');
    expect(useEditTransactionStore().state.amountStr.value).toBe('42');
  });

  it('decimal appends "." when not already present', () => {
    useEditTransactionStore().handleNumpad('digit', '5');
    useEditTransactionStore().handleNumpad('decimal');
    expect(useEditTransactionStore().state.amountStr.value).toBe('5.');
  });

  it('decimal is a no-op when "." is already present', () => {
    useEditTransactionStore().handleNumpad('digit', '5');
    useEditTransactionStore().handleNumpad('decimal');
    useEditTransactionStore().handleNumpad('decimal');
    expect(useEditTransactionStore().state.amountStr.value).toBe('5.');
  });

  it('backspace removes the last character', () => {
    useEditTransactionStore().handleNumpad('digit', '5');
    useEditTransactionStore().handleNumpad('digit', '3');
    useEditTransactionStore().handleNumpad('backspace');
    expect(useEditTransactionStore().state.amountStr.value).toBe('5');
  });

  it('backspace on a single character resets to "0"', () => {
    useEditTransactionStore().handleNumpad('digit', '5');
    useEditTransactionStore().handleNumpad('backspace');
    expect(useEditTransactionStore().state.amountStr.value).toBe('0');
  });

  it('limits decimal digits to 2', () => {
    useEditTransactionStore().handleNumpad('digit', '5');
    useEditTransactionStore().handleNumpad('decimal');
    useEditTransactionStore().handleNumpad('digit', '1');
    useEditTransactionStore().handleNumpad('digit', '2');
    useEditTransactionStore().handleNumpad('digit', '3');
    expect(useEditTransactionStore().state.amountStr.value).toBe('5.12');
  });

  it('digit action without value argument defaults to empty string (covers ?? "" branch)', () => {
    useEditTransactionStore().handleNumpad('digit', '5');
    useEditTransactionStore().handleNumpad('digit'); // value = undefined → digit = ''
    expect(useEditTransactionStore().state.amountStr.value).toBe('5'); // '' appended → '5'
  });
});

describe('useEditTransactionStore.reset', () => {
  it('clears editingTx and amountStr', () => {
    useEditTransactionStore().loadFromTx(makeTx());
    useEditTransactionStore().reset();
    const { state } = useEditTransactionStore();
    expect(state.editingTx.value).toBeNull();
    expect(state.amountStr.value).toBe('0');
  });
});
