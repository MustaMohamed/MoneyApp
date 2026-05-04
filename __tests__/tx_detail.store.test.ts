import { Currency, TransactionType } from '@/constants/enums';
import { useTxDetailStore } from '@/screens/transactions/detail/detail.store';
import type { Transaction } from '@/database/entities/transaction.entity';

const FAKE_TX: Transaction = {
  id: 'tx-1',
  type: TransactionType.Expense,
  amount: 100,
  currency: Currency.EGP,
  egp_amount: 100,
  exchange_rate: null,
  to_amount: null,
  minimum_payment_snapshot: null,
  account_id: 'acc-1',
  to_account_id: null,
  category_id: 'cat-1',
  note: null,
  transaction_date: '2026-05-01',
  transaction_time: '10:00:00',
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
};

beforeEach(() => useTxDetailStore.getState().reset());

describe('useTxDetailStore', () => {
  it('starts with tx=undefined', () => {
    expect(useTxDetailStore.getState().state.tx).toBeUndefined();
  });

  it('setTx accepts a transaction', () => {
    useTxDetailStore.getState().setTx(FAKE_TX);
    expect(useTxDetailStore.getState().state.tx).toBe(FAKE_TX);
  });

  it('setTx accepts null (not found)', () => {
    useTxDetailStore.getState().setTx(null);
    expect(useTxDetailStore.getState().state.tx).toBeNull();
  });

  it('reset returns tx to undefined', () => {
    useTxDetailStore.getState().setTx(FAKE_TX);
    useTxDetailStore.getState().reset();
    expect(useTxDetailStore.getState().state.tx).toBeUndefined();
  });
});
