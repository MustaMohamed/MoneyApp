import type { Transaction } from '@/database/entities/transaction.entity';
import { useTxDetailStore } from '@/modules/transactions/screens/transactions/detail/detail.store';

beforeEach(() => {
  useTxDetailStore.getState().reset();
});

describe('useTxDetailStore', () => {
  it('initialises with tx = undefined', () => {
    expect(useTxDetailStore.getState().state.tx).toBeUndefined();
  });

  it('setTx stores a transaction', () => {
    const tx = { id: 't1' } as Transaction;
    useTxDetailStore.getState().setTx(tx);
    expect(useTxDetailStore.getState().state.tx).toBe(tx);
  });

  it('setTx(null) records a not-found result', () => {
    useTxDetailStore.getState().setTx(null);
    expect(useTxDetailStore.getState().state.tx).toBeNull();
  });

  it('reset() returns tx to undefined', () => {
    useTxDetailStore.getState().setTx({ id: 't1' } as Transaction);
    useTxDetailStore.getState().reset();
    expect(useTxDetailStore.getState().state.tx).toBeUndefined();
  });
});
