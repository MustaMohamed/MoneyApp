import type { Transaction } from '@/database/entities/transaction.entity';
import { useTxDetailStore } from '@/modules/transactions/screens/transactions/detail/detail.store';

beforeEach(() => {
  useTxDetailStore().reset();
});

describe('useTxDetailStore', () => {
  it('initialises with tx = undefined', () => {
    expect(useTxDetailStore().state.tx.value).toBeUndefined();
  });

  it('setTx stores a transaction', () => {
    const tx = { id: 't1' } as Transaction;
    useTxDetailStore().setTx(tx);
    expect(useTxDetailStore().state.tx.value).toBe(tx);
  });

  it('setTx(null) records a not-found result', () => {
    useTxDetailStore().setTx(null);
    expect(useTxDetailStore().state.tx.value).toBeNull();
  });

  it('reset() returns tx to undefined', () => {
    useTxDetailStore().setTx({ id: 't1' } as Transaction);
    useTxDetailStore().reset();
    expect(useTxDetailStore().state.tx.value).toBeUndefined();
  });
});
