import type { Transaction } from '@/database/entities/transaction.entity';
import { useTxDetailStore } from '@/modules/transactions/screens/transactions/detail/detail.store';

beforeEach(() => {
  useTxDetailStore.getState().reset();
});

describe('useTxDetailStore', () => {
  it('initialises without transaction ownership', () => {
    expect(useTxDetailStore.getState()).toMatchObject({
      tx: null,
      txId: undefined,
    });
  });

  it('setTx stores a transaction with its route ownership', () => {
    const tx = { id: 't1' } as Transaction;
    useTxDetailStore.getState().setTx('t1', tx);
    expect(useTxDetailStore.getState().tx).toBe(tx);
    expect(useTxDetailStore.getState().txId).toBe('t1');
  });

  it('clearForId removes stale data and assigns the new route', () => {
    useTxDetailStore.getState().setTx('t1', { id: 't1' } as Transaction);

    useTxDetailStore.getState().clearForId('t2');

    expect(useTxDetailStore.getState().tx).toBeNull();
    expect(useTxDetailStore.getState().txId).toBe('t2');
  });

  it('reset() removes transaction ownership', () => {
    useTxDetailStore.getState().setTx('t1', { id: 't1' } as Transaction);
    useTxDetailStore.getState().reset();
    expect(useTxDetailStore.getState()).toMatchObject({ tx: null, txId: undefined });
  });
});
